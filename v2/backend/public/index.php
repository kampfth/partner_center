<?php
/**
 * Partner Center v2 - API Entry Point
 * All requests route through here.
 */

declare(strict_types=1);

// Bootstrap application
require_once __DIR__ . '/../src/bootstrap.php';

use App\Http\Router;
use App\Http\Request;
use App\Http\Response;

// Create request from globals
$request = Request::fromGlobals();

// Initialize router
$router = new Router();

// Register routes
require_once __DIR__ . '/../src/routes.php';

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
