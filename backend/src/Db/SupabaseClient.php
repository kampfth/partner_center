<?php
/**
 * Supabase REST API Client
 * All queries target schema v2 via Accept-Profile/Content-Profile headers
 */

declare(strict_types=1);

namespace App\Db;

class SupabaseClient
{
    private string $url;
    private string $key;
    private string $schema = 'v2';

    public function __construct(?string $url = null, ?string $key = null)
    {
        $this->url = $url ?? SUPABASE_URL;
        $this->key = $key ?? SUPABASE_SERVICE_ROLE_KEY;
    }

    public function select(string $table, string $query = ''): array
    {
        $endpoint = "/rest/v1/{$table}" . ($query ? "?{$query}" : '');
        return $this->request('GET', $endpoint);
    }

    public function insert(string $table, array $data, bool $upsert = false, ?string $onConflict = null): array
    {
        $endpoint = "/rest/v1/{$table}";
        $headers = ['Prefer' => 'return=representation'];
        
        if ($upsert && $onConflict) {
            $endpoint .= "?on_conflict={$onConflict}";
            $headers['Prefer'] = 'return=representation,resolution=merge-duplicates';
        } elseif ($upsert) {
            $headers['Prefer'] = 'return=representation,resolution=merge-duplicates';
        }

        return $this->request('POST', $endpoint, $data, $headers);
    }

    public function update(string $table, array $data, string $filter): array
    {
        $endpoint = "/rest/v1/{$table}?{$filter}";
        return $this->request('PATCH', $endpoint, $data, ['Prefer' => 'return=representation']);
    }

    public function delete(string $table, string $filter): array
    {
        $endpoint = "/rest/v1/{$table}?{$filter}";
        return $this->request('DELETE', $endpoint, null, ['Prefer' => 'return=representation']);
    }

    public function rpc(string $function, array $params = []): array
    {
        $endpoint = "/rest/v1/rpc/{$function}";
        return $this->request('POST', $endpoint, $params);
    }

    public function count(string $table, string $filter = ''): int
    {
        $query = 'select=count';
        if ($filter) {
            $query .= '&' . $filter;
        }
        $endpoint = "/rest/v1/{$table}?{$query}";
        $result = $this->request('GET', $endpoint, null, ['Prefer' => 'count=exact']);
        return (int)($result['count'] ?? 0);
    }

    private function request(string $method, string $endpoint, ?array $data = null, array $extraHeaders = []): array
    {
        $url = rtrim($this->url, '/') . $endpoint;

        $headers = array_merge([
            'apikey' => $this->key,
            'Authorization' => "Bearer {$this->key}",
            'Content-Type' => 'application/json',
            'Accept-Profile' => $this->schema,
            'Content-Profile' => $this->schema,
        ], $extraHeaders);

        $headerLines = [];
        foreach ($headers as $name => $value) {
            $headerLines[] = "{$name}: {$value}";
        }

        $options = [
            'http' => [
                'method' => $method,
                'header' => implode("\r\n", $headerLines),
                'ignore_errors' => true,
                'timeout' => 30,
            ],
        ];

        if ($data !== null && $method !== 'GET') {
            $options['http']['content'] = json_encode($data);
        }

        $context = stream_context_create($options);
        $response = @file_get_contents($url, false, $context);

        // Parse response headers for count
        $statusCode = 200;
        $countHeader = null;
        if (isset($http_response_header)) {
            foreach ($http_response_header as $header) {
                if (preg_match('/^HTTP\/\d+\.\d+\s+(\d+)/', $header, $matches)) {
                    $statusCode = (int)$matches[1];
                }
                if (stripos($header, 'content-range:') === 0) {
                    if (preg_match('/\/(\d+|\*)$/', $header, $matches)) {
                        $countHeader = $matches[1] === '*' ? null : (int)$matches[1];
                    }
                }
            }
        }

        $decoded = $response ? json_decode($response, true) : null;

        if ($statusCode >= 400) {
            $msg = $decoded['message'] ?? $decoded['error'] ?? 'Supabase request failed';
            throw new \RuntimeException($msg, $statusCode);
        }

        if ($countHeader !== null && is_array($decoded)) {
            return ['data' => $decoded, 'count' => $countHeader];
        }

        return is_array($decoded) ? $decoded : [];
    }
}
