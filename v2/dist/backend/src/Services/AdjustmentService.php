<?php
/**
 * Revenue Adjustment Service - CRUD for balance revenue adjustments
 */

declare(strict_types=1);

namespace App\Services;

use App\Db\SupabaseClient;

class AdjustmentService
{
    private SupabaseClient $db;

    public function __construct()
    {
        $this->db = new SupabaseClient();
    }

    public function create(array $data): array
    {
        $this->validate($data);
        
        $adjustment = [
            'year_month' => $data['yearMonth'],
            'name' => trim($data['name']),
            'amount' => (float)$data['amount'],
        ];
        
        $result = $this->db->insert('balance_revenue_adjustments', [$adjustment]);
        return $result[0] ?? $adjustment;
    }

    public function update(int $id, array $data): array
    {
        if ($id <= 0) {
            throw new \RuntimeException('Invalid ID', 400);
        }
        
        $this->validate($data);
        
        $adjustment = [
            'year_month' => $data['yearMonth'],
            'name' => trim($data['name']),
            'amount' => (float)$data['amount'],
            'updated_at' => date('c'),
        ];
        
        $result = $this->db->update('balance_revenue_adjustments', $adjustment, "id=eq.{$id}");
        if (empty($result)) {
            throw new \RuntimeException('Adjustment not found', 404);
        }
        return $result[0];
    }

    public function delete(int $id): void
    {
        if ($id <= 0) {
            throw new \RuntimeException('Invalid ID', 400);
        }
        $this->db->delete('balance_revenue_adjustments', "id=eq.{$id}");
    }

    private function validate(array $data): void
    {
        $yearMonth = $data['yearMonth'] ?? '';
        if (!preg_match('/^\d{4}-\d{2}$/', $yearMonth)) {
            throw new \RuntimeException('Invalid yearMonth format (YYYY-MM)', 400);
        }
        
        $name = trim($data['name'] ?? '');
        if ($name === '' || strlen($name) > 200) {
            throw new \RuntimeException('Name must be 1-200 characters', 400);
        }
    }
}
