// Investigate two search bugs:
//  1. non-bridge "George Bridge" leaking through the filter
//  2. GWB "Upper/Lower Level" not deduping
// Dumps category/type/addresstype + OSM extratags so we can filter strictly.
// Run: node phase-1/bug-probe.mjs
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
    const ex = p.extratags || {}
    console.log(
      `  ${(p.name || '(no name)').slice(0, 34).padEnd(34)} ${String(p.category + '/' + p.type).padEnd(20)} addr=${String(p.addresstype).padEnd(10)} bridge=${ex.bridge ?? '-'} man_made=${ex.man_made ?? '-'}`,
    )
  }
}

for (const q of ['george', 'george bridge', 'brooklyn bridge', 'george washington']) {
  await search(q)
}
