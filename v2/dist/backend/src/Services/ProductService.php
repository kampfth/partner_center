<?php
/**
 * Product Service - Business logic for products
 */

declare(strict_types=1);

namespace App\Services;

use App\Db\SupabaseClient;

class ProductService
{
    private SupabaseClient $db;
    
    private const VALID_PRODUCT_TYPES = ['Airports', 'Aircraft', 'Liveries', 'Bundle', 'Utility', 'Misc'];

    public function __construct()
    {
        $this->db = new SupabaseClient();
    }

    public function getAllProducts(?bool $tracked = null): array
    {
        $query = 'select=*&order=product_name.asc';
        if ($tracked !== null) {
            $query .= '&is_tracked=eq.' . ($tracked ? 'true' : 'false');
        }
        return $this->db->select('all_products', $query);
    }

    /**
     * Update label and/or product_type on all_products table
     * This works for both tracked and non-tracked products
     */
    public function updateProduct(string $productId, array $data): array
    {
        $product = $this->getProductByProductId($productId);
        if (!$product) {
            throw new \RuntimeException('Product not found', 404);
        }

        $updateData = [];
        
        // Handle label
        if (array_key_exists('label', $data)) {
            $label = $data['label'];
            if ($label !== null && $label !== '') {
                $label = trim($label);
                if (strlen($label) > 200) {
                    throw new \RuntimeException('Label must be 200 characters or less', 400);
                }
                $updateData['label'] = $label;
            } else {
                $updateData['label'] = null; // Clear label, will use product_name
            }
        }
        
        // Handle product_type
        if (array_key_exists('product_type', $data)) {
            $type = $data['product_type'];
            if ($type !== null && $type !== '') {
                if (!in_array($type, self::VALID_PRODUCT_TYPES, true)) {
                    throw new \RuntimeException('Invalid product_type. Must be one of: ' . implode(', ', self::VALID_PRODUCT_TYPES), 400);
                }
                $updateData['product_type'] = $type;
            } else {
                $updateData['product_type'] = null;
            }
        }

        if (empty($updateData)) {
            throw new \RuntimeException('No valid fields to update', 400);
        }

        // Update all_products
        $result = $this->db->update('all_products', $updateData, "product_id=eq.{$productId}");
        
        // If product is tracked, also update the products table label
        if ($product['is_tracked'] && isset($updateData['label'])) {
            $this->db->update('products', ['label' => $updateData['label'] ?? $product['product_name']], "product_id=eq.{$productId}");
        }

        return array_merge($product, $updateData);
    }

    /**
     * Export all products as array for CSV download
     */
    public function exportProducts(): array
    {
        $products = $this->db->select('all_products', 'select=product_id,product_name,label,lever,product_type,is_tracked,last_seen_at&order=product_name.asc');
        return $products;
    }

    /**
     * Import products from CSV data
     * Only updates label and product_type, does NOT add/remove products
     */
    public function importProducts(array $rows): array
    {
        $updated = 0;
        $skipped = 0;
        $warnings = [];

        foreach ($rows as $index => $row) {
            $productId = $row['product_id'] ?? null;
            $lineNum = $index + 2; // +2 for 1-based index and header row
            
            if (empty($productId)) {
                $warnings[] = "Line {$lineNum}: Missing product_id";
                $skipped++;
                continue;
            }

            // Check if product exists
            $product = $this->getProductByProductId($productId);
            if (!$product) {
                $warnings[] = "Line {$lineNum}: Product ID '{$productId}' not found in database";
                $skipped++;
                continue;
            }

            $updateData = [];

            // Handle label
            if (isset($row['label'])) {
                $label = trim($row['label']);
                if ($label !== '' && strlen($label) <= 200) {
                    $updateData['label'] = $label;
                } elseif ($label === '') {
                    $updateData['label'] = null;
                }
            }

            // Handle product_type
            if (isset($row['product_type'])) {
                $type = trim($row['product_type']);
                if ($type !== '' && in_array($type, self::VALID_PRODUCT_TYPES, true)) {
                    $updateData['product_type'] = $type;
                } elseif ($type === '') {
                    $updateData['product_type'] = null;
                } elseif ($type !== '') {
                    $warnings[] = "Line {$lineNum}: Invalid product_type '{$type}', skipping this field";
                }
            }

            if (!empty($updateData)) {
                $this->db->update('all_products', $updateData, "product_id=eq.{$productId}");
                
                // Also update products table if tracked
                if ($product['is_tracked'] && isset($updateData['label'])) {
                    $labelValue = $updateData['label'] ?? $product['product_name'];
                    $this->db->update('products', ['label' => $labelValue], "product_id=eq.{$productId}");
                }
                
                $updated++;
            } else {
                $skipped++;
            }
        }

        return [
            'updated' => $updated,
            'skipped' => $skipped,
            'warnings' => $warnings,
        ];
    }

