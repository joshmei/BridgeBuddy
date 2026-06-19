import { lazy, Suspense, useEffect, useState } from 'react'
import type { Bridge } from '../lib/bridge'
import { useAuth } from '../lib/auth'
import { getMyBridges, softDeleteCrossing, formatLogDate, type LoggedBridge } from '../lib/logs'
import {
  STRUCTURE_TYPES,
  STRUCTURE_TYPE_COLORS,
  STRUCTURE_TYPE_LABELS,
  type StructureType,
} from '../lib/structureTypes'
import { StructureBadge } from './StructureBadge'
import { DetailScreen } from './DetailScreen'

// Lazy so mapbox-gl only loads when she opens My Bridges (not on app start).
const BridgesMap = lazy(() => import('./BridgesMap').then((m) => ({ default: m.BridgesMap })))

// My Bridges (PART 5): a dark map header of her logged bridges (Phase 3) above an
// independently-scrolling list. Browsing is open to all; the list is personal, so
// logged out it prompts sign-in. Edit mode lets her remove bridges (soft delete).

const MAP_CLASS = 'h-[38dvh] w-full shrink-0'

// iOS-style red remove control. Sits in a 44x44 tap target (Apple guideline).
function MinusCircle() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#dc2626" />
      <rect x="6.5" y="11" width="11" height="2" rx="1" fill="#fff" />
    </svg>
  )
}

