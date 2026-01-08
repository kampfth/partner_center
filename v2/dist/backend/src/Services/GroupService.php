<?php
/**
 * Group Service - Business logic for product groups
 */

declare(strict_types=1);

namespace App\Services;

use App\Db\SupabaseClient;

class GroupService
{
    private SupabaseClient $db;

    public function __construct()
    {
        $this->db = new SupabaseClient();
    }

    public function getAllGroups(): array
    {
        $groups = $this->db->select('product_groups', 'select=*&order=name.asc');

        // Get product counts per group
        $products = $this->db->select('products', 'select=group_id&group_id=not.is.null');
        $counts = [];
        foreach ($products as $p) {
            $gid = $p['group_id'];
            $counts[$gid] = ($counts[$gid] ?? 0) + 1;
        }

        return array_map(function ($g) use ($counts) {
            return [
                'id' => $g['id'],
                'name' => $g['name'],
                'product_count' => $counts[$g['id']] ?? 0,
                'created_at' => $g['created_at'],
            ];
        }, $groups);
    }

    public function createGroup(string $name, array $productIds): array
    {
        // Validate name
        $name = trim($name);
        if ($name === '' || strlen($name) > 100) {
            throw new \RuntimeException('Group name must be 1-100 characters', 400);
        }

        // Validate product_ids count
        if (count($productIds) < 2) {
            throw new \RuntimeException('Select at least 2 products', 400);
        }

        // Check name uniqueness
        $existing = $this->db->select('product_groups', 'select=id&name=eq.' . urlencode($name) . '&limit=1');
        if (!empty($existing)) {
            throw new \RuntimeException('Group name already exists', 409);
        }

        // Validate all products exist in products table and have no group
        $inList = implode(',', array_map(fn($id) => '"' . addslashes($id) . '"', $productIds));
        $products = $this->db->select('products', "select=product_id,group_id&product_id=in.({$inList})");

        if (count($products) !== count($productIds)) {
            throw new \RuntimeException('Some products are not tracked', 400);
        }

        foreach ($products as $p) {
            if ($p['group_id'] !== null) {
                throw new \RuntimeException('Some products already belong to a group', 400);
            }
        }

        // Create group
        $groupResult = $this->db->insert('product_groups', ['name' => $name]);
        $groupId = $groupResult[0]['id'];

        // Update products
        $this->db->update('products', ['group_id' => $groupId], "product_id=in.({$inList})");

        return [
            'id' => $groupId,
            'name' => $name,
            'product_count' => count($productIds),
        ];
    }

    public function deleteGroup(string $groupId): void
    {
        // Check group exists
        $existing = $this->db->select('product_groups', "select=id&id=eq.{$groupId}&limit=1");
        if (empty($existing)) {
            throw new \RuntimeException('Group not found', 404);
        }

        // Unlink products (set group_id to null)
        $this->db->update('products', ['group_id' => null], "group_id=eq.{$groupId}");

        // Delete group
        $this->db->delete('product_groups', "id=eq.{$groupId}");
    }
}
