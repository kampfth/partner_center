<?php
/**
 * Partner Center API
 * 
 * Endpoints organized by category:
 * - Core: products, groups, report
 * - Balance: balance, expenses, withdrawals, partners
 * - Analytics: sales_by_weekday, sales_by_time_bucket, sales_by_msfs_version
 * - Settings: sort_order, login_history
 * - Admin: truncate_table, reset_all
 */

require 'auth.php';
checkAuth();
require 'ratelimit.php';
require 'validation.php';
require 'config.php';
require 'supabase.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Rate limiting
$ip = getClientIpAddress();
if (!rateLimit("api:ip:$ip", 600, 60) || !rateLimit("api:sess:" . session_id(), 600, 60)) {
    jsonError('Too many requests', 429);
}

enforceSameOriginPost();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse JSON response from Supabase, return empty array on failure
 */
function parseResponse(array $resp): array {
    if ($resp['code'] !== 200 || empty($resp['body'])) {
        return [];
    }
    $decoded = json_decode($resp['body'], true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Parse single row from Supabase response
 */
function parseFirstRow(array $resp): ?array {
    $rows = parseResponse($resp);
    return count($rows) > 0 ? $rows[0] : null;
}

/**
 * Get first value from a single-column response
 */
function parseFirstValue(array $resp, string $column) {
    $row = parseFirstRow($resp);
    return $row[$column] ?? null;
}

/**
 * Parse and validate date parameter with fallback
 */
function parseDateParam(string $key, string $fallback): string {
    $raw = isset($_GET[$key]) ? trim($_GET[$key]) : '';
    if ($raw === '' || strlen($raw) < 10) {
        return $fallback;
    }
    $date = substr($raw, 0, 10);
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? $date : $fallback;
}

/**
 * Get next day for exclusive date range queries
 */
function nextDay(string $date): string {
    return date('Y-m-d', strtotime($date . ' +1 day'));
}

/**
 * Require POST method or throw
 */
function requirePost(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('POST required');
    }
}

/**
 * Validate year_month format (YYYY-MM)
 */
function validateYearMonth(string $value): string {
    if (!preg_match('/^\d{4}-\d{2}$/', $value)) {
        throw new Exception('Invalid yearMonth format');
    }
    return $value;
}

/**
 * Validate expense/withdrawal category
 */
function validateCategory(string $value): string {
    if (!in_array($value, ['fixed', 'variable'])) {
        throw new Exception('Invalid category');
    }
    return $value;
}

/**
 * Validate positive amount
 */
function validatePositiveAmount(float $value): float {
    if ($value <= 0) {
        throw new Exception('Amount must be positive');
    }
    return $value;
}

/**
 * Sum amounts for a specific year_month from array of records
 */
function sumByMonth(array $records, string $yearMonth, string $amountField = 'amount'): float {
    $total = 0;
    foreach ($records as $record) {
        if (($record['year_month'] ?? '') === $yearMonth) {
            $total += floatval($record[$amountField] ?? 0);
        }
    }
    return $total;
}

/**
 * Generate list of year-month strings for a year
 */
function generateMonthsList(string $year): array {
    $months = [];
    for ($m = 1; $m <= 12; $m++) {
        $months[] = sprintf('%s-%02d', $year, $m);
    }
    return $months;
}

/**
 * Get month date range (first and last day)
 */
function getMonthRange(string $year, int $month): array {
    $start = sprintf('%s-%02d-01', $year, $month);
    $lastDay = date('t', strtotime($start . ' 00:00:00'));
    $end = sprintf('%s-%02d-%02d', $year, $month, $lastDay);
    return [$start, $end];
}

// =============================================================================
// MAIN ROUTER
// =============================================================================

$action = $_GET['action'] ?? '';
$supabase = new Supabase(SUPABASE_URL, SUPABASE_KEY);

try {
    switch ($action) {
        // =========================================================================
        // CORE ENDPOINTS
        // =========================================================================
        
        case 'date_range':
            $minDate = parseFirstValue($supabase->select('daily_sales', '?select=date&order=date.asc&limit=1'), 'date');
            $maxDate = parseFirstValue($supabase->select('daily_sales', '?select=date&order=date.desc&limit=1'), 'date');
            echo json_encode(['min_date' => $minDate, 'max_date' => $maxDate]);
            break;

        case 'products':
            echo $supabase->select('products', '?select=*,product_groups(name,id)&order=product_name.asc')['body'];
            break;

        case 'groups':
            echo $supabase->select('product_groups', '?order=name.asc')['body'];
            break;

        case 'create_group':
            requirePost();
            $data = requireJsonBody();
            $groupName = requireString($data, 'name', 1, 100);
            $productIds = array_values(array_filter(
                requireArray($data, 'productIds', 500),
                fn($id) => is_string($id) && isUuid($id)
            ));
            
            if (count($productIds) === 0) {
                throw new Exception('No valid productIds');
            }
            
            $gResp = $supabase->insert('product_groups', ['name' => $groupName], false, true);
            if ($gResp['code'] >= 400) {
                throw new Exception('Failed to create group: ' . $gResp['body']);
            }
            
            $group = json_decode($gResp['body'], true)[0];
            $idsStr = '(' . implode(',', $productIds) . ')';
            $supabase->update('products', ['group_id' => $group['id']], "?product_id=in.$idsStr");
            
            echo json_encode(['success' => true, 'group' => $group]);
            break;

        case 'update_product':
            requirePost();
            $data = requireJsonBody();
            $pid = requireUuid($data, 'product_id');
            
            $updates = [];
            if (isset($data['label'])) {
                $updates['label'] = requireString($data, 'label', 1, 200);
            }
            if (array_key_exists('group_id', $data)) {
                $updates['group_id'] = optionalUuid($data, 'group_id');
            }
            
            if (empty($updates)) {
                throw new Exception('No updates provided');
            }

            echo $supabase->update('products', $updates, "?product_id=eq.$pid")['body'];
            break;
            
        case 'report':
            $start = parseDateParam('start', date('Y-m-01'));
            $end = parseDateParam('end', date('Y-m-d'));
            
            $dailyData = parseResponse($supabase->select('daily_sales', "?date=gte.$start&date=lte.$end&order=date.asc"));
            $summaryData = parseResponse($supabase->request('POST', 'rpc/get_product_summary', [
                'start_date' => $start,
                'end_date' => $end
            ]));
            
            echo json_encode(['daily' => $dailyData, 'summary' => $summaryData]);
            break;
            
        case 'add_product':
            requirePost();
            $data = requireJsonBody();
            
            $newProduct = [
                'product_id' => requireUuid($data, 'productId'),
                'product_name' => requireString($data, 'productName', 1, 200),
                'lever' => requireString($data, 'lever', 1, 50),
                'label' => requireString($data, 'productName', 1, 200)
            ];
            
            echo $supabase->insert('products', [$newProduct], false, true)['body'];
            break;

        case 'available_products':
            $resp = $supabase->request('POST', 'rpc/get_available_products', []);
            echo $resp['code'] === 200 ? $resp['body'] : json_encode([]);
            break;

        case 'remove_product':
            requirePost();
            $pid = requireUuid(requireJsonBody(), 'product_id');
            $supabase->request('DELETE', "products?product_id=eq.$pid");
            echo json_encode(['success' => true]);
            break;

        // =========================================================================
        // SETTINGS ENDPOINTS
        // =========================================================================

        case 'update_password':
            http_response_code(400);
            echo json_encode(['error' => 'Password login disabled']);
            break;

        case 'get_login_history':
            echo $supabase->select('audit_logs', '?order=created_at.desc&limit=50')['body'];
            break;

        case 'save_sort_order':
            requirePost();
            $order = requireArray(requireJsonBody(), 'order', 2000);
            echo $supabase->insert('app_settings', [['key' => 'sort_order', 'value' => $order]], true)['body'];
            break;

        case 'get_sort_order':
            echo $supabase->select('app_settings', '?key=eq.sort_order')['body'];
            break;

        // =========================================================================
        // ADMIN / DANGER ZONE ENDPOINTS
        // =========================================================================

        case 'truncate_table':
            requirePost();
            if (!rateLimit("api:danger:ip:$ip", 20, 60)) {
                jsonError('Too many requests', 429);
            }
            
            $table = requireString(requireJsonBody(), 'table', 1, 50);
            $allowed = ['transactions', 'products', 'product_groups', 'audit_logs'];
            
            if (!in_array($table, $allowed)) {
                throw new Exception('Invalid table');
            }
            
            $pkColumn = match($table) {
                'transactions' => 'earning_id',
                'products' => 'product_id',
                default => 'id'
            };
            
            $supabase->request('DELETE', "$table?$pkColumn=neq.00000000-0000-0000-0000-000000000000");
            auditLog('DB_RESET', "Truncated table: $table");
            echo json_encode(['success' => true]);
            break;

        case 'reset_all':
            requirePost();
            if (!rateLimit("api:danger:ip:$ip", 10, 60)) {
                jsonError('Too many requests', 429);
            }
            
            $supabase->request('DELETE', 'transactions?earning_id=neq.00000000-0000-0000-0000-000000000000');
            $supabase->request('DELETE', 'products?product_id=neq.00000000-0000-0000-0000-000000000000');
            $supabase->request('DELETE', 'product_groups?id=neq.00000000-0000-0000-0000-000000000000');
            
            auditLog('DB_RESET_ALL', "Performed Full System Reset");
            echo json_encode(['success' => true]);
            break;

        // =========================================================================
        // BALANCE ENDPOINTS
        // =========================================================================
        
        case 'balance':
            $year = isset($_GET['year']) ? trim($_GET['year']) : date('Y');
            if (!preg_match('/^\d{4}$/', $year)) {
                $year = date('Y');
            }
            
            // Fetch all required data in parallel would be ideal, but PHP is sync
            $initialCash = floatval(parseFirstValue(
                $supabase->select('balance_initial_cash', "?year=eq.$year"),
                'amount'
            ) ?? 0);
            
            $partners = parseResponse($supabase->select('partners', '?order=id.asc'));
            $months = generateMonthsList($year);
            
            // Get revenue by calling RPC for each month
            $autoRevenueByMonth = [];
            $autoRevenueByLine = [];
            
            for ($m = 1; $m <= 12; $m++) {
                [$monthStart, $monthEnd] = getMonthRange($year, $m);
                $monthKey = sprintf('%s-%02d', $year, $m);
                
                $summaryData = parseResponse($supabase->request('POST', 'rpc/get_product_summary', [
                    'start_date' => $monthStart,
                    'end_date' => $monthEnd
                ]));
                
                $monthTotal = 0;
                foreach ($summaryData as $item) {
                    $displayName = $item['display_name'] ?? 'Unknown';
                    $itemType = $item['type'] ?? 'Product';
                    $amount = floatval($item['total_amount'] ?? 0);
                    $monthTotal += $amount;
                    
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
                
                $autoRevenueByMonth[$monthKey] = $monthTotal;
            }
            
            // Fetch adjustments, expenses, withdrawals
            $adjustments = parseResponse($supabase->select(
                'balance_revenue_adjustments',
                "?year_month=gte.$year-01&year_month=lte.$year-12&order=year_month.asc"
            ));
            
            $allExpenses = parseResponse($supabase->select(
                'balance_expenses',
                "?year_month=gte.$year-01&year_month=lte.$year-12&order=year_month.asc"
            ));
            $fixedExpenses = array_filter($allExpenses, fn($e) => $e['category'] === 'fixed');
            $variableExpenses = array_filter($allExpenses, fn($e) => $e['category'] === 'variable');
            
            $withdrawals = parseResponse($supabase->select(
                'balance_withdrawals',
                "?year_month=gte.$year-01&year_month=lte.$year-12&order=year_month.asc"
            ));
            
            // Compute monthly totals
            $revenueSubtotalByMonth = [];
            $revenueIndividualByMonth = [];
            $expensesTotalByMonth = [];
            $withdrawalsTotalByMonth = [];
            $netByMonth = [];
            $expensesPercentageByMonth = [];
            $totalRevenueByMonth = [];
            
            foreach ($partners as $p) {
                $revenueIndividualByMonth[$p['id']] = [];
            }
            
            foreach ($months as $idx => $month) {
                $autoRev = $autoRevenueByMonth[$month] ?? 0;
                $adjTotal = sumByMonth($adjustments, $month);
                $revenueSubtotalByMonth[$month] = $autoRev + $adjTotal;
                
                foreach ($partners as $p) {
                    $share = floatval($p['share'] ?? 0.5);
                    $revenueIndividualByMonth[$p['id']][$month] = $revenueSubtotalByMonth[$month] * $share;
                }
                
                $expensesTotalByMonth[$month] = sumByMonth($allExpenses, $month);
                $withdrawalsTotalByMonth[$month] = sumByMonth($withdrawals, $month);
                $netByMonth[$month] = $revenueSubtotalByMonth[$month] - $expensesTotalByMonth[$month] - $withdrawalsTotalByMonth[$month];
                
                $revenue = $revenueSubtotalByMonth[$month];
                $totalExp = $expensesTotalByMonth[$month] + $withdrawalsTotalByMonth[$month];
                $expensesPercentageByMonth[$month] = $revenue > 0 ? ($totalExp / $revenue) * 100 : 0;
                
                $totalRevenueByMonth[$month] = ($idx === 0 ? $initialCash : 0) + $revenueSubtotalByMonth[$month];
            }
            
            // Calculate capital available by partner (accumulated)
            $availableCapitalByPartner = [];
            foreach ($partners as $p) {
                $availableCapitalByPartner[$p['id']] = [];
                $accumulatedRevenue = 0;
                
                foreach ($months as $month) {
                    $accumulatedRevenue += $revenueIndividualByMonth[$p['id']][$month] ?? 0;
                    
                    $accumulatedWithdrawals = 0;
                    foreach ($withdrawals as $w) {
                        if ($w['partner_id'] === $p['id'] && $w['year_month'] <= $month) {
                            $accumulatedWithdrawals += floatval($w['amount']);
                        }
                    }
                    
                    $availableCapitalByPartner[$p['id']][$month] = $accumulatedRevenue - $accumulatedWithdrawals;
                }
            }
            
            // Year totals
            $totalRevenue = array_sum($revenueSubtotalByMonth) + $initialCash;
            $totalExpenses = array_sum($expensesTotalByMonth);
            $totalWithdrawals = array_sum($withdrawalsTotalByMonth);
            
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
                'expenses' => $allExpenses,
                'fixedExpenses' => array_values($fixedExpenses),
                'variableExpenses' => array_values($variableExpenses),
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
                        'net' => $totalRevenue - $totalExpenses - $totalWithdrawals
                    ]
                ]
            ]);
            break;

        case 'balance_years':
            $minDate = parseFirstValue($supabase->select('transactions', '?select=transaction_date&order=transaction_date.asc&limit=1'), 'transaction_date');
            $maxDate = parseFirstValue($supabase->select('transactions', '?select=transaction_date&order=transaction_date.desc&limit=1'), 'transaction_date');
            
            $minYear = $minDate && strlen($minDate) >= 4 ? intval(substr($minDate, 0, 4)) : null;
            $maxYear = $maxDate && strlen($maxDate) >= 4 ? intval(substr($maxDate, 0, 4)) : null;
            
            if (!$minYear || !$maxYear || $minYear > $maxYear) {
                echo json_encode(['years' => []]);
                break;
            }
            
            echo json_encode(['years' => range($minYear, $maxYear)]);
            break;
        
        case 'get_initial_cash':
            $resp = $supabase->select('balance_initial_cash', '?order=year.desc');
            echo $resp['code'] === 200 ? $resp['body'] : json_encode([]);
            break;
            
        case 'set_initial_cash':
            requirePost();
            $data = requireJsonBody();
            
            $cashYear = intval($data['year'] ?? 0);
            if ($cashYear < 2000 || $cashYear > 2100) {
                throw new Exception('Invalid year');
            }
            
            $payload = [
                'year' => $cashYear,
                'amount' => floatval($data['amount'] ?? 0),
                'note' => isset($data['note']) ? trim($data['note']) : null,
                'updated_at' => date('c')
            ];
            
            $resp = $supabase->insert('balance_initial_cash', [$payload], true);
            if ($resp['code'] >= 400) {
                throw new Exception('Failed to set initial cash: ' . $resp['body']);
            }
            
            echo json_encode(['success' => true, 'year' => $cashYear, 'amount' => $payload['amount']]);
            break;
            
        case 'delete_initial_cash':
            requirePost();
            $cashYear = intval(requireJsonBody()['year'] ?? 0);
            if ($cashYear < 2000 || $cashYear > 2100) {
                throw new Exception('Invalid year');
            }
            
            $supabase->request('DELETE', "balance_initial_cash?year=eq.$cashYear");
            echo json_encode(['success' => true]);
            break;

        // =========================================================================
        // EXPENSE ENDPOINTS
        // =========================================================================
            
        case 'create_expense':
            requirePost();
            $data = requireJsonBody();
            
            $newExpense = [
                'year_month' => validateYearMonth(requireString($data, 'yearMonth', 7, 7)),
                'category' => validateCategory(requireString($data, 'category', 1, 20)),
                'name' => requireString($data, 'name', 1, 200),
                'amount' => validatePositiveAmount(floatval($data['amount'] ?? 0))
            ];
            
            $resp = $supabase->insert('balance_expenses', [$newExpense], false, true);
            if ($resp['code'] >= 400) {
                throw new Exception('Failed to create expense: ' . $resp['body']);
            }
            
            echo $resp['body'];
            break;
            
        case 'update_expense':
            requirePost();
            $data = requireJsonBody();
            
            $id = intval($data['id'] ?? 0);
            if ($id <= 0) throw new Exception('Invalid id');
            
            $updates = [
                'year_month' => validateYearMonth(requireString($data, 'yearMonth', 7, 7)),
                'category' => validateCategory(requireString($data, 'category', 1, 20)),
                'name' => requireString($data, 'name', 1, 200),
                'amount' => validatePositiveAmount(floatval($data['amount'] ?? 0)),
                'updated_at' => date('c')
            ];
            
            $resp = $supabase->update('balance_expenses', $updates, "?id=eq.$id");
            if ($resp['code'] >= 400) {
                throw new Exception('Failed to update expense: ' . $resp['body']);
            }
            
            echo $resp['body'];
            break;
            
        case 'delete_expense':
            requirePost();
            $id = intval(requireJsonBody()['id'] ?? 0);
            if ($id <= 0) throw new Exception('Invalid id');
            
            $resp = $supabase->request('DELETE', "balance_expenses?id=eq.$id");
            if ($resp['code'] >= 400) {
                throw new Exception('Failed to delete expense: ' . $resp['body']);
            }
            
            echo json_encode(['success' => true]);
            break;

        // =========================================================================
        // WITHDRAWAL ENDPOINTS
        // =========================================================================
            
        case 'create_withdrawal':
            requirePost();
            $data = requireJsonBody();
            
            $yearMonth = validateYearMonth(requireString($data, 'yearMonth', 7, 7));
            $amount = validatePositiveAmount(floatval($data['amount'] ?? 0));
            $note = optionalString($data, 'note', 500);
            
            $partners = parseResponse($supabase->select('partners', '?order=id.asc'));
            if (count($partners) === 0) {
                throw new Exception('No partners found');
            }
            
            // Create one withdrawal per partner with same amount
            $newWithdrawals = array_map(fn($p) => [
                'year_month' => $yearMonth,
                'partner_id' => $p['id'],
                'amount' => $amount,
                'note' => $note
            ], $partners);
            
            $resp = $supabase->insert('balance_withdrawals', $newWithdrawals, false, true);
            if ($resp['code'] >= 400) {
                throw new Exception('Failed to create withdrawal: ' . $resp['body']);
            }
            
            echo $resp['body'];
            break;
            
        case 'update_withdrawal':
            requirePost();
            $data = requireJsonBody();
            
            $id = intval($data['id'] ?? 0);
            if ($id <= 0) throw new Exception('Invalid id');
            
            $yearMonth = validateYearMonth(requireString($data, 'yearMonth', 7, 7));
            $amount = validatePositiveAmount(floatval($data['amount'] ?? 0));
            $note = optionalString($data, 'note', 500);
            
            // Get the withdrawal to find its year_month
            $currentWithdrawal = parseFirstRow($supabase->select('balance_withdrawals', "?id=eq.$id"));
            if (!$currentWithdrawal) {
                throw new Exception('Withdrawal not found');
            }
            
            // Update ALL withdrawals for that month (both partners)
            $allWithdrawals = parseResponse($supabase->select('balance_withdrawals', "?year_month=eq.$yearMonth"));
            foreach ($allWithdrawals as $w) {
                $supabase->update('balance_withdrawals', [
                    'year_month' => $yearMonth,
                    'amount' => $amount,
                    'note' => $note,
                    'updated_at' => date('c')
                ], "?id=eq." . $w['id']);
            }
            
            echo json_encode(['success' => true]);
            break;
            
        case 'delete_withdrawal':
            requirePost();
            $id = intval(requireJsonBody()['id'] ?? 0);
            if ($id <= 0) throw new Exception('Invalid id');
            
            // Get the withdrawal to find its year_month
            $yearMonth = parseFirstValue($supabase->select('balance_withdrawals', "?id=eq.$id"), 'year_month');
            if (!$yearMonth) {
                throw new Exception('Withdrawal not found');
            }
            
            // Delete ALL withdrawals for that month (both partners)
            $resp = $supabase->request('DELETE', "balance_withdrawals?year_month=eq.$yearMonth");
            if ($resp['code'] >= 400) {
                throw new Exception('Failed to delete withdrawal: ' . $resp['body']);
            }
            
            echo json_encode(['success' => true]);
            break;

        // =========================================================================
        // REVENUE ADJUSTMENT ENDPOINTS
        // =========================================================================
            
        case 'create_revenue_adjustment':
            requirePost();
            $data = requireJsonBody();
            
            $newAdjustment = [
                'year_month' => validateYearMonth(requireString($data, 'yearMonth', 7, 7)),
                'name' => requireString($data, 'name', 1, 200),
                'amount' => floatval($data['amount'] ?? 0)
            ];
            
            $resp = $supabase->insert('balance_revenue_adjustments', [$newAdjustment], false, true);
            if ($resp['code'] >= 400) {
                throw new Exception('Failed to create revenue adjustment: ' . $resp['body']);
            }
            
            echo $resp['body'];
            break;
            
        case 'update_revenue_adjustment':
            requirePost();
            $data = requireJsonBody();
            
            $id = intval($data['id'] ?? 0);
            if ($id <= 0) throw new Exception('Invalid id');
            
            $updates = [
                'year_month' => validateYearMonth(requireString($data, 'yearMonth', 7, 7)),
                'name' => requireString($data, 'name', 1, 200),
                'amount' => floatval($data['amount'] ?? 0),
                'updated_at' => date('c')
            ];
            
            $resp = $supabase->update('balance_revenue_adjustments', $updates, "?id=eq.$id");
            if ($resp['code'] >= 400) {
                throw new Exception('Failed to update revenue adjustment: ' . $resp['body']);
            }
            
            echo $resp['body'];
            break;
            
        case 'delete_revenue_adjustment':
            requirePost();
            $id = intval(requireJsonBody()['id'] ?? 0);
            if ($id <= 0) throw new Exception('Invalid id');
            
            $resp = $supabase->request('DELETE', "balance_revenue_adjustments?id=eq.$id");
            if ($resp['code'] >= 400) {
                throw new Exception('Failed to delete revenue adjustment: ' . $resp['body']);
            }
            
            echo json_encode(['success' => true]);
            break;

        // =========================================================================
        // PARTNER ENDPOINTS
        // =========================================================================
            
        case 'partners':
            echo $supabase->select('partners', '?order=id.asc')['body'];
            break;
            
        case 'update_partners':
            requirePost();
            $partnersArray = requireArray(requireJsonBody(), 'partners', 10);
            
            foreach ($partnersArray as $p) {
                if (!isset($p['id']) || !is_string($p['id'])) {
                    throw new Exception('Invalid partner id');
                }
                if (!isset($p['name']) || !is_string($p['name'])) {
                    throw new Exception('Invalid partner name');
                }
                $share = floatval($p['share'] ?? 0);
                if ($share < 0 || $share > 1) {
                    throw new Exception('Invalid partner share');
                }
            }
            
            // Delete all and insert new
            $supabase->request('DELETE', 'partners?id=neq.00000000-0000-0000-0000-000000000000');
            
            $insertData = array_map(fn($p) => [
                'id' => $p['id'],
                'name' => $p['name'],
                'share' => floatval($p['share'])
            ], $partnersArray);
            
            $resp = $supabase->insert('partners', $insertData, false, true);
            if ($resp['code'] >= 400) {
                throw new Exception('Failed to update partners: ' . $resp['body']);
            }
            
            echo $resp['body'];
            break;

        // =========================================================================
        // ANALYTICS ENDPOINTS
        // =========================================================================

        case 'sales_by_weekday':
            $startDate = $_GET['start'] ?? null;
            $endDate = $_GET['end'] ?? null;
            if (!$startDate || !$endDate) {
                throw new Exception('start and end date required');
            }
            
            $transactions = parseResponse($supabase->select(
                'transactions',
                "?transaction_date=gte.$startDate&transaction_date=lt." . nextDay($endDate) . "&select=transaction_date,transaction_amount"
            ));
            
            // Aggregate by day of week
            $byDay = array_fill(0, 7, ['total_sales' => 0, 'units' => 0]);
            foreach ($transactions as $tx) {
                $dayOfWeek = intval(date('w', strtotime($tx['transaction_date'])));
                $byDay[$dayOfWeek]['total_sales'] += floatval($tx['transaction_amount']);
                $byDay[$dayOfWeek]['units']++;
            }
            
            $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            $result = [];
            for ($i = 0; $i < 7; $i++) {
                if ($byDay[$i]['units'] > 0) {
                    $result[] = [
                        'day_of_week' => $i,
                        'day_name' => $dayNames[$i],
                        'total_sales' => $byDay[$i]['total_sales'],
                        'units' => $byDay[$i]['units']
                    ];
                }
            }
            
            echo json_encode($result);
            break;

        case 'sales_by_time_bucket':
            $startDate = $_GET['start'] ?? null;
            $endDate = $_GET['end'] ?? null;
            if (!$startDate || !$endDate) {
                throw new Exception('start and end date required');
            }
            
            $transactions = parseResponse($supabase->select(
                'transactions',
                "?transaction_date=gte.$startDate&transaction_date=lt." . nextDay($endDate) . "&select=transaction_date,transaction_amount"
            ));
            
            // Aggregate by 4-hour time buckets
            $byBucket = array_fill(0, 6, ['total_sales' => 0, 'units' => 0]);
            foreach ($transactions as $tx) {
                $hour = intval(date('H', strtotime($tx['transaction_date'])));
                $bucketNum = floor($hour / 4);
                $byBucket[$bucketNum]['total_sales'] += floatval($tx['transaction_amount']);
                $byBucket[$bucketNum]['units']++;
            }
            
            $bucketLabels = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'];
            $result = [];
            for ($i = 0; $i < 6; $i++) {
                if ($byBucket[$i]['units'] > 0) {
                    $result[] = [
                        'time_bucket' => $bucketLabels[$i],
                        'total_sales' => $byBucket[$i]['total_sales'],
                        'units' => $byBucket[$i]['units']
                    ];
                }
            }
            
            echo json_encode($result);
            break;

        case 'sales_by_msfs_version':
            $startDate = $_GET['start'] ?? null;
            $endDate = $_GET['end'] ?? null;
            if (!$startDate || !$endDate) {
                throw new Exception('start and end date required');
            }
            
            $transactions = parseResponse($supabase->select(
                'transactions',
                "?transaction_date=gte.$startDate&transaction_date=lt." . nextDay($endDate) . "&select=transaction_amount,lever"
            ));
            
            // Aggregate by MSFS version based on lever value
            $byVersion = [];
            foreach ($transactions as $tx) {
                $lever = $tx['lever'] ?? '';
                
                if (stripos($lever, '2024') !== false) {
                    $version = '2024';
                } elseif (stripos($lever, 'Microsoft Flight Simulator') !== false) {
                    $version = '2020';
                } else {
                    $version = 'Unknown';
                }
                
                if (!isset($byVersion[$version])) {
                    $byVersion[$version] = ['total_sales' => 0, 'units' => 0];
                }
                $byVersion[$version]['total_sales'] += floatval($tx['transaction_amount']);
                $byVersion[$version]['units']++;
            }
            
            $result = [];
            foreach ($byVersion as $version => $data) {
                $result[] = [
                    'version' => $version,
                    'total_sales' => $data['total_sales'],
                    'units' => $data['units']
                ];
            }
            
            usort($result, fn($a, $b) => $b['total_sales'] <=> $a['total_sales']);
            echo json_encode($result);
            break;

        // =========================================================================
        // PRODUCT TRACKING ENDPOINTS
        // =========================================================================

        case 'all_products':
            $resp = $supabase->select('all_products', '?order=last_seen_at.desc');
            if ($resp['code'] !== 200) {
                throw new Exception('Failed to fetch all products');
            }
            echo json_encode(parseResponse($resp));
            break;

        case 'track_product':
            requirePost();
            $productId = requireString(requireJsonBody(), 'product_id', 1, 255);
            
            $prod = parseFirstRow($supabase->select('all_products', "?product_id=eq.$productId"));
            if (!$prod) {
                throw new Exception('Product not found');
            }
            
            $insertResp = $supabase->insert('products', [[
                'product_id' => $prod['product_id'],
                'product_name' => $prod['product_name'],
                'lever' => $prod['lever'],
                'label' => $prod['product_name']
            ]], false, true);
            
            if ($insertResp['code'] >= 400) {
                throw new Exception('Failed to add product to tracking');
            }
            
            $supabase->update('all_products', ['is_tracked' => true], "?product_id=eq.$productId");
            echo json_encode(['success' => true, 'message' => 'Product is now being tracked']);
            break;

        case 'untrack_product':
            requirePost();
            $productId = requireString(requireJsonBody(), 'product_id', 1, 255);
            
            $deleteResp = $supabase->request('DELETE', "products?product_id=eq.$productId");
            if ($deleteResp['code'] >= 400) {
                throw new Exception('Failed to remove product from tracking');
            }
            
            $supabase->update('all_products', ['is_tracked' => false], "?product_id=eq.$productId");
            echo json_encode(['success' => true, 'message' => 'Product is no longer tracked']);
            break;

        // =========================================================================
        // FALLBACK
        // =========================================================================

        default:
            echo json_encode(['error' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    $msg = (defined('APP_ENV') && APP_ENV === 'production') ? 'Internal error' : $e->getMessage();
    echo json_encode(['error' => $msg]);
}
