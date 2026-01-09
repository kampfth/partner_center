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
            return $this->db->rpc('get_product_summary', [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);
        } catch (\Throwable $e) {
            // If RPC doesn't exist, return empty summary
            if (str_contains($e->getMessage(), 'function') || str_contains($e->getMessage(), '404')) {
                return [];
            }
            throw $e;
        }
    }

    private function isValidDate(string $date): bool
    {
        $d = \DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }
}
