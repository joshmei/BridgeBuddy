-- Bridge Buddy — Phase 2.6: allow a user to delete (Undo) their own crossing.
-- Paste into the Supabase SQL editor and run it (after 0001 + 0002). Idempotent.
--
-- The original 0002_rls.sql intentionally had no DELETE policy on user_logs, so
-- deletes were denied. The "I've Crossed This" → "Undo" interaction needs to
-- remove the row, so we add an owner-scoped delete: a user may delete only their
-- own logs (user_id = auth.uid()). No user can delete another user's rows.

drop policy if exists "user_logs: delete own" on public.user_logs;
create policy "user_logs: delete own"
  on public.user_logs
  for delete
  to authenticated
  using (user_id = auth.uid());
