-- =====================================================================
-- PARFUM SURGEON — Idempotent Supabase E-Commerce Schema Migration
-- Safe to run multiple times; preserves all existing tables and records.
-- =====================================================================

-- 1. Extend products table with full e-commerce & SEO fields
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS sale_price numeric,
  ADD COLUMN IF NOT EXISTS stock integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_bestseller boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_new_arrival boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text;

-- 2. Verified Customer Reviews (moderated: is_approved = true to display)
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  product_name text,
  customer_name text NOT NULL,
  city text,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved ON public.reviews (product_id, is_approved);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public can read approved reviews" ON public.reviews
    FOR SELECT USING (is_approved = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can submit pending review" ON public.reviews
    FOR INSERT WITH CHECK (is_approved = false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Discount Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_order_amount numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public can validate active coupons" ON public.coupons
    FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Blog / Journal Posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  category text DEFAULT 'Fragrance Guide',
  excerpt text,
  content text NOT NULL,
  featured_image text,
  seo_title text,
  seo_description text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public can read published blog posts" ON public.blog_posts
    FOR SELECT USING (is_published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Newsletter Subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
