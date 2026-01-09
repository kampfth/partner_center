<?php
/**
 * Initial Cash Service - CRUD for balance initial cash
 */

declare(strict_types=1);

namespace App\Services;

use App\Db\SupabaseClient;

class InitialCashService
{
    private SupabaseClient $db;

    public function __construct()
    {
        $this->db = new SupabaseClient();
    }

    public function getAll(): array
    {
        return $this->db->select('balance_initial_cash', 'select=*&order=year.desc');
    }

    public function set(array $data): array
    {
        $year = (int)($data['year'] ?? 0);
        if ($year < 2000 || $year > 2100) {
            throw new \RuntimeException('Invalid year', 400);
        }
        
        $payload = [
            'year' => $year,
            'amount' => (float)($data['amount'] ?? 0),
            'note' => isset($data['note']) ? trim($data['note']) : null,
            'updated_at' => date('c'),
        ];
        
        $this->db->insert('balance_initial_cash', [$payload], true, 'year');
        
        return ['success' => true, 'year' => $year, 'amount' => $payload['amount']];
    }

    public function delete(int $year): void
    {
        if ($year < 2000 || $year > 2100) {
            throw new \RuntimeException('Invalid year', 400);
        }
        $this->db->delete('balance_initial_cash', "year=eq.{$year}");
    }
}
