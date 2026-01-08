<?php
/**
 * Auth Controller - Login page and authentication
 */

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Http\Middleware\Auth;
use App\Services\AuthService;

class AuthController
{
    private AuthService $authService;

    public function __construct()
    {
        $this->authService = new AuthService();
    }

    public function loginPage(Request $request): Response
    {
        Auth::init();

        if (Auth::isAuthenticated()) {
            return Response::redirect('/');
        }

        $error = '';
        $setupMode = $this->authService->isSetupMode();
        $newSecret = $setupMode ? $this->authService->createSecret() : '';
        $qrCodeUrl = $setupMode ? $this->authService->getQrCodeUrl($newSecret) : '';

        if ($request->method === 'POST') {
            $code = trim($request->body['code'] ?? '');

            if ($setupMode) {
                $secret = $request->body['secret'] ?? '';
                if ($this->authService->setupAndVerify($secret, $code)) {
                    Auth::login();
                    return Response::redirect('/');
                }
                $error = 'Invalid Code. Try again.';
                $newSecret = $secret; // Keep same secret for retry
                $qrCodeUrl = $this->authService->getQrCodeUrl($newSecret);
            } else {
                if ($this->authService->verifyCode($code)) {
                    Auth::login();
                    return Response::redirect('/');
                }
                $error = 'Invalid Code.';
            }
        }

        return Response::html($this->renderLoginPage($setupMode, $error, $newSecret, $qrCodeUrl));
    }

    public function logout(Request $request): Response
    {
        Auth::logout();
        return Response::redirect('/login');
    }

    private function renderLoginPage(bool $setupMode, string $error, string $secret, string $qrUrl): string
    {
        $title = $setupMode ? 'Initial Passkey Setup (2FA)' : 'Two-Factor Authentication';
        $buttonText = $setupMode ? 'Setup 2FA & Login' : 'Login';
        $errorHtml = $error ? $this->errorBlock($error) : '';
        $setupHtml = $setupMode ? $this->setupBlock($secret, $qrUrl) : '';

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Partner Center - Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 flex items-center justify-center min-h-screen text-slate-100">
<div class="bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 w-full max-w-md">
    <div class="flex justify-center mb-6">
        <div class="bg-blue-600 p-3 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
    </div>
    <h2 class="text-2xl font-bold text-center mb-2">Restricted Access</h2>
    <p class="text-slate-400 text-center mb-6 text-sm">{$title}</p>
    {$errorHtml}
    <form method="POST" class="space-y-4">
        {$setupHtml}
        <div>
            <label class="block text-sm font-medium mb-1 text-slate-300">2FA Code (6 digits)</label>
            <input type="text" name="code" required autocomplete="off" maxlength="6" pattern="[0-9]{6}"
                class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-center tracking-widest text-xl font-mono">
        </div>
        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors">
            {$buttonText}
        </button>
    </form>
</div>
</body>
</html>
HTML;
    }

    private function errorBlock(string $error): string
    {
        $escaped = htmlspecialchars($error, ENT_QUOTES, 'UTF-8');
        return <<<HTML
<div class="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 text-sm text-center">{$escaped}</div>
HTML;
    }

    private function setupBlock(string $secret, string $qrUrl): string
    {
        return <<<HTML
<div class="text-center p-4 bg-white rounded-lg mb-4">
    <img src="{$qrUrl}" class="mx-auto" alt="QR Code"/>
    <p class="text-slate-900 text-xs mt-2 font-mono">{$secret}</p>
</div>
<input type="hidden" name="secret" value="{$secret}">
<p class="text-xs text-slate-400 text-center">Scan with Google Authenticator or Authy</p>
HTML;
    }
}
