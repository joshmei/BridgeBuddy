import { useEffect, useState } from 'react'
import type { Bridge } from '../lib/bridge'
import { useAuth } from '../lib/auth'
import { getMyBridges, formatLogDate, type LoggedBridge } from '../lib/logs'
import { StructureBadge } from './StructureBadge'
import { DetailScreen } from './DetailScreen'

// My Bridges (PART 5): every bridge she's logged, most recently crossed first.
// Browsing is open to all, but this list is personal — logged out, it prompts
// sign-in instead.

function LoggedCard({ item, onSelect }: { item: LoggedBridge; onSelect: (b: Bridge) => void }) {
  const { bridge, log } = item
  const showLast = log.lastCrossing !== log.firstRecordedCrossing
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(bridge)}
        className="flex w-full gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left active:bg-slate-100"
      >
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
      </button>
    </li>
  )
}

export function MyBridgesScreen({ active }: { active: boolean }) {
  const { user, signOut, openAuthPrompt } = useAuth()
  const [items, setItems] = useState<LoggedBridge[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Bridge | null>(null)

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
        <button
          type="button"
          onClick={onSignOut}
          className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Sign out
        </button>
      </header>

      <section className="mt-5">
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
              <LoggedCard key={item.log.id} item={item} onSelect={setSelected} />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
