// Phase 0 follow-up: can Wikidata fill in structure type when OSM doesn't?
// Queries Wikidata entities for the 4 test bridges and dumps the properties
// most likely to encode "bridge type" (P31 instance of, P186 material, and
// related). For bridges where we already have the Q-ID from OSM, use it;
// otherwise look up by label.

const UA = 'BridgeBuddy/0.1-phase0-validation (jgoog612@gmail.com)';

const BRIDGES = [
  { name: 'Brooklyn Bridge', qid: 'Q125006' },          // from OSM tag
  { name: 'George Washington Bridge', qid: null },       // not in OSM, lookup needed
  { name: 'Hawthorne Bridge', qid: null },
  { name: 'Walnut Street Bridge', qid: null },
];

const PROPERTIES_OF_INTEREST = {
  P31:   'instance of',
  P186:  'material used',
  P527:  'has part',
  P361:  'part of',
  P2043: 'length',
  P571:  'inception',
  P84:   'architect',
  P631:  'structural engineer',
  P1435: 'heritage designation',
  // Wikidata sometimes uses these for bridges:
  P912:  'has facility',
  P5008: 'on focus list of project',
};

async function lookupQid(label) {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(label)}&language=en&format=json&limit=5`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Search ${res.status}`);
  const data = await res.json();
  // Pick the first result whose description suggests a bridge
  const bridgeMatch = data.search?.find(r => /bridge/i.test(r.description || ''));
  return { qid: bridgeMatch?.id, description: bridgeMatch?.description, allResults: data.search?.slice(0, 3) };
}

async function fetchEntity(qid) {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Entity ${res.status}`);
  return res.json();
}

async function resolveLabel(qid) {
  // Fetch just the label for a referenced Q-id (e.g. for P31 values)
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=labels&languages=en&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return qid;
  const data = await res.json();
  return data.entities?.[qid]?.labels?.en?.value ?? qid;
}

async function extractClaims(entity) {
  const claims = entity.claims || {};
  const out = {};
  for (const [pid, label] of Object.entries(PROPERTIES_OF_INTEREST)) {
    const c = claims[pid];
    if (!c) continue;
    const values = [];
    for (const stmt of c) {
      const dv = stmt.mainsnak?.datavalue;
      if (!dv) continue;
      if (dv.type === 'wikibase-entityid') {
        const refQid = dv.value.id;
        const refLabel = await resolveLabel(refQid);
        values.push(`${refLabel} (${refQid})`);
      } else if (dv.type === 'string') {
        values.push(dv.value);
      } else if (dv.type === 'time') {
        values.push(dv.value.time);
      } else if (dv.type === 'quantity') {
        values.push(`${dv.value.amount} ${dv.value.unit?.split('/').pop() ?? ''}`);
      } else {
        values.push(JSON.stringify(dv.value));
      }
    }
    if (values.length > 0) out[`${pid} (${label})`] = values;
  }
  return out;
}

for (const bridge of BRIDGES) {
  console.log(`\n=== ${bridge.name} ===`);

  let qid = bridge.qid;
  if (!qid) {
    try {
      const search = await lookupQid(bridge.name);
      qid = search.qid;
      console.log(`  Wikidata search: ${qid ?? 'NO BRIDGE MATCH'} (${search.description ?? ''})`);
      if (!qid) {
        console.log(`  Top results were:`, search.allResults);
        continue;
      }
    } catch (e) {
      console.log(`  Lookup ERROR -`, e.message);
      continue;
    }
  } else {
    console.log(`  Using OSM-provided Q-ID: ${qid}`);
  }

  try {
    const data = await fetchEntity(qid);
    const entity = data.entities?.[qid];
    if (!entity) {
      console.log('  Entity not found');
      continue;
    }
    const claims = await extractClaims(entity);
    console.log('  Properties:');
    if (Object.keys(claims).length === 0) {
      console.log('    (none of the properties of interest were present)');
    } else {
      for (const [k, v] of Object.entries(claims)) {
        console.log(`    ${k}: ${JSON.stringify(v)}`);
      }
    }
  } catch (e) {
    console.log('  Entity ERROR -', e.message);
  }
}
