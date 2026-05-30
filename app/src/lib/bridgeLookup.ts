import type { Bridge, StructureFinding } from './bridge'
import { bridgeId } from './identity'
import { searchNominatim, type BridgeSearchResult } from './nominatim'
import { distanceKm, fetchOsmBridgeCandidates, parseYear, type OverpassBbox } from './overpass'
import { fetchWikidataBridge } from './wikidata'
import { fetchWikipediaSummary } from './wikipedia'

// The lookup pipeline (PRODUCT.md §7):
//   1. Nominatim — search engine. Resolves the typed query to located bridge
//      results (name + coordinate + region label). Fast, partial/fuzzy.
//   2. Overpass — bbox-scoped to each result, aggregates the bridge's tags
//      (structure type, year, architect) across all its OSM elements.
//   3. Wikidata + Wikipedia — fill structure/architect/length and summary/photo.
// Steps 2 + 3's failures are non-fatal: a result still renders from whatever
// resolved (Nominatim always gives at least name + coordinate + region, §9).

// Earliest of two date strings by parsed year (original construction year).
function earlierYear(a: string | null, b: string | null): string | null {
  const ya = parseYear(a)
  const yb = parseYear(b)
  if (ya == null) return b
  if (yb == null) return a
  return ya <= yb ? a : b
}

// Overpass bbox (south, west, north, east) from a search result. Prefer
// Nominatim's feature bounds (correct for long bridges); pad slightly so we
// don't clip end segments. Fall back to a ~5 km box around the point.
function bboxFor(result: BridgeSearchResult): OverpassBbox {
  const pad = 0.01
  if (result.bbox) {
    const { south, north, west, east } = result.bbox
    return [south - pad, west - pad, north + pad, east + pad]
  }
  const { lat, lng } = result.coordinate
  const d = 0.05
  return [lat - d, lng - d, lat + d, lng + d]
}

// Drop a trailing parenthetical so deck variants collapse together, e.g.
// "George Washington Bridge (upper level)" → "george washington bridge".
function normalizeName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase()
}

// Nominatim returns multiple entries for one physical bridge (the relation, its
// constituent ways, and both end anchors of a long bridge), same name but coords
// that can differ by ~1-2 km — so a rounded-coordinate key splits them. Collapse
// by normalized name + proximity instead: a result is a duplicate if one with
// the same normalized name already sits within 2 km. Keeps the first (best-
// ranked) entry, and avoids enriching the same bridge several times.
const DEDUPE_KM = 2

export async function searchBridges(query: string): Promise<BridgeSearchResult[]> {
  const results = await searchNominatim(query)
  const unique: BridgeSearchResult[] = []
  for (const r of results) {
    const norm = normalizeName(r.name)
    const dup = unique.some(
      (u) => normalizeName(u.name) === norm && distanceKm(u.coordinate, r.coordinate) <= DEDUPE_KM,
    )
    if (!dup) unique.push(r)
  }
  return unique
}

// Enrich one search result into a full Bridge. OSM is bbox-scoped to the result;
// Wikidata + Wikipedia run in parallel. If OSM finds nothing (name mismatch
// between Nominatim and the OSM `name` tag), we still return a useful record
// from Nominatim + Wikidata + Wikipedia.
export async function enrichSearchResult(result: BridgeSearchResult): Promise<Bridge> {
  const candidates = await fetchOsmBridgeCandidates(result.name, bboxFor(result)).catch(() => [])
  const osm = candidates[0] ?? null

  const [wikidata, wikipedia] = await Promise.all([
    fetchWikidataBridge({ qid: osm?.wikidataQid, name: result.name }).catch(() => null),
    fetchWikipediaSummary(osm?.wikipediaTitle ?? result.name).catch(() => null),
  ])

  const coordinate = osm?.coordinate ?? result.coordinate
  // Lossless union of structure findings (provenance kept; conflict display is
  // open decision #8).
  const structures: StructureFinding[] = [
    ...(osm?.structures ?? []),
    ...(wikidata?.structures ?? []),
  ]

  return {
    id: osm?.id ?? bridgeId(result.name, coordinate),
    name: result.name,
    region: result.region,
    coordinate,
    structures,
    yearBuilt: earlierYear(osm?.yearBuilt ?? null, wikidata?.yearBuilt ?? null),
    architect: osm?.architect ?? wikidata?.architect ?? null,
    engineer: osm?.engineer ?? wikidata?.engineer ?? null,
    lengthMeters: wikidata?.lengthMeters ?? null,
    summary: wikipedia?.summary ?? null,
    thumbnailUrl: wikipedia?.thumbnailUrl ?? null,
    wikipediaUrl: wikipedia?.pageUrl ?? null,
    wikidataQid: osm?.wikidataQid ?? wikidata?.qid ?? null,
    sources: {
      osm: osm != null,
      wikidata: wikidata != null,
      wikipedia: wikipedia != null,
    },
  }
}

// Search + enrich every result, so cards carry the structure badge (the #1
// feature, CLAUDE.md). `limit` bounds the API fan-out. Phase 2's Supabase cache
// (§9) makes repeats instant.
export async function searchAndEnrich(query: string, limit = 8): Promise<Bridge[]> {
  const results = (await searchBridges(query)).slice(0, limit)
  return Promise.all(results.map(enrichSearchResult))
}
