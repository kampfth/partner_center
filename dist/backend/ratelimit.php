<?php

/**
 * Simple file-based rate limiting (works on shared hosting).
 * Stores counters in sys_get_temp_dir() with file locking.
 */

function getClientIpAddress() {
    // Note: On shared hosting, trusting X-Forwarded-For can be unsafe.
    // Prefer REMOTE_ADDR. If your host sets a trusted proxy, you can extend this.
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function rateLimit($bucketKey, $maxRequests, $windowSeconds) {
    $bucketKey = preg_replace('/[^a-zA-Z0-9:_-]/', '_', $bucketKey);
    $path = sys_get_temp_dir() . '/pc_rl_' . hash('sha256', $bucketKey) . '.json';

    $now = time();
    $data = ['reset' => $now + $windowSeconds, 'count' => 0];

    $fh = @fopen($path, 'c+');
    if ($fh === false) {
        // If we can't enforce rate limiting, fail open (avoid breaking app)
        return true;
    }

    try {
        if (flock($fh, LOCK_EX)) {
            $raw = stream_get_contents($fh);
            if ($raw) {
                $decoded = json_decode($raw, true);
                if (is_array($decoded) && isset($decoded['reset'], $decoded['count'])) {
                    $data = $decoded;
                }
            }

            if (!is_int($data['reset'])) $data['reset'] = $now + $windowSeconds;
            if (!is_int($data['count'])) $data['count'] = 0;

            if ($now >= $data['reset']) {
                $data['reset'] = $now + $windowSeconds;
                $data['count'] = 0;
            }

            $data['count']++;
            $allowed = $data['count'] <= $maxRequests;

            // Write back
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($data));
            fflush($fh);

            flock($fh, LOCK_UN);
            return $allowed;
        }
    } finally {
        fclose($fh);
    }

    // Fail open if lock failed
    return true;
}

function jsonError($message, $code = 400) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['error' => $message]);
    exit;
}


