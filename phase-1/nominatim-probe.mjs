// Why does partial search ("Brooklyn") return nothing while "Brooklyn Bridge"
// works? Inspect what Nominatim returns + its categories/types for each.
// Run: node phase-1/nominatim-probe.mjs
const UA = 'BridgeBuddy/0.1 (test)'

async function search(q) {
  const params = new URLSearchParams({ q, format: 'jsonv2', addressdetails: '1', limit: '10' })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': UA },
  })
  const data = await res.json()
  console.log(`\n=== q="${q}" → ${data.length} raw results ===`)
  for (const p of data) {
    console.log(`  ${(p.name || '(no name)').padEnd(28)} cat=${p.category}/${p.type}  addrtype=${p.addresstype}`)
  }
}

for (const q of ['Brooklyn', 'Brooklyn bridge', 'Hawthorne', 'Golden Gate']) {
  await search(q)
}
