import { fetchWithTimeout, USER_AGENT } from './http'
import type { BridgeCoordinate } from './bridge'

// Photon (photon.komoot.io) — the search engine. Unlike Nominatim, it's a
// prefix/typeahead geocoder, so partial first words work: "golden" returns the
// Golden Gate Bridge, "tower" returns Tower Bridge. We restrict to bridges
// server-side via osm_tag (bridge=* OR man_made=bridge), so results are
// bridge-only (no people/places) and famous bridges rank to the top by Photon's
// own relevance — fixing the ranking + recall + strict-filter needs at once.
//
// Free, no key (komoot's public instance — fair use). CORS-enabled
// (Access-Control-Allow-Origin: *), so it works from the browser; User-Agent is
// set only in Node (browsers forbid it). §7 / open-decision: Photon replaces
// Nominatim for search (2026-05-29).

const SEARCH_URL = 'https://photon.komoot.io/api/'

export interface BboxLatLng {
  south: number
  north: number
  west: number
  east: number
}

export interface BridgeSearchResult {
  name: string
  coordinate: BridgeCoordinate
  region: string | null // "City, Region" — see regionLabel
  country: string | null // structured, for the geographic filter
  state: string | null // structured state/province (US/Canada drill-down)
  bbox: BboxLatLng | null // feature bounds — scopes the Overpass enrichment
}

interface PhotonProps {
  name?: string
  osm_key?: string
  osm_value?: string
  city?: string
  town?: string
  village?: string
  district?: string
  locality?: string
  county?: string
  state?: string
  country?: string
  extent?: number[] // [west, north, east, south]
}

interface PhotonFeature {
  geometry?: { coordinates?: number[] } // [lon, lat]
  properties?: PhotonProps
}

// Defensive: we already filter to bridges via osm_tag server-side, but confirm.
function isBridge(p: PhotonProps): boolean {
  return p.osm_key === 'bridge' || (p.osm_key === 'man_made' && p.osm_value === 'bridge')
}

// "City, Region" label, with region+country fallback so we never show a lone
// region (open decision #3 / ISSUE 3).
function regionLabel(p: PhotonProps): string | null {
  const locality = p.city ?? p.town ?? p.village ?? p.district ?? p.locality ?? p.county ?? null
  const region = p.state ?? null
  const country = p.country ?? null
  const parts: string[] = []
  if (locality) parts.push(locality)
  if (region) parts.push(region)
  if (parts.length < 2 && country) parts.push(country)
  return parts.slice(0, 2).join(', ') || country || null
}

function toResult(f: PhotonFeature): BridgeSearchResult | null {
  const p = f.properties
  const coords = f.geometry?.coordinates
  if (!p || !isBridge(p) || !coords || coords.length < 2) return null
  const name = p.name?.trim()
  if (!name) return null
  const bbox =
    p.extent && p.extent.length === 4
      ? { west: p.extent[0], north: p.extent[1], east: p.extent[2], south: p.extent[3] }
      : null
  return {
    name,
    coordinate: { lat: coords[1], lng: coords[0] },
    region: regionLabel(p),
    country: p.country ?? null,
    state: p.state ?? null,
    bbox,
  }
}

export async function searchPhoton(query: string, limit = 20): Promise<BridgeSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  params.append('osm_tag', 'bridge') // bridge=* (yes, viaduct, movable, …)
  params.append('osm_tag', 'man_made:bridge') // the man_made=bridge feature
  const headers: Record<string, string> = {}
  if (typeof window === 'undefined') headers['User-Agent'] = USER_AGENT
  const res = await fetchWithTimeout(`${SEARCH_URL}?${params.toString()}`, { headers })
  if (!res.ok) throw new Error(`Photon HTTP ${res.status}`)
  const data = (await res.json()) as { features?: PhotonFeature[] }
  return (data.features ?? [])
    .map(toResult)
    .filter((r): r is BridgeSearchResult => r != null)
}
