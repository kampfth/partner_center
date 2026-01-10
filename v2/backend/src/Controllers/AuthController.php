<?php
/**
 * Auth Controller - Login page and two-step setup flow
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

        // Step 1: Check if Supabase is configured
        if (!$this->authService->isSupabaseConfigured()) {
            return $this->handleSupabaseSetup($request);
        }

        // Step 2: Check if TOTP is configured
        if ($this->authService->isSetupMode()) {
            return $this->handleTotpSetup($request);
        }

        // Normal login
        return $this->handleLogin($request);
    }

    private function handleSupabaseSetup(Request $request): Response
    {
        $error = '';
        $url = '';
        $key = '';

        if ($request->method === 'POST' && isset($request->body['setup_step']) && $request->body['setup_step'] === 'supabase') {
            $url = trim($request->body['supabase_url'] ?? '');
            $key = trim($request->body['supabase_key'] ?? '');

            // Validate inputs
            if (empty($url) || empty($key)) {
                $error = 'Both URL and Service Key are required.';
            } elseif (strpos($url, 'supabase.co') === false) {
                $error = 'Invalid Supabase URL. Must contain supabase.co';
            } elseif (strlen($key) < 50) {
                $error = 'Invalid Service Key. Must be a valid JWT token.';
            } else {
                // Test connection
                if ($this->authService->testSupabaseConnection($url, $key)) {
                    if ($this->authService->saveSupabaseConfig($url, $key)) {
                        // Redirect to reload with new config
                        return Response::redirect('/login?setup=db_complete');
                    } else {
                        $error = 'Failed to save configuration. Check write permissions.';
                    }
                } else {
                    $error = 'Connection failed. Please verify your credentials.';
                }
            }
        }

        return Response::html($this->renderSupabaseSetupPage($error, $url, $key));
    }

    private function handleTotpSetup(Request $request): Response
    {
        $error = '';
        $newSecret = $this->authService->createSecret();
        $qrCodeUrl = $this->authService->getQrCodeUrl($newSecret);

        if ($request->method === 'POST' && isset($request->body['setup_step']) && $request->body['setup_step'] === 'totp') {
            $code = trim($request->body['code'] ?? '');
            $secret = $request->body['secret'] ?? '';

            if ($this->authService->setupAndVerify($secret, $code)) {
                Auth::login();
                return Response::redirect('/');
            }
            $error = 'Invalid code. Please try again.';
            $newSecret = $secret;
            $qrCodeUrl = $this->authService->getQrCodeUrl($newSecret);
        }

        return Response::html($this->renderTotpSetupPage($error, $newSecret, $qrCodeUrl));
    }

    private function handleLogin(Request $request): Response
    {
        $error = '';

        if ($request->method === 'POST') {
            $code = trim($request->body['code'] ?? '');

            if ($this->authService->verifyCode($code)) {
                Auth::login();
                return Response::redirect('/');
            }
            $error = 'Invalid code.';
        }

        return Response::html($this->renderLoginPage($error));
    }

    public function logout(Request $request): Response
    {
        Auth::logout();
        return Response::redirect('/login');
    }

    public function session(Request $request): Response
    {
        Auth::init();
        return Response::json([
            'authenticated' => Auth::isAuthenticated(),
        ]);
    }

    // ==================== RENDER METHODS ====================

    private function renderSupabaseSetupPage(string $error, string $url, string $key): string
    {
        $errorHtml = $error ? $this->errorBlock($error) : '';
        $urlValue = htmlspecialchars($url, ENT_QUOTES, 'UTF-8');
        $keyValue = htmlspecialchars($key, ENT_QUOTES, 'UTF-8');

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Partner Center - Setup</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif;
            background: #000;
            color: #fafafa;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            -webkit-font-smoothing: antialiased;
        }
        .card {
            background: #0f0f0f;
            border: 1px solid #1f1f1f;
            border-radius: 1rem;
            padding: 2rem;
            width: 100%;
            max-width: 28rem;
        }
        .icon-wrap {
            width: 3.5rem;
            height: 3.5rem;
            background: #0078ff;
            border-radius: 0.75rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
        }
        .icon-wrap svg { width: 1.75rem; height: 1.75rem; }
        h1 {
            font-size: 1.5rem;
            font-weight: 600;
            text-align: center;
            margin-bottom: 0.5rem;
            letter-spacing: -0.025em;
        }
        .subtitle {
            color: #8a8a8a;
            font-size: 0.875rem;
            text-align: center;
            margin-bottom: 1.5rem;
        }
        .step-indicator {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
        }
        .step {
            width: 2rem;
            height: 0.25rem;
            border-radius: 0.125rem;
            background: #1f1f1f;
        }
        .step.active { background: #0078ff; }
        .error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #f87171;
            padding: 0.75rem 1rem;
            border-radius: 0.75rem;
            font-size: 0.875rem;
            margin-bottom: 1rem;
            text-align: center;
        }
        .form-group { margin-bottom: 1rem; }
        label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: #d4d4d4;
            margin-bottom: 0.5rem;
        }
        input[type="text"], input[type="url"], input[type="password"] {
            width: 100%;
            background: #000;
            border: 1px solid #1f1f1f;
            border-radius: 0.75rem;
            padding: 0.875rem 1rem;
            color: #fafafa;
            font-size: 0.875rem;
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s;
        }
        input:focus {
            border-color: #0078ff;
            box-shadow: 0 0 0 3px rgba(0, 120, 255, 0.15);
        }
        input::placeholder { color: #525252; }
        .hint {
            font-size: 0.75rem;
            color: #525252;
            margin-top: 0.375rem;
        }
        button {
            width: 100%;
            background: #0078ff;
            color: #fff;
            font-weight: 500;
            padding: 0.875rem 1.5rem;
            border: none;
            border-radius: 0.75rem;
            font-size: 0.9375rem;
            cursor: pointer;
            transition: background 0.15s;
            margin-top: 0.5rem;
        }
        button:hover { background: #0066dd; }
        button:active { background: #0055bb; }
    </style>
</head>
<body>
<div class="card">
    <div class="icon-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M3 5V19A9 3 0 0 0 21 19V5"/>
            <path d="M3 12A9 3 0 0 0 21 12"/>
        </svg>
    </div>
    <h1>Database Setup</h1>
    <p class="subtitle">Step 1 of 2 — Connect to Supabase</p>
    
    <div class="step-indicator">
        <div class="step active"></div>
        <div class="step"></div>
    </div>
    
    {$errorHtml}
    
    <form method="POST">
        <input type="hidden" name="setup_step" value="supabase">
        
        <div class="form-group">
            <label for="supabase_url">Supabase URL</label>
            <input type="url" id="supabase_url" name="supabase_url" required 
                   placeholder="https://xxxxx.supabase.co" value="{$urlValue}">
            <p class="hint">Found in Project Settings → API</p>
        </div>
        
        <div class="form-group">
            <label for="supabase_key">Service Role Key</label>
            <input type="password" id="supabase_key" name="supabase_key" required 
                   placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value="{$keyValue}">
            <p class="hint">Use service_role key (not anon key)</p>
        </div>
        
        <button type="submit">Test Connection & Continue</button>
    </form>
</div>
</body>
</html>
HTML;
    }

    private function renderTotpSetupPage(string $error, string $secret, string $qrUrl): string
    {
        $errorHtml = $error ? $this->errorBlock($error) : '';

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Partner Center - Setup 2FA</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif;
            background: #000;
            color: #fafafa;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            -webkit-font-smoothing: antialiased;
        }
        .card {
            background: #0f0f0f;
            border: 1px solid #1f1f1f;
            border-radius: 1rem;
            padding: 2rem;
            width: 100%;
            max-width: 28rem;
        }
        .icon-wrap {
            width: 3.5rem;
            height: 3.5rem;
            background: #0078ff;
            border-radius: 0.75rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
        }
        .icon-wrap svg { width: 1.75rem; height: 1.75rem; }
        h1 {
            font-size: 1.5rem;
            font-weight: 600;
            text-align: center;
            margin-bottom: 0.5rem;
            letter-spacing: -0.025em;
        }
        .subtitle {
            color: #8a8a8a;
            font-size: 0.875rem;
            text-align: center;
            margin-bottom: 1.5rem;
        }
        .step-indicator {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
        }
        .step {
            width: 2rem;
            height: 0.25rem;
            border-radius: 0.125rem;
            background: #1f1f1f;
        }
        .step.active { background: #0078ff; }
        .step.done { background: #22c55e; }
        .error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #f87171;
            padding: 0.75rem 1rem;
            border-radius: 0.75rem;
            font-size: 0.875rem;
            margin-bottom: 1rem;
            text-align: center;
        }
        .qr-wrap {
            background: #fff;
            border-radius: 0.75rem;
            padding: 1rem;
            margin-bottom: 1rem;
            text-align: center;
        }
        .qr-wrap img { display: block; margin: 0 auto; }
        .secret-code {
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 0.75rem;
            color: #171717;
            margin-top: 0.75rem;
            word-break: break-all;
        }
        .scan-hint {
            font-size: 0.75rem;
            color: #525252;
            text-align: center;
            margin-bottom: 1rem;
        }
        .form-group { margin-bottom: 1rem; }
        label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: #d4d4d4;
            margin-bottom: 0.5rem;
        }
        input[type="text"] {
            width: 100%;
            background: #000;
            border: 1px solid #1f1f1f;
            border-radius: 0.75rem;
            padding: 1rem;
            color: #fafafa;
            font-size: 1.5rem;
            font-family: 'SF Mono', Monaco, monospace;
            text-align: center;
            letter-spacing: 0.5em;
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s;
        }
        input:focus {
            border-color: #0078ff;
            box-shadow: 0 0 0 3px rgba(0, 120, 255, 0.15);
        }
        input::placeholder { color: #525252; letter-spacing: normal; }
        button {
            width: 100%;
            background: #0078ff;
            color: #fff;
            font-weight: 500;
            padding: 0.875rem 1.5rem;
            border: none;
            border-radius: 0.75rem;
            font-size: 0.9375rem;
            cursor: pointer;
            transition: background 0.15s;
            margin-top: 0.5rem;
        }
        button:hover { background: #0066dd; }
        button:active { background: #0055bb; }
    </style>
</head>
<body>
<div class="card">
    <div class="icon-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
    </div>
    <h1>Two-Factor Setup</h1>
    <p class="subtitle">Step 2 of 2 — Secure your account</p>
    
    <div class="step-indicator">
        <div class="step done"></div>
        <div class="step active"></div>
    </div>
    
    {$errorHtml}
    
    <div class="qr-wrap">
        <img src="{$qrUrl}" alt="QR Code" width="200" height="200">
        <p class="secret-code">{$secret}</p>
    </div>
    
    <p class="scan-hint">Scan with Google Authenticator, Authy, or 1Password</p>
    
    <form method="POST">
        <input type="hidden" name="setup_step" value="totp">
        <input type="hidden" name="secret" value="{$secret}">
        
        <div class="form-group">
            <label for="code">Verification Code</label>
            <input type="text" id="code" name="code" required autocomplete="off" 
                   maxlength="6" pattern="[0-9]{6}" inputmode="numeric"
                   placeholder="000000">
        </div>
        
        <button type="submit">Complete Setup</button>
    </form>
</div>
</body>
</html>
HTML;
    }

    private function renderLoginPage(string $error): string
    {
        $errorHtml = $error ? $this->errorBlock($error) : '';

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Partner Center - Login</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif;
            background: #000;
            color: #fafafa;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            -webkit-font-smoothing: antialiased;
        }
        .card {
            background: #0f0f0f;
            border: 1px solid #1f1f1f;
            border-radius: 1rem;
            padding: 2rem;
            width: 100%;
            max-width: 28rem;
        }
        .icon-wrap {
            width: 3.5rem;
            height: 3.5rem;
            background: #0078ff;
            border-radius: 0.75rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
        }
        .icon-wrap svg { width: 1.75rem; height: 1.75rem; }
        h1 {
            font-size: 1.5rem;
            font-weight: 600;
            text-align: center;
            margin-bottom: 0.5rem;
            letter-spacing: -0.025em;
        }
        .subtitle {
            color: #8a8a8a;
            font-size: 0.875rem;
            text-align: center;
            margin-bottom: 1.5rem;
        }
        .error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #f87171;
            padding: 0.75rem 1rem;
            border-radius: 0.75rem;
            font-size: 0.875rem;
            margin-bottom: 1rem;
            text-align: center;
        }
        .form-group { margin-bottom: 1rem; }
        label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: #d4d4d4;
            margin-bottom: 0.5rem;
        }
        input[type="text"] {
            width: 100%;
            background: #000;
            border: 1px solid #1f1f1f;
            border-radius: 0.75rem;
            padding: 1rem;
            color: #fafafa;
            font-size: 1.5rem;
            font-family: 'SF Mono', Monaco, monospace;
            text-align: center;
            letter-spacing: 0.5em;
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s;
        }
        input:focus {
            border-color: #0078ff;
            box-shadow: 0 0 0 3px rgba(0, 120, 255, 0.15);
        }
        input::placeholder { color: #525252; letter-spacing: normal; }
        button {
            width: 100%;
            background: #0078ff;
            color: #fff;
            font-weight: 500;
            padding: 0.875rem 1.5rem;
            border: none;
            border-radius: 0.75rem;
            font-size: 0.9375rem;
            cursor: pointer;
            transition: background 0.15s;
            margin-top: 0.5rem;
        }
        button:hover { background: #0066dd; }
        button:active { background: #0055bb; }
    </style>
</head>
<body>
<div class="card">
    <div class="icon-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
    </div>
    <h1>Partner Center</h1>
    <p class="subtitle">Enter your 2FA code to continue</p>
    
    {$errorHtml}
    
    <form method="POST">
        <div class="form-group">
            <label for="code">Authentication Code</label>
            <input type="text" id="code" name="code" required autocomplete="off" 
                   maxlength="6" pattern="[0-9]{6}" inputmode="numeric"
                   placeholder="000000">
        </div>
        
        <button type="submit">Login</button>
    </form>
</div>
</body>
</html>
HTML;
    }

    private function errorBlock(string $error): string
    {
        $escaped = htmlspecialchars($error, ENT_QUOTES, 'UTF-8');
        return "<div class=\"error\">{$escaped}</div>";
    }
}
