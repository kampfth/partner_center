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
        return Response::json([
            'status' => 'ok',
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
        ]);
    }
}
