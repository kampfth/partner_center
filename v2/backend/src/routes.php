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

/** @var Router $router */

// Add auth middleware for non-public routes
$router->addMiddleware(fn(Request $r) => Auth::check($r));

// === Public routes ===

$router->get('/api/health', function (Request $r) {
    return (new HealthController())->index($r);
}, public: true);

$router->get('/login', function (Request $r) {
    return (new AuthController())->loginPage($r);
}, public: true);

$router->post('/login', function (Request $r) {
    return (new AuthController())->loginPage($r);
}, public: true);

$router->get('/logout', function (Request $r) {
    return (new AuthController())->logout($r);
}, public: true);

// === Protected routes ===

// Products (all_products)
$router->get('/api/products', function (Request $r) {
    return (new ProductsController())->index($r);
});

$router->patch('/api/products/{product_id}', function (Request $r, array $p) {
    return (new ProductsController())->updateTracking($r, $p);
});

// Tracked Products (products table)
$router->get('/api/tracked-products', function (Request $r) {
    return (new ProductsController())->trackedIndex($r);
});

$router->patch('/api/tracked-products/{product_id}', function (Request $r, array $p) {
    return (new ProductsController())->updateTrackedProduct($r, $p);
});

// Groups
$router->get('/api/groups', function (Request $r) {
    return (new GroupsController())->index($r);
});

$router->post('/api/groups', function (Request $r) {
    return (new GroupsController())->create($r);
});

$router->delete('/api/groups/{group_id}', function (Request $r, array $p) {
    return (new GroupsController())->delete($r, $p);
});

// Imports
$router->post('/api/imports', function (Request $r) {
    return (new ImportsController())->upload($r);
});

$router->get('/api/imports', function (Request $r) {
    return (new ImportsController())->index($r);
});

// Reports
$router->get('/api/reports', function (Request $r) {
    return (new ReportsController())->index($r);
});

$router->get('/api/reports/date-range', function (Request $r) {
    return (new ReportsController())->dateRange($r);
});