    public function getProductByProductId(string $productId): ?array
    {
        $query = 'select=*&product_id=eq.' . urlencode($productId) . '&limit=1';
        $result = $this->db->select('all_products', $query);
        return $result[0] ?? null;
    }

    public function setTracking(string $productId, bool $tracked): array
    {
        $product = $this->getProductByProductId($productId);
        if (!$product) {
            throw new \RuntimeException('Product not found', 404);
        }

        if ($tracked) {
            return $this->enableTracking($product);
        } else {
            return $this->disableTracking($productId);
        }
    }

    private function enableTracking(array $product): array
    {
        $productId = $product['product_id'];

        // Update all_products
        $this->db->update('all_products', ['is_tracked' => true], "product_id=eq.{$productId}");

        // Check if already in products table
        $existing = $this->db->select('products', "select=id&product_id=eq.{$productId}&limit=1");
        if (empty($existing)) {
            // Insert into products table
            $this->db->insert('products', [
                'product_id' => $productId,
                'product_name' => $product['product_name'],
                'lever' => $product['lever'],
                'label' => $product['product_name'],
                'sort_order' => 0,
            ]);
        }

        return ['product_id' => $productId, 'is_tracked' => true];
    }

    private function disableTracking(string $productId): array
    {
        // Delete from products (cascade deletes transactions)
        $this->db->delete('products', "product_id=eq.{$productId}");

        // Update all_products
        $this->db->update('all_products', ['is_tracked' => false], "product_id=eq.{$productId}");

        return ['product_id' => $productId, 'is_tracked' => false];
    }

    public function getTrackedProducts(): array
    {
        $query = 'select=*,product_groups(name)&order=sort_order.asc,product_name.asc';
        $products = $this->db->select('products', $query);

        return array_map(function ($p) {
            return [
                'id' => $p['id'],
                'product_id' => $p['product_id'],
                'product_name' => $p['product_name'],
                'lever' => $p['lever'],
                'label' => $p['label'],
                'group_id' => $p['group_id'],
                'group_name' => $p['product_groups']['name'] ?? null,
                'sort_order' => $p['sort_order'],
            ];
        }, $products);
    }

    public function updateTrackedProduct(string $productId, array $data): array
    {
        $allowedFields = ['label', 'group_id', 'sort_order'];
        $updateData = array_intersect_key($data, array_flip($allowedFields));

        if (empty($updateData)) {
            throw new \RuntimeException('No valid fields to update', 400);
        }

        $result = $this->db->update('products', $updateData, "product_id=eq.{$productId}");
        if (empty($result)) {
            throw new \RuntimeException('Product not found or not tracked', 404);
        }

        return [
            'product_id' => $productId,
            'label' => $result[0]['label'] ?? null,
            'group_id' => $result[0]['group_id'] ?? null,
            'sort_order' => $result[0]['sort_order'] ?? 0,
        ];
    }
}
