<?php
/**
 * HTTP Request wrapper
 */

declare(strict_types=1);

namespace App\Http;

class Request
{
    public readonly string $method;
    public readonly string $path;
    public readonly array $query;
    public readonly array $body;
    public readonly array $files;
    public readonly array $headers;

    public function __construct(
        string $method,
        string $path,
        array $query = [],
        array $body = [],
        array $files = [],
        array $headers = []
    ) {
        $this->method = strtoupper($method);
        $this->path = $path;
        $this->query = $query;
        $this->body = $body;
        $this->files = $files;
        $this->headers = $headers;
    }

    public static function fromGlobals(): self
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        
        // Parse path from REQUEST_URI, stripping query string
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        
        // Normalize path (remove trailing slash except for root)
        if ($path !== '/' && str_ends_with($path, '/')) {
            $path = rtrim($path, '/');
        }

        // Parse JSON body for non-GET requests
        $body = [];
        if ($method !== 'GET' && $method !== 'HEAD') {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            if (str_contains($contentType, 'application/json')) {
                $raw = file_get_contents('php://input');
                if ($raw) {
                    $decoded = json_decode($raw, true);
                    if (is_array($decoded)) {
                        $body = $decoded;
                    }
                }
            } else {
                $body = $_POST;
            }
        }

        // Extract headers
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $header = str_replace('_', '-', substr($key, 5));
                $headers[$header] = $value;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['CONTENT-TYPE'] = $_SERVER['CONTENT_TYPE'];
        }

        return new self($method, $path, $_GET, $body, $_FILES, $headers);
    }

    public function getHeader(string $name): ?string
    {
        $name = strtoupper(str_replace('-', '_', $name));
        return $this->headers[$name] ?? $this->headers[str_replace('_', '-', $name)] ?? null;
    }

    public function getFile(string $name): ?array
    {
        return $this->files[$name] ?? null;
    }

    public function isXhr(): bool
    {
        $requested = $this->getHeader('X-Requested-With');
        return $requested !== null && strtolower($requested) === 'xmlhttprequest';
    }
}
