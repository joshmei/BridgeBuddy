import data from '../data/filterMetadata.json'

// Bundled static config (PRODUCT.md §5.6) — shipped with the app, instant, zero
// network, nothing to set up. Regenerate with `node phase-1/gen-seed.mjs`
// (architects/engineers pulled from Wikidata). Browse-by-type reads the architect
// and engineer lists straight from here (unchanged from the old filter approach).

interface FilterMetadata {
  countries: string[]
  statesByCountry: Record<string, string[]>
  architects: string[]
  engineers: string[]
}

const META = data as FilterMetadata

export const ARCHITECTS = META.architects
export const ENGINEERS = META.engineers
