<?php
/**
 * Debug endpoint - REMOVE after debugging
 */

header('Content-Type: application/json');

$debug = [
    'php_version' => PHP_VERSION,
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown',
    'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? 'unknown',
    'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
];

// Check .env locations
$envPaths = [
    __DIR__ . '/.env',
    __DIR__ . '/../.env',
    dirname(__DIR__) . '/.env',
    $_SERVER['DOCUMENT_ROOT'] . '/backend/.env',
    $_SERVER['DOCUMENT_ROOT'] . '/.env',
];

$debug['env_checks'] = [];
foreach ($envPaths as $path) {
    $debug['env_checks'][$path] = file_exists($path) ? 'EXISTS' : 'NOT_FOUND';
}

// Try to read .env if found
$envContent = null;
foreach ($envPaths as $path) {
    if (file_exists($path)) {
        $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines) {
            $envContent = [];
            foreach ($lines as $line) {
                if (strpos($line, '=') !== false && $line[0] !== '#') {
                    list($key) = explode('=', $line, 2);
                    $envContent[] = trim($key) . '=***'; // Hide values
                }
            }
        }
        break;
    }
}
$debug['env_keys_found'] = $envContent;

// Check if src directory exists
$debug['src_exists'] = is_dir(__DIR__ . '/src');
$debug['bootstrap_exists'] = file_exists(__DIR__ . '/src/bootstrap.php');

// Try to load bootstrap and catch errors
$debug['bootstrap_error'] = null;
try {
    ob_start();
    require_once __DIR__ . '/src/bootstrap.php';
    ob_end_clean();
    
    $debug['constants'] = [
        'SUPABASE_URL' => defined('SUPABASE_URL') ? (empty(SUPABASE_URL) ? 'EMPTY' : 'SET') : 'NOT_DEFINED',
        'SUPABASE_SERVICE_ROLE_KEY' => defined('SUPABASE_SERVICE_ROLE_KEY') ? (empty(SUPABASE_SERVICE_ROLE_KEY) ? 'EMPTY' : 'SET') : 'NOT_DEFINED',
        'AUTH_TOTP_SECRET' => defined('AUTH_TOTP_SECRET') ? (empty(AUTH_TOTP_SECRET) ? 'EMPTY' : 'SET') : 'NOT_DEFINED',
    ];
} catch (Throwable $e) {
    $debug['bootstrap_error'] = $e->getMessage();
}

echo json_encode($debug, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
