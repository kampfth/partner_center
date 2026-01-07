<?php
ini_set('memory_limit', '512M');
ini_set('max_execution_time', 300); // 5 minutes

require 'auth.php'; // Adiciona Autenticação
checkAuth();
require 'ratelimit.php';

require 'config.php';
require 'supabase.php';
$whitelist = require 'whitelist.php';

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

// Função para processar um arquivo CSV
function processCsvFile($csvPath, $supabase, $whitelist, &$totalProcessed, &$totalInserted, &$maxDate) {
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

    $batchSize = 1000;
    $transactionsBatch = [];
    $productsBatch = [];
    $seenProducts = [];

    while (($row = fgetcsv($handle)) !== false) {
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

        // Filter by Whitelist
        if (!in_array($pid, $whitelist)) {
            continue;
        }

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
            if (!empty($productsBatch)) {
                $supabase->insert('products', array_values($productsBatch), false);
                $productsBatch = [];
            }

            $supabase->insert('transactions', $transactionsBatch, false);
            $totalInserted += count($transactionsBatch);
            $totalProcessed += count($transactionsBatch);
            $transactionsBatch = [];
        }
    }

    // Processar batch final
    if (!empty($transactionsBatch)) {
        if (!empty($productsBatch)) {
            $supabase->insert('products', array_values($productsBatch), false);
        }
        $supabase->insert('transactions', $transactionsBatch, false);
        $totalInserted += count($transactionsBatch);
        $totalProcessed += count($transactionsBatch);
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

$totalProcessed = 0;
$totalInserted = 0;
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
        $result = processCsvFile($extractedPath, $supabase, $whitelist, $totalProcessed, $totalInserted, $maxDate);
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
    $result = processCsvFile($filePath, $supabase, $whitelist, $totalProcessed, $totalInserted, $maxDate);
    if (isset($result['error'])) {
        echo json_encode(['error' => $result['error']]);
        exit;
    }
    $csvFilesProcessed = 1;
}

$message = "Processed $totalProcessed rows from $csvFilesProcessed CSV file(s), Inserted $totalInserted transactions. Latest date: $maxDate";
if (!empty($errors)) {
    $message .= " | Errors: " . implode('; ', $errors);
}

auditLog('CSV_UPLOAD', $message);

echo json_encode([
    'success' => true, 
    'processed' => $totalProcessed, 
    'inserted' => $totalInserted,
    'latest_date' => $maxDate,
    'csv_files_processed' => $csvFilesProcessed,
    'errors' => $errors
]);


