<?php

class Supabase {
    private $url;
    private $key;

    public function __construct($url, $key) {
        $this->url = rtrim($url, '/');
        $this->key = $key;
    }

    public function request($method, $endpoint, $data = null, $headers = []) {
        $ch = curl_init();
        $url = $this->url . '/rest/v1/' . $endpoint;
        
        $defaultHeaders = [
            'apikey: ' . $this->key,
            'Authorization: Bearer ' . $this->key,
            'Content-Type: application/json',
            'Prefer: return=minimal'
        ];

        // Merge headers, allowing overrides
        $finalHeaders = [];
        $headerMap = [];
        
        foreach ($defaultHeaders as $h) {
            $parts = explode(':', $h, 2);
            $headerMap[trim($parts[0])] = trim($parts[1]);
        }
        foreach ($headers as $h) {
            $parts = explode(':', $h, 2);
            if (count($parts) == 2) {
                $headerMap[trim($parts[0])] = trim($parts[1]);
            }
        }
        
        foreach ($headerMap as $k => $v) {
            $finalHeaders[] = "$k: $v";
        }

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $finalHeaders);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } elseif ($method === 'PATCH') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
             if ($data) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } elseif ($method === 'DELETE') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        } elseif ($method === 'GET') {
            // endpoint usually contains query params
        }

        $response = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if (curl_errno($ch)) {
            throw new Exception('Curl error: ' . curl_error($ch));
        }
        
        curl_close($ch);

        return ['code' => $code, 'body' => $response];
    }

    public function insert($table, $data, $upsert = false, $returnRepresentation = false) {
        $headers = [];
        if ($upsert) {
            $headers[] = 'Prefer: resolution=merge-duplicates';
        } else {
             $headers[] = 'Prefer: resolution=ignore-duplicates';
        }
        
        if ($returnRepresentation) {
            // Modify the Prefer header to include return=representation
            // Actually, we need to append or replace.
            // Supabase allows comma separated: prefer: resolution=..., return=representation
            $headers[0] .= ', return=representation';
        }

        return $this->request('POST', $table, $data, $headers);
    }

    public function update($table, $data, $queryParams) {
        // queryParams: ?id=eq.123
        // Prefer: return=representation
        return $this->request('PATCH', $table . $queryParams, $data, ['Prefer: return=representation']);
    }

    public function select($table, $queryParams = '') {
        return $this->request('GET', $table . $queryParams);
    }
}
