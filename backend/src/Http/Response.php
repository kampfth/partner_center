<?php
/**
 * HTTP Response helper
 */

declare(strict_types=1);

namespace App\Http;

class Response
{
    private int $statusCode;
    private array $headers;
    private string $body;

    public function __construct(int $statusCode = 200, string $body = '', array $headers = [])
    {
        $this->statusCode = $statusCode;
        $this->body = $body;
        $this->headers = $headers;
    }

    public static function json(array $data, int $status = 200): self
    {
        return new self(
            $status,
            json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ['Content-Type' => 'application/json']
        );
    }

    public static function error(string $message, string $code, int $status = 400): self
    {
        return self::json([
            'error' => $message,
            'code' => $code,
        ], $status);
    }

    public static function html(string $content, int $status = 200): self
    {
        return new self($status, $content, ['Content-Type' => 'text/html; charset=UTF-8']);
    }

    public static function redirect(string $url, int $status = 302): self
    {
        return new self($status, '', ['Location' => $url]);
    }

    public function withHeader(string $name, string $value): self
    {
        $this->headers[$name] = $value;
        return $this;
    }

    public function send(): void
    {
        http_response_code($this->statusCode);

        // Security headers
        header('X-Frame-Options: DENY');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('X-Robots-Tag: noindex, nofollow, noarchive');

        foreach ($this->headers as $name => $value) {
            header("$name: $value");
        }

        echo $this->body;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getBody(): string
    {
        return $this->body;
    }
}
