<?php
/**
 * Auth Service - TOTP management, secrets persistence, and setup flow
 */

declare(strict_types=1);

namespace App\Services;

use App\Security\Totp;

class AuthService
{
    private Totp $totp;
    private string $secretsFile;
    private string $envFile;

    public function __construct()
    {
        $this->totp = new Totp();
        $this->secretsFile = VAR_DIR . '/secrets.php';
        $this->envFile = dirname(VAR_DIR) . '/.env';
    }

    // ==================== SUPABASE CONFIG ====================

    /**
     * Check if Supabase is configured in .env
     */
    public function isSupabaseConfigured(): bool
    {
        $url = SUPABASE_URL;
        $key = SUPABASE_SERVICE_ROLE_KEY;
        
        return !empty($url) && !empty($key) && 
               strpos($url, 'supabase.co') !== false &&
               strlen($key) > 50;
    }

    /**
     * Test Supabase connection with provided credentials
     */
    public function testSupabaseConnection(string $url, string $key): bool
    {
        $testUrl = rtrim($url, '/') . '/rest/v1/';
        
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    "apikey: {$key}",
                    "Authorization: Bearer {$key}",
                ],
                'timeout' => 10,
                'ignore_errors' => true,
            ],
        ]);
        
        $response = @file_get_contents($testUrl, false, $context);
        
        // Check HTTP status from headers
        if (isset($http_response_header)) {
            foreach ($http_response_header as $header) {
                if (preg_match('/^HTTP\/\d+\.\d+\s+(\d+)/', $header, $matches)) {
                    $status = (int)$matches[1];
                    // 200 OK or 404 (no tables) are both valid - means connection works
                    return $status < 500;
                }
            }
        }
        
        return false;
    }

    /**
     * Save Supabase credentials to .env file
     */
    public function saveSupabaseConfig(string $url, string $key): bool
    {
        $envContent = "# Supabase Configuration\n";
        $envContent .= "SUPABASE_URL={$url}\n";
        $envContent .= "SUPABASE_SERVICE_ROLE_KEY={$key}\n";
        
        $result = @file_put_contents($this->envFile, $envContent);
        
        if ($result !== false) {
            // Set restrictive permissions
            @chmod($this->envFile, 0600);
            return true;
        }
        
        return false;
    }

    // ==================== TOTP CONFIG ====================

    public function getSecret(): ?string
    {
        // Priority 1: env variable
        if (defined('AUTH_TOTP_SECRET') && AUTH_TOTP_SECRET !== '') {
            return AUTH_TOTP_SECRET;
        }

        // Priority 2: persisted file
        $secrets = $this->loadSecrets();
        return $secrets['totp_secret'] ?? null;
    }

    public function isSetupMode(): bool
    {
        return $this->getSecret() === null;
    }

    public function createSecret(): string
    {
        return $this->totp->createSecret();
    }

    public function verifyCode(string $code): bool
    {
        $secret = $this->getSecret();
        if ($secret === null) {
            return false;
        }
        return $this->totp->verifyCode($secret, $code, 2);
    }

    public function setupAndVerify(string $secret, string $code): bool
    {
        if (!$this->totp->verifyCode($secret, $code, 2)) {
            return false;
        }

        // Persist secret
        $this->saveSecret($secret);
        return true;
    }

    public function getQrCodeUrl(string $secret): string
    {
        return $this->totp->getQrCodeUrl('PartnerCenter', $secret);
    }

    private function loadSecrets(): array
    {
        if (!file_exists($this->secretsFile)) {
            return [];
        }
        return include $this->secretsFile;
    }

    private function saveSecret(string $secret): void
    {
        $data = $this->loadSecrets();
        $data['totp_secret'] = $secret;
        $content = "<?php\nreturn " . var_export($data, true) . ";\n";
        file_put_contents($this->secretsFile, $content);
    }
}
