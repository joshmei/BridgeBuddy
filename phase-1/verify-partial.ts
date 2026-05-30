// Verify partial-name search now surfaces bridges (no enrichment, just the
// Nominatim search + dedupe). Run from app/: npx tsx ../phase-1/verify-partial.ts
import { searchBridges } from '../app/src/lib/bridgeLookup'

async function main() {
  for (const q of ['george washington', 'george', 'brooklyn', 'Brooklyn Bridge', 'Golden Gate']) {
    const r = await searchBridges(q)
    console.log(`"${q}" → ${r.length}: ` + r.map((x) => `${x.name} [${x.region}]`).join(' | '))
  }
}

main()
