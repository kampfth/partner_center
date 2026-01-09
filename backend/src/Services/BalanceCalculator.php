<?php
/**
 * Balance Calculator - Helper for balance computations
 */

declare(strict_types=1);

namespace App\Services;

class BalanceCalculator
{
    public function computeMonthlyTotals(
        array $months,
        array $revenue,
        array $adjustments,
        array $expenses,
        array $withdrawals,
        array $partners,
        float $initialCash
    ): array {
        $revenueSubtotal = [];
        $revenueIndividual = [];
        $expensesTotal = [];
        $withdrawalsTotal = [];
        $net = [];
        $expensesPct = [];
        $totalRevenue = [];
        
        foreach ($partners as $p) {
            $revenueIndividual[$p['id']] = [];
        }
        
        foreach ($months as $idx => $month) {
            $autoRev = $revenue[$month] ?? 0;
            $adjTotal = $this->sumByMonth($adjustments, $month);
            $revenueSubtotal[$month] = $autoRev + $adjTotal;
            
            foreach ($partners as $p) {
                $share = (float)($p['share'] ?? 0.5);
                $revenueIndividual[$p['id']][$month] = $revenueSubtotal[$month] * $share;
            }
            
            $expensesTotal[$month] = $this->sumByMonth($expenses, $month);
            $withdrawalsTotal[$month] = $this->sumByMonth($withdrawals, $month);
            $net[$month] = $revenueSubtotal[$month] - $expensesTotal[$month] - $withdrawalsTotal[$month];
            
            $rev = $revenueSubtotal[$month];
            $totalExp = $expensesTotal[$month] + $withdrawalsTotal[$month];
            $expensesPct[$month] = $rev > 0 ? ($totalExp / $rev) * 100 : 0;
            
            $totalRevenue[$month] = ($idx === 0 ? $initialCash : 0) + $revenueSubtotal[$month];
        }
        
        $availableCapital = $this->calculateAvailableCapital($months, $revenueIndividual, $withdrawals, $partners);
        
        $yearTotalRevenue = array_sum($revenueSubtotal) + $initialCash;
        $yearTotalExpenses = array_sum($expensesTotal);
        $yearTotalWithdrawals = array_sum($withdrawalsTotal);
        
        return [
            'revenueSubtotalByMonth' => $revenueSubtotal,
            'revenueIndividualByMonth' => $revenueIndividual,
            'expensesTotalByMonth' => $expensesTotal,
            'withdrawalsTotalByMonth' => $withdrawalsTotal,
            'expensesPercentageByMonth' => $expensesPct,
            'totalRevenueByMonth' => $totalRevenue,
            'netByMonth' => $net,
            'availableCapitalByPartner' => $availableCapital,
            'yearTotals' => [
                'totalRevenue' => $yearTotalRevenue,
                'totalExpenses' => $yearTotalExpenses,
                'totalWithdrawals' => $yearTotalWithdrawals,
                'net' => $yearTotalRevenue - $yearTotalExpenses - $yearTotalWithdrawals
            ]
        ];
    }

    private function calculateAvailableCapital(
        array $months,
        array $revenueByPartner,
        array $withdrawals,
        array $partners
    ): array {
        $result = [];
        foreach ($partners as $p) {
            $result[$p['id']] = [];
            $accumulated = 0;
            
            foreach ($months as $month) {
                $accumulated += $revenueByPartner[$p['id']][$month] ?? 0;
                
                $accWithdrawals = 0;
                foreach ($withdrawals as $w) {
                    if (($w['partner_id'] ?? '') === $p['id'] && ($w['year_month'] ?? '') <= $month) {
                        $accWithdrawals += (float)($w['amount'] ?? 0);
                    }
                }
                
                $result[$p['id']][$month] = $accumulated - $accWithdrawals;
            }
        }
        return $result;
    }

    public function sumByMonth(array $records, string $month): float
    {
        $total = 0;
        foreach ($records as $r) {
            if (($r['year_month'] ?? '') === $month) {
                $total += (float)($r['amount'] ?? 0);
            }
        }
        return $total;
    }

    public function generateMonths(int $year): array
    {
        $months = [];
        for ($m = 1; $m <= 12; $m++) {
            $months[] = sprintf('%d-%02d', $year, $m);
        }
        return $months;
    }

    public function getMonthRange(int $year, int $month): array
    {
        $start = sprintf('%d-%02d-01', $year, $month);
        $lastDay = (int)date('t', strtotime($start));
        $end = sprintf('%d-%02d-%02d', $year, $month, $lastDay);
        return [$start, $end];
    }
}
