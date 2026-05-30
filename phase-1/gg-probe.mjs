// Investigate the Golden Gate issues: name truncation + Queensland data collision.
// Run: node phase-1/gg-probe.mjs
const UA = 'BridgeBuddy/0.1 (test)'

async function search(q) {
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    extratags: '1',
    limit: '12',
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': UA },
  })
  const data = await res.json()
  console.log(`\n=== q="${q}" → ${data.length} raw ===`)
  for (const p of data) {
    const a = p.address || {}
    const ex = p.extratags || {}
    const place = [a.city || a.town || a.village || a.suburb || a.county, a.state, a.country]
      .filter(Boolean)
      .join(', ')
    console.log(
      `  name="${p.name}" (${p.category}/${p.type}) bridge=${ex.bridge ?? '-'} wikidata=${ex.wikidata ?? '-'} @ ${Number(p.lat).toFixed(3)},${Number(p.lon).toFixed(3)} | ${place}`,
    )
  }
}

// Also: what coordinate does Wikidata have for the Golden Gate Bridge entity?
async function wikidataCoord(qid) {
  const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
    headers: { 'User-Agent': UA },
  })
  const data = await res.json()
  const claims = data.entities?.[qid]?.claims ?? {}
  const c = claims.P625?.[0]?.mainsnak?.datavalue?.value
  console.log(`\nWikidata ${qid} P625 coordinate:`, c ? `${c.latitude},${c.longitude}` : 'none')
}

await search('golden gate')
await search('golden gate bridge')
await wikidataCoord('Q44440') // Golden Gate Bridge (SF)
