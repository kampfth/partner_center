<?php
/**
 * Import Service - CSV/ZIP processing and data import
 */

declare(strict_types=1);

namespace App\Services;

use App\Db\SupabaseClient;

class ImportService
{
    private SupabaseClient $db;
    private CsvParser $parser;
    private array $trackedSet = [];
    private array $metrics;
    
    // Maps base product name -> product_id for MSFS 2024 products
    // Used to redirect Rentals transactions to their base product
    private array $baseProductMap = [];

    public function __construct()
    {
        $this->db = new SupabaseClient();
        $this->parser = new CsvParser();
    }

    public function processUpload(array $file): array
    {
        $this->metrics = [
            'rows_read' => 0,
            'products_discovered' => 0,
            'transactions_inserted' => 0,
            'transactions_skipped' => 0,
            'transactions_untracked' => 0,
            'rentals_merged' => 0,
            'errors' => [],
        ];

        $this->loadTrackedSet();
        $this->loadBaseProductMap();

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['csv', 'zip'], true)) {
            throw new \RuntimeException('Invalid file type. Only CSV or ZIP allowed.', 400);
        }

        if ($ext === 'zip') {
            $this->processZip($file['tmp_name']);
        } else {
            $this->processCsv($file['tmp_name']);
        }

        $importId = $this->logImport($file['name']);

        return [
            'import_id' => $importId,
            'filename' => $file['name'],
            'rows_read' => $this->metrics['rows_read'],
            'products_discovered' => $this->metrics['products_discovered'],
            'transactions_inserted' => $this->metrics['transactions_inserted'],
            'transactions_skipped' => $this->metrics['transactions_skipped'],
            'transactions_untracked' => $this->metrics['transactions_untracked'],
            'rentals_merged' => $this->metrics['rentals_merged'],
            'status' => 'completed',
        ];
    }

    private function loadTrackedSet(): void
    {
        $rows = $this->db->select('all_products', 'select=product_id&is_tracked=eq.true');
        foreach ($rows as $r) {
            if (isset($r['product_id'])) {
                $this->trackedSet[$r['product_id']] = true;
            }
        }
    }

    /**
     * Load mapping of base product names to product_ids for MSFS 2024
     * This allows us to redirect Rentals transactions to their base products
     */
    private function loadBaseProductMap(): void
    {
        $rows = $this->db->select('all_products', 'select=product_id,product_name,lever');
        foreach ($rows as $r) {
            $name = $r['product_name'] ?? '';
            $lever = $r['lever'] ?? '';
            
            // Only map MSFS 2024 non-Rentals products
            if ($lever === 'Microsoft Flight Simulator 2024' && !str_ends_with($name, ' Rentals')) {
                $this->baseProductMap[$name] = $r['product_id'];
            }
        }
    }

    private function processZip(string $path): void
    {
        if (!class_exists('ZipArchive')) {
            throw new \RuntimeException('ZIP extension not available', 500);
        }

        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            throw new \RuntimeException('Could not open ZIP file', 400);
        }

        $tempDir = sys_get_temp_dir() . '/import_' . uniqid();
        @mkdir($tempDir, 0755, true);

        for ($i = 0; $i < min($zip->numFiles, 50); $i++) {
            $name = $zip->getNameIndex($i);
            if (!$name || str_ends_with($name, '/') || strtolower(pathinfo($name, PATHINFO_EXTENSION)) !== 'csv') {
                continue;
            }
            if (str_contains($name, '..')) continue;

            $extracted = $tempDir . '/' . basename($name);
            file_put_contents($extracted, $zip->getFromIndex($i));
            $this->processCsv($extracted);
            @unlink($extracted);
        }

        $zip->close();
        @rmdir($tempDir);
    }

    private function processCsv(string $path): void
    {
        $handle = fopen($path, 'r');
        if (!$handle) {
            $this->metrics['errors'][] = 'Could not open CSV';
            return;
        }

        $headers = fgetcsv($handle);
        if (!$headers) {
            fclose($handle);
            $this->metrics['errors'][] = 'Could not read CSV headers';
            return;
        }

        $colMap = $this->parser->mapHeaders($headers);
        $allProductsBatch = [];
        $transactionsBatch = [];
        $seenProducts = [];
        
        // First pass: collect all products to build the base product map for new products
        $pendingBaseProducts = [];

        while (($row = fgetcsv($handle)) !== false) {
            $this->metrics['rows_read']++;
            $data = $this->parser->extractRow($row, $colMap);

            if (!$this->parser->isValidRow($data)) continue;

            $productName = $data['product_name'] ?? '';
            $lever = $data['lever'] ?? '';
            $productId = $data['product_id'];
            $isRentals = str_ends_with($productName, ' Rentals');
            $isMsfs2024 = $lever === 'Microsoft Flight Simulator 2024';

            // Track base products (non-Rentals MSFS 2024) for the mapping
            if ($isMsfs2024 && !$isRentals && !isset($this->baseProductMap[$productName])) {
                $this->baseProductMap[$productName] = $productId;
                $pendingBaseProducts[$productName] = $productId;
            }

            // Only add to all_products if NOT a Rentals product from MSFS 2024
            if (!isset($seenProducts[$productId]) && !($isRentals && $isMsfs2024)) {
                $allProductsBatch[] = [
                    'product_id' => $productId,
                    'product_name' => $productName,
                    'lever' => $lever,
                    'last_seen_at' => date('c'),
                ];
                $seenProducts[$productId] = true;
            }

            // Determine the effective product_id for this transaction
            $effectiveProductId = $productId;
            
            if ($isRentals && $isMsfs2024) {
                // Find the base product name (remove " Rentals" suffix)
                $baseName = substr($productName, 0, -8);
                
                if (isset($this->baseProductMap[$baseName])) {
                    // Redirect to base product
                    $effectiveProductId = $this->baseProductMap[$baseName];
                    $this->metrics['rentals_merged']++;
                } else {
                    // No base product found - skip this Rentals transaction
                    $this->metrics['transactions_untracked']++;
                    continue;
                }
            }

            // Check if the effective product is tracked
            if (!isset($this->trackedSet[$effectiveProductId])) {
                $this->metrics['transactions_untracked']++;
                continue;
            }

            // Use standard column names matching CSV format
            $transactionsBatch[] = [
                'earning_id'               => $data['earning_id'],
                'product_id'               => $effectiveProductId, // Use base product for Rentals
                'transaction_country_code' => $data['transaction_country_code'],
                'transaction_date'         => $data['transaction_date'],
                'units'                    => 1,
                'transaction_amount'       => (float)$data['transaction_amount'],
                'msfs_version'             => $this->parser->parseMsfsVersion($data['external_reference_label'] ?? ''),
            ];

            if (count($transactionsBatch) >= 500) {
                $this->flushBatches($allProductsBatch, $transactionsBatch);
                $allProductsBatch = [];
                $transactionsBatch = [];
            }
        }

        $this->flushBatches($allProductsBatch, $transactionsBatch);
        fclose($handle);
    }

    private function flushBatches(array $products, array $transactions): void
    {
        if (!empty($products)) {
            $before = count($this->db->select('all_products', 'select=id'));
            $this->db->insert('all_products', $products, true, 'product_id');
            $after = count($this->db->select('all_products', 'select=id'));
            $this->metrics['products_discovered'] += max(0, $after - $before);
        }

        if (!empty($transactions)) {
            $countBefore = count($transactions);
            try {
                $this->db->insert('transactions', $transactions, true, 'earning_id');
                $this->metrics['transactions_inserted'] += $countBefore;
            } catch (\Throwable) {
                foreach ($transactions as $t) {
                    try {
                        $this->db->insert('transactions', [$t], true, 'earning_id');
                        $this->metrics['transactions_inserted']++;
                    } catch (\Throwable) {
                        $this->metrics['transactions_skipped']++;
                    }
                }
            }
        }
    }

    private function logImport(string $filename): string
    {
        $result = $this->db->insert('imports', [
            'filename' => $filename,
            'rows_read' => $this->metrics['rows_read'],
            'products_discovered' => $this->metrics['products_discovered'],
            'transactions_inserted' => $this->metrics['transactions_inserted'],
            'transactions_skipped' => $this->metrics['transactions_skipped'],
            'transactions_untracked' => $this->metrics['transactions_untracked'],
            'errors' => json_encode($this->metrics['errors']),
            'started_at' => date('c'),
            'finished_at' => date('c'),
            'status' => 'completed',
        ]);
        return $result[0]['id'] ?? '';
    }

    public function getImportHistory(int $limit = 20): array
    {
        $limit = min($limit, 100);
        return $this->db->select('imports', "select=*&order=started_at.desc&limit={$limit}");
    }
}
