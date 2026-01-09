<?php
/**
 * Partner Center v2 - API Entry Point
 * All requests route through here.
 */

declare(strict_types=1);

// Bootstrap application
// This file is used in two layouts:
// - dev: v2/backend/public/index.php  (src is ../src)
// - dist: v2/dist/backend/index.php   (src is ./src)
$srcDir = null;
foreach ([__DIR__ . '/../src', __DIR__ . '/src'] as $candidate) {
    if (is_dir($candidate)) {
        $srcDir = $candidate;
        break;
    }
}
if ($srcDir === null) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Backend misconfigured: src directory not found', 'code' => 'BOOTSTRAP_ERROR']);
    exit;
}

require_once $srcDir . '/bootstrap.php';

use App\Http\Router;
use App\Http\Request;
use App\Http\Response;

// Create request from globals
$request = Request::fromGlobals();

// Initialize router
$router = new Router();

// Register routes
require_once $srcDir . '/routes.php';

// Dispatch and send response
try {
    $response = $router->dispatch($request);
    $response->send();
} catch (Throwable $e) {
    $code = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 500;
    $errorCode = $code === 500 ? 'INTERNAL_ERROR' : 'ERROR';
    
    if (getenv('APP_ENV') !== 'production') {
        Response::error($e->getMessage(), $errorCode, $code)->send();
    } else {
        Response::error('Internal server error', 'INTERNAL_ERROR', 500)->send();
    }
}
