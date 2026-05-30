-- Bridge Buddy — Phase 2 Row Level Security
-- Paste this into the Supabase SQL editor and run it AFTER 0001_schema.sql.
-- Safe to re-run: policies are dropped-if-exists before being (re)created.
--
-- Why this matters (PRODUCT.md §13): Supabase tables are reachable via the anon
-- key from any client. Without RLS, anyone could read or write every user's
-- logs. RLS must be ON for every table; a table with RLS disabled is wide open
-- regardless of intent.
--
-- bridge_cache: public, shared bridge data.
--   * SELECT  — anyone (anon + authenticated): bridge data is public, not personal.
--   * INSERT  — authenticated only: the client populates the cache when a logged-in
--               user records a crossing. (We do NOT use the service role key
--               client-side — overrides the earlier §13 "service role only" note,
--               decided 2026-05-30.)
--   * UPDATE/DELETE — no policy → denied for everyone via the anon/auth keys.
--
-- user_logs: private, owner-scoped. A user may only ever touch their own rows.
--   * SELECT/INSERT/UPDATE — only where user_id = auth.uid().
--   * DELETE — no policy → denied. No user can see or touch another user's logs. Ever.

-- ---------------------------------------------------------------------------
-- bridge_cache
-- ---------------------------------------------------------------------------
alter table public.bridge_cache enable row level security;

drop policy if exists "bridge_cache: public read" on public.bridge_cache;
create policy "bridge_cache: public read"
  on public.bridge_cache
  for select
  using (true);

drop policy if exists "bridge_cache: authenticated insert" on public.bridge_cache;
create policy "bridge_cache: authenticated insert"
  on public.bridge_cache
  for insert
  to authenticated
  with check (true);

-- No UPDATE or DELETE policy: cache rows cannot be modified or removed via the
-- anon/authenticated keys.

-- ---------------------------------------------------------------------------
-- user_logs
-- ---------------------------------------------------------------------------
alter table public.user_logs enable row level security;

drop policy if exists "user_logs: select own" on public.user_logs;
create policy "user_logs: select own"
  on public.user_logs
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_logs: insert own" on public.user_logs;
create policy "user_logs: insert own"
  on public.user_logs
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_logs: update own" on public.user_logs;
create policy "user_logs: update own"
  on public.user_logs
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No DELETE policy: logs cannot be deleted via the anon/authenticated keys.
