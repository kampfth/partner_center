<?php
/**
 * Authentication Middleware
 * Verifies session and handles timeouts
 */

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Request;
use App\Http\Response;

class Auth
{
    private const ABSOLUTE_TIMEOUT = 8 * 60 * 60; // 8 hours
    private const IDLE_TIMEOUT = 2 * 60 * 60;     // 2 hours

    public static function init(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            // Use var directory for session storage (more reliable on shared hosting)
            $sessionPath = defined('VAR_DIR') ? VAR_DIR . '/sessions' : sys_get_temp_dir();
            if (!is_dir($sessionPath)) {
                @mkdir($sessionPath, 0755, true);
            }
            if (is_writable($sessionPath)) {
                ini_set('session.save_path', $sessionPath);
            }
            
            // Secure session settings
            ini_set('session.use_strict_mode', '1');
            ini_set('session.cookie_httponly', '1');
            ini_set('session.use_only_cookies', '1');
            
            // Use Lax instead of Strict for better compatibility with redirects
            ini_set('session.cookie_samesite', 'Lax');

            if (self::isHttps()) {
                ini_set('session.cookie_secure', '1');
            }

            session_set_cookie_params([
                'lifetime' => 0,
                'path' => '/',
                'domain' => '',
                'secure' => self::isHttps(),
                'httponly' => true,
                'samesite' => 'Lax',
            ]);

            session_start();
        }
    }

    public static function check(Request $request): ?Response
    {
        self::init();

        if (!self::enforceTimeout()) {
            return self::unauthorized($request);
        }

        if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
            return self::unauthorized($request);
        }

        return null; // Auth passed
    }

    public static function login(): void
    {
        self::init();
        $_SESSION['authenticated'] = true;
        $_SESSION['created_at'] = time();
        $_SESSION['last_activity'] = time();
        session_regenerate_id(true);
    }

    public static function logout(): void
    {
        self::init();
        $_SESSION = [];
        session_destroy();
    }

    public static function isAuthenticated(): bool
    {
        self::init();
        return isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true;
    }

    private static function enforceTimeout(): bool
    {
        $now = time();

        // Absolute timeout
        $created = $_SESSION['created_at'] ?? $now;
        if (($now - $created) > self::ABSOLUTE_TIMEOUT) {
            self::logout();
            return false;
        }

        // Idle timeout
        $last = $_SESSION['last_activity'] ?? $now;
        if (($now - $last) > self::IDLE_TIMEOUT) {
            self::logout();
            return false;
        }

        $_SESSION['last_activity'] = $now;
        return true;
    }

    private static function unauthorized(Request $request): Response
    {
        if ($request->isXhr()) {
            return Response::error('Unauthorized', 'UNAUTHORIZED', 401);
        }
        return Response::redirect('/login');
    }

    private static function isHttps(): bool
    {
        if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
            return true;
        }
        if (!empty($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443) {
            return true;
        }
        if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') {
            return true;
        }
        return false;
    }
}
