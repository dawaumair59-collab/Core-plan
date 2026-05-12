import{n as e,s as t,t as n}from"./jsx-runtime-CnSBKPes.js";var r=t(e(),1),i=n(),a=`-- ============================================================
-- Restaurant SaaS Platform — Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- restaurants
CREATE TABLE IF NOT EXISTS public.restaurants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  logo_url        TEXT,
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  cuisine_type    TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- menu_categories
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

-- menu_items
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

-- videos
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

-- analytics
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

-- subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id           UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  plan                    TEXT NOT NULL CHECK (plan IN ('free','starter','pro','enterprise')),
  status                  TEXT NOT NULL CHECK (status IN ('active','trialing','past_due','canceled','unpaid')),
  current_period_start    TIMESTAMPTZ NOT NULL,
  current_period_end      TIMESTAMPTZ NOT NULL,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
  stripe_subscription_id  TEXT,
  stripe_customer_id      TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_user_id        ON public.restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant ON public.menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category        ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant      ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_videos_menu_item           ON public.videos(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_analytics_restaurant       ON public.analytics(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_restaurant   ON public.subscriptions(restaurant_id);

-- Auto updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE TRIGGER trg_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_menu_categories_updated_at
  BEFORE UPDATE ON public.menu_categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_videos_updated_at
  BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Row-Level Security
ALTER TABLE public.restaurants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions   ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "restaurants_owner_all"    ON public.restaurants    FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "restaurants_public_read"  ON public.restaurants    FOR SELECT USING (is_active = true);

CREATE POLICY "menu_categories_owner_all" ON public.menu_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_categories.restaurant_id AND r.user_id = auth.uid())
);
CREATE POLICY "menu_categories_public_read" ON public.menu_categories FOR SELECT USING (is_active = true);

CREATE POLICY "menu_items_owner_all" ON public.menu_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_items.restaurant_id AND r.user_id = auth.uid())
);
CREATE POLICY "menu_items_public_read" ON public.menu_items FOR SELECT USING (is_available = true);

CREATE POLICY "videos_owner_all" ON public.videos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = videos.restaurant_id AND r.user_id = auth.uid())
);
CREATE POLICY "videos_public_read" ON public.videos FOR SELECT USING (is_published = true);

CREATE POLICY "analytics_owner_read" ON public.analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = analytics.restaurant_id AND r.user_id = auth.uid())
);
CREATE POLICY "analytics_insert_all" ON public.analytics FOR INSERT WITH CHECK (true);

CREATE POLICY "subscriptions_owner_all" ON public.subscriptions FOR ALL USING (auth.uid() = user_id);`,o=[{name:`restaurants`,color:`orange`,icon:`🏪`,fields:[`id (uuid pk)`,`user_id → auth.users`,`name, slug (unique)`,`description, logo_url`,`address, phone, email`,`cuisine_type`,`is_active`,`created_at, updated_at`],rls:`Owner: full CRUD | Public: read active`},{name:`menu_categories`,color:`yellow`,icon:`📂`,fields:[`id (uuid pk)`,`restaurant_id → restaurants`,`name, description`,`display_order`,`is_active`,`created_at, updated_at`],rls:`Owner via restaurant | Public: read active`},{name:`menu_items`,color:`green`,icon:`🍽️`,fields:[`id (uuid pk)`,`category_id → menu_categories`,`restaurant_id → restaurants`,`name, description, price`,`image_url, allergens`,`nutritional_info (jsonb)`,`is_available, is_featured`,`display_order`,`created_at, updated_at`],rls:`Owner via restaurant | Public: read available`},{name:`videos`,color:`blue`,icon:`🎥`,fields:[`id (uuid pk)`,`menu_item_id → menu_items`,`restaurant_id → restaurants`,`title, description`,`video_url, thumbnail_url`,`duration_seconds`,`view_count`,`is_published`,`created_at, updated_at`],rls:`Owner via restaurant | Public: read published`},{name:`analytics`,color:`purple`,icon:`📊`,fields:[`id (uuid pk)`,`restaurant_id → restaurants`,`event_type`,`menu_item_id → menu_items`,`video_id → videos`,`session_id, metadata (jsonb)`,`created_at`],rls:`Owner read | Anyone can insert (tracking)`},{name:`subscriptions`,color:`pink`,icon:`💳`,fields:[`id (uuid pk)`,`user_id → auth.users`,`restaurant_id → restaurants`,`plan (free/starter/pro/enterprise)`,`status (active/trialing/…)`,`current_period_start/end`,`cancel_at_period_end`,`stripe_subscription_id`,`stripe_customer_id`,`created_at, updated_at`],rls:`Owner only (full CRUD)`}],s={orange:`border-orange-500/40 bg-orange-500/5`,yellow:`border-yellow-500/40 bg-yellow-500/5`,green:`border-green-500/40 bg-green-500/5`,blue:`border-blue-500/40 bg-blue-500/5`,purple:`border-purple-500/40 bg-purple-500/5`,pink:`border-pink-500/40 bg-pink-500/5`},c={orange:`bg-orange-500/20 text-orange-300`,yellow:`bg-yellow-500/20 text-yellow-300`,green:`bg-green-500/20 text-green-300`,blue:`bg-blue-500/20 text-blue-300`,purple:`bg-purple-500/20 text-purple-300`,pink:`bg-pink-500/20 text-pink-300`};function l(){let[e,t]=(0,r.useState)(!1);return(0,i.jsxs)(`div`,{className:`space-y-8`,children:[(0,i.jsxs)(`div`,{children:[(0,i.jsx)(`h1`,{className:`text-2xl font-bold`,children:`Database Schema`}),(0,i.jsx)(`p`,{className:`text-zinc-400 mt-1`,children:`Full relational schema with RLS policies for your Supabase project.`})]}),(0,i.jsx)(`div`,{className:`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`,children:o.map(e=>(0,i.jsxs)(`div`,{className:`rounded-xl border p-5 ${s[e.color]}`,children:[(0,i.jsxs)(`div`,{className:`flex items-center gap-2 mb-3`,children:[(0,i.jsx)(`span`,{className:`text-xl`,children:e.icon}),(0,i.jsx)(`span`,{className:`font-mono font-semibold text-sm`,children:e.name})]}),(0,i.jsx)(`ul`,{className:`space-y-1 mb-4`,children:e.fields.map(e=>(0,i.jsx)(`li`,{className:`text-xs text-zinc-400 font-mono`,children:e},e))}),(0,i.jsxs)(`div`,{className:`text-xs rounded-lg px-2 py-1.5 ${c[e.color]}`,children:[(0,i.jsx)(`span`,{className:`font-semibold`,children:`RLS: `}),e.rls]})]},e.name))}),(0,i.jsxs)(`div`,{className:`rounded-xl border border-zinc-800 bg-zinc-900 p-6`,children:[(0,i.jsx)(`h2`,{className:`font-semibold mb-4 text-zinc-300`,children:`Relationships`}),(0,i.jsxs)(`div`,{className:`font-mono text-xs text-zinc-400 space-y-1 leading-relaxed`,children:[(0,i.jsx)(`div`,{children:`auth.users ──▶ restaurants (user_id)`}),(0,i.jsx)(`div`,{children:`auth.users ──▶ subscriptions (user_id)`}),(0,i.jsx)(`div`,{className:`pl-4`,children:`restaurants ──▶ menu_categories (restaurant_id)`}),(0,i.jsx)(`div`,{className:`pl-8`,children:`menu_categories ──▶ menu_items (category_id)`}),(0,i.jsx)(`div`,{className:`pl-4`,children:`restaurants ──▶ menu_items (restaurant_id)`}),(0,i.jsx)(`div`,{className:`pl-8`,children:`menu_items ──▶ videos (menu_item_id)`}),(0,i.jsx)(`div`,{className:`pl-4`,children:`restaurants ──▶ videos (restaurant_id)`}),(0,i.jsx)(`div`,{className:`pl-4`,children:`restaurants ──▶ analytics (restaurant_id)`}),(0,i.jsx)(`div`,{className:`pl-4`,children:`restaurants ──▶ subscriptions (restaurant_id)`})]})]}),(0,i.jsxs)(`div`,{className:`rounded-xl border border-zinc-800 bg-zinc-900`,children:[(0,i.jsxs)(`div`,{className:`flex items-center justify-between px-5 py-3 border-b border-zinc-800`,children:[(0,i.jsx)(`span`,{className:`text-sm font-medium text-zinc-300`,children:`schema.sql — paste into Supabase SQL Editor`}),(0,i.jsx)(`button`,{onClick:()=>{navigator.clipboard.writeText(a),t(!0),setTimeout(()=>t(!1),2e3)},className:`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${e?`bg-green-500/20 text-green-400`:`bg-zinc-700 text-zinc-300 hover:bg-zinc-600`}`,children:e?`✓ Copied!`:`Copy SQL`})]}),(0,i.jsx)(`pre`,{className:`p-5 overflow-x-auto text-xs text-zinc-400 leading-relaxed max-h-96`,children:a})]})]})}export{l as default};