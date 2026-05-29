// Follow-up: dump ALL tags from ALL matching elements for a bridge,
// to see if structure/year/architect lives on a sibling way we'd otherwise miss.

const NAMES = ['Brooklyn Bridge', 'George Washington Bridge', 'Hawthorne Bridge'];
const UA = 'BridgeBuddy/0.1-phase0-validation (jgoog612@gmail.com)';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const TAGS_OF_INTEREST = [
  'bridge:structure',
  'bridge',
  'start_date',
  'year_of_construction',
  'opening_date',
  'construction:start_date',
  'architect',
  'engineer',
  'designer',
  'wikipedia',
  'wikidata',
  'heritage',
  'historic',
  'man_made',
  'building',
  'structure',
  'type',
];

async function queryOverpass(name) {
  const query = `[out:json][timeout:25];nwr["bridge"]["name"="${name}"];out tags;`;
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function aggregateTags(elements) {
  const found = {};
  for (const tag of TAGS_OF_INTEREST) {
    const values = new Set();
    for (const el of elements) {
      const v = el.tags?.[tag];
      if (v != null) values.add(v);
    }
    if (values.size > 0) found[tag] = [...values];
  }
  return found;
}

for (const name of NAMES) {
  console.log(`\n=== ${name} ===`);
  const data = await queryOverpass(name);
  const elements = data.elements || [];
  console.log(`  ${elements.length} element(s) returned`);
  for (const [i, el] of elements.entries()) {
    console.log(`  [${i}] ${el.type}/${el.id}  tag keys: ${Object.keys(el.tags || {}).length}`);
  }
  const aggregated = aggregateTags(elements);
  console.log('  AGGREGATED tags of interest:');
  if (Object.keys(aggregated).length === 0) {
    console.log('    (none found across any element)');
  } else {
    for (const [k, v] of Object.entries(aggregated)) {
      console.log(`    ${k} = ${JSON.stringify(v)}`);
    }
  }
}
