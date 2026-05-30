// Generates the curated "prominent New York bridges" default list bundled with
// the app (PRODUCT.md §5.6 #6 follow-up b). A live "all bridges in NY" Wikidata
// query 504s, so we resolve a curated, prominence-ordered name list once at
// build time through the real app pipeline and ship the enriched records.
// Run from app/:  npx tsx ../phase-1/gen-default-bridges.ts
import { writeFileSync } from 'node:fs'
import { searchAndEnrich } from '../app/src/lib/bridgeLookup'
import type { Bridge } from '../app/src/lib/bridge'

// Prominence-ordered (my curation). Edit to refresh the default list.
const NY_BRIDGES = [
  'Brooklyn Bridge',
  'George Washington Bridge',
  'Verrazzano-Narrows Bridge',
  'Manhattan Bridge',
  'Williamsburg Bridge',
  'Queensboro Bridge',
  'Bronx–Whitestone Bridge',
  'Throgs Neck Bridge',
  'Hell Gate Bridge',
  'Robert F. Kennedy Bridge',
  'Henry Hudson Bridge',
  'Kosciuszko Bridge',
  'Tappan Zee Bridge',
  'Marine Parkway–Gil Hodges Memorial Bridge',
  'Macombs Dam Bridge',
]

async function main() {
  const out: Bridge[] = []
  for (const name of NY_BRIDGES) {
    try {
      const [best] = await searchAndEnrich(name, 1)
      if (best) {
        out.push(best)
        console.log(`  ✓ ${name} → ${best.name} | ${best.region ?? '?'} | ${best.structures.map((s) => s.type).join('/') || '?'}`)
      } else {
        console.log(`  ✗ ${name} → no result`)
      }
    } catch (e) {
      console.log(`  ✗ ${name} → ERROR ${(e as Error).message}`)
    }
  }
  writeFileSync(
    new URL('../app/src/data/defaultBridges.json', import.meta.url),
    JSON.stringify(out, null, 2) + '\n',
  )
  console.log(`\nWrote app/src/data/defaultBridges.json — ${out.length} bridges`)
}

main()
