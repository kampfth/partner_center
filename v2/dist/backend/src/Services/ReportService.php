<?php
/**
 * Report Service - Business logic for reports and aggregations
 */

declare(strict_types=1);

namespace App\Services;

use App\Db\SupabaseClient;

class ReportService
{
    private SupabaseClient $db;

    public function __construct()
    {
        $this->db = new SupabaseClient();
    }

    public function getReport(string $startDate, string $endDate): array
    {
        // Validate dates
        if (!$this->isValidDate($startDate) || !$this->isValidDate($endDate)) {
            throw new \RuntimeException('Invalid date format. Use YYYY-MM-DD', 400);
        }

        if ($startDate > $endDate) {
            throw new \RuntimeException('start date must be before or equal to end date', 400);
        }

        // Get daily sales from view
        $daily = $this->getDailySales($startDate, $endDate);

        // Get summary via RPC
        $summary = $this->getProductSummary($startDate, $endDate);

        return [
            'daily' => $daily,
            'summary' => $summary,
        ];
    }

    public function getDateRange(): array
    {
        // Get min date using standard column name
        $minResult = $this->db->select('transactions', 'select=transaction_date&order=transaction_date.asc&limit=1');
        $minDate = $minResult[0]['transaction_date'] ?? null;

        // Get max date using standard column name
        $maxResult = $this->db->select('transactions', 'select=transaction_date&order=transaction_date.desc&limit=1');
        $maxDate = $maxResult[0]['transaction_date'] ?? null;

        // Extract only YYYY-MM-DD from timestamptz (format: "2026-01-06 00:00:00+00")
        // This ensures frontend receives clean dates for date pickers and API calls
        return [
            'min_date' => $minDate ? substr($minDate, 0, 10) : null,
            'max_date' => $maxDate ? substr($maxDate, 0, 10) : null,
        ];
    }

    private function getDailySales(string $startDate, string $endDate): array
    {
        $query = sprintf(
            'select=date,total_units,total_amount&date=gte.%s&date=lte.%s&order=date.asc',
            urlencode($startDate),
            urlencode($endDate)
        );

        return $this->db->select('daily_sales', $query);
    }

    private function getProductSummary(string $startDate, string $endDate): array
    {
        try {
            $summary = $this->db->rpc('get_product_summary', [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);
            
            // Apply PHP-level Rentals merging as safety layer
            return $this->mergeRentalsIntoBase($summary);
        } catch (\Throwable $e) {
            // If RPC doesn't exist, return empty summary
            if (str_contains($e->getMessage(), 'function') || str_contains($e->getMessage(), '404')) {
                return [];
            }
            throw $e;
        }
    }

    /**
     * Merge Rentals products into their base products
     * Rentals products (ending with " Rentals") should be merged into the base product
     * This is a PHP safety layer - SQL function should already handle this
     */
    private function mergeRentalsIntoBase(array $summary): array
    {
        $baseProducts = [];
        $rentalsProducts = [];
        
        // Separate base and rentals products
        foreach ($summary as $item) {
            $name = $item['display_name'] ?? '';
            if (str_ends_with($name, ' Rentals')) {
                $baseName = substr($name, 0, -8); // Remove " Rentals" suffix
                $rentalsProducts[$baseName] = $item;
            } else {
                $baseProducts[$name] = $item;
            }
        }
        
        // Merge rentals into base products
        foreach ($rentalsProducts as $baseName => $rentalsItem) {
            if (isset($baseProducts[$baseName])) {
                // Merge amounts and units
                $baseProducts[$baseName]['units_sold'] = 
                    (int)($baseProducts[$baseName]['units_sold'] ?? 0) + 
                    (int)($rentalsItem['units_sold'] ?? 0);
                $baseProducts[$baseName]['total_amount'] = 
                    (float)($baseProducts[$baseName]['total_amount'] ?? 0) + 
                    (float)($rentalsItem['total_amount'] ?? 0);
            }
            // If no base product exists, don't include rentals separately
            // (it would appear as "orphan" rental which shouldn't happen)
        }
        
        // Return only base products (sorted by total_amount desc)
        $result = array_values($baseProducts);
        usort($result, fn($a, $b) => ($b['total_amount'] ?? 0) <=> ($a['total_amount'] ?? 0));
        
        return $result;
    }

    private function isValidDate(string $date): bool
    {
        $d = \DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }
}
