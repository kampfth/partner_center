<?php
/**
 * Balance Service - Business logic for balance data retrieval
 */

declare(strict_types=1);

namespace App\Services;

use App\Db\SupabaseClient;

class BalanceService
{
    private SupabaseClient $db;
    private BalanceCalculator $calc;
    
    // Cache for product info
    private array $productCache = [];

    public function __construct()
    {
        $this->db = new SupabaseClient();
        $this->calc = new BalanceCalculator();
    }

    public function getBalance(int $year): array
    {
        $months = $this->calc->generateMonths($year);
        $initialCash = $this->getInitialCashAmount($year);
        $partners = $this->getPartners();
        
        // Get monthly revenue from transactions (direct query, no RPC dependency)
        [$autoRevenueByMonth, $autoRevenueByLine] = $this->getMonthlyRevenue($year, $months);
        
        // Fetch all balance data for the year
        $adjustments = $this->getAdjustments($year);
        $allExpenses = $this->getExpenses($year);
        $withdrawals = $this->getWithdrawals($year);
        
        $fixedExpenses = array_values(array_filter($allExpenses, fn($e) => ($e['category'] ?? '') === 'fixed'));
        $variableExpenses = array_values(array_filter($allExpenses, fn($e) => ($e['category'] ?? '') === 'variable'));
        
        // Compute monthly totals
        $computed = $this->calc->computeMonthlyTotals(
            $months, $autoRevenueByMonth, $adjustments, $allExpenses,
            $withdrawals, $partners, $initialCash
        );
        
        return [
            'year' => $year,
            'initialCash' => $initialCash,
            'partners' => $partners,
            'months' => $months,
            'autoRevenue' => [
                'byMonth' => $autoRevenueByMonth,
                'byLine' => array_values($autoRevenueByLine)
            ],
            'manualRevenueAdjustments' => $adjustments,
            'expenses' => $allExpenses,
            'fixedExpenses' => $fixedExpenses,
            'variableExpenses' => $variableExpenses,
            'withdrawals' => $withdrawals,
            'computed' => $computed
        ];
    }

    private function getMonthlyRevenue(int $year, array $months): array
    {
        $autoRevenueByMonth = [];
        $autoRevenueByLine = [];
        
        // Load product cache
        $this->loadProductCache();
        
        // Load tracked products (products in v2.products table)
        $trackedProducts = $this->getTrackedProducts();
        
        // Get all transactions for the year with product grouping
        $startDate = "{$year}-01-01";
        $endDate = "{$year}-12-31";
        $nextDay = ($year + 1) . "-01-01";
        
        // Get transactions for tracked products only
        $transactions = $this->db->select('transactions', 
            "select=product_id,transaction_date,transaction_amount,units&transaction_date=gte.{$startDate}&transaction_date=lt.{$nextDay}");
        
        // Group transactions by month and product
        $byMonthAndProduct = [];
        foreach ($transactions as $tx) {
            $productId = $tx['product_id'] ?? '';
            
            // Only include tracked products
            if (!isset($trackedProducts[$productId])) {
                continue;
            }
            
            $date = substr($tx['transaction_date'] ?? '', 0, 10);
            $monthKey = substr($date, 0, 7); // YYYY-MM
            $amount = (float)($tx['transaction_amount'] ?? 0);
            $units = (int)($tx['units'] ?? 1);
            
            if (!isset($byMonthAndProduct[$monthKey])) {
                $byMonthAndProduct[$monthKey] = [];
            }
            if (!isset($byMonthAndProduct[$monthKey][$productId])) {
                $byMonthAndProduct[$monthKey][$productId] = ['amount' => 0, 'units' => 0];
            }
            
            $byMonthAndProduct[$monthKey][$productId]['amount'] += $amount;
            $byMonthAndProduct[$monthKey][$productId]['units'] += $units;
        }
        
        // Process by month with Rentals merging
        foreach ($months as $monthKey) {
            $monthProducts = $byMonthAndProduct[$monthKey] ?? [];
            $monthTotal = 0;
            
            // Apply Rentals merging
            $mergedProducts = $this->mergeRentals($monthProducts);
            
            foreach ($mergedProducts as $productId => $data) {
                $productInfo = $trackedProducts[$productId] ?? $this->productCache[$productId] ?? null;
                $name = $productInfo['label'] ?? $productInfo['product_name'] ?? 'Unknown';
                $type = isset($productInfo['group_id']) && $productInfo['group_id'] ? 'Group' : 'Product';
                
                // Check if this is a group
                if ($type === 'Group' && isset($productInfo['group_name'])) {
                    $name = $productInfo['group_name'];
                }
                
                $amount = $data['amount'];
                $monthTotal += $amount;
                
                if (!isset($autoRevenueByLine[$name])) {
                    $autoRevenueByLine[$name] = [
                        'key' => $name,
                        'type' => $type,
                        'byMonth' => [],
                        'yearTotal' => 0
                    ];
                }
                $autoRevenueByLine[$name]['byMonth'][$monthKey] =
                    ($autoRevenueByLine[$name]['byMonth'][$monthKey] ?? 0) + $amount;
                $autoRevenueByLine[$name]['yearTotal'] += $amount;
            }
            
            $autoRevenueByMonth[$monthKey] = $monthTotal;
        }
        
        return [$autoRevenueByMonth, $autoRevenueByLine];
    }

