<?php
/**
 * Settings Controller - Sort order, audit logs
 */

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Db\SupabaseClient;

class SettingsController
{
    private SupabaseClient $db;

    public function __construct()
    {
        $this->db = new SupabaseClient();
    }

    public function getSortOrder(Request $request): Response
    {
        try {
            $result = $this->db->select('app_settings', 'select=*&key=eq.sort_order');
            return Response::json(['data' => $result]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    public function saveSortOrder(Request $request): Response
    {
        $order = $request->body['order'] ?? [];
        
        if (!is_array($order) || count($order) > 2000) {
            return Response::error('Invalid order array', 'VALIDATION_ERROR', 400);
        }
        
        try {
            $this->db->insert('app_settings', [[
                'key' => 'sort_order',
                'value' => json_encode($order),
                'updated_at' => date('c'),
            ]], true, 'key');
            
            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    public function getAuditLogs(Request $request): Response
    {
        $limit = min((int)($request->query['limit'] ?? 50), 100);
        
        try {
            $logs = $this->db->select('audit_logs', "select=*&order=created_at.desc&limit={$limit}");
            return Response::json(['data' => $logs]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    public static function logAudit(string $eventType, string $description = '', ?array $details = null): void
    {
        try {
            $db = new SupabaseClient();
            $db->insert('audit_logs', [[
                'event_type' => $eventType,
                'description' => $description,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                'details' => $details ? json_encode($details) : null,
            ]]);
        } catch (\Throwable) {
            // Silently fail - audit logging should not break the app
        }
    }
}
