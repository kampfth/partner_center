<?php
ini_set('memory_limit', '512M');
ini_set('max_execution_time', 300); // 5 minutes

require 'auth.php'; // Adiciona Autenticação
checkAuth();
require 'ratelimit.php';

require 'config.php';
require 'supabase.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

enforceSameOriginPost();

$ip = getClientIpAddress();
if (!rateLimit("upload:ip:$ip", 30, 60 * 60)) {
    jsonError('Too many uploads. Try again later.', 429);
}
if (!rateLimit("upload:sess:" . session_id(), 30, 60 * 60)) {
    jsonError('Too many uploads. Try again later.', 429);
}

if (!isset($_FILES['file'])) {
    echo json_encode(['error' => 'No file uploaded']);
    exit;
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['error' => 'Upload error code: ' . $file['error']]);
    exit;
}

$maxBytes = 50 * 1024 * 1024; // 50MB
if (!empty($file['size']) && $file['size'] > $maxBytes) {
    jsonError('File too large (max 50MB)', 400);
}

$supabase = new Supabase(SUPABASE_URL, SUPABASE_KEY);

function parseResponse(array $resp): array {
    if (($resp['code'] ?? 500) !== 200 || empty($resp['body'])) return [];
    $decoded = json_decode($resp['body'], true);
    return is_array($decoded) ? $decoded : [];
}

function loadTrackedProductIdSet($supabase): array {
    $rows = parseResponse($supabase->select('all_products', '?select=product_id&is_tracked=eq.true'));
    $set = [];
    foreach ($rows as $r) {
        $pid = $r['product_id'] ?? null;
        if (is_string($pid) && $pid !== '') $set[$pid] = true;
    }
    return $set;
}

$trackedSet = loadTrackedProductIdSet($supabase);

// Função para processar um arquivo CSV
function processCsvFile($csvPath, $supabase, $trackedSet, &$totalRowsRead, &$totalInserted, &$maxDate, &$totalTracked) {
    $handle = fopen($csvPath, 'r');
    if (!$handle) {
        return ['error' => 'Could not open CSV file'];
    }

    $headers = fgetcsv($handle);
    if ($headers === false) {
        fclose($handle);
        return ['error' => 'Could not read CSV headers'];
    }

    $headerMap = array_flip($headers);

    $requiredCols = [
        'earningId', 'transactionDate', 'transactionAmount', 'lever', 
        'productName', 'productId', 'transactionCountryCode', 'externalReferenceIdLabel'
    ];

    // Enforce required headers (avoid silent "0 inserted" imports)
    foreach ($requiredCols as $col) {
        if (!isset($headerMap[$col])) {
            fclose($handle);
            return ['error' => "Missing required CSV column: $col"];
        }
    }

    $batchSize = 1000;
    $transactionsBatch = [];
    $productsBatch = [];
    $seenProducts = [];
    $allProductsBatch = [];
    $seenAllProducts = [];

    while (($row = fgetcsv($handle)) !== false) {
        $totalRowsRead++;

        $data = [];
        foreach ($requiredCols as $col) {
            if (isset($headerMap[$col])) {
                $data[$col] = $row[$headerMap[$col]];
            }
        }

        $pid = $data['productId'] ?? null;
        $eid = $data['earningId'] ?? null;
        $tDate = $data['transactionDate'] ?? null;

        // Validation: Skip if critical fields are missing
        if (!$pid || !$eid || !$tDate) continue;

        // Always discover products into all_products (upsert updates last_seen_at)
        if (!isset($seenAllProducts[$pid])) {
            $allProductsBatch[$pid] = [
                'product_id' => $data['productId'],
                'product_name' => $data['productName'],
                'lever' => $data['lever'],
                'last_seen_at' => date('c')
            ];
            $seenAllProducts[$pid] = true;
        }

        // Only persist transactions for tracked products
        if (!isset($trackedSet[$pid])) {
            continue;
        }
        $totalTracked++;

        // Update Max Date
        if ($maxDate === null || $tDate > $maxDate) {
            $maxDate = $tDate;
        }

        $transactionsBatch[] = [
            'earning_id' => $data['earningId'],
            'transaction_date' => $data['transactionDate'],
            'transaction_amount' => floatval($data['transactionAmount']),
            'lever' => $data['lever'],
            'product_name' => $data['productName'],
            'product_id' => $data['productId'],
            'transaction_country_code' => $data['transactionCountryCode'],
            'external_reference_id_label' => $data['externalReferenceIdLabel']
        ];

        if (!isset($seenProducts[$pid])) {
            $productsBatch[$pid] = [
                'product_id' => $data['productId'],
                'product_name' => $data['productName'],
                'lever' => $data['lever'],
                'label' => $data['productName']
            ];
            $seenProducts[$pid] = true;
        }

        if (count($transactionsBatch) >= $batchSize) {
            if (!empty($allProductsBatch)) {
                // Upsert to all_products (update last_seen_at if exists)
                $supabase->insert('all_products', array_values($allProductsBatch), true);
                $allProductsBatch = [];
            }

            if (!empty($productsBatch)) {
                $supabase->insert('products', array_values($productsBatch), false);
                $productsBatch = [];
            }

            $supabase->insert('transactions', $transactionsBatch, false);
            $totalInserted += count($transactionsBatch);
            $transactionsBatch = [];
        }
    }

    // Flush discovery even if ZERO tracked transactions (core requirement)
    if (!empty($allProductsBatch)) {
        $supabase->insert('all_products', array_values($allProductsBatch), true);
    }

        if (!empty($productsBatch)) {
            $supabase->insert('products', array_values($productsBatch), false);
        }

    // Flush final transactions batch
    if (!empty($transactionsBatch)) {
        $supabase->insert('transactions', $transactionsBatch, false);
        $totalInserted += count($transactionsBatch);
    }

    fclose($handle);
    return ['success' => true];
}

