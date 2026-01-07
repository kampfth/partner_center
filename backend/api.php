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
        // --- DATE RANGE ---
        case 'date_range':
            // Get min and max dates from daily_sales view
            $minResp = $supabase->select('daily_sales', '?select=date&order=date.asc&limit=1');
            $maxResp = $supabase->select('daily_sales', '?select=date&order=date.desc&limit=1');
            
            $minDate = null;
            $maxDate = null;
            
            if ($minResp['code'] === 200 && !empty($minResp['body'])) {
                $decoded = json_decode($minResp['body'], true);
                if (is_array($decoded) && count($decoded) > 0) {
                    $minDate = $decoded[0]['date'];
                }
            }
            
            if ($maxResp['code'] === 200 && !empty($maxResp['body'])) {
                $decoded = json_decode($maxResp['body'], true);
                if (is_array($decoded) && count($decoded) > 0) {
                    $maxDate = $decoded[0]['date'];
                }
            }
            
            echo json_encode([
                'min_date' => $minDate,
                'max_date' => $maxDate
            ]);
            break;

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

        case 'available_products':
            // Get distinct products from transactions that are NOT in the products table
            // This requires an RPC or a more complex query
            // For now, let's get distinct product_id, product_name from transactions
            $resp = $supabase->request('POST', 'rpc/get_available_products', []);
            if ($resp['code'] === 200) {
                echo $resp['body'];
            } else {
                // Fallback: return empty if RPC doesn't exist
                echo json_encode([]);
            }
            break;

        case 'remove_product':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            $pid = requireUuid($data, 'product_id');
            
            $resp = $supabase->request('DELETE', "products?product_id=eq.$pid");
            echo json_encode(['success' => true]);
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

        // --- BALANCE ACTIONS ---
        
        case 'balance':
            $year = isset($_GET['year']) ? trim($_GET['year']) : date('Y');
            if (!preg_match('/^\d{4}$/', $year)) $year = date('Y');
            
            // Get initial cash from balance_initial_cash table (manually defined)
            $initialCash = 0;
            $initialCashResp = $supabase->select('balance_initial_cash', "?year=eq.$year");
            if ($initialCashResp['code'] === 200 && !empty($initialCashResp['body'])) {
                $decoded = json_decode($initialCashResp['body'], true);
                if (is_array($decoded) && count($decoded) > 0) {
                    $initialCash = floatval($decoded[0]['amount'] ?? 0);
                }
            }
            
            // Get partners
            $partnersResp = $supabase->select('partners', '?order=id.asc');
            $partners = [];
            if ($partnersResp['code'] === 200 && !empty($partnersResp['body'])) {
                $decoded = json_decode($partnersResp['body'], true);
                if (is_array($decoded)) {
                    $partners = $decoded;
                }
            }
            
            // Generate months list
            $months = [];
            for ($m = 1; $m <= 12; $m++) {
                $months[] = sprintf('%s-%02d', $year, $m);
            }
            
            // Get revenue using the SAME RPC as Reports (get_product_summary) for each month
            // This ensures Balance values match Reports exactly
            $autoRevenueByMonth = [];
            $autoRevenueByLine = []; // display_name -> { key, type, byMonth, yearTotal }
            
            for ($m = 1; $m <= 12; $m++) {
                $monthStart = sprintf('%s-%02d-01', $year, $m);
                $lastDay = date('t', strtotime($monthStart . ' 00:00:00'));
                $monthEnd = sprintf('%s-%02d-%02d', $year, $m, $lastDay);
                $monthKey = sprintf('%s-%02d', $year, $m);
                
                // Call the same RPC used by Reports
                $summaryResp = $supabase->request('POST', 'rpc/get_product_summary', [
                    'start_date' => $monthStart,
                    'end_date' => $monthEnd
                ]);
                
                $monthTotal = 0;
                
                if ($summaryResp['code'] === 200 && !empty($summaryResp['body'])) {
                    $summaryData = json_decode($summaryResp['body'], true);
                    if (is_array($summaryData)) {
                        foreach ($summaryData as $item) {
                            $displayName = $item['display_name'] ?? 'Unknown';
                            $itemType = $item['type'] ?? 'Product';
                            $amount = floatval($item['total_amount'] ?? 0);
                            $monthTotal += $amount;
                            
                            // Build line data keyed by display_name
                            if (!isset($autoRevenueByLine[$displayName])) {
                                $autoRevenueByLine[$displayName] = [
                                    'key' => $displayName,
                                    'type' => $itemType,
                                    'byMonth' => [],
                                    'yearTotal' => 0
                                ];
                            }
                            $autoRevenueByLine[$displayName]['byMonth'][$monthKey] = 
                                ($autoRevenueByLine[$displayName]['byMonth'][$monthKey] ?? 0) + $amount;
                            $autoRevenueByLine[$displayName]['yearTotal'] += $amount;
                        }
                    }
                }
                
                $autoRevenueByMonth[$monthKey] = $monthTotal;
            }
            
            // Get revenue adjustments
            $adjResp = $supabase->select('balance_revenue_adjustments', "?year_month=gte.$year-01&year_month=lte.$year-12&order=year_month.asc");
            $adjustments = [];
            if ($adjResp['code'] === 200 && !empty($adjResp['body'])) {
                $decoded = json_decode($adjResp['body'], true);
                if (is_array($decoded)) {
                    $adjustments = $decoded;
                }
            }
            
            // Get expenses and separate by category
            $expResp = $supabase->select('balance_expenses', "?year_month=gte.$year-01&year_month=lte.$year-12&order=year_month.asc");
            $expenses = [];
            $fixedExpenses = [];
            $variableExpenses = [];
            if ($expResp['code'] === 200 && !empty($expResp['body'])) {
                $decoded = json_decode($expResp['body'], true);
                if (is_array($decoded)) {
                    $expenses = $decoded;
                    foreach ($decoded as $exp) {
                        if ($exp['category'] === 'fixed') {
                            $fixedExpenses[] = $exp;
                        } else {
                            $variableExpenses[] = $exp;
                        }
                    }
                }
            }
            
            // Get withdrawals
            $withResp = $supabase->select('balance_withdrawals', "?year_month=gte.$year-01&year_month=lte.$year-12&order=year_month.asc");
            $withdrawals = [];
            if ($withResp['code'] === 200 && !empty($withResp['body'])) {
                $decoded = json_decode($withResp['body'], true);
                if (is_array($decoded)) {
                    $withdrawals = $decoded;
                }
            }
            
            // Compute totals
            $revenueSubtotalByMonth = [];
            $revenueIndividualByMonth = [];
            $expensesTotalByMonth = [];
            $withdrawalsTotalByMonth = [];
            $netByMonth = [];
            
            // Initialize partner months
            foreach ($partners as $p) {
                $revenueIndividualByMonth[$p['id']] = [];
            }
            
            foreach ($months as $month) {
                $autoRev = $autoRevenueByMonth[$month] ?? 0;
                $adjTotal = 0;
                foreach ($adjustments as $adj) {
                    if ($adj['year_month'] === $month) {
                        $adjTotal += floatval($adj['amount']);
                    }
                }
                $revenueSubtotalByMonth[$month] = $autoRev + $adjTotal;
                
                // Individual revenue by partner share
                foreach ($partners as $p) {
                    $share = floatval($p['share'] ?? 0.5);
                    $revenueIndividualByMonth[$p['id']][$month] = $revenueSubtotalByMonth[$month] * $share;
                }
                
                // Expenses total
                $expTotal = 0;
                foreach ($expenses as $exp) {
                    if ($exp['year_month'] === $month) {
                        $expTotal += floatval($exp['amount']);
                    }
                }
                $expensesTotalByMonth[$month] = $expTotal;
                
                // Withdrawals total
                $withTotal = 0;
                foreach ($withdrawals as $withdrawal) {
                    if ($withdrawal['year_month'] === $month) {
                        $withTotal += floatval($withdrawal['amount']);
                    }
                }
                $withdrawalsTotalByMonth[$month] = $withTotal;
                
                // Net
                $netByMonth[$month] = $revenueSubtotalByMonth[$month] - $expensesTotalByMonth[$month] - $withdrawalsTotalByMonth[$month];
            }
            
            // Calculate Capital Available by Partner (accumulated)
            $availableCapitalByPartner = [];
            foreach ($partners as $p) {
                $availableCapitalByPartner[$p['id']] = [];
                $accumulatedRevenue = 0;
                
                foreach ($months as $month) {
                    // Add revenue for this month
                    $accumulatedRevenue += $revenueIndividualByMonth[$p['id']][$month] ?? 0;
                    
                    // Sum withdrawals for this partner up to and including this month
                    $accumulatedWithdrawals = 0;
                    foreach ($withdrawals as $withdrawal) {
                        if ($withdrawal['partner_id'] === $p['id']) {
                            $withMonth = $withdrawal['year_month'];
                            // Compare month strings (YYYY-MM format)
                            if ($withMonth <= $month) {
                                $accumulatedWithdrawals += floatval($withdrawal['amount']);
                            }
                        }
                    }
                    
                    $availableCapitalByPartner[$p['id']][$month] = $accumulatedRevenue - $accumulatedWithdrawals;
                }
            }
            
            // Calculate expenses percentage by month
            $expensesPercentageByMonth = [];
            foreach ($months as $month) {
                $revenue = $revenueSubtotalByMonth[$month] ?? 0;
                $expenses = $expensesTotalByMonth[$month] ?? 0;
                $withdrawals = $withdrawalsTotalByMonth[$month] ?? 0;
                $totalExp = $expenses + $withdrawals;
                
                if ($revenue > 0) {
                    $expensesPercentageByMonth[$month] = ($totalExp / $revenue) * 100;
                } else {
                    $expensesPercentageByMonth[$month] = 0;
                }
            }
            
            // Calculate total revenue by month (for display)
            // TOTAL RECEITA = CAIXA (only first month) + SUB TOTAL receitas
            $totalRevenueByMonth = [];
            foreach ($months as $idx => $month) {
                if ($idx === 0) {
                    // First month includes initial cash
                    $totalRevenueByMonth[$month] = $initialCash + ($revenueSubtotalByMonth[$month] ?? 0);
                } else {
                    // Other months only show revenue subtotal
                    $totalRevenueByMonth[$month] = $revenueSubtotalByMonth[$month] ?? 0;
                }
            }
            
            // Year totals
            $totalRevenue = array_sum($revenueSubtotalByMonth) + $initialCash;
            $totalExpenses = array_sum($expensesTotalByMonth);
            $totalWithdrawals = array_sum($withdrawalsTotalByMonth);
            $net = $totalRevenue - $totalExpenses - $totalWithdrawals;
            
            echo json_encode([
                'year' => intval($year),
                'initialCash' => $initialCash,
                'partners' => $partners,
                'months' => $months,
                'autoRevenue' => [
                    'byMonth' => $autoRevenueByMonth,
                    'byLine' => array_values($autoRevenueByLine)
                ],
                'manualRevenueAdjustments' => $adjustments,
                'expenses' => $expenses,
                'fixedExpenses' => $fixedExpenses,
                'variableExpenses' => $variableExpenses,
                'withdrawals' => $withdrawals,
                'computed' => [
                    'revenueSubtotalByMonth' => $revenueSubtotalByMonth,
                    'revenueIndividualByMonth' => $revenueIndividualByMonth,
                    'expensesTotalByMonth' => $expensesTotalByMonth,
                    'withdrawalsTotalByMonth' => $withdrawalsTotalByMonth,
                    'expensesPercentageByMonth' => $expensesPercentageByMonth,
                    'totalRevenueByMonth' => $totalRevenueByMonth,
                    'totalExpensesByMonth' => $expensesTotalByMonth,
                    'netByMonth' => $netByMonth,
                    'availableCapitalByPartner' => $availableCapitalByPartner,
                    'yearTotals' => [
                        'totalRevenue' => $totalRevenue,
                        'totalExpenses' => $totalExpenses,
                        'totalWithdrawals' => $totalWithdrawals,
                        'net' => $net
                    ]
                ]
            ]);
            break;

        case 'balance_years':
            // Years available in transactions.transaction_date (min/max range)
            // Uses only 2 small queries to avoid scanning large tables.
            $minResp = $supabase->select('transactions', '?select=transaction_date&order=transaction_date.asc&limit=1');
            $maxResp = $supabase->select('transactions', '?select=transaction_date&order=transaction_date.desc&limit=1');

            $minYear = null;
            $maxYear = null;

            if ($minResp['code'] === 200 && !empty($minResp['body'])) {
                $decoded = json_decode($minResp['body'], true);
                if (is_array($decoded) && count($decoded) > 0) {
                    $d = $decoded[0]['transaction_date'] ?? null;
                    if (is_string($d) && strlen($d) >= 4) $minYear = intval(substr($d, 0, 4));
                }
            }

            if ($maxResp['code'] === 200 && !empty($maxResp['body'])) {
                $decoded = json_decode($maxResp['body'], true);
                if (is_array($decoded) && count($decoded) > 0) {
                    $d = $decoded[0]['transaction_date'] ?? null;
                    if (is_string($d) && strlen($d) >= 4) $maxYear = intval(substr($d, 0, 4));
                }
            }

            if (!$minYear || !$maxYear || $minYear > $maxYear) {
                echo json_encode(['years' => []]);
                break;
            }

            $years = [];
            for ($y = $minYear; $y <= $maxYear; $y++) $years[] = $y;
            echo json_encode(['years' => $years]);
            break;
        
        case 'get_initial_cash':
            // Get all initial cash entries
            $resp = $supabase->select('balance_initial_cash', '?order=year.desc');
            if ($resp['code'] === 200) {
                echo $resp['body'];
            } else {
                echo json_encode([]);
            }
            break;
            
        case 'set_initial_cash':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            
            $cashYear = intval($data['year'] ?? 0);
            if ($cashYear < 2000 || $cashYear > 2100) throw new Exception('Invalid year');
            
            $amount = floatval($data['amount'] ?? 0);
            $note = isset($data['note']) ? trim($data['note']) : null;
            
            $payload = [
                'year' => $cashYear,
                'amount' => $amount,
                'note' => $note,
                'updated_at' => date('c')
            ];
            
            // Upsert (insert or update)
            $resp = $supabase->insert('balance_initial_cash', [$payload], true);
            if ($resp['code'] >= 400) throw new Exception('Failed to set initial cash: ' . $resp['body']);
            
            echo json_encode(['success' => true, 'year' => $cashYear, 'amount' => $amount]);
            break;
            
        case 'delete_initial_cash':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            
            $cashYear = intval($data['year'] ?? 0);
            if ($cashYear < 2000 || $cashYear > 2100) throw new Exception('Invalid year');
            
            $resp = $supabase->request('DELETE', "balance_initial_cash?year=eq.$cashYear");
            echo json_encode(['success' => true]);
            break;
            
        case 'create_expense':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            
            $yearMonth = requireString($data, 'yearMonth', 7, 7);
            if (!preg_match('/^\d{4}-\d{2}$/', $yearMonth)) throw new Exception('Invalid yearMonth format');
            
            $category = requireString($data, 'category', 1, 20);
            if (!in_array($category, ['fixed', 'variable'])) throw new Exception('Invalid category');
            
            $name = requireString($data, 'name', 1, 200);
            $amount = floatval($data['amount'] ?? 0);
            if ($amount <= 0) throw new Exception('Amount must be positive');
            
            $newExpense = [
                'year_month' => $yearMonth,
                'category' => $category,
                'name' => $name,
                'amount' => $amount
            ];
            
            $resp = $supabase->insert('balance_expenses', [$newExpense], false, true);
            if ($resp['code'] >= 400) throw new Exception('Failed to create expense: ' . $resp['body']);
            
            echo $resp['body'];
            break;
            
        case 'update_expense':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            
            $id = intval($data['id'] ?? 0);
            if ($id <= 0) throw new Exception('Invalid id');
            
            $yearMonth = requireString($data, 'yearMonth', 7, 7);
            if (!preg_match('/^\d{4}-\d{2}$/', $yearMonth)) throw new Exception('Invalid yearMonth format');
            
            $category = requireString($data, 'category', 1, 20);
            if (!in_array($category, ['fixed', 'variable'])) throw new Exception('Invalid category');
            
            $name = requireString($data, 'name', 1, 200);
            $amount = floatval($data['amount'] ?? 0);
            if ($amount <= 0) throw new Exception('Amount must be positive');
            
            $updates = [
                'year_month' => $yearMonth,
                'category' => $category,
                'name' => $name,
                'amount' => $amount,
                'updated_at' => date('c')
            ];
            
            $resp = $supabase->update('balance_expenses', $updates, "?id=eq.$id");
            if ($resp['code'] >= 400) throw new Exception('Failed to update expense: ' . $resp['body']);
            
            echo $resp['body'];
            break;
            
        case 'delete_expense':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            
            $id = intval($data['id'] ?? 0);
            if ($id <= 0) throw new Exception('Invalid id');
            
            $resp = $supabase->request('DELETE', "balance_expenses?id=eq.$id");
            if ($resp['code'] >= 400) throw new Exception('Failed to delete expense: ' . $resp['body']);
            
            echo json_encode(['success' => true]);
            break;
            
        case 'create_withdrawal':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            
            $yearMonth = requireString($data, 'yearMonth', 7, 7);
            if (!preg_match('/^\d{4}-\d{2}$/', $yearMonth)) throw new Exception('Invalid yearMonth format');
            
            $partnerId = requireString($data, 'partnerId', 1, 50);
            $amount = floatval($data['amount'] ?? 0);
            if ($amount <= 0) throw new Exception('Amount must be positive');
            
            $note = optionalString($data, 'note', 500);
            
            $newWithdrawal = [
                'year_month' => $yearMonth,
                'partner_id' => $partnerId,
                'amount' => $amount,
                'note' => $note
            ];
            
            $resp = $supabase->insert('balance_withdrawals', [$newWithdrawal], false, true);
            if ($resp['code'] >= 400) throw new Exception('Failed to create withdrawal: ' . $resp['body']);
            
            echo $resp['body'];
            break;
            
        case 'update_withdrawal':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            
            $id = intval($data['id'] ?? 0);
            if ($id <= 0) throw new Exception('Invalid id');
            
            $yearMonth = requireString($data, 'yearMonth', 7, 7);
            if (!preg_match('/^\d{4}-\d{2}$/', $yearMonth)) throw new Exception('Invalid yearMonth format');
            
            $partnerId = requireString($data, 'partnerId', 1, 50);
            $amount = floatval($data['amount'] ?? 0);
            if ($amount <= 0) throw new Exception('Amount must be positive');
            
            $note = optionalString($data, 'note', 500);
            
            $updates = [
                'year_month' => $yearMonth,
                'partner_id' => $partnerId,
                'amount' => $amount,
                'note' => $note,
                'updated_at' => date('c')
            ];
            
            $resp = $supabase->update('balance_withdrawals', $updates, "?id=eq.$id");
            if ($resp['code'] >= 400) throw new Exception('Failed to update withdrawal: ' . $resp['body']);
            
            echo $resp['body'];
            break;
            
        case 'delete_withdrawal':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            
            $id = intval($data['id'] ?? 0);
            if ($id <= 0) throw new Exception('Invalid id');
            
            $resp = $supabase->request('DELETE', "balance_withdrawals?id=eq.$id");
            if ($resp['code'] >= 400) throw new Exception('Failed to delete withdrawal: ' . $resp['body']);
            
            echo json_encode(['success' => true]);
            break;
            
        case 'create_revenue_adjustment':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            
            $yearMonth = requireString($data, 'yearMonth', 7, 7);
            if (!preg_match('/^\d{4}-\d{2}$/', $yearMonth)) throw new Exception('Invalid yearMonth format');
            
            $name = requireString($data, 'name', 1, 200);
            $amount = floatval($data['amount'] ?? 0);
            
            $newAdjustment = [
                'year_month' => $yearMonth,
                'name' => $name,
                'amount' => $amount
            ];
            
            $resp = $supabase->insert('balance_revenue_adjustments', [$newAdjustment], false, true);
            if ($resp['code'] >= 400) throw new Exception('Failed to create revenue adjustment: ' . $resp['body']);
            
            echo $resp['body'];
            break;
            
        case 'update_revenue_adjustment':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            
            $id = intval($data['id'] ?? 0);
            if ($id <= 0) throw new Exception('Invalid id');
            
            $yearMonth = requireString($data, 'yearMonth', 7, 7);
            if (!preg_match('/^\d{4}-\d{2}$/', $yearMonth)) throw new Exception('Invalid yearMonth format');
            
            $name = requireString($data, 'name', 1, 200);
            $amount = floatval($data['amount'] ?? 0);
            
            $updates = [
                'year_month' => $yearMonth,
                'name' => $name,
                'amount' => $amount,
                'updated_at' => date('c')
            ];
            
            $resp = $supabase->update('balance_revenue_adjustments', $updates, "?id=eq.$id");
            if ($resp['code'] >= 400) throw new Exception('Failed to update revenue adjustment: ' . $resp['body']);
            
            echo $resp['body'];
            break;
            
        case 'delete_revenue_adjustment':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            
            $id = intval($data['id'] ?? 0);
            if ($id <= 0) throw new Exception('Invalid id');
            
            $resp = $supabase->request('DELETE', "balance_revenue_adjustments?id=eq.$id");
            if ($resp['code'] >= 400) throw new Exception('Failed to delete revenue adjustment: ' . $resp['body']);
            
            echo json_encode(['success' => true]);
            break;
            
        case 'partners':
            $resp = $supabase->select('partners', '?order=id.asc');
            echo $resp['body'];
            break;
            
        case 'update_partners':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('POST required');
            $data = requireJsonBody();
            
            $partnersArray = requireArray($data, 'partners', 10);
            
            // Validate partners
            foreach ($partnersArray as $p) {
                if (!isset($p['id']) || !is_string($p['id'])) throw new Exception('Invalid partner id');
                if (!isset($p['name']) || !is_string($p['name'])) throw new Exception('Invalid partner name');
                $share = floatval($p['share'] ?? 0);
                if ($share < 0 || $share > 1) throw new Exception('Invalid partner share');
            }
            
            // Delete all existing and insert new
            $supabase->request('DELETE', 'partners?id=neq.00000000-0000-0000-0000-000000000000');
            
            $insertData = [];
            foreach ($partnersArray as $p) {
                $insertData[] = [
                    'id' => $p['id'],
                    'name' => $p['name'],
                    'share' => floatval($p['share'])
                ];
            }
            
            $resp = $supabase->insert('partners', $insertData, false, true);
            if ($resp['code'] >= 400) throw new Exception('Failed to update partners: ' . $resp['body']);
            
            echo $resp['body'];
            break;

        default:
            echo json_encode(['error' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    $msg = (defined('APP_ENV') && APP_ENV === 'production') ? 'Internal error' : $e->getMessage();
    echo json_encode(['error' => $msg]);
}

