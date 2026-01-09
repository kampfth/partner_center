<?php
/**
 * Imports Controller - CSV/ZIP upload handling
 */

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Services\ImportService;

class ImportsController
{
    private ImportService $service;

    public function __construct()
    {
        $this->service = new ImportService();
    }

    public function upload(Request $request): Response
    {
        $file = $request->getFile('file');

        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $errorCode = $file['error'] ?? UPLOAD_ERR_NO_FILE;
            return Response::error("Upload error (code: {$errorCode})", 'VALIDATION_ERROR', 400);
        }

        // File size limit: 50MB
        if ($file['size'] > 50 * 1024 * 1024) {
            return Response::error('File too large (max 50MB)', 'VALIDATION_ERROR', 400);
        }

        try {
            $result = $this->service->processUpload($file);
            return Response::json(['data' => $result]);
        } catch (\RuntimeException $e) {
            $code = $e->getCode() >= 400 ? $e->getCode() : 500;
            return Response::error($e->getMessage(), 'VALIDATION_ERROR', $code);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    public function index(Request $request): Response
    {
        $limit = (int)($request->query['limit'] ?? 20);

        try {
            $imports = $this->service->getImportHistory($limit);
            return Response::json(['data' => $imports]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }
}
