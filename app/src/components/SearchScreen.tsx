import { useRef, useState } from 'react'
import type { Bridge } from '../lib/bridge'
import { parseYear } from '../lib/overpass'
import { searchAndEnrich } from '../lib/bridgeLookup'
import { searchBridgesByPerson, type PersonRole } from '../lib/wikidataDiscovery'
import { applyFilters, deriveOptions, EMPTY_FILTERS, type Filters } from '../lib/filters'
import { homeFilterOptions } from '../lib/filterMetadata'
import { StructureBadge } from './StructureBadge'
import { DetailScreen } from './DetailScreen'
import { FilterControls } from './FilterControls'

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
        className="flex w-full gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left active:bg-slate-100"
      >
        {bridge.thumbnailUrl ? (
          <img src={bridge.thumbnailUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1.5">
          <h2 className="truncate text-base font-semibold text-slate-900">{bridge.name}</h2>
          <StructureBadge structures={bridge.structures} />
          <p className="text-xs text-slate-500">
            {secondary ? <span>{secondary}</span> : null}
            {secondary && year ? <span> · </span> : null}
            {year ? <span>Built {year}</span> : null}
          </p>
        </div>
      </button>
    </li>
  )
}

export function SearchScreen() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [results, setResults] = useState<Bridge[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState('')
  const [selected, setSelected] = useState<Bridge | null>(null)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const runId = useRef(0)

  // "Clear all" → back to the home state so the full option lists return (not
  // the result-narrowed set). Clearing the architect/engineer that produced a
  // discovery set logically returns to home.
  function clearAll() {
    runId.current++ // cancel any in-flight lookup
    setFilters(EMPTY_FILTERS)
    setResults([])
    setStatus('idle')
    setSearched('')
  }

  // Detail-page architect/engineer link → refine the CURRENT results to that
  // person (§5.6 #5).
  function filterByPerson(field: 'architect' | 'engineer', value: string) {
    setFilters({ ...EMPTY_FILTERS, [field]: value })
    setSelected(null)
  }

  // Home-screen discovery: pick an architect/engineer with no search → query
  // Wikidata for their bridges (§5.6 #6, decision #11). Keeps any country/type
  // filters already set so they refine the discovered set.
  async function runDiscovery(role: PersonRole, value: string) {
    const id = ++runId.current
    setStatus('loading')
    setError(null)
    setSearched(value)
    setFilters({ ...filters, architect: null, engineer: null, [role]: value })
    try {
      const bridges = await searchBridgesByPerson(value, role)
      if (id !== runId.current) return
      setResults(bridges)
      setStatus('done')
    } catch (err) {
      if (id !== runId.current) return
      setError(err instanceof Error ? err.message : 'Lookup failed')
      setStatus('error')
    }
  }

  if (selected) {
    return (
      <DetailScreen bridge={selected} onBack={() => setSelected(null)} onFilterByPerson={filterByPerson} />
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = query.trim()
    if (!name) return
    const id = ++runId.current
    setStatus('loading')
    setError(null)
    setSearched(name)
    setFilters(EMPTY_FILTERS)
    try {
      const bridges = await searchAndEnrich(name)
      if (id !== runId.current) return
      setResults(bridges)
      setStatus('done')
    } catch (err) {
      if (id !== runId.current) return
      setError(err instanceof Error ? err.message : 'Lookup failed')
      setStatus('error')
    }
  }

  const hasResults = status === 'done' && results.length > 0
  const filtered = hasResults ? applyFilters(results, filters) : []
  const personName = filters.architect ?? filters.engineer
  const personEmpty = personName != null && filtered.length <= 1
  // Options: from the current result set once we have one; otherwise the bundled
  // home config (instant, no network).
  const options = hasResults ? deriveOptions(results, filters.country) : homeFilterOptions(filters.country)

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-slate-50 px-4 py-6">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-widest text-slate-500">Bridge Buddy</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Find a bridge</h1>
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
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'loading' || query.trim() === ''}
          className="rounded-lg bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:opacity-40"
        >
          Search
        </button>
      </form>

      <section className="mt-5">
        {status === 'loading' ? (
          <p className="text-sm text-slate-500">Searching for “{searched}”…</p>
        ) : status === 'error' ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">Lookup failed</p>
            <p className="mt-1 text-red-700">{error}</p>
            <p className="mt-1 text-red-700">The service can be slow under load — try again.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <FilterControls
              options={options}
              filters={filters}
              onChange={setFilters}
              onSelectPerson={hasResults ? undefined : runDiscovery}
              onClearAll={clearAll}
            />

            {hasResults ? (
              personEmpty ? (
                <p className="text-sm text-slate-500">No other bridges by {personName} found.</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-slate-500">No bridges match these filters.</p>
              ) : (
                <ul className="space-y-2.5">
                  {filtered.map((bridge) => (
                    <BridgeCard key={bridge.id} bridge={bridge} onSelect={setSelected} />
                  ))}
                </ul>
              )
            ) : status === 'done' ? (
              <p className="text-sm text-slate-500">
                No named bridge found for “{searched}”. Try a different spelling, or open Filters to
                browse by architect or engineer.
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Search by name (partial works, e.g. “golden”), or open <span className="font-medium">Filters</span>{' '}
                to browse by architect or engineer.
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
