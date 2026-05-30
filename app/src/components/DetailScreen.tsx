import type { Bridge } from '../lib/bridge'
import { parseYear } from '../lib/overpass'
import { StructureBadge } from './StructureBadge'

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
        className="h-52 w-full rounded-xl border border-slate-200"
      />
      <a
        href={osmLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-slate-500"
      >
        {lat.toFixed(4)}°, {lng.toFixed(4)}° · View larger map →
      </a>
    </section>
  )
}

// A labeled fact row, only rendered when the value is present (missing data is
// simply omitted, not shown as blanks — §9).
function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
    </div>
  )
}

export function DetailScreen({ bridge, onBack }: { bridge: Bridge; onBack: () => void }) {
  const year = parseYear(bridge.yearBuilt)
  const contributors = [
    bridge.sources.osm && 'OpenStreetMap',
    bridge.sources.wikidata && 'Wikidata',
    bridge.sources.wikipedia && 'Wikipedia',
  ].filter(Boolean) as string[]

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-slate-50 pb-10">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ‹ Search
        </button>
      </div>

      {bridge.thumbnailUrl ? (
        <img src={bridge.thumbnailUrl} alt={bridge.name} className="h-48 w-full object-cover" />
      ) : null}

      <div className="space-y-5 px-4 pt-4">
        <header className="space-y-2">
          {/* Structure type at the top of every detail page (CLAUDE.md). */}
          <StructureBadge structures={bridge.structures} />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{bridge.name}</h1>
          {bridge.region ? <p className="text-sm text-slate-500">{bridge.region}</p> : null}
        </header>

        <dl className="rounded-xl border border-slate-200 bg-white px-4 py-1">
          <Fact label="Built" value={year ? String(year) : null} />
          <Fact label="Length" value={bridge.lengthMeters ? formatLength(bridge.lengthMeters) : null} />
          <Fact label="Architect" value={bridge.architect} />
          <Fact label="Structural engineer" value={bridge.engineer} />
        </dl>

        {bridge.summary ? (
          <section className="space-y-1">
            <p className="text-sm leading-relaxed text-slate-700">{bridge.summary}</p>
            {bridge.wikipediaUrl ? (
              <a
                href={bridge.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium text-blue-700"
              >
                Read more on Wikipedia →
              </a>
            ) : null}
          </section>
        ) : (
          <p className="text-sm text-slate-400">No encyclopedia summary available for this bridge.</p>
        )}

        {/* MAP PIN — dependency-free OSM embed (decided 2026-05-29). Leaflet is
            reserved for the Phase 3 multi-pin map. */}
        {bridge.coordinate ? <MapPin lat={bridge.coordinate.lat} lng={bridge.coordinate.lng} /> : null}

        {contributors.length > 0 ? (
          <p className="text-xs text-slate-400">Data: {contributors.join(' · ')}</p>
        ) : null}
      </div>
    </main>
  )
}
