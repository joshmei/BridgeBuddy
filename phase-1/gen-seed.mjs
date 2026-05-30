// Reusable generator for the bundled filter-options config (PRODUCT.md §5.6 #6).
// Hardcodes US states + Canadian provinces/territories + countries, and pulls
// the most prolific bridge architects/engineers from Wikidata, then writes a
// static JSON file shipped with the app (no DB, no setup).
// Re-run anytime to refresh: node phase-1/gen-seed.mjs
import { writeFileSync, mkdirSync } from 'node:fs'

const UA = 'BridgeBuddy/0.1 (https://bridge-buddy-zeta.vercel.app; jgoog612@gmail.com)'

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri',
  'Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York',
  'North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington',
  'West Virginia','Wisconsin','Wyoming',
]
const CA_PROVINCES = [
  'Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador',
  'Northwest Territories','Nova Scotia','Nunavut','Ontario','Prince Edward Island','Quebec',
  'Saskatchewan','Yukon',
]

// Q12280 = bridge. P84 = architect, P631 = structural engineer.
function sparql(property, limit) {
  return `SELECT ?name (COUNT(DISTINCT ?bridge) AS ?n) WHERE {
    ?bridge wdt:P31/wdt:P279* wd:Q12280 .
    ?bridge wdt:${property} ?person .
    ?person rdfs:label ?name . FILTER(LANG(?name) = "en")
  } GROUP BY ?name ORDER BY DESC(?n) LIMIT ${limit}`
}

async function fetchPeople(property, limit) {
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql(property, limit))}`
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } })
  if (!res.ok) throw new Error(`Wikidata SPARQL HTTP ${res.status}`)
  const data = await res.json()
  return data.results.bindings.map((b) => b.name.value)
}

// All current countries (Wikidata Q6256, P31 with no end date). Bounded (~200)
// and light — unlike scanning every bridge's P17 (which 504s). Same Wikidata
// English labels that discovery results carry, so client-side country filtering
// matches.
async function fetchCountries() {
  const query = `SELECT DISTINCT ?name WHERE {
    ?c wdt:P31 wd:Q6256 .
    FILTER NOT EXISTS { ?c wdt:P576 ?dissolved }
    ?c rdfs:label ?name . FILTER(LANG(?name) = "en")
  }`
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } })
  if (!res.ok) throw new Error(`Wikidata SPARQL HTTP ${res.status}`)
  const data = await res.json()
  return data.results.bindings.map((b) => b.name.value)
}

const architects = await fetchPeople('P84', 40)
const engineers = await fetchPeople('P631', 40)
const countriesRaw = await fetchCountries()
// Comprehensive list (US/Canada guaranteed present), sorted; UI pins the user's
// country (or US by default) to the top.
const countries = [...new Set([...countriesRaw, 'United States', 'Canada'])]
  .filter((c) => c && c.length <= 120)
  .sort((a, b) => a.localeCompare(b))

const data = {
  _generated: 'phase-1/gen-seed.mjs — re-run to refresh',
  countries,
  statesByCountry: {
    'United States': US_STATES,
    Canada: CA_PROVINCES,
  },
  architects,
  engineers,
}

const outDir = new URL('../app/src/data/', import.meta.url)
mkdirSync(outDir, { recursive: true })
writeFileSync(new URL('filterMetadata.json', outDir), JSON.stringify(data, null, 2) + '\n')
const count = data.countries.length + US_STATES.length + CA_PROVINCES.length + architects.length + engineers.length
console.log(`Wrote app/src/data/filterMetadata.json — ${count} values`)
console.log(`architects (${architects.length}):`, architects.slice(0, 8).join(', '), '…')
console.log(`engineers (${engineers.length}):`, engineers.slice(0, 8).join(', '), '…')
