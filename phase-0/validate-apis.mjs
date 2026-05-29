// Throwaway validation script for Bridge Buddy Phase 0.
// Queries Overpass + Wikipedia for a few known bridges and reports coverage.
// Run: node phase-0/validate-apis.mjs

const BRIDGES = [
  { name: 'Brooklyn Bridge', expect: 'famous, NYC' },
  { name: 'George Washington Bridge', expect: 'famous, NYC/NJ' },
  { name: 'Hawthorne Bridge', expect: 'mid-tier, Portland OR' },
  { name: 'Walnut Street Bridge', expect: 'smaller, Chattanooga TN' },
];

const UA = 'BridgeBuddy/0.1-phase0-validation (jgoog612@gmail.com)';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

async function queryOverpass(name) {
  const query = `[out:json][timeout:25];nwr["bridge"]["name"="${name}"];out tags 5;`;
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'data=' + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function queryWikipedia(name) {
  const slug = encodeURIComponent(name.replace(/ /g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function summarizeOverpass(data) {
  const elements = data.elements || [];
  if (elements.length === 0) return { hits: 0 };
  const first = elements[0];
  const tags = first.tags || {};
  return {
    hits: elements.length,
    firstType: first.type,
    structure: tags['bridge:structure'] ?? '(missing)',
    bridge: tags['bridge'] ?? '(missing)',
    year: tags['start_date'] ?? tags['year_of_construction'] ?? '(missing)',
    architect: tags['architect'] ?? '(missing)',
    wikipedia: tags['wikipedia'] ?? '(missing)',
    wikidata: tags['wikidata'] ?? '(missing)',
  };
}

function summarizeWikipedia(data) {
  if (!data) return { found: false };
  return {
    found: true,
    type: data.type,
    hasSummary: !!data.extract,
    summaryChars: data.extract?.length ?? 0,
    hasImage: !!data.thumbnail,
    url: data.content_urls?.desktop?.page,
  };
}

console.log('Bridge Buddy — Phase 0 API validation');
console.log('User-Agent:', UA);

for (const { name, expect } of BRIDGES) {
  console.log(`\n=== ${name}  (${expect}) ===`);

  try {
    const o = await queryOverpass(name);
    console.log('  Overpass :', JSON.stringify(summarizeOverpass(o)));
  } catch (e) {
    console.log('  Overpass : ERROR -', e.message);
  }

  try {
    const w = await queryWikipedia(name);
    console.log('  Wikipedia:', JSON.stringify(summarizeWikipedia(w)));
  } catch (e) {
    console.log('  Wikipedia: ERROR -', e.message);
  }
}
