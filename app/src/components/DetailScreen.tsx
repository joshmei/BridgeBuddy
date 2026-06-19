import { useEffect, useState } from 'react'
import type { Bridge } from '../lib/bridge'
import { parseYear } from '../lib/overpass'
import { useAuth } from '../lib/auth'
import {
  getLogForBridge,
  recordCrossing,
  undoCrossing,
  formatLogDate,
  type CrossingLog,
} from '../lib/logs'
import { StructureBadge } from './StructureBadge'
import { BridgeJournal } from './BridgeJournal'

function formatLength(meters: number): string {
  const ft = Math.round(meters * 3.28084)
  return `${meters.toLocaleString('en-US')} m (${ft.toLocaleString('en-US')} ft)`
}

// Dependency-free map pin via OpenStreetMap's embed iframe (decided 2026-05-29;
// Leaflet comes in Phase 3 for the multi-pin map). A small bbox around the point
// gives a close-zoom view with a marker.
function MapPin({ lat, lng }: { lat: number; lng: number }) {
  const d = 0.004
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`
  const osmLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
  return (
    <section className="space-y-1">
      <iframe
        title="Bridge location"
        src={src}
        loading="lazy"
        className="h-52 w-full rounded-xl border border-divider"
      />
      <a
        href={osmLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted"
      >
        {lat.toFixed(4)}°, {lng.toFixed(4)}° · View larger map →
      </a>
    </section>
  )
}

// "I've Crossed This" — the primary action of the app. Browsing is open to
// everyone; logging requires an account, so a tap while logged out opens the
// auth screen. Logged in: tapping creates the log. Once crossed, the button is
// replaced by a "Crossed! ✓" label plus a small "Undo" button that deletes the
// log (no confirmation) and restores the original button.
function CrossedButton({ bridge }: { bridge: Bridge }) {
  const { user, openAuthPrompt } = useAuth()
  const [log, setLog] = useState<CrossingLog | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLog(null)
      return
    }
    getLogForBridge(user.id, bridge)
      .then((l) => {
        if (active) setLog(l)
      })
      .catch(() => {
        /* non-fatal: button just shows the un-logged state */
      })
    return () => {
      active = false
    }
    // bridge.id is the stable synthetic identity; depending on the object would
    // refetch on every unrelated re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, bridge.id])

  async function onTap() {
    if (!user) {
      openAuthPrompt()
      return
    }
    setBusy(true)
    setError(null)
    try {
      setLog(await recordCrossing(user.id, bridge))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.')
    } finally {
      setBusy(false)
    }
  }

  // Undo (no confirmation) — soft-deletes the log (or decrements if it had
  // multiple crossings). Returns null when removed → restores the button.
  async function onUndo() {
    if (!user || !log) return
    setBusy(true)
    setError(null)
    try {
      setLog(await undoCrossing(user.id, log.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not undo. Try again.')
    } finally {
      setBusy(false)
    }
  }

  // Crossed state: "Crossed! ✓" as plain text on the page, with a smaller,
  // muted-rose Undo button beneath it.
  if (log) {
    return (
      <section className="space-y-2">
        <p className="text-xl font-semibold text-emerald-700">Crossed! ✓</p>
        <p className="text-xs text-muted">
          First recorded: {formatLogDate(log.firstRecordedCrossing)}
        </p>
        <button
          type="button"
          onClick={onUndo}
          disabled={busy}
          style={{ backgroundColor: '#C9847A' }}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white active:opacity-80 disabled:opacity-60"
        >
          {busy ? 'Undoing…' : 'Undo'}
        </button>
        {error ? <p className="text-xs text-red-700">{error}</p> : null}
      </section>
    )
  }

  // Not yet crossed: the full-width primary button.
  return (
    <section className="space-y-1.5">
      <button
        type="button"
        onClick={onTap}
        disabled={busy}
        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white active:bg-slate-700 disabled:opacity-60"
      >
        {busy ? 'Saving…' : "I've Crossed This"}
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </section>
  )
}

// A labeled fact row, only rendered when the value is present (missing data is
// simply omitted, not shown as blanks — §9).
function Fact({
  label,
  value,
  onClick,
}: {
  label: string
  value: string | null
  onClick?: () => void
}) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4 border-b border-divider py-2 last:border-0">
      <dt className="shrink-0 text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink">
        {onClick ? (
          // Link, not button (§5.6 #5): tap → results filtered to this person.
          <button type="button" onClick={onClick} className="text-accent underline underline-offset-2">
            {value}
          </button>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}

export function DetailScreen({
  bridge,
  onBack,
  onFilterByPerson,
  backLabel = 'Search',
}: {
  bridge: Bridge
  onBack: () => void
  onFilterByPerson?: (field: 'architect' | 'engineer', value: string) => void
  backLabel?: string
}) {
  const year = parseYear(bridge.yearBuilt)
  const contributors = [
    bridge.sources.osm && 'OpenStreetMap',
    bridge.sources.wikidata && 'Wikidata',
    bridge.sources.wikipedia && 'Wikipedia',
  ].filter(Boolean) as string[]
  // Shallow result still being enriched (opened from a search list) — show
  // loading placeholders instead of empty/"unknown" facts (Phase 3 perf fix).
  const loading = bridge.enriched === false

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-page pb-28">
      <div className="sticky top-0 z-10 border-b border-divider bg-page/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-muted hover:text-accent"
        >
          ‹ {backLabel}
        </button>
      </div>

      {bridge.thumbnailUrl ? (
        <img src={bridge.thumbnailUrl} alt={bridge.name} className="h-48 w-full object-cover" />
      ) : null}

      <div className="space-y-5 px-4 pt-4">
        <header className="space-y-2">
          {/* Structure type at the top of every detail page (CLAUDE.md). */}
          {loading ? (
            <span className="inline-block animate-pulse rounded-md bg-surface px-3 py-1 text-xs font-semibold text-muted">
              Loading…
            </span>
          ) : (
            <StructureBadge structures={bridge.structures} />
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{bridge.name}</h1>
          {bridge.region ? <p className="text-sm text-muted">{bridge.region}</p> : null}
        </header>

        {/* Private journal — pill (right-aligned) opens a full-screen panel. Shown
            regardless of crossing/enrichment state (the journal is independent). */}
        <BridgeJournal bridge={bridge} />

        {/* Primary action — prominent, directly under the title (PART 4). */}
        {loading ? (
          <div className="w-full rounded-xl bg-surface px-4 py-3 text-center text-base font-medium text-muted">
            Loading details…
          </div>
        ) : (
          <CrossedButton bridge={bridge} />
        )}

        {loading ? (
          <p className="text-sm text-muted">Loading details…</p>
        ) : (
          <>
            <dl className="rounded-xl border border-divider bg-surface px-4 py-1">
              <Fact label="Built" value={year ? String(year) : null} />
              <Fact label="Length" value={bridge.lengthMeters ? formatLength(bridge.lengthMeters) : null} />
              <Fact
                label="Architect"
                value={bridge.architect}
                onClick={
                  onFilterByPerson && bridge.architect
                    ? () => onFilterByPerson('architect', bridge.architect!)
                    : undefined
                }
              />
              <Fact
                label="Structural engineer"
                value={bridge.engineer}
                onClick={
                  onFilterByPerson && bridge.engineer
                    ? () => onFilterByPerson('engineer', bridge.engineer!)
                    : undefined
                }
              />
            </dl>

            {bridge.summary ? (
              <section className="space-y-1">
                <p className="text-sm leading-relaxed text-ink">{bridge.summary}</p>
                {bridge.wikipediaUrl ? (
                  <a
                    href={bridge.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm font-medium text-accent"
                  >
                    Read more on Wikipedia →
                  </a>
                ) : null}
              </section>
            ) : (
              <p className="text-sm text-muted">No encyclopedia summary available for this bridge.</p>
            )}
          </>
        )}

        {/* MAP PIN — dependency-free OSM embed (decided 2026-05-29). Leaflet is
            reserved for the Phase 3 multi-pin map. */}
        {bridge.coordinate ? <MapPin lat={bridge.coordinate.lat} lng={bridge.coordinate.lng} /> : null}

        {!loading && contributors.length > 0 ? (
          <p className="text-xs text-muted">Data: {contributors.join(' · ')}</p>
        ) : null}
      </div>
    </main>
  )
}
