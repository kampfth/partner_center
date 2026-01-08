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

// Load environment variables
loadEnvFile(__DIR__ . '/../.env');

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

        if ($key !== '' && getenv($key) === false) {
            putenv("$key=$val");
            $_ENV[$key] = $val;
        }
    }
}

// Define constants
define('APP_ENV', getenv('APP_ENV') ?: 'production');
define('SUPABASE_URL', getenv('SUPABASE_URL') ?: '');
define('SUPABASE_SERVICE_ROLE_KEY', getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '');
define('AUTH_TOTP_SECRET', getenv('AUTH_TOTP_SECRET') ?: '');
define('VAR_DIR', __DIR__ . '/../var');

// Ensure var directory exists
if (!is_dir(VAR_DIR)) {
    @mkdir(VAR_DIR, 0755, true);
}
