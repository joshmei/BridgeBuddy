-- Bridge Buddy — Phase 2.6: soft delete for user_logs.
-- The is_deleted column was added in the Supabase dashboard on 2026-06-13; this
-- file records it so the schema is reproducible from migrations. Idempotent —
-- safe to (re-)run, and a no-op if the column already exists.
--
-- Removing a bridge sets is_deleted = true (an UPDATE, already permitted by the
-- "user_logs: update own" policy from 0002) instead of deleting the row, so
-- removed bridges are preserved for a future "Recently Removed"/recovery feature.
-- All app reads filter WHERE is_deleted = false. The hard-delete policy from
-- 0003_user_logs_delete.sql is therefore no longer used (harmless to leave in
-- place; nothing in the app calls DELETE anymore).

alter table public.user_logs
  add column if not exists is_deleted boolean not null default false;

-- Speeds up the "active logs for a user" reads (optional but cheap).
create index if not exists user_logs_active_idx
  on public.user_logs (user_id)
  where is_deleted = false;
