<?php

function isUuid($value) {
    if (!is_string($value)) return false;
    return preg_match('/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/', $value) === 1;
}

function requireJsonBody() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        jsonError('Invalid JSON body', 400);
    }
    return $data;
}

function requireString($data, $key, $minLen = 1, $maxLen = 500) {
    $v = $data[$key] ?? null;
    if (!is_string($v)) jsonError("Missing or invalid `$key`", 400);
    $v = trim($v);
    if (strlen($v) < $minLen) jsonError("`$key` too short", 400);
    if (strlen($v) > $maxLen) jsonError("`$key` too long", 400);
    return $v;
}

function optionalString($data, $key, $maxLen = 500) {
    if (!array_key_exists($key, $data) || $data[$key] === null) return null;
    if (!is_string($data[$key])) jsonError("Invalid `$key`", 400);
    $v = trim($data[$key]);
    if (strlen($v) > $maxLen) jsonError("`$key` too long", 400);
    return $v;
}

function requireUuid($data, $key) {
    $v = $data[$key] ?? null;
    if (!is_string($v) || !isUuid($v)) jsonError("Missing or invalid `$key`", 400);
    return $v;
}

function optionalUuid($data, $key) {
    if (!array_key_exists($key, $data) || $data[$key] === null || $data[$key] === '') return null;
    $v = $data[$key];
    if (!is_string($v) || !isUuid($v)) jsonError("Invalid `$key`", 400);
    return $v;
}

function requireArray($data, $key, $maxItems = 500) {
    $v = $data[$key] ?? null;
    if (!is_array($v)) jsonError("Missing or invalid `$key`", 400);
    if (count($v) > $maxItems) jsonError("`$key` too many items", 400);
    return $v;
}

function requireDateYmd($value, $fieldName = 'date') {
    if (!is_string($value)) jsonError("Invalid `$fieldName`", 400);
    $value = trim($value);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) jsonError("Invalid `$fieldName` (expected YYYY-MM-DD)", 400);
    return $value;
}


