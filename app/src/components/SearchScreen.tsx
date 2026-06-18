import { useRef, useState } from 'react'
import type { Bridge } from '../lib/bridge'
import { useAuth } from '../lib/auth'
import { parseYear } from '../lib/overpass'
import { searchAndEnrich } from '../lib/bridgeLookup'
import { searchBridgesByPerson, type PersonRole } from '../lib/wikidataDiscovery'
import defaultBridgesData from '../data/defaultBridges.json'
import { StructureBadge } from './StructureBadge'
import { DetailScreen } from './DetailScreen'
import { BrowseLocationSheet, BrowseBuilderSheet } from './Browse'

// Curated prominent New York bridges, generated at build time
// (phase-1/gen-default-bridges.ts) — the default home browse before any search.
const DEFAULT_BRIDGES = defaultBridgesData as Bridge[]

// Browse selections cap at 20 enriched results (no pagination).
const BROWSE_LIMIT = 20

type Status = 'idle' | 'loading' | 'error' | 'done'

function formatCoord(bridge: Bridge): string | null {
  if (!bridge.coordinate) return null
  const { lat, lng } = bridge.coordinate
  return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`
}

function BridgeCard({ bridge, onSelect }: { bridge: Bridge; onSelect: (b: Bridge) => void }) {
  const year = parseYear(bridge.yearBuilt)
  const secondary = bridge.region ?? formatCoord(bridge)
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(bridge)}
        className="flex w-full gap-3 rounded-xl border border-divider bg-surface p-3 text-left active:bg-divider"
      >
        {bridge.thumbnailUrl ? (
          <img src={bridge.thumbnailUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1.5">
          <h2 className="truncate text-base font-semibold text-ink">{bridge.name}</h2>
          <StructureBadge structures={bridge.structures} />
          <p className="text-xs text-muted">
            {secondary ? <span>{secondary}</span> : null}
            {secondary && year ? <span> · </span> : null}
            {year ? <span>Built {year}</span> : null}
          </p>
        </div>
      </button>
    </li>
  )
}

// Top-right auth control on the search home (Phase 2.5 #1). Logged out → a subtle
// "Sign in" button opening the existing auth overlay. Logged in → her Google
// avatar (initial-letter fallback) tapping through to the My Bridges tab.
function HomeAuthControl({ onGoToProfile }: { onGoToProfile: () => void }) {
  const { user, openAuthPrompt } = useAuth()

  if (!user) {
    return (
      <button type="button" onClick={openAuthPrompt} className="shrink-0 text-sm font-medium text-accent">
        Sign in
      </button>
    )
  }

  const meta = user.user_metadata ?? {}
  const displayName: string = meta.display_name || meta.full_name || meta.name || user.email || 'You'
  const avatarUrl: string | undefined = meta.avatar_url || meta.picture

  return (
    <button type="button" onClick={onGoToProfile} aria-label="Open My Bridges" className="shrink-0">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
          {displayName.charAt(0).toUpperCase()}
        </span>
      )}
    </button>
  )
}

export function SearchScreen({ onGoToProfile }: { onGoToProfile: () => void }) {
  const [query, setQuery] = useState('')
  // Default home view = the curated New York list (instant, bundled).
  const [status, setStatus] = useState<Status>('done')
  const [results, setResults] = useState<Bridge[]>(DEFAULT_BRIDGES)
  const [isDefault, setIsDefault] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState('')
  const [searchTitle, setSearchTitle] = useState<string | null>(null)
  const [selected, setSelected] = useState<Bridge | null>(null)
  const [browseOpen, setBrowseOpen] = useState<'location' | 'builder' | null>(null)
  const runId = useRef(0)

  // Shared runner: race-guarded, sets the loading/results/error state and the
  // results title. `fetcher` returns the enriched bridges to show.
  async function run(fetcher: () => Promise<Bridge[]>, searchedLabel: string, title: string | null) {
    const id = ++runId.current
    setStatus('loading')
    setError(null)
    setSearched(searchedLabel)
    setIsDefault(false)
    setSearchTitle(title)
    try {
      const bridges = await fetcher()
      if (id !== runId.current) return
      setResults(bridges)
      setStatus('done')
    } catch (err) {
      if (id !== runId.current) return
      setError(err instanceof Error ? err.message : 'Lookup failed')
      setStatus('error')
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = query.trim()
    if (!name) return
    run(() => searchAndEnrich(name, BROWSE_LIMIT), name, null)
  }

  // Browse by location → "bridges in [place]" (name/place search via Photon).
  function browseLocation(q: string, title: string) {
    setBrowseOpen(null)
    run(() => searchAndEnrich(q, BROWSE_LIMIT), title, title)
  }

  // Architect/engineer → Wikidata bridges-by-person discovery (existing logic).
  // Used by Browse-by-type AND the detail-page architect/engineer links.
  function runDiscovery(role: PersonRole, value: string) {
    setBrowseOpen(null)
    run(() => searchBridgesByPerson(value, role), value, `Bridges by ${value}`)
  }

  function onPersonFromDetail(field: 'architect' | 'engineer', value: string) {
    setSelected(null)
    runDiscovery(field, value)
  }

  if (selected) {
    return (
      <DetailScreen bridge={selected} onBack={() => setSelected(null)} onFilterByPerson={onPersonFromDetail} />
    )
  }

  const hasResults = status === 'done' && results.length > 0
  const listLabel = isDefault ? 'Popular bridges in New York' : searchTitle

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-page px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-28">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted">Bridge Buddy</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Find a bridge</h1>
        </div>
        <HomeAuthControl onGoToProfile={onGoToProfile} />
      </header>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., Brooklyn Bridge"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          className="min-w-0 flex-1 rounded-lg border border-divider bg-surface px-3 py-2 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'loading' || query.trim() === ''}
          className="rounded-lg bg-accent px-4 py-2 text-base font-medium text-white disabled:opacity-40"
        >
          Search
        </button>
      </form>

      {/* Browse — guided discovery (replaces the old Filters button). */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setBrowseOpen('location')}
          className="flex-1 rounded-lg border border-divider bg-surface px-3 py-2.5 text-sm font-medium text-ink active:bg-divider"
        >
          🌍 Browse by location
        </button>
        <button
          type="button"
          onClick={() => setBrowseOpen('builder')}
          className="flex-1 rounded-lg border border-divider bg-surface px-3 py-2.5 text-sm font-medium text-ink active:bg-divider"
        >
          🏗 Browse by builder
        </button>
      </div>

      <section className="mt-5">
        {status === 'loading' ? (
          <p className="text-sm text-muted">Searching for “{searched}”…</p>
        ) : status === 'error' ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">Lookup failed</p>
            <p className="mt-1 text-red-700">{error}</p>
            <p className="mt-1 text-red-700">The service can be slow under load — try again.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {listLabel ? (
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{listLabel}</p>
            ) : null}

            {hasResults ? (
              <ul className="space-y-2.5">
                {results.map((bridge) => (
                  <BridgeCard key={bridge.id} bridge={bridge} onSelect={setSelected} />
                ))}
              </ul>
            ) : status === 'done' ? (
              <p className="text-sm text-muted">
                No bridges found for “{searched}”. Try a different spelling, or use Browse to discover
                by location, architect, or engineer.
              </p>
            ) : null}
          </div>
        )}
      </section>

      {browseOpen === 'location' ? (
        <BrowseLocationSheet onClose={() => setBrowseOpen(null)} onPick={browseLocation} />
      ) : null}
      {browseOpen === 'builder' ? (
        <BrowseBuilderSheet onClose={() => setBrowseOpen(null)} onPickPerson={runDiscovery} />
      ) : null}
    </main>
  )
}
