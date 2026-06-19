import { useEffect, useRef, useState } from 'react'
import type { Bridge } from '../lib/bridge'
import { useAuth } from '../lib/auth'
import { getNotes, addNote, updateNote, formatNoteDate, type JournalNote } from '../lib/notes'

// Private journal (Phase 3): a right-aligned "Journal (n)" pill above the crossing
// button; tapping opens a full-screen panel sliding in from the right. The panel
// lists her private notes for this bridge (newest first), with inline add/edit.
// Soft-delete only; samples are read-only with an "Example" chip. Logged out → a
// subtle sign-in prompt instead of the + button.

const PLACEHOLDER =
  'e.g. I crossed this with my dad on our road trip in 2019, or: Impressive cable-stay design — the deck clearance here is surprisingly low.'

function NotebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 3v18M9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

const TEXTAREA_CLASS =
  'w-full rounded-lg border border-divider bg-page p-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none'

// After the journal closes, iOS Safari can stay zoomed in from the textarea.
// Briefly clamp maximum-scale to snap the viewport back, then restore the normal
// viewport so pinch-zoom elsewhere still works. Runs only after a full close.
function resetZoom() {
  const viewport = document.querySelector('meta[name="viewport"]')
  if (!viewport) return
  viewport.setAttribute(
    'content',
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover',
  )
  setTimeout(() => {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover')
  }, 300)
}

export function BridgeJournal({ bridge }: { bridge: Bridge }) {
  const { user, openAuthPrompt } = useAuth()
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false) // playing the close (page-turn) animation
  const closeTimer = useRef<number | null>(null)
  const [notes, setNotes] = useState<JournalNote[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let alive = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    getNotes(user.id, bridge)
      .then((n) => {
        if (alive) setNotes(n)
      })
      .catch(() => {
        /* non-fatal */
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // bridge.id is the stable synthetic key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, bridge.id])

  async function reload() {
    if (!user) return
    setNotes(await getNotes(user.id, bridge))
  }

  async function saveAdd() {
    if (!user || !draft.trim()) return
    setBusy(true)
    setError(null)
    try {
      await addNote(user.id, bridge, draft.trim())
      setDraft('')
      setAdding(false)
      resetZoom() // left the textarea → snap iOS zoom back
      await reload()
    } catch {
      setError('Could not save. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit() {
    if (!user || !editingId || !editText.trim()) return
    setBusy(true)
    setError(null)
    try {
      await updateNote(user.id, editingId, editText.trim())
      setEditingId(null)
      resetZoom() // left the textarea → snap iOS zoom back
      await reload()
    } catch {
      setError('Could not save. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function openPanel() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setClosing(false)
    setOpen(true)
  }

  // Play the reverse page-turn, then unmount the panel.
  function closePanel() {
    setClosing(true)
    closeTimer.current = window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
      closeTimer.current = null
      resetZoom() // panel fully closed → snap iOS zoom back
    }, 480) // matches the journal-close animation duration
  }

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  return (
    <>
      {/* Pill — right-aligned, above "I've Crossed This". */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openPanel}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-[13px] font-medium text-ink"
          style={{ borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#e8d8dc' }}
        >
          <NotebookIcon />
          Journal
          {user && notes.length > 0 ? (
            <span className="rounded-full bg-divider px-1.5 text-[11px] font-semibold text-muted">
              {notes.length}
            </span>
          ) : null}
        </button>
      </div>

      {/* Full-screen panel that opens like a book cover (3D page turn). Parent
          holds the perspective; the inner panel rotates on its left edge. */}
      {open ? (
        <div className="fixed inset-0 z-50" style={{ perspective: '1200px' }}>
          <div
            className={`journal-panel ${closing ? 'journal-close' : 'journal-open'} flex h-full w-full flex-col bg-page`}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-divider px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={closePanel}
                className="text-sm font-medium text-muted hover:text-accent"
              >
                ‹ Back
              </button>
            <h2 className="text-base font-semibold text-ink">Your Journal</h2>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setDraft('')
                  setAdding(true)
                }}
                aria-label="Add a note"
                className="text-2xl leading-none text-accent"
              >
                +
              </button>
            ) : (
              <span className="w-6" />
            )}
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
            ) : null}

            {!user ? (
              <div>
                <p className="text-sm text-muted">Sign in to keep a journal on this bridge.</p>
                <button
                  type="button"
                  onClick={openAuthPrompt}
                  className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
                >
                  Sign in
                </button>
              </div>
            ) : (
              <>
                {adding ? (
                  <div className="space-y-2 rounded-xl border border-divider bg-surface p-3">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={PLACEHOLDER}
                      rows={4}
                      autoFocus
                      className={TEXTAREA_CLASS}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAdding(false)
                          setDraft('')
                          resetZoom()
                        }}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveAdd}
                        disabled={busy || !draft.trim()}
                        className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                      >
                        {busy ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {loading && notes.length === 0 ? (
                  <p className="text-sm text-muted">Loading…</p>
                ) : notes.length === 0 && !adding ? (
                  <p className="text-sm text-muted">Tap + to add your first note about this bridge.</p>
                ) : null}

                {notes.map((n) =>
                  editingId === n.id ? (
                    <div key={n.id} className="space-y-2 rounded-xl border border-divider bg-surface p-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={4}
                        autoFocus
                        className={TEXTAREA_CLASS}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null)
                            resetZoom()
                          }}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={busy || !editText.trim()}
                          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                        >
                          {busy ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={n.id} className="rounded-xl border border-divider bg-surface p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-muted">{formatNoteDate(n.createdAt)}</p>
                        {n.isSample ? (
                          <span className="shrink-0 rounded-full bg-divider px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Example
                          </span>
                        ) : null}
                      </div>
                      {n.edited ? <p className="text-[10px] text-muted">Edited</p> : null}
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{n.note}</p>
                      {!n.isSample ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(n.id)
                            setEditText(n.note)
                          }}
                          className="mt-2 text-xs font-medium text-accent"
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                  ),
                )}
              </>
            )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
