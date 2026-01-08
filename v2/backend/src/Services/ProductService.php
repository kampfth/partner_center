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
