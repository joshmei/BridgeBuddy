// Verify the Wikipedia bridge-relevance guard: a non-bridge article (rugby
// player "George Bridge") is discarded, real bridges keep their summary.
// Run from app/: npx tsx ../phase-1/verify-wiki.ts
import { fetchWikipediaSummary } from '../app/src/lib/wikipedia'

async function main() {
  for (const name of ['George Bridge', 'Brooklyn Bridge', 'Hawthorne Bridge', 'George Washington Bridge']) {
    const r = await fetchWikipediaSummary(name)
    console.log(`"${name}" → ${r ? `KEPT: ${r.summary.slice(0, 70)}…` : 'null (discarded)'}`)
  }
}

main()
