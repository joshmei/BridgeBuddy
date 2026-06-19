-- Bridge Buddy — Phase 3: private journal entries (bridge_notes).
-- Paste into the Supabase SQL editor and run it FIRST, then 0006_bridge_notes_rls.sql.
-- Safe to re-run (IF NOT EXISTS throughout).
--
-- A personal engineering journal: a stack of private notes per bridge, per user.
-- Nobody else ever sees these. Key design points:
--   * SOFT DELETE ONLY — "deleting" a note sets is_deleted = true; rows are never
--     hard-deleted. All reads filter WHERE is_deleted = false. (No DELETE policy
--     in 0006, so hard deletes aren't even possible via the anon/auth keys.)
--   * PERMANENT & INDEPENDENT OF THE COLLECTION. bridge_id references
--     bridge_cache (insert-only, never deleted) — NOT user_logs. So removing a
--     bridge from her collection (user_logs.is_deleted = true) has zero effect on
--     her notes; re-crossing later shows them exactly as left. The two is_deleted
--     columns (user_logs vs bridge_notes) are completely independent.
--   * is_sample marks the two onboarding example notes (created on her first-ever
--     logged bridge) so the UI can show an "Example" chip and soft-delete exactly
--     those two when she saves her first real note. Real notes have is_sample = false.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

create table if not exists public.bridge_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  bridge_id   uuid not null references public.bridge_cache(id) on delete cascade,
  note        text not null,
  is_sample   boolean not null default false,   -- onboarding example notes
  is_deleted  boolean not null default false,   -- soft delete (rows kept forever)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Active notes for a (user, bridge) — the journal's read path.
create index if not exists bridge_notes_user_bridge_idx
  on public.bridge_notes (user_id, bridge_id)
  where is_deleted = false;
