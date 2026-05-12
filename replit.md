# Restaurant SaaS Platform

A full-stack restaurant SaaS platform powered by React + Vite on the frontend and Supabase (PostgreSQL) as the database backend.

## Project overview

This platform lets restaurant owners manage their restaurant profiles, menus, videos, analytics, and subscriptions — all stored in Supabase with row-level security.

## Setup

### 1. Run the database schema in Supabase

Before the app can read/write data, you need to create the tables in your Supabase project:

1. Open your Supabase project → **SQL Editor**
2. Click the **Schema & SQL** tab in the app, then **Copy SQL**
3. Paste into the Supabase SQL Editor and click **Run**

This creates all 6 tables with indexes, triggers, and RLS policies.

### 2. Environment secrets (already set)

| Secret | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

These are configured in Replit Secrets.

## Database schema

| Table | Description |
|---|---|
| `restaurants` | Restaurant profiles — belongs to a `auth.users` user |
| `menu_categories` | Categories per restaurant (Starters, Mains, etc.) |
| `menu_items` | Items per category with price, allergens, nutritional info |
| `videos` | Videos linked to specific menu items |
| `analytics` | Event tracking (page_view, video_play, etc.) per restaurant |
| `subscriptions` | Billing plans (free/starter/pro/enterprise) per restaurant |

## Architecture

- **Frontend**: React 19 + Vite + Tailwind CSS v4
- **Database**: Supabase (PostgreSQL) with Row-Level Security
- **Auth**: Supabase Auth (tables are RLS-protected per user)
- **Type safety**: Full TypeScript types in `src/types/database.ts`
- **CRUD layer**: `src/lib/api.ts` — typed functions for all tables

## Running locally

```bash
npm run dev
```

Runs on port 5000.

## User preferences

- Keep all Supabase queries in `src/lib/api.ts`
- Use TypeScript strict mode
- Tailwind CSS for all styling
