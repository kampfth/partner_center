<?php
/**
 * Reports Controller
 */

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Services\ReportService;

class ReportsController
{
    private ReportService $service;

    public function __construct()
    {
        $this->service = new ReportService();
    }

    public function index(Request $request): Response
    {
        $start = $request->query['start'] ?? '';
        $end = $request->query['end'] ?? '';

        if ($start === '' || $end === '') {
            return Response::error('start and end query params are required', 'VALIDATION_ERROR', 400);
        }

        try {
            $report = $this->service->getReport($start, $end);
            return Response::json(['data' => $report]);
        } catch (\RuntimeException $e) {
            $code = $e->getCode() >= 400 ? $e->getCode() : 500;
            return Response::error($e->getMessage(), 'VALIDATION_ERROR', $code);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    public function dateRange(Request $request): Response
    {
        try {
            $range = $this->service->getDateRange();
            return Response::json(['data' => $range]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }
}
