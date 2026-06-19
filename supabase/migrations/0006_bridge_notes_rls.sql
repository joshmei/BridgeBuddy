-- Bridge Buddy — Phase 3: RLS for the private journal (bridge_notes).
-- Paste into the Supabase SQL editor and run it AFTER 0005_bridge_notes.sql.
-- Safe to re-run (policies dropped-if-exists before being recreated).
--
-- These notes are strictly private — every policy is owner-scoped to
-- user_id = auth.uid(). No other user can ever read or write them.
--   * SELECT / INSERT / UPDATE — own rows only.
--   * NO DELETE policy → hard deletes are impossible via the anon/authenticated
--     keys. "Deleting" a note is an UPDATE setting is_deleted = true, which the
--     update policy covers. Journal entries are permanent personal history.

alter table public.bridge_notes enable row level security;

drop policy if exists "bridge_notes: select own" on public.bridge_notes;
create policy "bridge_notes: select own"
  on public.bridge_notes
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "bridge_notes: insert own" on public.bridge_notes;
create policy "bridge_notes: insert own"
  on public.bridge_notes
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "bridge_notes: update own" on public.bridge_notes;
create policy "bridge_notes: update own"
  on public.bridge_notes
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No DELETE policy: removal is a soft delete (is_deleted = true) via UPDATE.
