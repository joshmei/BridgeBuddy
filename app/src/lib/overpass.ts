import { fetchWithTimeout, USER_AGENT } from './http'
import type { BridgeCoordinate, StructureFinding } from './bridge'
import { mapOsmStructure } from './structureTypes'
import { bridgeId } from './identity'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements?: OverpassElement[]
}

// What we extract from OSM for ONE physical bridge (one cluster of elements).
export interface OsmBridgeData {
  id: string // synthetic stable key (identity.ts)
  name: string
  coordinate: BridgeCoordinate | null
  structures: StructureFinding[]
  yearBuilt: string | null
  architect: string | null
  engineer: string | null
  wikidataQid: string | null
  wikipediaTitle: string | null // e.g. "en:Brooklyn Bridge"
  elementCount: number
}

// PRODUCT.md §7 finding: a single bridge is many OSM elements (Brooklyn=31,
// Hawthorne=69) and the interesting tags are scattered across siblings — the
// structure type may only appear after aggregating ALL of them. So we pull
// `out tags center;` (no element cap) and merge.
//
// EXACT name match (`=`). Phase 1 finding (2026-05-29): a substring regex
// (`name~...,i`) makes Overpass scan every named bridge on the planet — measured
// at ~75s vs ~2s for exact. So Overpass can't back a free-text search box;
// partial/fuzzy search needs a geocoder (open decision — see §11 / §7). Match is
// therefore exact and case-sensitive for now.
//
// `center` is added to the validated phase-0 query (`out tags;`) because the map
// pin (Phase 1 deliverable) needs a coordinate; ways/relations lack one without it.
//
// User-Agent only in Node: Overpass rejects the default node/undici UA with 406,
// so the smoke test (and any future server-side call) must send one. Browsers
// forbid setting User-Agent (it throws a console warning in iOS Safari, which we
// explicitly check) and send their own real UA that Overpass accepts — so we
// skip the header there.
// Optional bounding box (Overpass order: south, west, north, east) scopes the
// query to one location — fast, and it eliminates global name-conflation since
// we only look near the Nominatim-resolved bridge.
export type OverpassBbox = [number, number, number, number]

async function queryOverpass(name: string, bbox?: OverpassBbox): Promise<OverpassResponse> {
  const escaped = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const filter = bbox ? `(${bbox.join(',')})` : ''
  const ql = `[out:json][timeout:25];nwr["bridge"]["name"="${escaped}"]${filter};out tags center;`
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  if (typeof window === 'undefined') headers['User-Agent'] = USER_AGENT
  const res = await fetchWithTimeout(OVERPASS_URL, {
    method: 'POST',
    headers,
    body: 'data=' + encodeURIComponent(ql),
  })
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
  return res.json() as Promise<OverpassResponse>
}

// First non-empty value of any of the given tag keys, across all elements.
function firstTag(elements: OverpassElement[], keys: string[]): string | null {
  for (const el of elements) {
    for (const key of keys) {
      const v = el.tags?.[key]
      if (v != null && v.trim() !== '') return v
    }
  }
  return null
}

// Parse a leading 4-digit year from an OSM/Wikidata date string
// (e.g. "1883-05-24", "1931", "+1883-05-24T00:00:00Z"). null if none.
export function parseYear(value: string | null): number | null {
  if (!value) return null
  const m = value.match(/(\d{4})/)
  if (!m) return null
  const year = Number(m[1])
  return year >= 1 && year <= 9999 ? year : null
}

// "Year built" is the ORIGINAL construction year, so pick the date string whose
// year is earliest across all elements/keys. Guards against a sub-element's
// future works date winning (GWB had a stray start_date=2027).
function earliestDate(elements: OverpassElement[], keys: string[]): string | null {
  let best: { year: number; value: string } | null = null
  for (const el of elements) {
    for (const key of keys) {
      const v = el.tags?.[key]
      const year = parseYear(v ?? null)
      if (v == null || year == null) continue
      if (!best || year < best.year) best = { year, value: v }
    }
  }
  return best?.value ?? null
}

function elementCoord(el: OverpassElement): BridgeCoordinate | null {
  if (el.center) return { lat: el.center.lat, lng: el.center.lon }
  if (el.lat != null && el.lon != null) return { lat: el.lat, lng: el.lon }
  return null
}

