import type { Bridge, BridgeCoordinate, StructureFinding } from './bridge'
import { fetchWithTimeout, USER_AGENT } from './http'
import { bridgeId } from './identity'
import { fetchWikidataBridge } from './wikidata'
import { fetchWikipediaSummary } from './wikipedia'

// Home-screen discovery producer (§5.6 #6, decision #11): when an architect or
// engineer filter is applied with no search, query Wikidata for that person's
// bridges and enrich each. (Structure-type / country filters refine the result
// set client-side, as already built — they don't trigger a query.)
//
// query.wikidata.org/sparql is CORS-enabled (verified). The person is matched by
// exact English label — which is exactly what enrichment + the seed store, so
// the value in filter_metadata lines up with Wikidata's label.

const SPARQL_URL = 'https://query.wikidata.org/sparql'
const Q_BRIDGE = 'wd:Q12280'

export type PersonRole = 'architect' | 'engineer'

interface DiscoveredBridge {
  qid: string
  name: string
  coordinate: BridgeCoordinate | null
  country: string | null
}

function parsePointWkt(wkt: string | undefined): BridgeCoordinate | null {
  if (!wkt) return null
  const m = wkt.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/i)
  if (!m) return null
  return { lat: Number(m[2]), lng: Number(m[1]) }
}

async function fetchBridgesByPerson(label: string, role: PersonRole): Promise<DiscoveredBridge[]> {
  const prop = role === 'architect' ? 'P84' : 'P631'
  const escaped = label.replace(/["\\]/g, '')
  const query = `SELECT DISTINCT ?bridge ?bridgeLabel ?coord ?countryLabel WHERE {
    ?person rdfs:label "${escaped}"@en .
    ?bridge wdt:P31/wdt:P279* ${Q_BRIDGE} .
    ?bridge wdt:${prop} ?person .
    OPTIONAL { ?bridge wdt:P625 ?coord }
    OPTIONAL { ?bridge wdt:P17 ?country }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } LIMIT 60`
  const url = `${SPARQL_URL}?format=json&query=${encodeURIComponent(query)}`
  const headers: Record<string, string> = { Accept: 'application/sparql-results+json' }
  if (typeof window === 'undefined') headers['User-Agent'] = USER_AGENT
  const res = await fetchWithTimeout(url, { headers })
  if (!res.ok) throw new Error(`Wikidata SPARQL HTTP ${res.status}`)
  const data = (await res.json()) as {
    results: {
      bindings: Array<{
        bridge: { value: string }
        bridgeLabel?: { value: string }
        coord?: { value: string }
        countryLabel?: { value: string }
      }>
    }
  }
  const byQid = new Map<string, DiscoveredBridge>()
  for (const b of data.results.bindings) {
    const qid = b.bridge.value.split('/').pop()
    if (!qid || byQid.has(qid)) continue
    byQid.set(qid, {
      qid,
      name: b.bridgeLabel?.value ?? qid,
      coordinate: parsePointWkt(b.coord?.value),
      country: b.countryLabel?.value ?? null,
    })
  }
  return [...byQid.values()]
}

// Build a full Bridge from a Wikidata bridge QID (Wikidata + Wikipedia; no OSM —
// these come from Wikidata, not a name/Overpass lookup).
async function enrichByQid(d: DiscoveredBridge): Promise<Bridge> {
  const wikidata = await fetchWikidataBridge({ qid: d.qid }).catch(() => null)
  const wikipedia = await fetchWikipediaSummary(wikidata?.wikipediaTitle ?? d.name).catch(() => null)
  const coordinate = wikidata?.coordinate ?? d.coordinate
  const name = wikidata?.label ?? d.name
  const structures: StructureFinding[] = wikidata?.structures ?? []
  return {
    id: bridgeId(name, coordinate),
    name,
    // Country comes from the SPARQL (P17) so discovery results stay
    // country-filterable; state isn't fetched (no per-result geocoding).
    region: d.country,
    country: d.country,
    state: null,
    coordinate,
    structures,
    yearBuilt: wikidata?.yearBuilt ?? null,
    architect: wikidata?.architect ?? null,
    engineer: wikidata?.engineer ?? null,
    lengthMeters: wikidata?.lengthMeters ?? null,
    summary: wikipedia?.summary ?? null,
    thumbnailUrl: wikipedia?.thumbnailUrl ?? null,
    wikipediaUrl: wikipedia?.pageUrl ?? null,
    wikidataQid: wikidata?.qid ?? d.qid,
    sources: { osm: false, wikidata: wikidata != null, wikipedia: wikipedia != null },
  }
}

// Discover + enrich all bridges by a person. Sorted: those with a photo first
// (proxy for notability), then by name. `limit` caps the enrichment fan-out.
export async function searchBridgesByPerson(
  label: string,
  role: PersonRole,
  limit = 24,
): Promise<Bridge[]> {
  const discovered = (await fetchBridgesByPerson(label, role)).slice(0, limit)
  const bridges = await Promise.all(discovered.map(enrichByQid))
  return bridges.sort((a, b) => {
    if (!!a.thumbnailUrl !== !!b.thumbnailUrl) return a.thumbnailUrl ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}
