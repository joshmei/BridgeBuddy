import type { Bridge } from './bridge'
import { supabase } from './supabase'
import { ensureCached } from './logs'

// Private journal entries (bridge_notes, Phase 3). Per-bridge, per-user, never
// shared. Soft-delete only; queries always filter is_deleted = false. Permanent
// and independent of the collection — bridge_notes references bridge_cache, not
// user_logs, so removing a bridge never touches its notes (see 0005_bridge_notes).

export interface JournalNote {
  id: string
  note: string
  createdAt: string // ISO timestamp
  isSample: boolean
  edited: boolean // updatedAt meaningfully later than createdAt
}

interface NoteRow {
  id: string
  note: string
  is_sample: boolean
  created_at: string
  updated_at: string
}

// "May 30, 2026" from an ISO timestamp (local time).
export function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function toNote(row: NoteRow): JournalNote {
  return {
    id: row.id,
    note: row.note,
    createdAt: row.created_at,
    isSample: row.is_sample,
    // >1s gap ⇒ genuinely edited (inserts set updated_at === created_at).
    edited: new Date(row.updated_at).getTime() - new Date(row.created_at).getTime() > 1000,
  }
}

const NOTE_SELECT = 'id, note, is_sample, created_at, updated_at'

// All active notes for this user + bridge, newest first. Joins bridge_cache on
// the synthetic bridge_key (same approach as getLogForBridge); a bridge that was
// never cached simply has no notes.
export async function getNotes(userId: string, bridge: Bridge): Promise<JournalNote[]> {
  const { data, error } = await supabase
    .from('bridge_notes')
    .select(`${NOTE_SELECT}, bridge_cache!inner(bridge_key)`)
    .eq('user_id', userId)
    .eq('bridge_cache.bridge_key', bridge.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as unknown as NoteRow[]).map(toNote)
}

// Add a real note. Ensures the bridge is cached (for the FK), inserts the note,
// then soft-deletes any onboarding samples so examples and real notes never mix.
export async function addNote(userId: string, bridge: Bridge, text: string): Promise<JournalNote> {
  const bridgeId = await ensureCached(bridge)
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('bridge_notes')
    .insert({
      user_id: userId,
      bridge_id: bridgeId,
      note: text,
      is_sample: false,
      created_at: now,
      updated_at: now,
    })
    .select(NOTE_SELECT)
    .single()
  if (error) throw error

  // First real note → retire the samples (no-op once they're already gone).
  await supabase
    .from('bridge_notes')
    .update({ is_deleted: true, updated_at: now })
    .eq('user_id', userId)
    .eq('is_sample', true)
    .eq('is_deleted', false)

  return toNote(data as unknown as NoteRow)
}

// Edit a note's text; bumps updated_at so the UI can show an "Edited" label.
export async function updateNote(userId: string, noteId: string, text: string): Promise<JournalNote> {
  const { data, error } = await supabase
    .from('bridge_notes')
    .update({ note: text, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('user_id', userId)
    .select(NOTE_SELECT)
    .single()
  if (error) throw error
  return toNote(data as unknown as NoteRow)
}
