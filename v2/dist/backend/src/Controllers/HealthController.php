<?php
/**
 * Health check endpoint (public)
 */

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;

class HealthController
{
    public function index(Request $request): Response
    {
        $hasSupabaseUrl = !empty(SUPABASE_URL);
        $hasSupabaseKey = !empty(SUPABASE_SERVICE_ROLE_KEY);
        $hasTotpSecret = !empty(AUTH_TOTP_SECRET);
        
        $status = ($hasSupabaseUrl && $hasSupabaseKey) ? 'ok' : 'config_error';
        
        return Response::json([
            'status' => $status,
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
            'config' => [
                'supabase_url' => $hasSupabaseUrl,
                'supabase_key' => $hasSupabaseKey,
                'totp_secret' => $hasTotpSecret,
                'env_path' => file_exists(__DIR__ . '/../../.env') ? 'found' : 'not_found',
            ],
        ]);
    }
}
