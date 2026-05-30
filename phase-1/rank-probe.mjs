// ISSUE 4: does raising the limit + sorting by importance surface Golden Gate
// for the query "golden"? Run: node phase-1/rank-probe.mjs
const UA = 'BridgeBuddy/0.1 (test)'

async function search(q, limit) {
  const params = new URLSearchParams({ q, format: 'jsonv2', addressdetails: '1', extratags: '1', limit: String(limit) })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'User-Agent': UA } })
  return res.json()
}

function isBridge(p) {
  if (p.category === 'man_made' && p.type === 'bridge') return true
  if (p.category === 'bridge') return true
  if (p.addresstype === 'bridge') return true
  const ex = p.extratags || {}
  return ex.bridge != null || ex.man_made === 'bridge'
}

for (const limit of [8, 20]) {
  const data = await search('golden', limit)
  const bridges = data.filter(isBridge)
  console.log(`\n=== q="golden" limit=${limit} → ${data.length} raw, ${bridges.length} bridges ===`)
  for (const p of bridges.sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))) {
    const a = p.address || {}
    const place = [a.city || a.town || a.village || a.county, a.state, a.country].filter(Boolean).join(', ')
    console.log(`  imp=${(p.importance ?? 0).toFixed(4)}  ${p.name}  | ${place}`)
  }
}
