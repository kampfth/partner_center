<?php
/**
 * Auth Service - TOTP management and secrets persistence
 */

declare(strict_types=1);

namespace App\Services;

use App\Security\Totp;

class AuthService
{
    private Totp $totp;
    private string $secretsFile;

    public function __construct()
    {
        $this->totp = new Totp();
        $this->secretsFile = VAR_DIR . '/secrets.php';
    }

    public function getSecret(): ?string
    {
        // Priority 1: env variable
        $envSecret = AUTH_TOTP_SECRET;
        if ($envSecret !== '') {
            return $envSecret;
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
