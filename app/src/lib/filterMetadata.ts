import data from '../data/filterMetadata.json'
import type { StructureType } from './structureTypes'
import { STRUCTURE_TYPES } from './structureTypes'
import type { FilterOptions } from './filters'

// Home-screen filter options come from a STATIC bundled config (PRODUCT.md
// §5.6 #6) — shipped with the app, instant, zero network, nothing for anyone to
// set up. Regenerate with `node phase-1/gen-seed.mjs` (states/provinces
// hardcoded; architects/engineers pulled from Wikidata). No write-through / no
// self-growth (that was the dropped Supabase-table approach).

interface FilterMetadata {
  countries: string[]
  statesByCountry: Record<string, string[]>
  architects: string[]
  engineers: string[]
}

const META = data as FilterMetadata

export function homeStatesFor(country: string | null): string[] {
  if (!country) return []
  return META.statesByCountry[country] ?? []
}

// FilterOptions for the home screen (before any search). Structure types are the
// full canonical set; geography/architect/engineer come from the bundled config.
export function homeFilterOptions(selectedCountry: string | null): FilterOptions {
  return {
    countries: META.countries,
    states: homeStatesFor(selectedCountry),
    structureTypes: STRUCTURE_TYPES as unknown as StructureType[],
    architects: META.architects,
    engineers: META.engineers,
  }
}
