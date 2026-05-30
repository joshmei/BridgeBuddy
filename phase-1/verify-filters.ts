// Pure-logic unit test for Phase 1.5 filters (no API). Run from app/:
//   npx tsx ../phase-1/verify-filters.ts
import type { Bridge } from '../app/src/lib/bridge'
import { applyFilters, deriveOptions, orderCountries, EMPTY_FILTERS } from '../app/src/lib/filters'

function b(partial: Partial<Bridge>): Bridge {
  return {
    id: partial.name ?? 'x',
    name: partial.name ?? 'x',
    region: null,
    country: null,
    state: null,
    coordinate: { lat: 0, lng: 0 },
    structures: [],
    yearBuilt: null,
    architect: null,
    engineer: null,
    lengthMeters: null,
    summary: null,
    thumbnailUrl: null,
    wikipediaUrl: null,
    wikidataQid: null,
    sources: { osm: true, wikidata: false, wikipedia: false },
    ...partial,
  }
}

const S = (t: Bridge['structures'][number]['type']) => ({ type: t, source: 'osm' as const, raw: t })

const bridges: Bridge[] = [
  b({ name: 'Golden Gate', country: 'United States', state: 'California', structures: [S('suspension')], architect: 'Joseph Strauss' }),
  b({ name: 'Brooklyn', country: 'United States', state: 'New York', structures: [S('suspension'), S('cable-stayed')], architect: 'John A. Roebling', engineer: 'John A. Roebling' }),
  b({ name: 'Hawthorne', country: 'United States', state: 'Oregon', structures: [S('truss'), S('movable')] }),
  b({ name: 'Tower Bridge', country: 'United Kingdom', state: 'England', structures: [S('movable')] }),
  b({ name: 'Confederation', country: 'Canada', state: 'Prince Edward Island', structures: [S('beam')] }),
]

let pass = 0
let fail = 0
function check(name: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`)
  cond ? pass++ : fail++
}

// AND across facets: US + suspension → Golden Gate, Brooklyn
check(
  'US + suspension → 2',
  applyFilters(bridges, { ...EMPTY_FILTERS, country: 'United States', structureTypes: ['suspension'] }).length === 2,
)
// OR within structure type: truss OR beam → Hawthorne, Confederation
check(
  'truss|beam → 2',
  applyFilters(bridges, { ...EMPTY_FILTERS, structureTypes: ['truss', 'beam'] }).length === 2,
)
// State narrows within country
check(
  'US + California → 1',
  applyFilters(bridges, { ...EMPTY_FILTERS, country: 'United States', state: 'California' }).length === 1,
)
// Architect filter
check(
  'architect Roebling → 1',
  applyFilters(bridges, { ...EMPTY_FILTERS, architect: 'John A. Roebling' }).length === 1,
)

// Options: only present values
const opts = deriveOptions(bridges, 'United States')
check('countries present = 3', opts.countries.length === 3)
check('US states scoped = 3', opts.states.length === 3 && opts.states.includes('California'))
check('architects present = 2', opts.architects.length === 2)
check('engineers present = 1', opts.engineers.length === 1)

// Country ordering — use Australia (sorts before Canada) to distinguish the
// default (Canada forced 2nd) vs GPS (pure alphabetical after the pin) cases.
const countries = ['Australia', 'Canada', 'United States', 'France']
check(
  'US default pin → Canada forced 2nd: [US, Canada, Australia, France]',
  JSON.stringify(orderCountries(countries, { country: 'United States', isDefault: true })) ===
    JSON.stringify(['United States', 'Canada', 'Australia', 'France']),
)
check(
  'GPS US pin → alphabetical after US: [US, Australia, Canada, France]',
  JSON.stringify(orderCountries(countries, { country: 'United States', isDefault: false })) ===
    JSON.stringify(['United States', 'Australia', 'Canada', 'France']),
)
check(
  'GPS Canada pin → Canada first',
  orderCountries(countries, { country: 'Canada', isDefault: false })[0] === 'Canada',
)

console.log(`\n${pass} passed, ${fail} failed`)
