import type { StructureType } from './structureTypes'

// A single structure-type finding, tagged with where it came from and the raw
// value before normalization. We preserve ALL findings from BOTH sources
// rather than collapsing to one value, because:
//   - hybrid bridges genuinely are two types (Brooklyn = suspension + cable-stayed)
//   - OSM and Wikidata can legitimately disagree (Hawthorne: OSM=truss,
//     Wikidata=vertical-lift → movable; both correct for different elements)
// How to DISPLAY a multi-finding / conflicting set is open decision #8 (§11) —
// the data layer stays lossless so the UI can decide later.
export interface StructureFinding {
  type: StructureType
  source: 'osm' | 'wikidata'
  raw: string // original tag value / P31 label, e.g. 'vertical-lift bridge'
}

export interface BridgeCoordinate {
  lat: number
  lng: number
}

// The merged, source-agnostic bridge record the UI renders. Every external
// field is nullable — Wikipedia/Wikidata coverage is patchy for regional
// bridges (§9) and missing data is shown as a gap, never hidden.
export interface Bridge {
  id: string // synthetic stable key — see identity.ts; also the §9 cache key
  name: string
  region: string | null // human-readable place label, e.g. "Brooklyn, New York"
  country: string | null // structured, for the geographic filter (e.g. "United States")
  state: string | null // structured state/province, for US/Canada drill-down
  coordinate: BridgeCoordinate | null
  structures: StructureFinding[] // empty => "Structure type unknown" (§6)
  yearBuilt: string | null // ISO-ish date or year string, as the source gives it
  architect: string | null
  engineer: string | null
  lengthMeters: number | null
  summary: string | null
  thumbnailUrl: string | null
  wikipediaUrl: string | null
  wikidataQid: string | null
  // Which sources actually returned data — useful for debugging coverage and
  // for the cache layer in Phase 2.
  sources: {
    osm: boolean
    wikidata: boolean
    wikipedia: boolean
  }
}
