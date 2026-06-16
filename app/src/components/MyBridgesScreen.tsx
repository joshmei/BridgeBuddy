import { useEffect, useState } from 'react'
import type { Bridge } from '../lib/bridge'
import { useAuth } from '../lib/auth'
import { getMyBridges, softDeleteCrossing, formatLogDate, type LoggedBridge } from '../lib/logs'
import { StructureBadge } from './StructureBadge'
import { DetailScreen } from './DetailScreen'

// My Bridges (PART 5): every bridge she's logged, most recently crossed first.
// Browsing is open to all, but this list is personal — logged out, it prompts
// sign-in instead. Edit mode (Phase 2.6) lets her remove bridges (soft delete).

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
        <h2 className="truncate text-base font-semibold text-slate-900">{bridge.name}</h2>
        <StructureBadge structures={bridge.structures} />
        <div className="space-y-0.5 text-xs text-slate-500">
          <p>First recorded: {formatLogDate(log.firstRecordedCrossing)}</p>
          {showLast ? <p>Last crossing: {formatLogDate(log.lastCrossing)}</p> : null}
          {log.crossingCount > 1 ? (
            <p className="font-medium text-slate-600">Crossed {log.crossingCount} times</p>
          ) : null}
        </div>
        {log.notes ? <p className="text-xs italic text-slate-600">{log.notes}</p> : null}
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
          <div className="flex flex-1 gap-3 rounded-xl border border-slate-200 bg-white p-3">
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
          className="flex w-full gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left active:bg-slate-100"
        >
          <CardBody item={item} />
        </button>
      )}
    </li>
  )
}

export function MyBridgesScreen({ active }: { active: boolean }) {
  const { user, signOut, openAuthPrompt } = useAuth()
  const [items, setItems] = useState<LoggedBridge[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Bridge | null>(null)
  const [editing, setEditing] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<LoggedBridge | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

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

  if (!user) {
    return (
      <main className="mx-auto min-h-svh w-full max-w-md bg-slate-50 px-4 pt-6 pb-28">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My Bridges</h1>
        <p className="mt-4 text-sm text-slate-500">
          Log in to see the bridges you've crossed. Your collection is saved to your account, so it
          follows you to any device.
        </p>
        <button
          type="button"
          onClick={openAuthPrompt}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2.5 text-base font-medium text-white"
        >
          Log in or sign up
        </button>
      </main>
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

  // Identity comes straight from Supabase auth metadata, auto-populated by Google
  // on sign-in (§9.5) — no public.users table, nothing to write. A custom
  // display_name (Phase 4) would override the Google name here when present.
  const meta = user.user_metadata ?? {}
  const displayName: string =
    meta.display_name || meta.full_name || meta.name || user.email || 'You'
  const avatarUrl: string | undefined = meta.avatar_url || meta.picture

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-slate-50 px-4 pt-6 pb-28">
      <header className="flex items-center gap-3">
        {avatarUrl ? (
          // referrerPolicy avoids Google blocking the avatar when the referrer is sent.
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-slate-500">{displayName}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My Bridges</h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onSignOut}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Sign out
          </button>
          {items.length > 0 ? (
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="text-sm font-semibold text-blue-700"
            >
              {editing ? 'Done' : 'Edit'}
            </button>
          ) : null}
        </div>
      </header>

      <section className="mt-5">
        {actionError ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {actionError}
          </p>
        ) : null}

        {status === 'loading' && items.length === 0 ? (
          <p className="text-sm text-slate-500">Loading your bridges…</p>
        ) : status === 'error' ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">Could not load your bridges</p>
            <p className="mt-1 text-red-700">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">
            No bridges logged yet. Search for a bridge and tap "I've Crossed This" to start your
            collection.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => (
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
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-medium text-slate-900">
              Remove {pendingRemove.bridge.name} from your collection?
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingRemove(null)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-base font-medium text-slate-700 active:bg-slate-100"
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