function CardBody({ item }: { item: LoggedBridge }) {
  const { bridge, log } = item
  const showLast = log.lastCrossing !== log.firstRecordedCrossing
  return (
    <>
      {bridge.thumbnailUrl ? (
        <img src={bridge.thumbnailUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
      ) : null}
      <div className="min-w-0 flex-1 space-y-1.5">
        <h2 className="truncate text-base font-semibold text-ink">{bridge.name}</h2>
        <StructureBadge structures={bridge.structures} />
        <div className="space-y-0.5 text-xs text-muted">
          <p>First recorded: {formatLogDate(log.firstRecordedCrossing)}</p>
          {showLast ? <p>Last crossing: {formatLogDate(log.lastCrossing)}</p> : null}
          {log.crossingCount > 1 ? (
            <p className="font-medium text-muted">Crossed {log.crossingCount} times</p>
          ) : null}
        </div>
        {log.notes ? <p className="text-xs italic text-muted">{log.notes}</p> : null}
      </div>
    </>
  )
}

function LoggedCard({
  item,
  editing,
  removing,
  onSelect,
  onRemove,
}: {
  item: LoggedBridge
  editing: boolean
  removing: boolean
  onSelect: (b: Bridge) => void
  onRemove: (item: LoggedBridge) => void
}) {
  return (
    // max-h + opacity + translate animate the slide-out; !mt-0 collapses this
    // row's spacing so the remaining cards close the gap smoothly.
    <li
      className={`overflow-hidden transition-all duration-300 ease-out ${
        removing ? 'max-h-0 -translate-x-6 opacity-0 !mt-0' : 'max-h-60'
      }`}
    >
      {editing ? (
        // Non-tappable in edit mode — only the minus circle is interactive, so a
        // stray tap can't navigate into the detail page.
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-3 rounded-xl border border-divider bg-surface p-3">
            <CardBody item={item} />
          </div>
          <button
            type="button"
            onClick={() => onRemove(item)}
            aria-label={`Remove ${item.bridge.name}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-red-600 active:opacity-70"
          >
            <MinusCircle />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(item.bridge)}
          className="flex w-full gap-3 rounded-xl border border-divider bg-surface p-3 text-left active:bg-divider"
        >
          <CardBody item={item} />
        </button>
      )}
    </li>
  )
}

// Filter her collection by structure type (Phase 3). The options are exactly the
// types present in her logged bridges, shown as colored badge-chips. Sits below
// the map; collapsed by default behind a "Filter by type" button.
function StructureFilterBar({
  present,
  selected,
  onToggle,
  onClear,
}: {
  present: StructureType[]
  selected: StructureType[]
  onToggle: (t: StructureType) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  if (present.length === 0) return null
  return (
    <div className="shrink-0 border-b border-divider px-4 py-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-sm font-medium text-ink"
          aria-expanded={open}
        >
          Filter by type
          {selected.length > 0 ? (
            <span className="rounded-full bg-accent px-1.5 text-xs font-semibold text-white">
              {selected.length}
            </span>
          ) : null}
          <span className="text-muted" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
        </button>
        {selected.length > 0 ? (
          <button type="button" onClick={onClear} className="text-xs font-medium text-accent">
            Clear
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {present.map((t) => {
            const on = selected.includes(t)
            const c = STRUCTURE_TYPE_COLORS[t]
            return (
              <button
                key={t}
                type="button"
                onClick={() => onToggle(t)}
                aria-pressed={on}
                className="rounded-md px-2 py-0.5 text-xs font-semibold"
                style={
                  on
                    ? { backgroundColor: c.bg, color: c.fg }
                    : { color: c.bg, boxShadow: `inset 0 0 0 1.5px ${c.bg}` }
                }
              >
                {STRUCTURE_TYPE_LABELS[t]}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function MyBridgesScreen({
  active,
  onGoToSearch,
}: {
  active: boolean
  onGoToSearch: () => void
}) {
  const { user, signOut, openAuthPrompt } = useAuth()
  const [items, setItems] = useState<LoggedBridge[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Bridge | null>(null)
  const [editing, setEditing] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<LoggedBridge | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<StructureType[]>([])

  // Reload whenever the tab becomes active (so a just-logged crossing appears)
  // or the user changes.
  useEffect(() => {
    if (!active || !user || selected) return
    let alive = true
    // Syncing with an external system (Supabase) — exactly what effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('loading')
    getMyBridges(user.id)
      .then((rows) => {
        if (!alive) return
        setItems(rows)
        setStatus('done')
      })
      .catch((e) => {
        if (!alive) return
        setError(e instanceof Error ? e.message : 'Could not load your bridges.')
        setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [active, user, selected])

  if (selected) {
    return (
      <DetailScreen bridge={selected} backLabel="My Bridges" onBack={() => setSelected(null)} />
    )
  }

  async function onSignOut() {
    if (!window.confirm('Sign out of Bridge Buddy?')) return
    await signOut()
  }

  // Soft-delete the bridge, play the slide-out, then drop it from the list.
  async function confirmRemove(item: LoggedBridge) {
    if (!user) return
    const id = item.log.id
    const wasLast = items.length <= 1
    setPendingRemove(null)
    setActionError(null)
    setRemovingId(id)
    try {
      await softDeleteCrossing(user.id, id)
    } catch (e) {
      setRemovingId(null)
      setActionError(e instanceof Error ? e.message : 'Could not remove. Try again.')
      return
    }
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.log.id !== id))
      setRemovingId(null)
      if (wasLast) setEditing(false)
    }, 300)
  }

  // Identity from Supabase auth metadata (Google-populated, §9.5).
  const meta = user?.user_metadata ?? {}
  const displayName: string =
    meta.display_name || meta.full_name || meta.name || user?.email || 'You'
  const avatarUrl: string | undefined = meta.avatar_url || meta.picture

  // Filter options = structure types present in her collection; filtering a
  // bridge matches if ANY of its types is selected (recovered from applyFilters).
  const present = STRUCTURE_TYPES.filter((t) =>
    items.some((it) => it.bridge.structures.some((s) => s.type === t)),
  )
  const filtered =
    typeFilter.length === 0
      ? items
      : items.filter((it) => it.bridge.structures.some((s) => typeFilter.includes(s.type)))
  const toggleType = (t: StructureType) =>
    setTypeFilter((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-md flex-col bg-page">
      {/* Header — unchanged in spirit: title (+ identity/controls when logged in). */}
      <header className="flex shrink-0 items-center gap-3 px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3">
        {user && avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          {user ? <p className="truncate text-sm text-muted">{displayName}</p> : null}
          <h1 className="text-2xl font-semibold tracking-tight text-ink">My Bridges</h1>
        </div>
        {user ? (
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={onSignOut}
              className="text-sm font-medium text-muted hover:text-accent"
            >
              Sign out
            </button>
            {items.length > 0 ? (
              <button
                type="button"
                onClick={() => setEditing((e) => !e)}
                className="text-sm font-semibold text-accent"
              >
                {editing ? 'Done' : 'Edit'}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {/* Map header — full width, fixed height; mounts only when this tab is active. */}
      {active ? (
        <Suspense fallback={<div className={MAP_CLASS} style={{ backgroundColor: '#1a1a2e' }} />}>
          <BridgesMap bridges={user ? filtered : []} onSelect={setSelected} className={MAP_CLASS} />
        </Suspense>
      ) : (
        <div className={MAP_CLASS} style={{ backgroundColor: '#1a1a2e' }} />
      )}

      {/* Structure-type filter — below the map, options = types in her collection. */}
      {user && status === 'done' && items.length > 0 ? (
        <StructureFilterBar
          present={present}
          selected={typeFilter}
          onToggle={toggleType}
          onClear={() => setTypeFilter([])}
        />
      ) : null}

      {/* Bridge list / state area — scrolls independently below the map. */}
      <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {actionError ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {actionError}
          </p>
        ) : null}

        {!user ? (
          <div>
            <p className="text-sm text-muted">
              Log in to see the bridges you've crossed. Your collection is saved to your account, so
              it follows you to any device.
            </p>
            <button
              type="button"
              onClick={openAuthPrompt}
              className="mt-4 rounded-lg bg-accent px-4 py-2.5 text-base font-medium text-white"
            >
              Log in or sign up
            </button>
          </div>
        ) : status === 'loading' && items.length === 0 ? (
          <p className="text-sm text-muted">Loading your bridges…</p>
        ) : status === 'error' ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">Could not load your bridges</p>
            <p className="mt-1 text-red-700">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div>
            <p className="text-sm text-muted">
              No bridges logged yet. Search for a bridge and tap "I've Crossed This" to start your
              collection.
            </p>
            <button
              type="button"
              onClick={onGoToSearch}
              className="mt-4 rounded-lg bg-accent px-4 py-2.5 text-base font-medium text-white"
            >
              Find a bridge
            </button>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((item) => (
              <LoggedCard
                key={item.log.id}
                item={item}
                editing={editing}
                removing={removingId === item.log.id}
                onSelect={setSelected}
                onRemove={setPendingRemove}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Remove confirmation dialog */}
      {pendingRemove ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setPendingRemove(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-medium text-ink">
              Remove {pendingRemove.bridge.name} from your collection?
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingRemove(null)}
                className="flex-1 rounded-lg border border-divider px-4 py-2.5 text-base font-medium text-ink active:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmRemove(pendingRemove)}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-base font-semibold text-white active:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
