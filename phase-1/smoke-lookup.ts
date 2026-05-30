// Phase 1 smoke test: run the real Nominatim → Overpass → Wikidata → Wikipedia
// pipeline and print the enriched Bridge records.
// Run from app/:  npx tsx ../phase-1/smoke-lookup.ts

import { searchBridges, enrichSearchResult } from '../app/src/lib/bridgeLookup'

const QUERIES = [
  'brooklyn bridge', // should dedupe to 1 (relation + ways + anchors collapse)
  'george washington bridge', // dedupe NJ/NY anchors + "(upper level)" deck → 1
  'golden gate bridge', // breadth check — a bridge not yet exercised
  'asdfqwer not a bridge', // negative case → no results
]

async function main() {
  for (const query of QUERIES) {
    console.log(`\n=== "${query}" ===`)
    try {
      const results = await searchBridges(query)
      if (results.length === 0) {
        console.log('  (no bridges found)')
        continue
      }
      console.log(
        `  ${results.length} result(s):`,
        results.map((r) => `${r.name} — ${r.region ?? '?'}`).join(' | '),
      )
      const bridge = await enrichSearchResult(results[0])
      console.log('  --- enriched first result ---')
      console.log('  id         :', bridge.id)
      console.log('  region     :', bridge.region)
      console.log('  coordinate :', bridge.coordinate)
      console.log(
        '  structures :',
        bridge.structures.map((s) => `${s.type} [${s.source}:${s.raw}]`).join(', ') || '(unknown)',
      )
      console.log('  yearBuilt  :', bridge.yearBuilt)
      console.log('  architect  :', bridge.architect)
      console.log('  length (m) :', bridge.lengthMeters)
      console.log('  summary    :', bridge.summary ? `${bridge.summary.slice(0, 70)}…` : null)
      console.log('  thumbnail  :', bridge.thumbnailUrl ? 'yes' : 'no')
      console.log('  sources    :', JSON.stringify(bridge.sources))
    } catch (e) {
      console.log('  ERROR -', (e as Error).message)
    }
  }
}

main()
