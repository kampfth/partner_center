<?php
/**
 * Balance Controller - Balance, Expenses, Withdrawals, Revenue Adjustments, Initial Cash
 */

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Services\BalanceService;
use App\Services\ExpenseService;
use App\Services\WithdrawalService;
use App\Services\AdjustmentService;
use App\Services\InitialCashService;

class BalanceController
{
    public function index(Request $request): Response
    {
        $year = (int)($request->query['year'] ?? date('Y'));
        if ($year < 2000 || $year > 2100) {
            $year = (int)date('Y');
        }
        
        try {
            $balance = (new BalanceService())->getBalance($year);
            return Response::json($balance);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    public function years(Request $request): Response
    {
        try {
            $years = (new BalanceService())->getAvailableYears();
            return Response::json(['years' => $years]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    // === Expenses ===
    
    public function createExpense(Request $request): Response
    {
        try {
            $result = (new ExpenseService())->create($request->body);
            return Response::json(['data' => $result], 201);
        } catch (\RuntimeException $e) {
            return $this->handleError($e);
        }
    }

    public function updateExpense(Request $request, array $params): Response
    {
        try {
            $result = (new ExpenseService())->update((int)($params['id'] ?? 0), $request->body);
            return Response::json(['data' => $result]);
        } catch (\RuntimeException $e) {
            return $this->handleError($e);
        }
    }

    public function deleteExpense(Request $request, array $params): Response
    {
        try {
            (new ExpenseService())->delete((int)($params['id'] ?? 0));
            return Response::json(['success' => true]);
        } catch (\RuntimeException $e) {
            return $this->handleError($e);
        }
    }

    // === Withdrawals ===
    
    public function createWithdrawal(Request $request): Response
    {
        try {
            $result = (new WithdrawalService())->create($request->body);
            return Response::json(['data' => $result], 201);
        } catch (\RuntimeException $e) {
            return $this->handleError($e);
        }
    }

    public function updateWithdrawal(Request $request, array $params): Response
    {
        try {
            $result = (new WithdrawalService())->update((int)($params['id'] ?? 0), $request->body);
            return Response::json(['data' => $result]);
        } catch (\RuntimeException $e) {
            return $this->handleError($e);
        }
    }

    public function deleteWithdrawal(Request $request, array $params): Response
    {
        try {
            (new WithdrawalService())->delete((int)($params['id'] ?? 0));
            return Response::json(['success' => true]);
        } catch (\RuntimeException $e) {
            return $this->handleError($e);
        }
    }

    // === Revenue Adjustments ===
    
    public function createAdjustment(Request $request): Response
    {
        try {
            $result = (new AdjustmentService())->create($request->body);
            return Response::json(['data' => $result], 201);
        } catch (\RuntimeException $e) {
            return $this->handleError($e);
        }
    }

    public function updateAdjustment(Request $request, array $params): Response
    {
        try {
            $result = (new AdjustmentService())->update((int)($params['id'] ?? 0), $request->body);
            return Response::json(['data' => $result]);
        } catch (\RuntimeException $e) {
            return $this->handleError($e);
        }
    }

    public function deleteAdjustment(Request $request, array $params): Response
    {
        try {
            (new AdjustmentService())->delete((int)($params['id'] ?? 0));
            return Response::json(['success' => true]);
        } catch (\RuntimeException $e) {
            return $this->handleError($e);
        }
    }

    // === Initial Cash ===
    
    public function getInitialCash(Request $request): Response
    {
        try {
            $data = (new InitialCashService())->getAll();
            return Response::json(['data' => $data]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    public function setInitialCash(Request $request): Response
    {
        try {
            $result = (new InitialCashService())->set($request->body);
            return Response::json($result);
        } catch (\RuntimeException $e) {
            return $this->handleError($e);
        }
    }

    public function deleteInitialCash(Request $request, array $params): Response
    {
        try {
            (new InitialCashService())->delete((int)($params['year'] ?? 0));
            return Response::json(['success' => true]);
        } catch (\RuntimeException $e) {
            return $this->handleError($e);
        }
    }

    private function handleError(\RuntimeException $e): Response
    {
        $code = $e->getCode() >= 400 ? $e->getCode() : 500;
        $errorCode = match ($code) {
            400 => 'VALIDATION_ERROR',
            404 => 'NOT_FOUND',
            default => 'INTERNAL_ERROR',
        };
        return Response::error($e->getMessage(), $errorCode, $code);
    }
}
