-- ProteinPrice Database Schema
-- Run this in Supabase SQL Editor

-- Brands
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Retailers
CREATE TABLE IF NOT EXISTS retailers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  affiliate_tag TEXT,
  active BOOLEAN DEFAULT TRUE
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand_id TEXT REFERENCES brands(id),
  category TEXT NOT NULL CHECK (category IN ('protein-powder','protein-bar','protein-drink')),
  sub_category TEXT,
  flavor TEXT,
  size_lb NUMERIC(6,2),
  servings INTEGER,
  protein_g INTEGER,
  calories INTEGER,
  img TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prices (current best price per product per retailer)
CREATE TABLE IF NOT EXISTS prices (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  retailer_id TEXT REFERENCES retailers(id),
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  url TEXT,
  in_stock BOOLEAN DEFAULT TRUE,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, retailer_id)
);

-- Price history
CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  retailer_id TEXT REFERENCES retailers(id),
  price NUMERIC(10,2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price alerts
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  target_price NUMERIC(10,2),
  notified_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Public read access for products, brands, retailers, prices
CREATE POLICY "Public read products" ON products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read brands" ON brands FOR SELECT USING (TRUE);
CREATE POLICY "Public read retailers" ON retailers FOR SELECT USING (active = TRUE);
CREATE POLICY "Public read prices" ON prices FOR SELECT USING (TRUE);
CREATE POLICY "Public read price_history" ON price_history FOR SELECT USING (TRUE);

-- Alerts: anyone can insert, only service role can read/update
CREATE POLICY "Public insert alerts" ON alerts FOR INSERT WITH CHECK (TRUE);

-- Affiliate click tracking
CREATE TABLE IF NOT EXISTS clicks (
  id          BIGSERIAL PRIMARY KEY,
  product_id  TEXT,
  retailer_id TEXT,
  url         TEXT NOT NULL,
  referrer    TEXT,
  user_agent  TEXT,
  clicked_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert clicks" ON clicks FOR INSERT WITH CHECK (TRUE);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clicks_product  ON clicks(product_id);
CREATE INDEX IF NOT EXISTS idx_clicks_retailer ON clicks(retailer_id);
CREATE INDEX IF NOT EXISTS idx_clicks_date     ON clicks(clicked_at DESC);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_prices_product ON prices(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_email ON alerts(email);
CREATE INDEX IF NOT EXISTS idx_alerts_product ON alerts(product_id);
