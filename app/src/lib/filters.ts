import type { Bridge } from './bridge'
import type { StructureType } from './structureTypes'
import { STRUCTURE_TYPES } from './structureTypes'
import { DEFAULT_PINNED_COUNTRY, type PinnedCountry } from './geolocate'

// Search-results filtering (§5.6, Phase 1.5). All pure + data-driven — every
// option comes from the current result set; no network calls here.

export interface Filters {
  country: string | null
  state: string | null // only meaningful when country is US/Canada
  structureTypes: StructureType[] // OR within this facet, AND across facets
  architect: string | null
  engineer: string | null
}

export const EMPTY_FILTERS: Filters = {
  country: null,
  state: null,
  structureTypes: [],
  architect: null,
  engineer: null,
}

// Architect / engineer fields can hold several people ("Ammann, Cass Gilbert").
// We treat them as individual names everywhere — so each is a distinct filter
// option and each is independently discoverable (Wikidata matches one label).
export function splitNames(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function isFilterActive(f: Filters): boolean {
  return (
    f.country != null ||
    f.state != null ||
    f.structureTypes.length > 0 ||
    f.architect != null ||
    f.engineer != null
  )
}

// Countries that drill down to a state/province picker.
const STATE_COUNTRIES = new Set(['United States', 'Canada'])
export function hasStates(country: string | null): boolean {
  return country != null && STATE_COUNTRIES.has(country)
}

// AND across facets; OR within the structure-type facet (a bridge matches if it
// has ANY selected type — standard faceted search). Geography/architect/engineer
// are exact-match narrowers.
export function applyFilters(bridges: Bridge[], f: Filters): Bridge[] {
  return bridges.filter((b) => {
    if (f.country && b.country !== f.country) return false
    if (f.state && b.state !== f.state) return false
    if (f.structureTypes.length > 0) {
      const types = new Set(b.structures.map((s) => s.type))
      if (!f.structureTypes.some((t) => types.has(t))) return false
    }
    if (f.architect && !splitNames(b.architect).includes(f.architect)) return false
    if (f.engineer && !splitNames(b.engineer).includes(f.engineer)) return false
    return true
  })
}

export interface FilterOptions {
  countries: string[]
  states: string[] // for the selected country (empty unless a US/Canada country is chosen)
  structureTypes: StructureType[]
  architects: string[]
  engineers: string[]
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b))
}

// Available filter options derived from the (unfiltered) result set. States are
// scoped to the currently-selected country so the drill-down is relevant.
export function deriveOptions(bridges: Bridge[], selectedCountry: string | null): FilterOptions {
  const presentTypes = new Set<StructureType>()
  for (const b of bridges) for (const s of b.structures) presentTypes.add(s.type)
  return {
    countries: uniqueSorted(bridges.map((b) => b.country)),
    states: hasStates(selectedCountry)
      ? uniqueSorted(bridges.filter((b) => b.country === selectedCountry).map((b) => b.state))
      : [],
    structureTypes: STRUCTURE_TYPES.filter((t) => presentTypes.has(t)),
    architects: uniqueSorted(bridges.flatMap((b) => splitNames(b.architect))),
    engineers: uniqueSorted(bridges.flatMap((b) => splitNames(b.engineer))),
  }
}

// Order the country list: pinned country first; when US is the *default* pin
// (GPS fallback), Canada comes second; otherwise alphabetical (§5.6).
const CANADA = 'Canada'
export function orderCountries(countries: string[], pin: PinnedCountry | null): string[] {
  const sorted = uniqueSorted(countries)
  if (!pin) return sorted
  const out: string[] = []
  if (sorted.includes(pin.country)) out.push(pin.country)
  if (pin.isDefault && pin.country !== CANADA && sorted.includes(CANADA)) out.push(CANADA)
  for (const c of sorted) if (!out.includes(c)) out.push(c)
  return out
}

// Convenience for the UI before GPS resolves: default (US) pin.
export const DEFAULT_PIN: PinnedCountry = { country: DEFAULT_PINNED_COUNTRY, isDefault: true }
