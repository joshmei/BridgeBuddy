// Verify the Photon search switch: bridge-only, prefix recall, prominence
// ranking, and full-path dedup/canonical naming.
// Run from app/: npx tsx ../phase-1/verify-partial.ts
import { searchBridges, searchAndEnrich } from '../app/src/lib/bridgeLookup'

async function main() {
  for (const q of ['golden', 'tower', 'brooklyn', 'hawthorne']) {
    const r = await searchBridges(q)
    console.log(`searchBridges("${q}") top: ` + r.slice(0, 4).map((x) => `${x.name} [${x.region}]`).join(' | '))
  }
  for (const q of ['golden', 'george washington']) {
    const b = await searchAndEnrich(q)
    console.log(`\nsearchAndEnrich("${q}") → ${b.length}:`)
    for (const x of b.slice(0, 6)) {
      console.log(`  ${x.name} [${x.region}] qid=${x.wikidataQid} photo=${x.thumbnailUrl ? 'y' : 'n'} len=${x.lengthMeters ?? '-'}`)
    }
  }
}

main()
