-- Add msfs_version field to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS msfs_version TEXT;

-- Update existing products based on product names
-- Products with "2024" in the name
UPDATE products 
SET msfs_version = '2024' 
WHERE (product_name ILIKE '%2024%' OR label ILIKE '%2024%')
AND msfs_version IS NULL;

-- Products with "2020" in the name or related keywords
UPDATE products 
SET msfs_version = '2020' 
WHERE (product_name ILIKE '%2020%' OR label ILIKE '%2020%' OR product_name ILIKE '%fs2020%' OR label ILIKE '%fs2020%')
AND msfs_version IS NULL;

