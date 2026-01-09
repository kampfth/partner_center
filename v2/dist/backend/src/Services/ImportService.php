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
            'errors' => [],
        ];

        $this->loadTrackedSet();

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

        while (($row = fgetcsv($handle)) !== false) {
            $this->metrics['rows_read']++;
            $data = $this->parser->extractRow($row, $colMap);

            if (!$this->parser->isValidRow($data)) continue;

            if (!isset($seenProducts[$data['product_id']])) {
                $allProductsBatch[] = [
                    'product_id' => $data['product_id'],
                    'product_name' => $data['product_name'],
                    'lever' => $data['lever'],
                    'last_seen_at' => date('c'),
                ];
                $seenProducts[$data['product_id']] = true;
            }

            if (!isset($this->trackedSet[$data['product_id']])) {
                $this->metrics['transactions_untracked']++;
                continue;
            }

            // Use standard column names matching CSV format
            $transactionsBatch[] = [
                'earning_id'               => $data['earning_id'],
                'product_id'               => $data['product_id'],
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
