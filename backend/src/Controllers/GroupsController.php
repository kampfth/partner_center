<?php
/**
 * Groups Controller
 */

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Services\GroupService;

class GroupsController
{
    private GroupService $service;

    public function __construct()
    {
        $this->service = new GroupService();
    }

    public function index(Request $request): Response
    {
        try {
            $groups = $this->service->getAllGroups();
            return Response::json(['data' => $groups]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    public function create(Request $request): Response
    {
        $name = $request->body['name'] ?? '';
        $productIds = $request->body['product_ids'] ?? [];

        if (!is_string($name) || trim($name) === '') {
            return Response::error('Group name is required', 'VALIDATION_ERROR', 400);
        }

        if (!is_array($productIds)) {
            return Response::error('product_ids must be an array', 'VALIDATION_ERROR', 400);
        }

        try {
            $result = $this->service->createGroup($name, $productIds);
            return Response::json(['data' => $result], 201);
        } catch (\RuntimeException $e) {
            $code = $e->getCode() >= 400 ? $e->getCode() : 500;
            $errorCode = match ($code) {
                400 => 'VALIDATION_ERROR',
                409 => 'CONFLICT',
                default => 'INTERNAL_ERROR',
            };
            return Response::error($e->getMessage(), $errorCode, $code);
        }
    }

    public function delete(Request $request, array $params): Response
    {
        $groupId = $params['group_id'] ?? '';
        if ($groupId === '') {
            return Response::error('Group ID required', 'VALIDATION_ERROR', 400);
        }

        try {
            $this->service->deleteGroup($groupId);
            return Response::json(['success' => true]);
        } catch (\RuntimeException $e) {
            $code = $e->getCode() >= 400 ? $e->getCode() : 500;
            $errorCode = $code === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR';
            return Response::error($e->getMessage(), $errorCode, $code);
        }
    }
}
