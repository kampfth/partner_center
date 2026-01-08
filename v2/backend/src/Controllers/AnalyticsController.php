<?php
/**
 * Analytics Controller - Sales aggregations
 */

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Services\AnalyticsService;

class AnalyticsController
{
    private AnalyticsService $service;

    public function __construct()
    {
        $this->service = new AnalyticsService();
    }

    public function byWeekday(Request $request): Response
    {
        return $this->handleAnalytics($request, fn($s, $e) => $this->service->byWeekday($s, $e));
    }

    public function byTimeBucket(Request $request): Response
    {
        return $this->handleAnalytics($request, fn($s, $e) => $this->service->byTimeBucket($s, $e));
    }

    public function byMsfsVersion(Request $request): Response
    {
        return $this->handleAnalytics($request, fn($s, $e) => $this->service->byMsfsVersion($s, $e));
    }

    private function handleAnalytics(Request $request, callable $method): Response
    {
        $start = $request->query['start'] ?? '';
        $end = $request->query['end'] ?? '';
        
        if ($start === '' || $end === '') {
            return Response::error('start and end query params are required', 'VALIDATION_ERROR', 400);
        }
        
        if (!$this->isValidDate($start) || !$this->isValidDate($end)) {
            return Response::error('Invalid date format (YYYY-MM-DD)', 'VALIDATION_ERROR', 400);
        }
        
        try {
            $result = $method($start, $end);
            return Response::json(['data' => $result]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    private function isValidDate(string $date): bool
    {
        $d = \DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }
}
