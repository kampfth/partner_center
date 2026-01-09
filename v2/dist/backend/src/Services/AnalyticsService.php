<?php
/**
 * Analytics Service - Sales aggregations by weekday, time, MSFS version
 */

declare(strict_types=1);

namespace App\Services;

use App\Db\SupabaseClient;

class AnalyticsService
{
    private SupabaseClient $db;
    
    private const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    // 2-hour intervals (12 buckets)
    private const TIME_BUCKETS = ['00-02', '02-04', '04-06', '06-08', '08-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20-22', '22-24'];

    // Cache for product lever lookup
    private array $productLeverCache = [];

    public function __construct()
    {
        $this->db = new SupabaseClient();
    }

    public function byWeekday(string $start, string $end): array
    {
        $transactions = $this->getTransactions($start, $end);
        
        $byDay = array_fill(0, 7, ['total_sales' => 0, 'units' => 0]);
        foreach ($transactions as $tx) {
            $dayOfWeek = (int)date('w', strtotime($tx['transaction_date']));
            $byDay[$dayOfWeek]['total_sales'] += (float)($tx['transaction_amount'] ?? 0);
            $byDay[$dayOfWeek]['units']++;
        }
        
        $result = [];
        for ($i = 0; $i < 7; $i++) {
            if ($byDay[$i]['units'] > 0) {
                $result[] = [
                    'day_of_week' => $i,
                    'day_name' => self::DAY_NAMES[$i],
                    'total_sales' => $byDay[$i]['total_sales'],
                    'units' => $byDay[$i]['units'],
                ];
            }
        }
        
        return $result;
    }

    public function byTimeBucket(string $start, string $end): array
    {
        $transactions = $this->getTransactions($start, $end);
        
        // 12 buckets for 2-hour intervals
        $byBucket = array_fill(0, 12, ['total_sales' => 0, 'units' => 0]);
        foreach ($transactions as $tx) {
            // Note: transaction_date may not have time component, default to 0
            $hour = 0;
            if (strlen($tx['transaction_date'] ?? '') > 10) {
                $hour = (int)date('H', strtotime($tx['transaction_date']));
            }
            // 2-hour intervals: 0-1 -> bucket 0, 2-3 -> bucket 1, etc.
            $bucketNum = (int)floor($hour / 2);
            $byBucket[$bucketNum]['total_sales'] += (float)($tx['transaction_amount'] ?? 0);
            $byBucket[$bucketNum]['units']++;
        }
        
        $result = [];
        // Always return all 12 buckets for consistent chart display
        for ($i = 0; $i < 12; $i++) {
            $result[] = [
                'time_bucket' => self::TIME_BUCKETS[$i],
                'total_sales' => $byBucket[$i]['total_sales'],
                'units' => $byBucket[$i]['units'],
            ];
        }
        
        return $result;
    }

    public function byMsfsVersion(string $start, string $end): array
    {
        $transactions = $this->getTransactionsWithProductId($start, $end);
        
        // Load product lever cache
        $this->loadProductLeverCache();
        
        $byVersion = [];
        foreach ($transactions as $tx) {
            // Get lever from all_products table via cache
            $productId = $tx['product_id'] ?? '';
            $lever = $this->productLeverCache[$productId] ?? '';
            
            // Detect version from lever
            $version = $this->detectVersionFromLever($lever);
            
            if (!isset($byVersion[$version])) {
                $byVersion[$version] = ['total_sales' => 0, 'units' => 0];
            }
            $byVersion[$version]['total_sales'] += (float)($tx['transaction_amount'] ?? 0);
            $byVersion[$version]['units']++;
        }
        
        $result = [];
        foreach ($byVersion as $version => $data) {
            $result[] = [
                'version' => $version,
                'total_sales' => $data['total_sales'],
                'units' => $data['units'],
            ];
        }
        
        usort($result, fn($a, $b) => $b['total_sales'] <=> $a['total_sales']);
        return $result;
    }

    private function getTransactions(string $start, string $end): array
    {
        $nextDay = date('Y-m-d', strtotime($end . ' +1 day'));
        return $this->db->select('transactions',
            "select=transaction_date,transaction_amount&transaction_date=gte.{$start}&transaction_date=lt.{$nextDay}");
    }

    private function getTransactionsWithProductId(string $start, string $end): array
    {
        $nextDay = date('Y-m-d', strtotime($end . ' +1 day'));
        return $this->db->select('transactions',
            "select=product_id,transaction_date,transaction_amount&transaction_date=gte.{$start}&transaction_date=lt.{$nextDay}");
    }

    /**
     * Load product lever cache from all_products table
     */
    private function loadProductLeverCache(): void
    {
        if (!empty($this->productLeverCache)) {
            return;
        }
        
        $products = $this->db->select('all_products', 'select=product_id,lever');
        foreach ($products as $p) {
            $this->productLeverCache[$p['product_id']] = $p['lever'] ?? '';
        }
    }

    /**
     * Detect MSFS version from lever column
     * - "Microsoft Flight Simulator" = 2020
     * - "Microsoft Flight Simulator 2024" = 2024
     */
    private function detectVersionFromLever(string $lever): string
    {
        if ($lever === 'Microsoft Flight Simulator 2024') {
            return '2024';
        }
        if ($lever === 'Microsoft Flight Simulator') {
            return '2020';
        }
        // Fallback pattern matching
        if (stripos($lever, '2024') !== false) {
            return '2024';
        }
        if (stripos($lever, 'Microsoft Flight Simulator') !== false) {
            return '2020';
        }
        return 'Unknown';
    }
}
