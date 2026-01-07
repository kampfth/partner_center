<?php
require_once 'GoogleAuthenticator.php';

// Configurações de Segurança
define('SECRETS_FILE', __DIR__ . '/secrets.php');

function isHttpsRequest() {
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') return true;
    if (!empty($_SERVER['SERVER_PORT']) && intval($_SERVER['SERVER_PORT']) === 443) return true;
    // Some hosts set this header when behind a proxy/load balancer
    if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') return true;
    return false;
}

// Secure Session Settings (must be set BEFORE session_start)
ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_httponly', '1');
ini_set('session.use_only_cookies', '1');
ini_set('session.cookie_samesite', 'Strict'); // PHP 7.3+

if (isHttpsRequest()) {
    ini_set('session.cookie_secure', '1');
}

// Session cookie params (samesite support)
if (PHP_VERSION_ID >= 70300) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => isHttpsRequest(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

session_start();

// Security Headers Globais
header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("X-Robots-Tag: noindex, nofollow, noarchive");
header("Permissions-Policy: geolocation=(), microphone=(), camera=()");
header("Cross-Origin-Opener-Policy: same-origin");
header("Cross-Origin-Resource-Policy: same-origin");

// Basic CSP compatible with current pages (Tailwind CDN + QR images)
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'");

if (isHttpsRequest()) {
    header("Strict-Transport-Security: max-age=31536000; includeSubDomains");
}

function enforceSameOriginPost() {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'GET' || $method === 'HEAD' || $method === 'OPTIONS') return;

    $host = $_SERVER['HTTP_HOST'] ?? '';
    if ($host === '') return; // fail open if unknown

    $scheme = isHttpsRequest() ? 'https' : 'http';
    $expectedOrigin = $scheme . '://' . $host;

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        if (stripos($origin, $expectedOrigin) !== 0) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Forbidden (origin)']);
            exit;
        }
        return;
    }

    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    if ($referer !== '') {
        if (stripos($referer, $expectedOrigin) !== 0) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Forbidden (referer)']);
            exit;
        }
    }
}

function enforceSessionTimeout() {
    $now = time();

    // Absolute max session age: 8h
    $created = $_SESSION['created_at'] ?? $now;
    if (!is_int($created)) $created = $now;

    if (($now - $created) > (8 * 60 * 60)) {
        session_unset();
        session_destroy();
        return false;
    }

    // Idle timeout: 2h
    $last = $_SESSION['last_activity'] ?? $now;
    if (!is_int($last)) $last = $now;
    if (($now - $last) > (2 * 60 * 60)) {
        session_unset();
        session_destroy();
        return false;
    }

    $_SESSION['last_activity'] = $now;
    return true;
}

function checkAuth() {
    if (!enforceSessionTimeout()) {
        http_response_code(401);
        echo json_encode(['error' => 'Session expired']);
        exit;
    }
    if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
        if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        header("Location: /backend/login.php");
        exit;
    }
}

function loadSecrets() {
    if (file_exists(SECRETS_FILE)) {
        return include SECRETS_FILE;
    }
    // Default master hash if file doesn't exist (should be setup on first run)
    // This is hash for 'admin123' just in case, but login.php handles setup logic.
    return [];
}

function saveSecrets($data) {
    // Load existing to merge
    $existing = loadSecrets();
    $merged = array_merge($existing, $data);
    $content = "<?php\nreturn " . var_export($merged, true) . ";\n";
    file_put_contents(SECRETS_FILE, $content);
}

function auditLog($event, $desc = '') {
    // We need supabase instance here to log to DB. 
    // Usually auth.php is included before supabase.php.
    // If supabase class is available, use it.
    global $supabase; 
    if ($supabase) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $supabase->insert('audit_logs', [
            'event_type' => $event,
            'description' => $desc,
            'ip_address' => $ip
        ], false);
    }
}

