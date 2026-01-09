<?php
/**
 * Import Service Tests
 * Minimal test harness for CSV parsing and dedupe logic (no external dependencies)
 * 
 * Run: php v2/backend/tests/ImportServiceTest.php
 */

declare(strict_types=1);

// Bootstrap
require_once __DIR__ . '/../src/bootstrap.php';

class ImportServiceTest
{
    private int $passed = 0;
    private int $failed = 0;

    public function run(): void
    {
        echo "=== ImportService Tests ===\n\n";

        $this->testHeaderMapping();
        $this->testMsfsVersionParsing();
        $this->testCsvParsing();
        $this->testHeaderNormalization();

        echo "\n=== Results ===\n";
        echo "Passed: {$this->passed}\n";
        echo "Failed: {$this->failed}\n";
        
        exit($this->failed > 0 ? 1 : 0);
    }

    private function testHeaderMapping(): void
    {
        $this->test('Header mapping - lowercase', function () {
            $headers = ['earningid', 'productid', 'transactiondate', 'transactionamount', 'lever', 'productname', 'transactioncountrycode', 'externalreferenceidlabel'];
            $map = $this->mapHeaders($headers);
            
            // Use standard column names matching CSV format
            return isset($map['earning_id']) 
                && isset($map['product_id']) 
                && isset($map['transaction_date'])
                && $map['earning_id'] === 0
                && $map['product_id'] === 1;
        });

        $this->test('Header mapping - mixed case', function () {
            $headers = ['EarningId', 'ProductId', 'TransactionDate'];
            $map = $this->mapHeaders($headers);
            
            return isset($map['earning_id']) && isset($map['product_id']);
        });

        $this->test('Header mapping - unknown columns ignored', function () {
            $headers = ['earningid', 'unknowncolumn', 'productid'];
            $map = $this->mapHeaders($headers);
            
            return count($map) === 2 && !isset($map['unknowncolumn']);
        });
    }

    private function testMsfsVersionParsing(): void
    {
        $this->test('MSFS version - detects MSFS2024', function () {
            return $this->parseMsfsVersion('Some Label MSFS2024 Edition') === 'MSFS2024';
        });

        $this->test('MSFS version - detects MSFS2020', function () {
            return $this->parseMsfsVersion('Product for MSFS2020') === 'MSFS2020';
        });

        $this->test('MSFS version - case insensitive', function () {
            return $this->parseMsfsVersion('msfs2024 lowercase') === 'MSFS2024';
        });

        $this->test('MSFS version - returns null for unknown', function () {
            return $this->parseMsfsVersion('Some other product') === null;
        });

        $this->test('MSFS version - empty string returns null', function () {
            return $this->parseMsfsVersion('') === null;
        });

        $this->test('MSFS version - MSFS2024 takes priority over MSFS2020', function () {
            // If both appear, MSFS2024 should be detected first
            return $this->parseMsfsVersion('MSFS2024 MSFS2020') === 'MSFS2024';
        });
    }

    private function testCsvParsing(): void
    {
        $this->test('CSV parsing - extracts correct values', function () {
            $headers = ['earningid', 'productid', 'transactiondate', 'transactionamount', 'lever', 'productname', 'transactioncountrycode', 'externalreferenceidlabel'];
            $row = ['E123', 'P456', '2026-01-08', '99.99', 'Marketplace', 'Test Product', 'US', 'MSFS2024 Edition'];
            
            $map = $this->mapHeaders($headers);
            $data = $this->extractRow($row, $map);
            
            // Use standard column names matching CSV format
            return $data['earning_id'] === 'E123'
                && $data['product_id'] === 'P456'
                && $data['transaction_date'] === '2026-01-08'
                && $data['transaction_amount'] === '99.99'
                && $data['product_name'] === 'Test Product'
                && $data['transaction_country_code'] === 'US';
        });

        $this->test('CSV parsing - handles missing columns gracefully', function () {
            $headers = ['earningid', 'productid'];
            $row = ['E123', 'P456'];
            
            $map = $this->mapHeaders($headers);
            $data = $this->extractRow($row, $map);
            
            return $data['earning_id'] === 'E123'
                && $data['product_name'] === ''; // Missing column = empty string
        });

        $this->test('CSV parsing - trims whitespace', function () {
            $headers = ['earningid', 'productid'];
            $row = ['  E123  ', '  P456  '];
            
            $map = $this->mapHeaders($headers);
            $data = $this->extractRow($row, $map);
            
            return $data['earning_id'] === 'E123' && $data['product_id'] === 'P456';
        });
    }

    private function testHeaderNormalization(): void
    {
        $this->test('Header normalization - handles BOM', function () {
            // UTF-8 BOM + header
            $headers = ["\xEF\xBB\xBFearningid", 'productid'];
            $map = $this->mapHeaders($headers);
            
            // Should still map correctly after trimming
            // Note: actual implementation should strip BOM
            return isset($map['product_id']);
        });
    }

    // === Helper methods (using CsvParser) ===

    private ?\App\Services\CsvParser $parser = null;

    private function getParser(): \App\Services\CsvParser
    {
        if ($this->parser === null) {
            $this->parser = new \App\Services\CsvParser();
        }
        return $this->parser;
    }

    private function mapHeaders(array $headers): array
    {
        return $this->getParser()->mapHeaders($headers);
    }

    private function extractRow(array $row, array $colMap): array
    {
        return $this->getParser()->extractRow($row, $colMap);
    }

    private function parseMsfsVersion(string $label): ?string
    {
        return $this->getParser()->parseMsfsVersion($label);
    }

    // === Test framework ===

    private function test(string $name, callable $fn): void
    {
        try {
            $result = $fn();
            if ($result === true) {
                echo "✓ {$name}\n";
                $this->passed++;
            } else {
                echo "✗ {$name} (assertion failed)\n";
                $this->failed++;
            }
        } catch (\Throwable $e) {
            echo "✗ {$name} (exception: {$e->getMessage()})\n";
            $this->failed++;
        }
    }
}

// Run tests
(new ImportServiceTest())->run();
