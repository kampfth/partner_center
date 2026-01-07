-- Create all_products table to store all products found in CSV uploads
-- This serves as a discovery table for new products

CREATE TABLE IF NOT EXISTS all_products (
    id SERIAL PRIMARY KEY,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    lever TEXT,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    is_tracked BOOLEAN DEFAULT FALSE,
    UNIQUE(product_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_all_products_tracked ON all_products(is_tracked);
CREATE INDEX IF NOT EXISTS idx_all_products_lever ON all_products(lever);

-- Add comment
COMMENT ON TABLE all_products IS 'Stores all products discovered from CSV uploads, including untracked products';
COMMENT ON COLUMN all_products.is_tracked IS 'TRUE if product exists in the products table and is being tracked';

