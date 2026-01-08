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
    private const TIME_BUCKETS = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'];

    public function __construct()
    {
        $this->db = new SupabaseClient();
    }

    public function byWeekday(string $start, string $end): array
    {
        $transactions = $this->getTransactions($start, $end);
        
        $byDay = array_fill(0, 7, ['total_sales' => 0, 'units' => 0]);
        foreach ($transactions as $tx) {
            $dayOfWeek = (int)date('w', strtotime($tx['purchase_date']));
            $byDay[$dayOfWeek]['total_sales'] += (float)($tx['amount_usd'] ?? 0);
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
        
        $byBucket = array_fill(0, 6, ['total_sales' => 0, 'units' => 0]);
        foreach ($transactions as $tx) {
            // Note: purchase_date may not have time component, default to 0
            $hour = 0;
            if (strlen($tx['purchase_date'] ?? '') > 10) {
                $hour = (int)date('H', strtotime($tx['purchase_date']));
            }
            $bucketNum = (int)floor($hour / 4);
            $byBucket[$bucketNum]['total_sales'] += (float)($tx['amount_usd'] ?? 0);
            $byBucket[$bucketNum]['units']++;
        }
        
        $result = [];
        for ($i = 0; $i < 6; $i++) {
            if ($byBucket[$i]['units'] > 0) {
                $result[] = [
                    'time_bucket' => self::TIME_BUCKETS[$i],
                    'total_sales' => $byBucket[$i]['total_sales'],
                    'units' => $byBucket[$i]['units'],
                ];
            }
        }
        
        return $result;
    }

    public function byMsfsVersion(string $start, string $end): array
    {
        $transactions = $this->getTransactions($start, $end);
        
        $byVersion = [];
        foreach ($transactions as $tx) {
            $version = $this->detectVersion($tx['msfs_version'] ?? '', $tx['lever'] ?? '');
            
            if (!isset($byVersion[$version])) {
                $byVersion[$version] = ['total_sales' => 0, 'units' => 0];
            }
            $byVersion[$version]['total_sales'] += (float)($tx['amount_usd'] ?? 0);
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
            "select=purchase_date,amount_usd,msfs_version,lever&purchase_date=gte.{$start}&purchase_date=lt.{$nextDay}");
    }

    private function detectVersion(string $msfsVersion, string $lever): string
    {
        if (stripos($msfsVersion, 'MSFS2024') !== false || stripos($lever, '2024') !== false) {
            return 'MSFS2024';
        }
        if (stripos($msfsVersion, 'MSFS2020') !== false || stripos($lever, 'Microsoft Flight Simulator') !== false) {
            return 'MSFS2020';
        }
        return 'Unknown';
    }
}