// Centroid of every element that has a coordinate. Good enough for a single
// map pin on a multi-segment structure.
function centroid(elements: OverpassElement[]): BridgeCoordinate | null {
  const points = elements.map(elementCoord).filter((p): p is BridgeCoordinate => p != null)
  if (points.length === 0) return null
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), {
    lat: 0,
    lng: 0,
  })
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}

// Great-circle distance in km (haversine).
export function distanceKm(a: BridgeCoordinate, b: BridgeCoordinate): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// A name like "Brooklyn Bridge" returns elements for EVERY same-named bridge on
// the planet (§7 finding: name ≠ identity). Single-linkage clustering groups
// elements into distinct physical bridges: an element joins a cluster if it's
// within LINK_KM of ANY member. Contiguous segments of one long bridge chain
// together; bridges in different cities (far apart) fall into separate clusters.
const LINK_KM = 2

function clusterElements(elements: OverpassElement[]): OverpassElement[][] {
  const located = elements.filter((el) => elementCoord(el) != null)
  const clusters: OverpassElement[][] = []
  for (const el of located) {
    const coord = elementCoord(el)!
    const joined = clusters.find((cluster) =>
      cluster.some((member) => distanceKm(coord, elementCoord(member)!) <= LINK_KM),
    )
    if (joined) joined.push(el)
    else clusters.push([el])
  }
  // Elements with no coordinate (rare) attach to the largest cluster so their
  // tags aren't lost.
  const unlocated = elements.filter((el) => elementCoord(el) == null)
  if (unlocated.length > 0 && clusters.length > 0) {
    clusters.sort((a, b) => b.length - a.length)
    clusters[0].push(...unlocated)
  }
  return clusters
}

// Distinct OSM structure findings across all elements (deduped by canonical type).
function aggregateStructures(elements: OverpassElement[]): StructureFinding[] {
  const seen = new Set<string>()
  const out: StructureFinding[] = []
  for (const el of elements) {
    const raw = el.tags?.['bridge:structure']
    if (!raw) continue
    const type = mapOsmStructure(raw)
    if (!type || seen.has(type)) continue
    seen.add(type)
    out.push({ type, source: 'osm', raw })
  }
  return out
}

// Aggregate one cluster (one physical bridge) into a candidate record.
function buildCandidate(name: string, elements: OverpassElement[]): OsmBridgeData {
  const coordinate = centroid(elements)
  return {
    id: bridgeId(name, coordinate),
    name,
    coordinate,
    structures: aggregateStructures(elements),
    yearBuilt: earliestDate(elements, [
      'start_date',
      'opening_date',
      'year_of_construction',
      'construction:start_date',
    ]),
    architect: firstTag(elements, ['architect']),
    engineer: firstTag(elements, ['engineer', 'designer']),
    wikidataQid: firstTag(elements, ['wikidata']),
    wikipediaTitle: firstTag(elements, ['wikipedia']),
    elementCount: elements.length,
  }
}

// Returns one candidate per distinct physical bridge with this exact name,
// largest (most elements) first. We group by name (harmless for an exact query,
// and ready for when a geocoder feeds multiple names through here), then cluster
// each name's elements by proximity (so two same-named bridges in different
// cities stay separate, and two different-named bridges that happen to be near
// each other don't merge).
export async function fetchOsmBridgeCandidates(
  name: string,
  bbox?: OverpassBbox,
): Promise<OsmBridgeData[]> {
  const data = await queryOverpass(name, bbox)
  const elements = data.elements ?? []
  if (elements.length === 0) return []

  const byName = new Map<string, OverpassElement[]>()
  for (const el of elements) {
    const name = el.tags?.name
    if (!name) continue
    const group = byName.get(name)
    if (group) group.push(el)
    else byName.set(name, [el])
  }

  const candidates: OsmBridgeData[] = []
  for (const [name, group] of byName) {
    for (const cluster of clusterElements(group)) {
      candidates.push(buildCandidate(name, cluster))
    }
  }
  return candidates.sort((a, b) => b.elementCount - a.elementCount)
}
