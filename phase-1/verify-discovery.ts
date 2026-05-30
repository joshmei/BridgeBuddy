// Verify the home-screen discovery producer: bridges-by-person via Wikidata,
// enriched. Run from app/: npx tsx ../phase-1/verify-discovery.ts
import { searchBridgesByPerson } from '../app/src/lib/wikidataDiscovery'

async function main() {
  for (const [name, role] of [
    ['John Augustus Roebling', 'architect'],
    ['David B. Steinman', 'engineer'],
  ] as const) {
    const b = await searchBridgesByPerson(name, role, 8)
    console.log(`\n${name} (${role}) → ${b.length}:`)
    for (const x of b.slice(0, 6)) {
      console.log(
        `  ${x.name} | ${x.structures.map((s) => s.type).join('/') || '?'} | ${x.country ?? 'no country'} | photo ${x.thumbnailUrl ? 'y' : 'n'}`,
      )
    }
  }
}

main()
