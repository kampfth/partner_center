<?php
/**
 * Partners Controller - Partner management
 */

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Db\SupabaseClient;

class PartnersController
{
    private SupabaseClient $db;

    public function __construct()
    {
        $this->db = new SupabaseClient();
    }

    public function index(Request $request): Response
    {
        try {
            $partners = $this->db->select('partners', 'select=*&order=id.asc');
            return Response::json(['data' => $partners]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    public function update(Request $request): Response
    {
        $partnersArray = $request->body['partners'] ?? [];
        
        if (!is_array($partnersArray) || count($partnersArray) > 10) {
            return Response::error('Invalid partners array', 'VALIDATION_ERROR', 400);
        }
        
        try {
            foreach ($partnersArray as $p) {
                if (!isset($p['id']) || !is_string($p['id'])) {
                    throw new \RuntimeException('Invalid partner id', 400);
                }
                if (!isset($p['name']) || !is_string($p['name']) || trim($p['name']) === '') {
                    throw new \RuntimeException('Invalid partner name', 400);
                }
                $share = (float)($p['share'] ?? 0);
                if ($share < 0 || $share > 1) {
                    throw new \RuntimeException('Share must be between 0 and 1', 400);
                }
            }
            
            // Delete all existing partners
            $this->db->delete('partners', 'id=neq.00000000-0000-0000-0000-000000000000');
            
            // Insert new partners
            $insertData = array_map(fn($p) => [
                'id' => $p['id'],
                'name' => trim($p['name']),
                'share' => (float)$p['share'],
            ], $partnersArray);
            
            $result = $this->db->insert('partners', $insertData);
            return Response::json(['data' => $result]);
            
        } catch (\RuntimeException $e) {
            $code = $e->getCode() >= 400 ? $e->getCode() : 500;
            return Response::error($e->getMessage(), 'VALIDATION_ERROR', $code);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }
}
