<?php
require 'auth.php';
require 'ratelimit.php';
require 'config.php';
require 'supabase.php';

$ga = new PHPGangsta_GoogleAuthenticator();
$secrets = loadSecrets();
$setupMode = !isset($secrets['2fa_secret']);
$error = '';

$supabase = new Supabase(SUPABASE_URL, SUPABASE_KEY);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    enforceSameOriginPost();

    // Rate limit login attempts per IP
    $ip = getClientIpAddress();
    if (!rateLimit("login:ip:$ip", 10, 15 * 60)) {
        http_response_code(429);
        $error = "Too many attempts. Try again later.";
    } else {
    $password = $_POST['password'] ?? '';
    $code = $_POST['code'] ?? '';

    // If no master hash set, use default temporary hash for 'admin123'
    $masterHash = $secrets['master_hash'] ?? '$2y$10$X8Kz7.X8Kz7.X8Kz7.X8Kz7.X8Kz7.X8Kz7.X8Kz7.X8Kz7.X8Kz7.'; 

    if ($error === '' && password_verify($password, $masterHash)) {
        if ($setupMode) {
            $secret = $_POST['secret'] ?? '';
            if ($ga->verifyCode($secret, $code, 2)) {
                saveSecrets(['2fa_secret' => $secret, 'master_hash' => $masterHash]); // Save hash too to init file
                $_SESSION['authenticated'] = true;
                $_SESSION['created_at'] = time();
                $_SESSION['last_activity'] = time();
                session_regenerate_id(true);
                auditLog('LOGIN_SETUP', 'Initial 2FA Setup Completed');
                header("Location: /");
                exit;
            } else {
                $error = "Invalid Code. Try again.";
            }
        } else {
            if ($ga->verifyCode($secrets['2fa_secret'], $code, 2)) {
                $_SESSION['authenticated'] = true;
                $_SESSION['created_at'] = time();
                $_SESSION['last_activity'] = time();
                session_regenerate_id(true);
                auditLog('LOGIN_SUCCESS', 'User logged in successfully');
                header("Location: /");
                exit;
            } else {
                auditLog('LOGIN_FAIL', 'Invalid 2FA Code');
                $error = "Invalid Code.";
            }
        }
    } else {
        auditLog('LOGIN_FAIL', 'Invalid Master Password');
        $error = "Incorrect Master Password.";
    }
    } // rateLimit block
}

$newSecret = $setupMode ? $ga->createSecret() : '';
$qrCodeUrl = $setupMode ? $ga->getQRCodeGoogleUrl('PartnerCenter', $newSecret) : '';
?>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
    </div>
    
    <h2 class="text-2xl font-bold text-center mb-2">Restricted Access</h2>
    <p class="text-slate-400 text-center mb-6 text-sm">
        <?php echo $setupMode ? "Initial Security Setup" : "Two-Factor Authentication"; ?>
    </p>

    <?php if ($error): ?>
        <div class="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 text-sm text-center">
            <?= htmlspecialchars($error) ?>
        </div>
    <?php endif; ?>

    <form method="POST" class="space-y-4">
        
        <div>
            <label class="block text-sm font-medium mb-1 text-slate-300">Master Password</label>
            <input type="password" name="password" required class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none">
        </div>

        <?php if ($setupMode): ?>
            <div class="text-center p-4 bg-white rounded-lg mb-4">
                <img src="<?= $qrCodeUrl ?>" class="mx-auto" />
                <p class="text-slate-900 text-xs mt-2 font-mono"><?= $newSecret ?></p>
            </div>
            <input type="hidden" name="secret" value="<?= $newSecret ?>">
            <p class="text-xs text-slate-400 text-center">Scan with Google Authenticator or Authy</p>
        <?php endif; ?>

        <div>
            <label class="block text-sm font-medium mb-1 text-slate-300">2FA Code (6 digits)</label>
            <input type="text" name="code" required autocomplete="off" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-center tracking-widest text-xl font-mono">
        </div>

        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors">
            <?= $setupMode ? "Setup & Login" : "Login" ?>
        </button>
    </form>
</div>

</body>
</html>

