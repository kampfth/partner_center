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

    /**
     * Truncate a specific table
     */
    public function truncate(Request $request): Response
    {
        $table = $request->body['table'] ?? '';
        $allowed = ['transactions', 'products', 'product_groups', 'audit_logs', 'all_products', 'imports'];
        
        if (!in_array($table, $allowed, true)) {
            return Response::error('Invalid table', 'VALIDATION_ERROR', 400);
        }
        
        try {
            // Delete all rows using a filter that matches everything
            $pkColumn = match ($table) {
                'transactions' => 'earning_id',
                'products' => 'product_id',
                'all_products' => 'product_id',
                default => 'id',
            };
            
            // Use "not is null" to match all rows that have a primary key (i.e., all rows)
            $this->db->delete($table, "{$pkColumn}=not.is.null");
            
            SettingsController::logAudit('DB_TRUNCATE', "Truncated table: {$table}");
            
            return Response::json(['success' => true, 'table' => $table]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    /**
     * Truncate transactions from a specific date onwards
     */
    public function truncateByDate(Request $request): Response
    {
        $fromDate = $request->body['from_date'] ?? '';
        
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate)) {
            return Response::error('Invalid date format. Use YYYY-MM-DD', 'VALIDATION_ERROR', 400);
        }
        
        try {
            $this->db->delete('transactions', "transaction_date=gte.{$fromDate}");
            
            SettingsController::logAudit('DB_TRUNCATE_BY_DATE', "Deleted transactions from: {$fromDate}");
            
            return Response::json(['success' => true, 'from_date' => $fromDate]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    /**
     * Full database reset - deletes ALL data
     */
    public function reset(Request $request): Response
    {
        try {
            // Delete in order to respect foreign keys
            // 1. First delete transactions (depends on products)
            $this->db->delete('transactions', 'earning_id=not.is.null');
            
            // 2. Delete tracked products (depends on product_groups)
            $this->db->delete('products', 'product_id=not.is.null');
            
            // 3. Delete product groups
            $this->db->delete('product_groups', 'id=not.is.null');
            
            // 4. Delete ALL products from discovery table
            $this->db->delete('all_products', 'product_id=not.is.null');
            
            // 5. Delete import history
            $this->db->delete('imports', 'id=not.is.null');
            
            // 6. Delete balance data
            $this->db->delete('balance_expenses', 'id=not.is.null');
            $this->db->delete('balance_withdrawals', 'id=not.is.null');
            $this->db->delete('balance_revenue_adjustments', 'id=not.is.null');
            $this->db->delete('balance_initial_cash', 'id=not.is.null');
            
            SettingsController::logAudit('DB_RESET_ALL', 'Performed full system reset - all data deleted');
            
            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }
}
