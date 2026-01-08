<?php
/**
 * Debug endpoint - REMOVE after debugging
 */

header('Content-Type: application/json');

$debug = [
    'php_version' => PHP_VERSION,
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
];

// Try to load bootstrap and catch errors
$debug['bootstrap_error'] = null;
try {
    ob_start();
    require_once __DIR__ . '/src/bootstrap.php';
    ob_end_clean();
    
    $debug['constants'] = [
        'SUPABASE_URL' => defined('SUPABASE_URL') ? (empty(SUPABASE_URL) ? 'EMPTY' : 'SET (' . substr(SUPABASE_URL, 0, 30) . '...)') : 'NOT_DEFINED',
        'SUPABASE_SERVICE_ROLE_KEY' => defined('SUPABASE_SERVICE_ROLE_KEY') ? (empty(SUPABASE_SERVICE_ROLE_KEY) ? 'EMPTY' : 'SET (length: ' . strlen(SUPABASE_SERVICE_ROLE_KEY) . ')') : 'NOT_DEFINED',
        'AUTH_TOTP_SECRET' => defined('AUTH_TOTP_SECRET') ? (empty(AUTH_TOTP_SECRET) ? 'EMPTY' : 'SET') : 'NOT_DEFINED',
    ];
    
    // Test Supabase connection
    if (!empty(SUPABASE_URL) && !empty(SUPABASE_SERVICE_ROLE_KEY)) {
        $testUrl = rtrim(SUPABASE_URL, '/') . '/rest/v1/';
        $headers = [
            'apikey: ' . SUPABASE_SERVICE_ROLE_KEY,
            'Authorization: Bearer ' . SUPABASE_SERVICE_ROLE_KEY,
        ];
        
        $ch = curl_init($testUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        $debug['supabase_test'] = [
            'http_code' => $httpCode,
            'success' => $httpCode === 200,
            'error' => $error ?: null,
        ];
    } else {
        $debug['supabase_test'] = 'SKIPPED - missing credentials';
    }
    
} catch (Throwable $e) {
    $debug['bootstrap_error'] = $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine();
}

echo json_encode($debug, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
