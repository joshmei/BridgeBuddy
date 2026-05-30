// Design probe for switching search to Photon. Inspect response shape, bridge
// identification, region fields, coordinates. Run: node phase-1/photon-probe.mjs
async function search(q) {
  const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=15`)
  const data = await res.json()
  console.log(`\n=== q="${q}" → ${data.features?.length ?? 0} features ===`)
  for (const f of data.features ?? []) {
    const p = f.properties || {}
    const [lon, lat] = f.geometry?.coordinates ?? []
    const place = [p.city || p.town || p.village || p.district, p.state, p.country]
      .filter(Boolean)
      .join(', ')
    console.log(
      `  ${(p.name || '(no name)').slice(0, 30).padEnd(30)} ${String(p.osm_key + '=' + p.osm_value).padEnd(20)} ${p.osm_type}${p.osm_id} @ ${lat?.toFixed?.(3)},${lon?.toFixed?.(3)} | ${place}`,
    )
  }
}

for (const q of ['golden', 'brooklyn', 'hawthorne', 'george washington', 'walnut street']) {
  await search(q)
}
