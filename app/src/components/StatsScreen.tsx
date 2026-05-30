import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { getMyBridges, computeStats, formatLogDate, type Stats } from '../lib/logs'
import { STRUCTURE_TYPE_COLORS, STRUCTURE_TYPE_LABELS } from '../lib/structureTypes'

// Stats (PART 6): total crossed, breakdown by structure type, the first-ever
// recorded crossing (a milestone), and her most-crossed bridge.

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1">{children}</div>
    </section>
  )
}

export function StatsScreen({ active }: { active: boolean }) {
  const { user, openAuthPrompt } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active || !user) return
    let alive = true
    // Syncing with an external system (Supabase) — exactly what effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('loading')
    getMyBridges(user.id)
      .then((rows) => {
        if (!alive) return
        setStats(computeStats(rows))
        setStatus('done')
      })
      .catch((e) => {
        if (!alive) return
        setError(e instanceof Error ? e.message : 'Could not load your stats.')
        setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [active, user])

  if (!user) {
    return (
      <main className="mx-auto min-h-svh w-full max-w-md bg-slate-50 px-4 pt-6 pb-28">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Stats</h1>
        <p className="mt-4 text-sm text-slate-500">Log in to see stats for the bridges you've crossed.</p>
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

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-slate-50 px-4 pt-6 pb-28">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Stats</h1>

      <section className="mt-5">
        {status === 'loading' && !stats ? (
          <p className="text-sm text-slate-500">Crunching your numbers…</p>
        ) : status === 'error' ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">Could not load your stats</p>
            <p className="mt-1 text-red-700">{error}</p>
          </div>
        ) : !stats || stats.total === 0 ? (
          <p className="text-sm text-slate-500">
            No bridges logged yet. Once you start your collection, your stats appear here.
          </p>
        ) : (
          <div className="space-y-3">
            <StatCard label="Total bridges crossed">
              <p className="text-4xl font-semibold tabular-nums text-slate-900">{stats.total}</p>
            </StatCard>

            <StatCard label="By structure type">
              <ul className="space-y-1.5">
                {stats.byStructure.map(({ type, count }) => (
                  <li key={type} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-slate-700">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: STRUCTURE_TYPE_COLORS[type].bg }}
                      />
                      {STRUCTURE_TYPE_LABELS[type]}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">{count}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-400">
                Hybrid bridges count under each of their types, so these can sum to more than the
                total.
              </p>
            </StatCard>

            {stats.firstEver ? (
              <StatCard label="First recorded crossing">
                <p className="text-base font-semibold text-slate-900">{stats.firstEver.bridge.name}</p>
                <p className="text-sm text-slate-500">
                  {formatLogDate(stats.firstEver.log.firstRecordedCrossing)}
                </p>
              </StatCard>
            ) : null}

            {stats.mostCrossed ? (
              <StatCard label="Most crossed">
                <p className="text-base font-semibold text-slate-900">{stats.mostCrossed.bridge.name}</p>
                <p className="text-sm text-slate-500">
                  {stats.mostCrossed.log.crossingCount === 1
                    ? 'Crossed once'
                    : `Crossed ${stats.mostCrossed.log.crossingCount} times`}
                </p>
              </StatCard>
            ) : null}
          </div>
        )}
      </section>
    </main>
  )
}