    /**
     * Load product info from all_products table
     */
    private function loadProductCache(): void
    {
        if (!empty($this->productCache)) {
            return;
        }
        
        $products = $this->db->select('all_products', 'select=product_id,product_name,lever');
        foreach ($products as $p) {
            $this->productCache[$p['product_id']] = $p;
        }
    }

    /**
     * Get tracked products from v2.products with group info
     */
    private function getTrackedProducts(): array
    {
        $products = $this->db->select('products', 'select=product_id,product_name,label,group_id');
        $groups = $this->db->select('product_groups', 'select=id,name');
        
        // Index groups by id
        $groupsById = [];
        foreach ($groups as $g) {
            $groupsById[$g['id']] = $g;
        }
        
        $result = [];
        foreach ($products as $p) {
            $p['group_name'] = isset($p['group_id']) && isset($groupsById[$p['group_id']]) 
                ? $groupsById[$p['group_id']]['name'] 
                : null;
            $result[$p['product_id']] = $p;
        }
        
        return $result;
    }

    /**
     * Merge Rentals products into their base products
     * Rentals are MSFS 2024 exclusive feature
     */
    private function mergeRentals(array $monthProducts): array
    {
        $rentalsToMerge = [];
        
        // Find Rentals products and their base products
        foreach ($monthProducts as $productId => $data) {
            $productInfo = $this->productCache[$productId] ?? null;
            if (!$productInfo) continue;
            
            $name = $productInfo['product_name'] ?? '';
            $lever = $productInfo['lever'] ?? '';
            
            // Only process MSFS 2024 Rentals
            if (!str_ends_with($name, ' Rentals') || $lever !== 'Microsoft Flight Simulator 2024') {
                continue;
            }
            
            // Find base product
            $baseName = substr($name, 0, -8); // Remove " Rentals"
            $baseProductId = null;
            
            foreach ($this->productCache as $pid => $pinfo) {
                if (($pinfo['product_name'] ?? '') === $baseName && 
                    ($pinfo['lever'] ?? '') === 'Microsoft Flight Simulator 2024') {
                    $baseProductId = $pid;
                    break;
                }
            }
            
            if ($baseProductId && isset($monthProducts[$baseProductId])) {
                $rentalsToMerge[$productId] = $baseProductId;
            }
        }
        
        // Merge rentals into base products
        foreach ($rentalsToMerge as $rentalsId => $baseId) {
            $monthProducts[$baseId]['amount'] += $monthProducts[$rentalsId]['amount'];
            $monthProducts[$baseId]['units'] += $monthProducts[$rentalsId]['units'];
            unset($monthProducts[$rentalsId]);
        }
        
        return $monthProducts;
    }

    public function getAvailableYears(): array
    {
        // Use standard column name matching CSV format
        $min = $this->db->select('transactions', 'select=transaction_date&order=transaction_date.asc&limit=1');
        $max = $this->db->select('transactions', 'select=transaction_date&order=transaction_date.desc&limit=1');
        
        $minYear = isset($min[0]['transaction_date']) ? (int)substr($min[0]['transaction_date'], 0, 4) : null;
        $maxYear = isset($max[0]['transaction_date']) ? (int)substr($max[0]['transaction_date'], 0, 4) : null;
        
        if (!$minYear || !$maxYear || $minYear > $maxYear) {
            return [];
        }
        
        return range($minYear, $maxYear);
    }

    public function getInitialCashAmount(int $year): float
    {
        try {
            $result = $this->db->select('balance_initial_cash', "select=amount&year=eq.{$year}&limit=1");
            return (float)($result[0]['amount'] ?? 0);
        } catch (\Throwable) {
            return 0;
        }
    }

    public function getPartners(): array
    {
        try {
            return $this->db->select('partners', 'select=*&order=id.asc');
        } catch (\Throwable) {
            return [];
        }
    }

    private function getAdjustments(int $year): array
    {
        try {
            return $this->db->select('balance_revenue_adjustments',
                "select=*&year_month=gte.{$year}-01&year_month=lte.{$year}-12&order=year_month.asc");
        } catch (\Throwable) {
            return [];
        }
    }

    private function getExpenses(int $year): array
    {
        try {
            return $this->db->select('balance_expenses',
                "select=*&year_month=gte.{$year}-01&year_month=lte.{$year}-12&order=year_month.asc");
        } catch (\Throwable) {
            return [];
        }
    }

    private function getWithdrawals(int $year): array
    {
        try {
            return $this->db->select('balance_withdrawals',
                "select=*&year_month=gte.{$year}-01&year_month=lte.{$year}-12&order=year_month.asc");
        } catch (\Throwable) {
            return [];
        }
    }
}
