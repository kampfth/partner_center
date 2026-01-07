<?php
require 'auth.php'; // Adiciona Autenticação
checkAuth();
require 'ratelimit.php';
require 'validation.php';

require 'config.php';
require 'supabase.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$ip = getClientIpAddress();
if (!rateLimit("api:ip:$ip", 600, 60)) {
    jsonError('Too many requests', 429);
}
if (!rateLimit("api:sess:" . session_id(), 600, 60)) {
    jsonError('Too many requests', 429);
}

enforceSameOriginPost();

$action = $_GET['action'] ?? '';
$supabase = new Supabase(SUPABASE_URL, SUPABASE_KEY);

try {
    switch ($action) {
        // --- EXISTING ACTIONS ---
        case 'products':
            $resp = $supabase->select('products', '?select=*,product_groups(name,id)&order=product_name.asc');
            echo $resp['body'];
            break;

        case 'groups':
            $resp = $supabase->select('product_groups', '?order=name.asc');
            echo $resp['body'];
            break;

        case 'create_group':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            
            $groupName = requireString($data, 'name', 1, 100);
            $productIds = requireArray($data, 'productIds', 500);
            $productIds = array_values(array_filter($productIds, function($id) { return is_string($id) && isUuid($id); }));
            if (count($productIds) === 0) throw new Exception('No valid productIds');
            
            $gResp = $supabase->insert('product_groups', ['name' => $groupName], false, true);
            if ($gResp['code'] >= 400) throw new Exception('Failed to create group: ' . $gResp['body']);
            
            $group = json_decode($gResp['body'], true);
            $groupId = $group[0]['id'];
            
            $idsStr = '(' . implode(',', $productIds) . ')';
            $uResp = $supabase->update('products', ['group_id' => $groupId], "?product_id=in.$idsStr");
            
            echo json_encode(['success' => true, 'group' => $group[0]]);
            break;

        case 'update_product':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            $pid = requireUuid($data, 'product_id');
            
            $updates = [];
            if (isset($data['label'])) $updates['label'] = requireString($data, 'label', 1, 200);
            if (array_key_exists('group_id', $data)) $updates['group_id'] = optionalUuid($data, 'group_id');
            
            if (empty($updates)) throw new Exception('No updates provided');

            $resp = $supabase->update('products', $updates, "?product_id=eq.$pid");
            echo $resp['body'];
            break;
            
        case 'report':
            // Get date parameters with safe defaults
            $startRaw = isset($_GET['start']) ? trim($_GET['start']) : '';
            $endRaw = isset($_GET['end']) ? trim($_GET['end']) : '';
            
            // Default to current month if not provided
            if ($startRaw === '' || strlen($startRaw) < 10) {
                $start = date('Y-m-01');
            } else {
                $start = substr($startRaw, 0, 10);
            }
            
            if ($endRaw === '' || strlen($endRaw) < 10) {
                $end = date('Y-m-d');
            } else {
                $end = substr($endRaw, 0, 10);
            }
            
            // Basic format validation (YYYY-MM-DD)
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start)) {
                $start = date('Y-m-01');
            }
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
                $end = date('Y-m-d');
            }
            
            // Query daily_sales view
            $dailyResp = $supabase->select('daily_sales', "?date=gte.$start&date=lte.$end&order=date.asc");
            $dailyData = [];
            if ($dailyResp['code'] === 200 && !empty($dailyResp['body'])) {
                $decoded = json_decode($dailyResp['body'], true);
                if (is_array($decoded)) {
                    $dailyData = $decoded;
                }
            }
            
            // Query product summary RPC
            $summaryResp = $supabase->request('POST', 'rpc/get_product_summary', [
                'start_date' => $start,
                'end_date' => $end
            ]);
            $summaryData = [];
            if ($summaryResp['code'] === 200 && !empty($summaryResp['body'])) {
                $decoded = json_decode($summaryResp['body'], true);
                if (is_array($decoded)) {
                    $summaryData = $decoded;
                }
            }
            
            // Return combined response
            echo json_encode([
                'daily' => $dailyData,
                'summary' => $summaryData
            ]);
            break;
            
        case 'add_product':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            
            $newProduct = [
                'product_id' => requireUuid($data, 'productId'),
                'product_name' => requireString($data, 'productName', 1, 200),
                'lever' => requireString($data, 'lever', 1, 50),
                'label' => requireString($data, 'productName', 1, 200)
            ];
            
            $resp = $supabase->insert('products', [$newProduct], false, true);
            echo $resp['body'];
            break;

        // --- NEW SETTINGS ACTIONS ---

        case 'update_password':
            // Master password has been removed. Keep endpoint for backward compatibility.
            http_response_code(400);
            echo json_encode(['error' => 'Password login disabled']);
            break;

        case 'get_login_history':
            // Fetch last 50 logs
            $resp = $supabase->select('audit_logs', '?order=created_at.desc&limit=50');
            echo $resp['body'];
            break;

        case 'save_sort_order':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            $order = requireArray($data, 'order', 2000); // Array of product/group names
            
            // Upsert into app_settings
            $payload = ['key' => 'sort_order', 'value' => $order];
            $resp = $supabase->insert('app_settings', [$payload], true); // upsert
            echo $resp['body'];
            break;

        case 'get_sort_order':
            $resp = $supabase->select('app_settings', '?key=eq.sort_order');
            echo $resp['body'];
            break;

        case 'truncate_table':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            if (!rateLimit("api:danger:ip:$ip", 20, 60)) jsonError('Too many requests', 429);
            $data = requireJsonBody();
            $table = requireString($data, 'table', 1, 50);
            
            $allowed = ['transactions', 'products', 'product_groups', 'audit_logs'];
            if (!in_array($table, $allowed)) throw new Exception('Invalid table');
            
            // Supabase REST doesn't allow TRUNCATE usually without RLS bypass or RPC.
            // DELETE * is safer via REST.
            // ?id=neq.0 (delete all where id is not 0, practically all)
            // Or we can assume we have service role key which bypasses RLS.
            
            if ($table === 'transactions') {
                // Delete all transactions
                // To delete all, we need a condition that matches all. 
                // earning_id is text. earning_id=neq.impossible_string
                $supabase->request('DELETE', 'transactions?earning_id=neq.00000000-0000-0000-0000-000000000000');
            } elseif ($table === 'products') {
                 $supabase->request('DELETE', 'products?product_id=neq.00000000-0000-0000-0000-000000000000');
            } elseif ($table === 'product_groups') {
                 $supabase->request('DELETE', 'product_groups?id=neq.00000000-0000-0000-0000-000000000000');
            } elseif ($table === 'audit_logs') {
                 $supabase->request('DELETE', 'audit_logs?id=neq.00000000-0000-0000-0000-000000000000');
            }
            
            auditLog('DB_RESET', "Truncated table: $table");
            echo json_encode(['success' => true]);
            break;

        case 'reset_all':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            if (!rateLimit("api:danger:ip:$ip", 10, 60)) jsonError('Too many requests', 429);
            
            // Order matters for FK
            $supabase->request('DELETE', 'transactions?earning_id=neq.00000000-0000-0000-0000-000000000000');
            $supabase->request('DELETE', 'products?product_id=neq.00000000-0000-0000-0000-000000000000');
            $supabase->request('DELETE', 'product_groups?id=neq.00000000-0000-0000-0000-000000000000');
            // Keep audit logs maybe? Or delete too. Let's keep audit logs of the reset.
            
            auditLog('DB_RESET_ALL', "Performed Full System Reset");
            echo json_encode(['success' => true]);
            break;

        default:
            echo json_encode(['error' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    $msg = (defined('APP_ENV') && APP_ENV === 'production') ? 'Internal error' : $e->getMessage();
    echo json_encode(['error' => $msg]);
}

