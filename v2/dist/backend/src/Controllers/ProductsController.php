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
}
