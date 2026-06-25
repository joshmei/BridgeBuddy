import { useEffect, useState } from 'react'
import type { Bridge } from '../lib/bridge'
import { useAuth } from '../lib/auth'
import { getMyBridges, computeStats, formatLogDate, type Stats, type LoggedBridge } from '../lib/logs'
import { STRUCTURE_TYPE_COLORS, STRUCTURE_TYPE_LABELS } from '../lib/structureTypes'
import { StructureBadge } from './StructureBadge'
import { DetailScreen } from './DetailScreen'

// Stats (PART 6): total crossed, breakdown by structure type, and three milestone
// cards — most recently crossed, first recorded crossing, most crossed — each
// tappable through to the bridge's detail page.

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-divider bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1">{children}</div>
    </section>
  )
}

// A milestone (most recent / first / most crossed) — name + badge + a detail line,
// tappable through to the bridge detail.
function MilestoneCard({
  label,
  item,
  detail,
  onSelect,
}: {
  label: string
  item: LoggedBridge
  detail: string
  onSelect: (b: Bridge) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.bridge)}
      className="block w-full rounded-xl border border-divider bg-surface p-4 text-left active:bg-divider"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink">{item.bridge.name}</p>
      <div className="mt-1.5">
        <StructureBadge structures={item.bridge.structures} />
      </div>
      <p className="mt-1.5 text-sm text-muted">{detail}</p>
    </button>
  )
}

export function StatsScreen({ active, onGoToSearch }: { active: boolean; onGoToSearch: () => void }) {
  const { user, openAuthPrompt } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Bridge | null>(null)

  useEffect(() => {
    if (!active || !user || selected) return
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
  }, [active, user, selected])

  if (selected) {
    return <DetailScreen bridge={selected} backLabel="Stats" onBack={() => setSelected(null)} />
  }

  if (!user) {
    return (
      <main className="mx-auto min-h-svh w-full max-w-md bg-page px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-28">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Stats</h1>
        <p className="mt-4 text-sm text-muted">Log in to see stats for the bridges you've crossed.</p>
        <button
          type="button"
          onClick={openAuthPrompt}
          className="mt-4 rounded-lg bg-accent px-4 py-2.5 text-base font-medium text-white"
        >
          Log in or sign up
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-page px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-28">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Stats</h1>

      <section className="mt-5">
        {status === 'loading' && !stats ? (
          <p className="text-sm text-muted">Crunching your numbers…</p>
        ) : status === 'error' ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">Could not load your stats</p>
            <p className="mt-1 text-red-700">{error}</p>
          </div>
        ) : !stats || stats.total === 0 ? (
          <div>
            <p className="text-sm text-muted">Start crossing bridges to see your stats.</p>
            <button
              type="button"
              onClick={onGoToSearch}
              className="mt-4 rounded-lg bg-accent px-4 py-2.5 text-base font-medium text-white"
            >
              Find a bridge
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <StatCard label="Total bridges crossed">
              <p className="text-4xl font-semibold tabular-nums text-ink">{stats.total}</p>
            </StatCard>

            <StatCard label="By structure type">
              <ul className="space-y-1.5">
                {stats.byStructure.map(({ type, count }) => (
                  <li key={type} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-ink">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: STRUCTURE_TYPE_COLORS[type].bg }}
                      />
                      {STRUCTURE_TYPE_LABELS[type]}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-ink">{count}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">
                Hybrid bridges count under each of their types, so these can sum to more than the
                total.
              </p>
            </StatCard>

            {stats.mostRecent ? (
              <MilestoneCard
                label="Most recently crossed"
                item={stats.mostRecent}
                detail={formatLogDate(stats.mostRecent.log.lastCrossing)}
                onSelect={setSelected}
              />
            ) : null}

            {stats.firstEver ? (
              <MilestoneCard
                label="First recorded crossing"
                item={stats.firstEver}
                detail={formatLogDate(stats.firstEver.log.firstRecordedCrossing)}
                onSelect={setSelected}
              />
            ) : null}

            {stats.mostCrossed ? (
              <MilestoneCard
                label="Most crossed"
                item={stats.mostCrossed}
                detail={
                  stats.mostCrossed.log.crossingCount === 1
                    ? 'Crossed once'
                    : `Crossed ${stats.mostCrossed.log.crossingCount} times`
                }
                onSelect={setSelected}
              />
            ) : null}
          </div>
        )}
      </section>
    </main>
  )
}
