-- Add msfs_version field to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS msfs_version TEXT;

-- Update products based on their lever value
-- "Microsoft Flight Simulator 2024" = MSFS 2024
UPDATE products 
SET msfs_version = '2024' 
WHERE lever = 'Microsoft Flight Simulator 2024'
AND msfs_version IS NULL;

-- "Microsoft Flight Simulator" = MSFS 2020
UPDATE products 
SET msfs_version = '2020' 
WHERE lever = 'Microsoft Flight Simulator'
AND msfs_version IS NULL;

-- For any products with neither (unlikely but just in case)
-- Leave as NULL which will show as "Unknown" in the charts

