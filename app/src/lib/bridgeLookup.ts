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

// Strip deck/level qualifiers so the two halves of a double-decked bridge
// collapse, e.g. "George Washington Bridge Upper Level" / "(Lower Level)" /
// "... lower" → "George Washington Bridge". Case-preserving (this is the name we
// display). Handles the suffix with or without parentheses (production Nominatim
// returns it WITHOUT parens; earlier test data had parens).
function baseName(name: string): string {
  return name
    .replace(/\s*[-–—]?\s*\(?\s*(upper|lower)(\s+(level|deck))?\s*\)?\s*$/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '') // any other trailing parenthetical
    .trim()
}

// Nominatim returns multiple entries for one physical bridge (the relation, its
// constituent ways, both end anchors of a long bridge, and separate upper/lower
// decks), with names that differ only by a level suffix and coords up to ~1-2 km
// apart — so a rounded-coordinate key splits them. Collapse by BASE name +
// proximity: a result is a duplicate if one with the same base name already sits
// within 2 km. We store and display the base name, and avoid enriching the same
// bridge several times.
const DEDUPE_KM = 2

export async function searchBridges(query: string): Promise<BridgeSearchResult[]> {
  const results = await searchNominatim(query)
  const unique: BridgeSearchResult[] = []
  for (const r of results) {
    const base = baseName(r.name)
    const dup = unique.some(
      (u) =>
        u.name.toLowerCase() === base.toLowerCase() &&
        distanceKm(u.coordinate, r.coordinate) <= DEDUPE_KM,
    )
    if (!dup) unique.push({ ...r, name: base })
  }
  return unique
}

// Beyond this distance, a name-resolved Wikidata entity is NOT this result's
// bridge — it's a namesake collision (e.g. a Queensland "Golden Gate Bridge"
// resolving to the San Francisco entity ~12,000 km away).
const MAX_MISMATCH_KM = 50

interface EnrichedResult {
  bridge: Bridge
  resolvedQid: string | null // the Wikidata entity this name/tag resolved to
  wikidataNear: boolean // entity coordinate is near the result (or unknown)
}

// Enrich one search result. Pipeline per result is serial — OSM (bbox-scoped) →
// Wikidata → Wikipedia — because each step feeds the next: OSM gives the wikidata
// QID + wikipedia tag; the validated Wikidata entity gives the canonical name and
// the correct enwiki article title.
async function enrichWithMeta(result: BridgeSearchResult): Promise<EnrichedResult> {
  const candidates = await fetchOsmBridgeCandidates(result.name, bboxFor(result)).catch(() => [])
  const osm = candidates[0] ?? null
  const coordinate = osm?.coordinate ?? result.coordinate

  const wikidata = await fetchWikidataBridge({ qid: osm?.wikidataQid, name: result.name }).catch(
    () => null,
  )

  // Location-validate the Wikidata match. A name search can resolve a local
  // bridge to a famous same-named one elsewhere; if the entity's coordinate is
  // far from this result, the match is a collision and its data must not be used.
  const wikidataNear =
    !wikidata?.coordinate || distanceKm(coordinate, wikidata.coordinate) <= MAX_MISMATCH_KM
  const useWikidata = wikidata != null && wikidataNear

  // Pick the Wikipedia article title: validated Wikidata sitelink (correct +
  // upgrades a short OSM name like "Golden Gate" to the real article) → OSM's own
  // wikipedia tag → the result name. Skip the name when Wikidata told us it's a
  // far-away namesake, so we don't pull the famous bridge's article either.
  let wpTitle: string | null = null
  if (useWikidata && wikidata.wikipediaTitle) wpTitle = wikidata.wikipediaTitle
  else if (osm?.wikipediaTitle) wpTitle = osm.wikipediaTitle
  else if (!(wikidata && !wikidataNear)) wpTitle = result.name
  const wikipedia = wpTitle ? await fetchWikipediaSummary(wpTitle).catch(() => null) : null

  // Canonical name from the validated Wikidata label (fixes short OSM names like
  // "Golden Gate" → "Golden Gate Bridge"); otherwise the search-result name.
  const name = useWikidata && wikidata.label ? wikidata.label : result.name

  // Lossless union of structure findings (provenance kept; conflict display is
  // open decision #8).
  const structures: StructureFinding[] = [
    ...(osm?.structures ?? []),
    ...(useWikidata ? wikidata.structures : []),
  ]

  const bridge: Bridge = {
    id: bridgeId(name, coordinate),
    name,
    region: result.region,
    coordinate,
    structures,
    yearBuilt: earlierYear(osm?.yearBuilt ?? null, useWikidata ? wikidata.yearBuilt : null),
    architect: osm?.architect ?? (useWikidata ? wikidata.architect : null),
    engineer: osm?.engineer ?? (useWikidata ? wikidata.engineer : null),
    lengthMeters: useWikidata ? wikidata.lengthMeters : null,
    summary: wikipedia?.summary ?? null,
    thumbnailUrl: wikipedia?.thumbnailUrl ?? null,
    wikipediaUrl: wikipedia?.pageUrl ?? null,
    wikidataQid: useWikidata ? wikidata.qid : null,
    sources: { osm: osm != null, wikidata: useWikidata, wikipedia: wikipedia != null },
  }

  return { bridge, resolvedQid: wikidata?.qid ?? null, wikidataNear }
}

// Public single-result enrichment (used by tooling/smoke tests).
export async function enrichSearchResult(result: BridgeSearchResult): Promise<Bridge> {
  return (await enrichWithMeta(result)).bridge
}

// Search + enrich every result, so cards carry the structure badge (the #1
// feature, CLAUDE.md). `limit` bounds the API fan-out. Phase 2's Supabase cache
// (§9) makes repeats instant.
//
// Final pass removes namesake collisions: if a result resolved to a Wikidata
// entity that's far away (not near), AND another result legitimately OWNS that
// same entity (resolved to it AND is near it), the far one is a collision and is
// dropped — e.g. the Queensland "Golden Gate Bridge" is removed once the SF one
// validates Q44440. Bridges with no validated owner of their entity are kept, so
// genuinely-distinct same-named bridges survive.
export async function searchAndEnrich(query: string, limit = 8): Promise<Bridge[]> {
  const results = (await searchBridges(query)).slice(0, limit)
  const enriched = await Promise.all(results.map(enrichWithMeta))

  const validatedOwners = new Set<string>()
  for (const e of enriched) {
    if (e.resolvedQid && e.wikidataNear) validatedOwners.add(e.resolvedQid)
  }

  return enriched
    .filter((e) => !(e.resolvedQid && !e.wikidataNear && validatedOwners.has(e.resolvedQid)))
    .map((e) => e.bridge)
}
