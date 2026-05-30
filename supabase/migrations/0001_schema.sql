-- Bridge Buddy — Phase 2 schema (auth + personal log)
-- Paste this into the Supabase SQL editor and run it BEFORE 0002_rls.sql.
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
--
-- Notes on shape (decided 2026-05-30, see PRODUCT.md §9):
--   * No public.users table. Signup is email + password only — there is no
--     profile data to store — so user_logs references auth.users(id) directly.
--   * bridge_cache.bridge_key holds the app's SYNTHETIC stable key
--     (slug(name)@roundedCoord, e.g. "brooklyn-bridge@40.71,-73.99"; see
--     app/src/lib/identity.ts). It is intentionally NOT an OSM id: one physical
--     bridge is dozens of OSM elements, so no single OSM id can be the key.
--   * structure (text) is the denormalized primary canonical type, for Stats
--     grouping. structures (jsonb) carries the full lossless StructureFinding[]
--     so the multi-pill badge (hybrids like Brooklyn = suspension + cable-stayed)
--     renders identically on the My Bridges screen — structure type is never
--     buried (CLAUDE.md / §10).
--   * data (jsonb) stores the full enriched Bridge object so My Bridges cards can
--     re-open the detail page with zero additional API calls (the §9 cache).

create extension if not exists "pgcrypto"; -- provides gen_random_uuid()

-- ---------------------------------------------------------------------------
-- bridge_cache — shared, public bridge data (cached after first log)
-- ---------------------------------------------------------------------------
create table if not exists public.bridge_cache (
  id                   uuid primary key default gen_random_uuid(),
  bridge_key           text unique not null,                 -- synthetic stable key (identity.ts)
  name                 text not null,
  lat                  double precision,
  lng                  double precision,
  structure            text,                                 -- denormalized primary canonical type
  structures           jsonb not null default '[]'::jsonb,   -- full StructureFinding[] (preserves hybrids)
  year_built           integer,
  architect            text,
  structural_engineer  text,
  wikipedia_summary    text,
  wikipedia_image      text,
  wikipedia_url        text,
  wikidata_qid         text,
  data                 jsonb,                                -- full enriched Bridge object (rehydrate w/o API calls)
  cached_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- user_logs — one row per (user, bridge); a personal crossing record
-- ---------------------------------------------------------------------------
create table if not exists public.user_logs (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  bridge_id                uuid not null references public.bridge_cache(id) on delete cascade,
  first_recorded_crossing  date not null default current_date, -- first time logged IN THIS APP (honest; not her true first ever)
  last_crossing            date not null default current_date,
  crossing_count           integer not null default 1,
  notes                    text,                               -- display-only this phase; entry UI lands in Phase 4
  created_at               timestamptz not null default now(),
  unique (user_id, bridge_id)                                  -- enables atomic upsert/increment on re-tap
);

create index if not exists user_logs_user_id_idx on public.user_logs (user_id);
