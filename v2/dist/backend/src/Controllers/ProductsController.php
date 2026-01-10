<?php
/**
 * Products Controller
 */

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Services\ProductService;

class ProductsController
{
    private ProductService $service;

    public function __construct()
    {
        $this->service = new ProductService();
    }

    public function index(Request $request): Response
    {
        $tracked = $request->query['tracked'] ?? null;
        $trackedBool = null;
        
        if ($tracked === 'true') {
            $trackedBool = true;
        } elseif ($tracked === 'false') {
            $trackedBool = false;
        }

        try {
            $products = $this->service->getAllProducts($trackedBool);
            return Response::json(['data' => $products]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    public function updateTracking(Request $request, array $params): Response
    {
        $productId = $params['product_id'] ?? '';
        if ($productId === '') {
            return Response::error('Product ID required', 'VALIDATION_ERROR', 400);
        }

        $isTracked = $request->body['is_tracked'] ?? null;
        if (!is_bool($isTracked)) {
            return Response::error('is_tracked must be boolean', 'VALIDATION_ERROR', 400);
        }

        try {
            $result = $this->service->setTracking($productId, $isTracked);
            return Response::json(['data' => $result]);
        } catch (\RuntimeException $e) {
            $code = $e->getCode() >= 400 ? $e->getCode() : 500;
            $errorCode = $code === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR';
            return Response::error($e->getMessage(), $errorCode, $code);
        }
    }

    public function trackedIndex(Request $request): Response
    {
        try {
            $products = $this->service->getTrackedProducts();
            return Response::json(['data' => $products]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    public function updateTrackedProduct(Request $request, array $params): Response
    {
        $productId = $params['product_id'] ?? '';
        if ($productId === '') {
            return Response::error('Product ID required', 'VALIDATION_ERROR', 400);
        }

        try {
            $result = $this->service->updateTrackedProduct($productId, $request->body);
            return Response::json(['data' => $result]);
        } catch (\RuntimeException $e) {
            $code = $e->getCode() >= 400 ? $e->getCode() : 500;
            $errorCode = match ($code) {
                400 => 'VALIDATION_ERROR',
                404 => 'NOT_FOUND',
                default => 'INTERNAL_ERROR',
            };
            return Response::error($e->getMessage(), $errorCode, $code);
        }
    }

    /**
     * Update a product's label and/or product_type (works for any product, tracked or not)
     */
    public function updateProduct(Request $request, array $params): Response
    {
        $productId = $params['product_id'] ?? '';
        if ($productId === '') {
            return Response::error('Product ID required', 'VALIDATION_ERROR', 400);
        }

        try {
            $result = $this->service->updateProduct($productId, $request->body);
            return Response::json(['data' => $result]);
        } catch (\RuntimeException $e) {
            $code = $e->getCode() >= 400 ? $e->getCode() : 500;
            $errorCode = match ($code) {
                400 => 'VALIDATION_ERROR',
                404 => 'NOT_FOUND',
                default => 'INTERNAL_ERROR',
            };
            return Response::error($e->getMessage(), $errorCode, $code);
        }
    }

    /**
     * Export all products as CSV
     */
    public function export(Request $request): Response
    {
        try {
            $products = $this->service->exportProducts();
            
            // Build CSV content
            $csv = "product_id,product_name,label,lever,product_type,is_tracked,last_seen_at\n";
            
            foreach ($products as $p) {
                $csv .= sprintf(
                    "%s,%s,%s,%s,%s,%s,%s\n",
                    $this->escapeCsvField($p['product_id'] ?? ''),
                    $this->escapeCsvField($p['product_name'] ?? ''),
                    $this->escapeCsvField($p['label'] ?? ''),
                    $this->escapeCsvField($p['lever'] ?? ''),
                    $this->escapeCsvField($p['product_type'] ?? ''),
                    ($p['is_tracked'] ?? false) ? 'true' : 'false',
                    $this->escapeCsvField($p['last_seen_at'] ?? '')
                );
            }

            return Response::csv($csv, 'products_export.csv');
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    /**
     * Import products from CSV
     */
    public function import(Request $request): Response
    {
        try {
            $csvContent = $request->body['csv'] ?? null;
            if (empty($csvContent)) {
                return Response::error('CSV content required', 'VALIDATION_ERROR', 400);
            }

            // Parse CSV
            $lines = explode("\n", trim($csvContent));
            if (count($lines) < 2) {
                return Response::error('CSV must have header and at least one data row', 'VALIDATION_ERROR', 400);
            }

            // Limit to 10000 rows
            if (count($lines) > 10001) {
                return Response::error('CSV cannot have more than 10000 rows', 'VALIDATION_ERROR', 400);
            }

            // Parse header
            $header = str_getcsv(array_shift($lines));
            $header = array_map('trim', $header);
            $header = array_map('strtolower', $header);
            
            // Validate required column
            if (!in_array('product_id', $header, true)) {
                return Response::error('CSV must have product_id column', 'VALIDATION_ERROR', 400);
            }

            // Parse rows
            $rows = [];
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '') continue;
                
                $values = str_getcsv($line);
                $row = [];
                foreach ($header as $i => $col) {
                    $row[$col] = $values[$i] ?? '';
                }
                $rows[] = $row;
            }

            $result = $this->service->importProducts($rows);
            return Response::json(['data' => $result]);
        } catch (\RuntimeException $e) {
            $code = $e->getCode() >= 400 ? $e->getCode() : 500;
            return Response::error($e->getMessage(), $code === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR', $code);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    private function escapeCsvField(string $value): string
    {
        // If field contains comma, quote, or newline, wrap in quotes and escape quotes
        if (preg_match('/[,"\n\r]/', $value)) {
            return '"' . str_replace('"', '""', $value) . '"';
        }
        return $value;
    }
}
