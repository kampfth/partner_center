<?php
/**
 * Admin Controller - Danger zone operations
 */

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Db\SupabaseClient;
use App\Controllers\SettingsController;

class AdminController
{
    private SupabaseClient $db;

    public function __construct()
    {
        $this->db = new SupabaseClient();
    }

    public function truncate(Request $request): Response
    {
        $table = $request->body['table'] ?? '';
        $allowed = ['transactions', 'products', 'product_groups', 'audit_logs', 'all_products'];
        
        if (!in_array($table, $allowed, true)) {
            return Response::error('Invalid table', 'VALIDATION_ERROR', 400);
        }
        
        try {
            $pkColumn = match ($table) {
                'transactions' => 'earning_id',
                'products' => 'product_id',
                'all_products' => 'product_id',
                default => 'id',
            };
            
            $this->db->delete($table, "{$pkColumn}=neq.00000000-0000-0000-0000-000000000000");
            
            SettingsController::logAudit('DB_TRUNCATE', "Truncated table: {$table}");
            
            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    public function reset(Request $request): Response
    {
        try {
            // Delete in order to respect foreign keys
            $this->db->delete('transactions', 'earning_id=neq.00000000-0000-0000-0000-000000000000');
            $this->db->delete('products', 'product_id=neq.00000000-0000-0000-0000-000000000000');
            $this->db->delete('product_groups', 'id=neq.00000000-0000-0000-0000-000000000000');
            
            // Reset all_products tracking flags
            $this->db->update('all_products', ['is_tracked' => false], 'is_tracked=eq.true');
            
            SettingsController::logAudit('DB_RESET_ALL', 'Performed full system reset');
            
            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }
}
