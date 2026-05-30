import { useRef, useState } from 'react'
import type { Bridge } from '../lib/bridge'
import { parseYear } from '../lib/overpass'
import { searchAndEnrich } from '../lib/bridgeLookup'
import { StructureBadge } from './StructureBadge'
import { DetailScreen } from './DetailScreen'

type Status = 'idle' | 'loading' | 'error' | 'done'

function formatCoord(bridge: Bridge): string | null {
  if (!bridge.coordinate) return null
  const { lat, lng } = bridge.coordinate
  return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`
}

function BridgeCard({ bridge, onSelect }: { bridge: Bridge; onSelect: (b: Bridge) => void }) {
  const year = parseYear(bridge.yearBuilt)
  // Secondary disambiguation line: prefer the Nominatim region label, fall back
  // to coordinates.
  const secondary = bridge.region ?? formatCoord(bridge)
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(bridge)}
        className="flex w-full gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left active:bg-slate-100"
      >
        {bridge.thumbnailUrl ? (
          <img
            src={bridge.thumbnailUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
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
  const runId = useRef(0)

  // The enriched bridge is already in hand from the search, so opening detail
  // needs no refetch — just swap the view (search state is preserved on back).
  if (selected) {
    return <DetailScreen bridge={selected} onBack={() => setSelected(null)} />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = query.trim()
    if (!name) return
    const id = ++runId.current
    setStatus('loading')
    setError(null)
    setSearched(name)
    try {
      const bridges = await searchAndEnrich(name)
      if (id !== runId.current) return // a newer search superseded this one
      setResults(bridges)
      setStatus('done')
    } catch (err) {
      if (id !== runId.current) return
      setError(err instanceof Error ? err.message : 'Lookup failed')
      setStatus('error')
    }
  }

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
        {status === 'idle' ? (
          <p className="text-sm text-slate-500">
            Search by exact name. Named bridges only — anonymous overpasses and culverts are
            excluded by design.
          </p>
        ) : null}

        {status === 'loading' ? (
          <p className="text-sm text-slate-500">Searching for “{searched}”…</p>
        ) : null}

        {status === 'error' ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">Lookup failed</p>
            <p className="mt-1 text-red-700">{error}</p>
            <p className="mt-1 text-red-700">Overpass can be slow under load — try again.</p>
          </div>
        ) : null}

        {status === 'done' && results.length === 0 ? (
          <p className="text-sm text-slate-500">
            No named bridge found for “{searched}”. Search is exact for now — check spelling and
            capitalization (e.g., “Brooklyn Bridge”).
          </p>
        ) : null}

        {status === 'done' && results.length > 0 ? (
          <ul className="space-y-2.5">
            {results.map((bridge) => (
              <BridgeCard key={bridge.id} bridge={bridge} onSelect={setSelected} />
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  )
}
