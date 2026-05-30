// Investigate why Wikidata structure-type calls fail in the browser but not in
// Node. Simulates the cross-origin request (Origin header) and checks for CORS
// response headers. Run: node phase-1/cors-check.mjs
const ORIGIN = 'https://bridge-buddy-zeta.vercel.app'

const GETS = [
  ['Overpass', 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent('[out:json][timeout:5];node(1);out;')],
  ['WD EntityData (current)', 'https://www.wikidata.org/wiki/Special:EntityData/Q125006.json'],
  ['WD wbgetentities origin=*', 'https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q125006&props=claims&format=json&origin=*'],
  ['WD wbsearch origin=*', 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Brooklyn+Bridge&language=en&format=json&origin=*'],
  ['WP REST summary', 'https://en.wikipedia.org/api/rest_v1/page/summary/Brooklyn_Bridge'],
]

console.log('--- simple GET: status + Access-Control-Allow-Origin ---')
for (const [name, url] of GETS) {
  try {
    const res = await fetch(url, { headers: { Origin: ORIGIN } })
    console.log(`${name.padEnd(28)} ${res.status}  ACAO=${res.headers.get('access-control-allow-origin')}`)
  } catch (e) {
    console.log(`${name.padEnd(28)} ERROR ${e.message}`)
  }
}

console.log('\n--- preflight (OPTIONS) with Api-User-Agent header ---')
const PRE = [
  ['WD EntityData', 'https://www.wikidata.org/wiki/Special:EntityData/Q125006.json'],
  ['WP REST summary', 'https://en.wikipedia.org/api/rest_v1/page/summary/Brooklyn_Bridge'],
]
for (const [name, url] of PRE) {
  try {
    const res = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        Origin: ORIGIN,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'api-user-agent',
      },
    })
    console.log(`${name.padEnd(20)} ${res.status}  allow-origin=${res.headers.get('access-control-allow-origin')}  allow-headers=${res.headers.get('access-control-allow-headers')}`)
  } catch (e) {
    console.log(`${name.padEnd(20)} ERROR ${e.message}`)
  }
}
