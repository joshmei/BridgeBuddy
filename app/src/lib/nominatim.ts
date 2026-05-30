import { fetchWithTimeout, USER_AGENT } from './http'
import type { BridgeCoordinate } from './bridge'

// Nominatim geocoder — the search engine (Phase 1 finding: Overpass can't do a
// global free-text search in usable time; §7). Fast, partial + typo-tolerant,
// and returns a place label we use as the secondary disambiguation line.
//
// Policy: ≤1 req/sec (we call it once per search) and a UA/Referer identifying
// the app. Browsers forbid setting User-Agent but send Referer automatically,
// which satisfies the policy; Node must send User-Agent (set below).

const SEARCH_URL = 'https://nominatim.openstreetmap.org/search'

export interface BboxLatLng {
  south: number
  north: number
  west: number
  east: number
}

export interface BridgeSearchResult {
  name: string
  coordinate: BridgeCoordinate
  region: string | null // e.g. "Brooklyn, New York"
  bbox: BboxLatLng | null // feature bounds — used to scope the Overpass enrichment
}

interface NominatimPlace {
  name?: string
  display_name?: string
  lat: string
  lon: string
  category?: string // jsonv2: maps to OSM key (e.g. "man_made", "highway")
  type?: string // e.g. "bridge"
  addresstype?: string
  boundingbox?: [string, string, string, string] // [south, north, west, east]
  address?: Record<string, string>
  extratags?: Record<string, string> // raw OSM tags (needs extratags=1)
}

// STRICT: only return features that are ACTUALLY bridges in OSM. A name match
// is NOT enough — "George Washington" memorials, a "Bridgewater" town, or any
// place/person-shaped result whose name contains "bridge" must be discarded.
// A result qualifies only via an OSM bridge tag/category:
//   - category man_made=bridge, or Nominatim's bridge category / addresstype
//   - the raw OSM `bridge` tag present (extratags), or man_made=bridge
// (Note: this correctly KEEPS real footbridges like "George Bridge" / Millennium
// Bridge, which carry bridge=yes — they are genuine named bridges per §6.)
function isBridge(p: NominatimPlace): boolean {
  if (p.category === 'man_made' && p.type === 'bridge') return true
  if (p.category === 'bridge') return true
  if (p.addresstype === 'bridge') return true
  const ex = p.extratags ?? {}
  return ex.bridge != null || ex.man_made === 'bridge'
}

// "City, Region" label from Nominatim's address breakdown. Always two parts when
// possible; if there's no city, fall back to region + country (or at minimum the
// country) — never a lone region like "Queensland".
function regionLabel(address: Record<string, string> | undefined): string | null {
  if (!address) return null
  const locality =
    address.city ??
    address.town ??
    address.village ??
    address.suburb ??
    address.borough ??
    address.hamlet ??
    address.county ??
    null
  const region = address.state ?? address.province ?? null
  const country = address.country ?? null
  const parts: string[] = []
  if (locality) parts.push(locality)
  if (region) parts.push(region)
  if (parts.length < 2 && country) parts.push(country)
  return parts.slice(0, 2).join(', ') || country || null
}

function toResult(p: NominatimPlace): BridgeSearchResult {
  const bbox: BboxLatLng | null = p.boundingbox
    ? {
        south: Number(p.boundingbox[0]),
        north: Number(p.boundingbox[1]),
        west: Number(p.boundingbox[2]),
        east: Number(p.boundingbox[3]),
      }
    : null
  return {
    name: p.name?.trim() || (p.display_name?.split(',')[0]?.trim() ?? ''),
    coordinate: { lat: Number(p.lat), lng: Number(p.lon) },
    region: regionLabel(p.address),
    bbox,
  }
}

async function runSearch(query: string, limit: number): Promise<BridgeSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    extratags: '1', // needed to read the raw OSM `bridge` tag for strict filtering
    limit: String(limit),
  })
  const headers: Record<string, string> = {}
  if (typeof window === 'undefined') headers['User-Agent'] = USER_AGENT
  const res = await fetchWithTimeout(`${SEARCH_URL}?${params.toString()}`, { headers })
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)
  const places = (await res.json()) as NominatimPlace[]
  return places
    .filter(isBridge)
    .map(toResult)
    .filter((r) => r.name !== '')
}

// Partial names like "Brooklyn" or "Hawthorne" make Nominatim return places
// (boroughs, towns) and no bridge, so the raw search comes back empty. When that
// happens — and the query doesn't already say bridge/viaduct — retry biased
// toward bridges ("Brooklyn" → "Brooklyn bridge"), which surfaces the structure.
// Distinctive names that already return a bridge (e.g. "Golden Gate") and full
// names skip the retry, so this only adds a second call when the first finds none.
export async function searchNominatim(query: string, limit = 8): Promise<BridgeSearchResult[]> {
  const direct = await runSearch(query, limit)
  if (direct.length > 0 || /\b(bridge|viaduct)\b/i.test(query)) return direct
  return runSearch(`${query} bridge`, limit)
}
