<?php
/**
 * Withdrawal Service - CRUD for balance withdrawals
 */

declare(strict_types=1);

namespace App\Services;

use App\Db\SupabaseClient;

class WithdrawalService
{
    private SupabaseClient $db;

    public function __construct()
    {
        $this->db = new SupabaseClient();
    }

    public function create(array $data): array
    {
        $yearMonth = $this->validateYearMonth($data['yearMonth'] ?? '');
        $amount = $this->validateAmount($data['amount'] ?? 0);
        $note = isset($data['note']) ? trim($data['note']) : null;
        
        // Get partners to create withdrawal for each
        $partners = $this->db->select('partners', 'select=id&order=id.asc');
        if (empty($partners)) {
            throw new \RuntimeException('No partners found', 400);
        }
        
        $withdrawals = array_map(fn($p) => [
            'year_month' => $yearMonth,
            'partner_id' => $p['id'],
            'amount' => $amount,
            'note' => $note,
        ], $partners);
        
        return $this->db->insert('balance_withdrawals', $withdrawals);
    }

    public function update(int $id, array $data): array
    {
        if ($id <= 0) {
            throw new \RuntimeException('Invalid ID', 400);
        }
        
        $yearMonth = $this->validateYearMonth($data['yearMonth'] ?? '');
        $amount = $this->validateAmount($data['amount'] ?? 0);
        $note = isset($data['note']) ? trim($data['note']) : null;
        
        // Get current withdrawal to find its year_month
        $current = $this->db->select('balance_withdrawals', "select=year_month&id=eq.{$id}&limit=1");
        if (empty($current)) {
            throw new \RuntimeException('Withdrawal not found', 404);
        }
        
        $currentMonth = $current[0]['year_month'];
        
        // Update ALL withdrawals for that month (both partners)
        $this->db->update('balance_withdrawals', [
            'year_month' => $yearMonth,
            'amount' => $amount,
            'note' => $note,
            'updated_at' => date('c'),
        ], "year_month=eq.{$currentMonth}");
        
        return ['success' => true];
    }

    public function delete(int $id): void
    {
        if ($id <= 0) {
            throw new \RuntimeException('Invalid ID', 400);
        }
        
        // Get withdrawal to find its year_month
        $current = $this->db->select('balance_withdrawals', "select=year_month&id=eq.{$id}&limit=1");
        if (empty($current)) {
            throw new \RuntimeException('Withdrawal not found', 404);
        }
        
        $yearMonth = $current[0]['year_month'];
        
        // Delete ALL withdrawals for that month (both partners)
        $this->db->delete('balance_withdrawals', "year_month=eq.{$yearMonth}");
    }

    private function validateYearMonth(string $value): string
    {
        if (!preg_match('/^\d{4}-\d{2}$/', $value)) {
            throw new \RuntimeException('Invalid yearMonth format (YYYY-MM)', 400);
        }
        return $value;
    }

    private function validateAmount($value): float
    {
        $amount = (float)$value;
        if ($amount <= 0) {
            throw new \RuntimeException('Amount must be positive', 400);
        }
        return $amount;
    }
}
