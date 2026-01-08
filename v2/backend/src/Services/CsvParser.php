<?php
/**
 * CSV Parser - Header mapping and row extraction for import
 */

declare(strict_types=1);

namespace App\Services;

class CsvParser
{
    // Header mapping: CSV column (lowercase) -> internal field
    public const HEADER_MAP = [
        'earningid' => 'earning_id',
        'transactiondate' => 'purchase_date',
        'transactionamount' => 'amount_usd',
        'lever' => 'lever',
        'productname' => 'product_name',
        'productid' => 'product_id',
        'transactioncountrycode' => 'customer_country',
        'externalreferenceidlabel' => 'external_label',
    ];

    public function mapHeaders(array $headers): array
    {
        $map = [];
        foreach ($headers as $i => $h) {
            // Strip BOM and normalize
            $h = preg_replace('/^\xEF\xBB\xBF/', '', $h);
            $key = strtolower(trim($h));
            if (isset(self::HEADER_MAP[$key])) {
                $map[self::HEADER_MAP[$key]] = $i;
            }
        }
        return $map;
    }

    public function extractRow(array $row, array $colMap): array
    {
        $data = [];
        foreach (self::HEADER_MAP as $field) {
            $data[$field] = isset($colMap[$field]) ? trim($row[$colMap[$field]] ?? '') : '';
        }
        return $data;
    }

    public function parseMsfsVersion(string $label): ?string
    {
        if (stripos($label, 'MSFS2024') !== false) return 'MSFS2024';
        if (stripos($label, 'MSFS2020') !== false) return 'MSFS2020';
        return null;
    }

    public function isValidRow(array $data): bool
    {
        return !empty($data['product_id']) 
            && !empty($data['earning_id']) 
            && !empty($data['purchase_date']);
    }
}
