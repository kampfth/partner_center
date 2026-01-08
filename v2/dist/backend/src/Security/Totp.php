<?php
/**
 * TOTP (Time-based One-Time Password) implementation
 * RFC 6238 compliant
 */

declare(strict_types=1);

namespace App\Security;

class Totp
{
    private int $codeLength = 6;
    private int $period = 30;

    public function createSecret(int $length = 16): string
    {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = '';

        $bytes = random_bytes($length);
        for ($i = 0; $i < $length; $i++) {
            $secret .= $chars[ord($bytes[$i]) & 31];
        }

        return $secret;
    }

    public function getCode(string $secret, ?int $timeSlice = null): string
    {
        if ($timeSlice === null) {
            $timeSlice = (int)floor(time() / $this->period);
        }

        $secretKey = $this->base32Decode($secret);
        $time = pack('N*', 0) . pack('N*', $timeSlice);
        $hmac = hash_hmac('sha1', $time, $secretKey, true);
        $offset = ord(substr($hmac, -1)) & 0x0F;
        $hashPart = substr($hmac, $offset, 4);
        $value = unpack('N', $hashPart)[1] & 0x7FFFFFFF;
        $modulo = 10 ** $this->codeLength;

        return str_pad((string)($value % $modulo), $this->codeLength, '0', STR_PAD_LEFT);
    }

    public function verifyCode(string $secret, string $code, int $discrepancy = 1): bool
    {
        if (strlen($code) !== $this->codeLength) {
            return false;
        }

        $currentTimeSlice = (int)floor(time() / $this->period);

        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            $calculatedCode = $this->getCode($secret, $currentTimeSlice + $i);
            if (hash_equals($calculatedCode, $code)) {
                return true;
            }
        }

        return false;
    }

    public function getQrCodeUrl(string $label, string $secret, string $issuer = 'PartnerCenter'): string
    {
        $otpauth = sprintf(
            'otpauth://totp/%s?secret=%s&issuer=%s',
            rawurlencode($label),
            $secret,
            rawurlencode($issuer)
        );

        return sprintf(
            'https://api.qrserver.com/v1/create-qr-code/?data=%s&size=200x200&ecc=M',
            rawurlencode($otpauth)
        );
    }

    private function base32Decode(string $input): string
    {
        $map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $input = strtoupper(rtrim($input, '='));
        $output = '';
        $buffer = 0;
        $bitsLeft = 0;

        for ($i = 0, $len = strlen($input); $i < $len; $i++) {
            $val = strpos($map, $input[$i]);
            if ($val === false) {
                continue;
            }
            $buffer = ($buffer << 5) | $val;
            $bitsLeft += 5;
            if ($bitsLeft >= 8) {
                $bitsLeft -= 8;
                $output .= chr(($buffer >> $bitsLeft) & 0xFF);
            }
        }

        return $output;
    }
}
