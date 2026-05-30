// Verify the Golden Gate fixes (canonical name, collision removal, region
// format) + no regressions. Uses the full enrich path incl. collision removal.
// Run from app/: npx tsx ../phase-1/verify-partial.ts
import { searchAndEnrich } from '../app/src/lib/bridgeLookup'

async function main() {
  for (const q of [
    'golden gate',
    'golden gate bridge',
    'george washington',
    'walnut street bridge',
  ]) {
    const bridges = await searchAndEnrich(q)
    console.log(`\n"${q}" → ${bridges.length} result(s):`)
    for (const b of bridges) {
      console.log(
        `  ${b.name} | region="${b.region}" | qid=${b.wikidataQid} | photo=${b.thumbnailUrl ? 'y' : 'n'} | len=${b.lengthMeters ?? '-'} @ ${b.coordinate?.lat.toFixed(2)},${b.coordinate?.lng.toFixed(2)}`,
      )
    }
  }
}

main()
