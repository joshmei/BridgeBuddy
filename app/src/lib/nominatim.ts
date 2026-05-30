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
}

// Keep results that are plausibly bridges. Nominatim categorizes bridges
// inconsistently (man_made=bridge, category=bridge, or a highway way whose name
// is the bridge), so we accept an explicit bridge category OR a bridge-ish name.
function looksLikeBridge(p: NominatimPlace): boolean {
  if (p.category === 'man_made' && p.type === 'bridge') return true
  if (p.category === 'bridge') return true
  if (p.addresstype === 'bridge') return true
  return /\b(bridge|viaduct|crossing|span)\b/i.test(p.name ?? p.display_name ?? '')
}

// Compact "locality, region" label from Nominatim's address breakdown.
function regionLabel(address: Record<string, string> | undefined): string | null {
  if (!address) return null
  const locality =
    address.city ??
    address.town ??
    address.village ??
    address.suburb ??
    address.borough ??
    address.county ??
    null
  const region = address.state ?? address.province ?? address.country ?? null
  const parts = [locality, region].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : (address.country ?? null)
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
    limit: String(limit),
  })
  const headers: Record<string, string> = {}
  if (typeof window === 'undefined') headers['User-Agent'] = USER_AGENT
  const res = await fetchWithTimeout(`${SEARCH_URL}?${params.toString()}`, { headers })
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)
  const places = (await res.json()) as NominatimPlace[]
  return places
    .filter(looksLikeBridge)
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
