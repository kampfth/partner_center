<?php
/**
 * Route definitions for Partner Center v2 API
 */

declare(strict_types=1);

use App\Http\Router;
use App\Http\Request;
use App\Http\Response;
use App\Http\Middleware\Auth;
use App\Controllers\HealthController;
use App\Controllers\AuthController;
use App\Controllers\ProductsController;
use App\Controllers\GroupsController;
use App\Controllers\ImportsController;
use App\Controllers\ReportsController;
use App\Controllers\BalanceController;
use App\Controllers\PartnersController;
use App\Controllers\SettingsController;
use App\Controllers\AnalyticsController;
use App\Controllers\AdminController;

/** @var Router $router */

// Add auth middleware for non-public routes
$router->addMiddleware(fn(Request $r) => Auth::check($r));

// === Public routes ===

$router->get('/api/health', fn(Request $r) => (new HealthController())->index($r), public: true);
$router->get('/login', fn(Request $r) => (new AuthController())->loginPage($r), public: true);
$router->post('/login', fn(Request $r) => (new AuthController())->loginPage($r), public: true);
$router->get('/logout', fn(Request $r) => (new AuthController())->logout($r), public: true);

// === Protected routes ===

// Products (all_products)
$router->get('/api/products', fn(Request $r) => (new ProductsController())->index($r));
$router->patch('/api/products/{product_id}', fn(Request $r, array $p) => (new ProductsController())->updateTracking($r, $p));

// Tracked Products (products table)
$router->get('/api/tracked-products', fn(Request $r) => (new ProductsController())->trackedIndex($r));
$router->patch('/api/tracked-products/{product_id}', fn(Request $r, array $p) => (new ProductsController())->updateTrackedProduct($r, $p));

// Groups
$router->get('/api/groups', fn(Request $r) => (new GroupsController())->index($r));
$router->post('/api/groups', fn(Request $r) => (new GroupsController())->create($r));
$router->delete('/api/groups/{group_id}', fn(Request $r, array $p) => (new GroupsController())->delete($r, $p));

// Imports
$router->post('/api/imports', fn(Request $r) => (new ImportsController())->upload($r));
$router->get('/api/imports', fn(Request $r) => (new ImportsController())->index($r));

// Reports
$router->get('/api/reports', fn(Request $r) => (new ReportsController())->index($r));
$router->get('/api/reports/date-range', fn(Request $r) => (new ReportsController())->dateRange($r));

// === Balance ===
$router->get('/api/balance', fn(Request $r) => (new BalanceController())->index($r));
$router->get('/api/balance/years', fn(Request $r) => (new BalanceController())->years($r));

// Expenses
$router->post('/api/expenses', fn(Request $r) => (new BalanceController())->createExpense($r));
$router->patch('/api/expenses/{id}', fn(Request $r, array $p) => (new BalanceController())->updateExpense($r, $p));
$router->delete('/api/expenses/{id}', fn(Request $r, array $p) => (new BalanceController())->deleteExpense($r, $p));

// Withdrawals
$router->post('/api/withdrawals', fn(Request $r) => (new BalanceController())->createWithdrawal($r));
$router->patch('/api/withdrawals/{id}', fn(Request $r, array $p) => (new BalanceController())->updateWithdrawal($r, $p));
$router->delete('/api/withdrawals/{id}', fn(Request $r, array $p) => (new BalanceController())->deleteWithdrawal($r, $p));

// Revenue Adjustments
$router->post('/api/revenue-adjustments', fn(Request $r) => (new BalanceController())->createAdjustment($r));
$router->patch('/api/revenue-adjustments/{id}', fn(Request $r, array $p) => (new BalanceController())->updateAdjustment($r, $p));
$router->delete('/api/revenue-adjustments/{id}', fn(Request $r, array $p) => (new BalanceController())->deleteAdjustment($r, $p));

// Initial Cash
$router->get('/api/initial-cash', fn(Request $r) => (new BalanceController())->getInitialCash($r));
$router->post('/api/initial-cash', fn(Request $r) => (new BalanceController())->setInitialCash($r));
$router->delete('/api/initial-cash/{year}', fn(Request $r, array $p) => (new BalanceController())->deleteInitialCash($r, $p));

// === Partners ===
$router->get('/api/partners', fn(Request $r) => (new PartnersController())->index($r));
$router->put('/api/partners', fn(Request $r) => (new PartnersController())->update($r));

// === Settings ===
$router->get('/api/settings/sort-order', fn(Request $r) => (new SettingsController())->getSortOrder($r));
$router->put('/api/settings/sort-order', fn(Request $r) => (new SettingsController())->saveSortOrder($r));
$router->get('/api/audit-logs', fn(Request $r) => (new SettingsController())->getAuditLogs($r));

// === Analytics ===
$router->get('/api/analytics/weekday', fn(Request $r) => (new AnalyticsController())->byWeekday($r));
$router->get('/api/analytics/time-bucket', fn(Request $r) => (new AnalyticsController())->byTimeBucket($r));
$router->get('/api/analytics/msfs-version', fn(Request $r) => (new AnalyticsController())->byMsfsVersion($r));

// === Admin (Danger Zone) ===
$router->post('/api/admin/truncate', fn(Request $r) => (new AdminController())->truncate($r));
$router->post('/api/admin/reset', fn(Request $r) => (new AdminController())->reset($r));
