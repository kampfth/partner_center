<?php
/**
 * Expense Service - CRUD for balance expenses
 */

declare(strict_types=1);

namespace App\Services;

use App\Db\SupabaseClient;

class ExpenseService
{
    private SupabaseClient $db;

    public function __construct()
    {
        $this->db = new SupabaseClient();
    }

    public function create(array $data): array
    {
        $this->validateExpense($data);
        
        $expense = [
            'year_month' => $data['yearMonth'],
            'category' => $data['category'],
            'name' => $data['name'],
            'amount' => (float)$data['amount'],
        ];
        
        $result = $this->db->insert('balance_expenses', [$expense]);
        return $result[0] ?? $expense;
    }

    public function update(int $id, array $data): array
    {
        if ($id <= 0) {
            throw new \RuntimeException('Invalid ID', 400);
        }
        
        $this->validateExpense($data);
        
        $expense = [
            'year_month' => $data['yearMonth'],
            'category' => $data['category'],
            'name' => $data['name'],
            'amount' => (float)$data['amount'],
            'updated_at' => date('c'),
        ];
        
        $result = $this->db->update('balance_expenses', $expense, "id=eq.{$id}");
        if (empty($result)) {
            throw new \RuntimeException('Expense not found', 404);
        }
        return $result[0];
    }

    public function delete(int $id): void
    {
        if ($id <= 0) {
            throw new \RuntimeException('Invalid ID', 400);
        }
        $this->db->delete('balance_expenses', "id=eq.{$id}");
    }

    private function validateExpense(array $data): void
    {
        $yearMonth = $data['yearMonth'] ?? '';
        if (!preg_match('/^\d{4}-\d{2}$/', $yearMonth)) {
            throw new \RuntimeException('Invalid yearMonth format (YYYY-MM)', 400);
        }
        
        $category = $data['category'] ?? '';
        if (!in_array($category, ['fixed', 'variable'], true)) {
            throw new \RuntimeException('Category must be "fixed" or "variable"', 400);
        }
        
        $name = trim($data['name'] ?? '');
        if ($name === '' || strlen($name) > 200) {
            throw new \RuntimeException('Name must be 1-200 characters', 400);
        }
        
        $amount = (float)($data['amount'] ?? 0);
        if ($amount <= 0) {
            throw new \RuntimeException('Amount must be positive', 400);
        }
    }
}