// Detectar tipo de arquivo e processar
$filePath = $file['tmp_name'];
$fileName = $file['name'];
$fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

if (!in_array($fileExtension, ['csv', 'zip'])) {
    jsonError('Invalid file type. Only CSV or ZIP are allowed.', 400);
}

// MIME sniffing (best-effort)
if (function_exists('finfo_open')) {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    if ($finfo) {
        $mime = finfo_file($finfo, $filePath);
        finfo_close($finfo);
        // Allow common CSV/ZIP mimes; shared hosts may vary
        $allowedMimes = [
            'text/plain',
            'text/csv',
            'application/csv',
            'application/vnd.ms-excel',
            'application/zip',
            'application/x-zip-compressed',
            'application/octet-stream',
        ];
        if ($mime && !in_array($mime, $allowedMimes)) {
            jsonError('Invalid file mime type.', 400);
        }
    }
}

$totalRowsRead = 0;
$totalInserted = 0;
$totalTracked = 0;
$maxDate = null;
$csvFilesProcessed = 0;
$errors = [];

// Verificar se é ZIP
if ($fileExtension === 'zip') {
    // Verificar se a extensão ZipArchive está disponível
    if (!class_exists('ZipArchive')) {
        echo json_encode(['error' => 'ZIP extension not available on server']);
        exit;
    }

    $zip = new ZipArchive();
    if ($zip->open($filePath) !== TRUE) {
        echo json_encode(['error' => 'Could not open ZIP file']);
        exit;
    }

    // Criar diretório temporário para extrair CSVs
    $tempDir = sys_get_temp_dir() . '/' . uniqid('csv_extract_');
    if (!mkdir($tempDir, 0755, true)) {
        $zip->close();
        echo json_encode(['error' => 'Could not create temporary directory']);
        exit;
    }

    // Extrair e processar cada arquivo CSV do ZIP
    $maxCsvFiles = 50;
    for ($i = 0; $i < $zip->numFiles; $i++) {
        if ($csvFilesProcessed >= $maxCsvFiles) break;
        $entryName = $zip->getNameIndex($i);
        
        // Ignorar diretórios e arquivos que não são CSV
        if ($entryName === false || substr($entryName, -1) === '/') {
            continue;
        }

        // Zip slip protection (basic)
        if (strpos($entryName, '..') !== false || strpos($entryName, ':') !== false || (isset($entryName[0]) && ($entryName[0] === '/' || $entryName[0] === '\\'))) {
            $errors[] = "Skipped suspicious entry: $entryName";
            continue;
        }

        $entryExtension = strtolower(pathinfo($entryName, PATHINFO_EXTENSION));
        if ($entryExtension !== 'csv') {
            continue;
        }

        // Extrair arquivo CSV
        $extractedPath = $tempDir . '/' . basename($entryName);
        if (file_put_contents($extractedPath, $zip->getFromIndex($i)) === false) {
            $errors[] = "Failed to extract: $entryName";
            continue;
        }

        // Processar CSV extraído
        $result = processCsvFile($extractedPath, $supabase, $trackedSet, $totalRowsRead, $totalInserted, $maxDate, $totalTracked);
        if (isset($result['error'])) {
            $errors[] = "$entryName: " . $result['error'];
        } else {
            $csvFilesProcessed++;
        }

        // Limpar arquivo extraído
        @unlink($extractedPath);
    }

    $zip->close();
    
    // Limpar diretório temporário
    @rmdir($tempDir);

    if ($csvFilesProcessed === 0) {
        echo json_encode([
            'error' => 'No CSV files found in ZIP',
            'details' => $errors
        ]);
        exit;
    }

} else {
    // Processar como CSV direto
    $result = processCsvFile($filePath, $supabase, $trackedSet, $totalRowsRead, $totalInserted, $maxDate, $totalTracked);
    if (isset($result['error'])) {
        echo json_encode(['error' => $result['error']]);
        exit;
    }
    $csvFilesProcessed = 1;
}

$message = "Rows read: $totalRowsRead | Tracked rows: $totalTracked | Inserted: $totalInserted | Latest: $maxDate | CSV files: $csvFilesProcessed";
if (!empty($errors)) {
    $message .= " | Errors: " . implode('; ', $errors);
}

auditLog('CSV_UPLOAD', $message);

echo json_encode([
    'success' => true, 
    'processed' => $totalRowsRead, 
    'inserted' => $totalInserted,
    'tracked' => $totalTracked,
    'latest_date' => $maxDate,
    'csv_files_processed' => $csvFilesProcessed,
    'errors' => $errors
]);
