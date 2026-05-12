-- ============================================================
-- Restaurant SaaS Platform — Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── restaurants ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.restaurants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  logo_url        TEXT,
  banner_url      TEXT,
  theme           TEXT NOT NULL DEFAULT 'ember',
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  cuisine_type    TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supabase Storage bucket for restaurant logos and banners
-- Run this AFTER creating the table, then go to Storage → restaurant-assets → make it Public
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-assets', 'restaurant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can read, owners can upload/delete
CREATE POLICY "storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'restaurant-assets');

CREATE POLICY "storage_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'restaurant-assets' AND auth.role() = 'authenticated'
  );

CREATE POLICY "storage_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'restaurant-assets' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── menu_categories ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── menu_items ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id      UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  restaurant_id    UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  price            NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url        TEXT,
  is_available     BOOLEAN NOT NULL DEFAULT true,
  is_featured      BOOLEAN NOT NULL DEFAULT false,
  allergens        TEXT[],
  nutritional_info JSONB,
  display_order    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── videos ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.videos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id     UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  restaurant_id    UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  video_url        TEXT NOT NULL,
  thumbnail_url    TEXT,
  duration_seconds INTEGER,
  view_count       INTEGER NOT NULL DEFAULT 0,
  is_published     BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── analytics ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  menu_item_id    UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  video_id        UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  session_id      TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── subscriptions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id           UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  plan                    TEXT NOT NULL CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  status                  TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
  current_period_start    TIMESTAMPTZ NOT NULL,
  current_period_end      TIMESTAMPTZ NOT NULL,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
  stripe_subscription_id  TEXT,
  stripe_customer_id      TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_restaurants_user_id        ON public.restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug           ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant ON public.menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category        ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant      ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_videos_menu_item           ON public.videos(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_videos_restaurant          ON public.videos(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_restaurant       ON public.analytics(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type       ON public.analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at       ON public.analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_restaurant   ON public.subscriptions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id      ON public.subscriptions(user_id);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_menu_categories_updated_at
  BEFORE UPDATE ON public.menu_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.restaurants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions   ENABLE ROW LEVEL SECURITY;

-- restaurants: owner full access, public read for active
CREATE POLICY "restaurants_owner_all" ON public.restaurants
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "restaurants_public_read" ON public.restaurants
  FOR SELECT USING (is_active = true);

-- menu_categories: owner through restaurant, public read
CREATE POLICY "menu_categories_owner_all" ON public.menu_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = menu_categories.restaurant_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "menu_categories_public_read" ON public.menu_categories
  FOR SELECT USING (is_active = true);

-- menu_items: owner through restaurant, public read
CREATE POLICY "menu_items_owner_all" ON public.menu_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = menu_items.restaurant_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "menu_items_public_read" ON public.menu_items
  FOR SELECT USING (is_available = true);

-- videos: owner through restaurant, public read for published
CREATE POLICY "videos_owner_all" ON public.videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = videos.restaurant_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "videos_public_read" ON public.videos
  FOR SELECT USING (is_published = true);

-- analytics: owner through restaurant, insert allowed for anyone (tracking)
CREATE POLICY "analytics_owner_read" ON public.analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = analytics.restaurant_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "analytics_insert_all" ON public.analytics
  FOR INSERT WITH CHECK (true);

-- subscriptions: only owner
CREATE POLICY "subscriptions_owner_all" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);
