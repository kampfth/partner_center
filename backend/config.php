<?php
/**
 * Security note:
 * - Do NOT hardcode secrets here.
 * - On Hostinger/FTP, keep secrets in project-root `.env` and block HTTP access via `.htaccess`.
 */

function loadEnvFile($envPath) {
    if (!file_exists($envPath)) return;
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) return;

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || (isset($line[0]) && $line[0] === '#')) continue;
        $pos = strpos($line, '=');
        if ($pos === false) continue;

        $key = trim(substr($line, 0, $pos));
        $val = trim(substr($line, $pos + 1));

        // Strip optional quotes
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

// Load from project root: <root>/.env
loadEnvFile(__DIR__ . '/../.env');

define('APP_ENV', getenv('APP_ENV') ?: 'production');
define('SUPABASE_URL', getenv('SUPABASE_URL') ?: '');
define('SUPABASE_SERVICE_ROLE_KEY', getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '');

// Backwards-compatible alias used by existing code paths
define('SUPABASE_KEY', SUPABASE_SERVICE_ROLE_KEY);
