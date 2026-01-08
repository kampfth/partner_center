<?php
/**
 * Bootstrap: autoload, env, initialization
 */

declare(strict_types=1);

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Increase limits for CSV processing
ini_set('memory_limit', '512M');
ini_set('max_execution_time', '300');

// Global to store env values (putenv doesn't work on all servers)
global $__ENV_VALUES;
$__ENV_VALUES = [];

// Load environment variables - try multiple paths
$envPaths = [
    __DIR__ . '/../.env',           // backend/.env
    __DIR__ . '/../../.env',        // public_html/.env (where user put it)
];

foreach ($envPaths as $envPath) {
    if (file_exists($envPath)) {
        loadEnvFile($envPath);
        break;
    }
}

// Simple PSR-4-like autoloader for App namespace
spl_autoload_register(function (string $class): void {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

/**
 * Load .env file into environment
 */
function loadEnvFile(string $path): void
{
    global $__ENV_VALUES;
    
    if (!file_exists($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }

        $pos = strpos($line, '=');
        if ($pos === false) {
            continue;
        }

        $key = trim(substr($line, 0, $pos));
        $val = trim(substr($line, $pos + 1));

        // Strip quotes
        if (strlen($val) >= 2) {
            $first = $val[0];
            $last = $val[strlen($val) - 1];
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $val = substr($val, 1, -1);
            }
        }

        if ($key !== '') {
            // Store in our global array (always works)
            $__ENV_VALUES[$key] = $val;
            // Also try putenv and $_ENV (may not work on all servers)
            @putenv("$key=$val");
            $_ENV[$key] = $val;
        }
    }
}

/**
 * Get environment variable value
 */
function env(string $key, string $default = ''): string
{
    global $__ENV_VALUES;
    
    // First check our global array (most reliable)
    if (isset($__ENV_VALUES[$key])) {
        return $__ENV_VALUES[$key];
    }
    
    // Then try getenv
    $val = getenv($key);
    if ($val !== false && $val !== '') {
        return $val;
    }
    
    // Then try $_ENV
    if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
        return $_ENV[$key];
    }
    
    return $default;
}

// Define constants using our reliable env() function
define('APP_ENV', env('APP_ENV', 'production'));
define('SUPABASE_URL', env('SUPABASE_URL'));
define('SUPABASE_SERVICE_ROLE_KEY', env('SUPABASE_SERVICE_ROLE_KEY'));
define('AUTH_TOTP_SECRET', env('AUTH_TOTP_SECRET'));
define('VAR_DIR', __DIR__ . '/../var');

// Ensure var directory exists
if (!is_dir(VAR_DIR)) {
    @mkdir(VAR_DIR, 0755, true);
}
