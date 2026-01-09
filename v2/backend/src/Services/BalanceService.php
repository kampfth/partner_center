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
        
        // Get monthly revenue from transactions
        [$autoRevenueByMonth, $autoRevenueByLine] = $this->getMonthlyRevenue($year, $months);
        
        // Fetch all balance data for the year
        $adjustments = $this->getAdjustments($year);
        $allExpenses = $this->getExpenses($year);
        $withdrawals = $this->getWithdrawals($year);
        
        $fixedExpenses = array_values(array_filter($allExpenses, fn($e) => $e['category'] === 'fixed'));
        $variableExpenses = array_values(array_filter($allExpenses, fn($e) => $e['category'] === 'variable'));
        
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
        
        for ($m = 1; $m <= 12; $m++) {
            [$start, $end] = $this->calc->getMonthRange($year, $m);
            $monthKey = sprintf('%d-%02d', $year, $m);
            
            $summary = $this->getProductSummary($start, $end);
            $monthTotal = 0;
            
            foreach ($summary as $item) {
                $name = $item['display_name'] ?? 'Unknown';
                $amount = (float)($item['total_amount'] ?? 0);
                $monthTotal += $amount;
                
                if (!isset($autoRevenueByLine[$name])) {
                    $autoRevenueByLine[$name] = [
                        'key' => $name,
                        'type' => $item['type'] ?? 'Product',
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

    public function getAvailableYears(): array
    {
        $min = $this->db->select('transactions', 'select=purchase_date&order=purchase_date.asc&limit=1');
        $max = $this->db->select('transactions', 'select=purchase_date&order=purchase_date.desc&limit=1');
        
        $minYear = isset($min[0]['purchase_date']) ? (int)substr($min[0]['purchase_date'], 0, 4) : null;
        $maxYear = isset($max[0]['purchase_date']) ? (int)substr($max[0]['purchase_date'], 0, 4) : null;
        
        if (!$minYear || !$maxYear || $minYear > $maxYear) {
            return [];
        }
        
        return range($minYear, $maxYear);
    }

    public function getInitialCashAmount(int $year): float
    {
        $result = $this->db->select('balance_initial_cash', "select=amount&year=eq.{$year}&limit=1");
        return (float)($result[0]['amount'] ?? 0);
    }

    public function getPartners(): array
    {
        return $this->db->select('partners', 'select=*&order=id.asc');
    }

    private function getProductSummary(string $start, string $end): array
    {
        try {
            return $this->db->rpc('get_product_summary', ['start_date' => $start, 'end_date' => $end]);
        } catch (\Throwable) {
            return [];
        }
    }

    private function getAdjustments(int $year): array
    {
        return $this->db->select('balance_revenue_adjustments',
            "select=*&year_month=gte.{$year}-01&year_month=lte.{$year}-12&order=year_month.asc");
    }

    private function getExpenses(int $year): array
    {
        return $this->db->select('balance_expenses',
            "select=*&year_month=gte.{$year}-01&year_month=lte.{$year}-12&order=year_month.asc");
    }

    private function getWithdrawals(int $year): array
    {
        return $this->db->select('balance_withdrawals',
            "select=*&year_month=gte.{$year}-01&year_month=lte.{$year}-12&order=year_month.asc");
    }
}
