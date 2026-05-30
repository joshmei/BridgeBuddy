import { fetchWithTimeout, wikimediaHeaders } from './http'
import type { StructureFinding } from './bridge'
import { mapWikidataLabel } from './structureTypes'

// Wikidata closes the gap when OSM's bridge:structure is missing (validated in
// Phase 0: GWB recovered as suspension). P31 returns ALL types, preserving
// hybrids. We also harvest inception / architect / engineer / length (§7).

const ENTITY_URL = (qid: string) =>
  `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`
const SEARCH_URL = (label: string) =>
  `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
    label,
  )}&language=en&format=json&limit=5&origin=*`
const LABELS_URL = (qids: string[]) =>
  `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join(
    '|',
  )}&props=labels&languages=en&format=json&origin=*`

export interface WikidataBridgeData {
  qid: string
  label: string | null // canonical English label, e.g. "Golden Gate Bridge"
  structures: StructureFinding[]
  yearBuilt: string | null
  architect: string | null
  engineer: string | null
  lengthMeters: number | null
  coordinate: { lat: number; lng: number } | null // P625 — for location validation
  wikipediaTitle: string | null // enwiki sitelink title, for the correct article
}

interface Claim {
  mainsnak?: {
    datavalue?: {
      type: string
      value: unknown
    }
  }
}

interface Entity {
  labels?: Record<string, { value: string }>
  sitelinks?: Record<string, { title: string }>
  claims?: Record<string, Claim[]>
}

// Resolve a bridge to a Q-ID: prefer the one OSM already gave us, else search
// by name and take the first result whose description mentions "bridge" (§7).
async function searchQid(name: string): Promise<string | null> {
  const res = await fetchWithTimeout(SEARCH_URL(name), { headers: wikimediaHeaders() })
  if (!res.ok) throw new Error(`Wikidata search HTTP ${res.status}`)
  const data = (await res.json()) as {
    search?: Array<{ id: string; description?: string }>
  }
  const match = data.search?.find((r) => /bridge/i.test(r.description ?? ''))
  return match?.id ?? null
}

async function fetchEntity(qid: string): Promise<Entity | null> {
  const res = await fetchWithTimeout(ENTITY_URL(qid), { headers: wikimediaHeaders() })
  if (!res.ok) throw new Error(`Wikidata entity HTTP ${res.status}`)
  const data = (await res.json()) as { entities?: Record<string, Entity> }
  return data.entities?.[qid] ?? null
}

// Resolve a batch of referenced Q-IDs (P31 values, architect, engineer) to
// their English labels in one request.
async function resolveLabels(qids: string[]): Promise<Record<string, string>> {
  if (qids.length === 0) return {}
  const res = await fetchWithTimeout(LABELS_URL(qids), { headers: wikimediaHeaders() })
  if (!res.ok) return {}
  const data = (await res.json()) as {
    entities?: Record<string, { labels?: { en?: { value: string } } }>
  }
  const out: Record<string, string> = {}
  for (const qid of qids) {
    const label = data.entities?.[qid]?.labels?.en?.value
    if (label) out[qid] = label
  }
  return out
}

// Convert a Wikidata length quantity to metres using its unit QID (the `unit`
// field is a URL like ".../Q3710"). Defaults to metres if the unit is missing
// or unrecognized. Returns a value rounded to the nearest metre.
function quantityToMeters(value: { amount?: string; unit?: string }): number | null {
  const amount = Number(value.amount)
  if (!Number.isFinite(amount)) return null
  const unitQid = value.unit?.split('/').pop() ?? ''
  const FACTORS: Record<string, number> = {
    Q11573: 1, // metre
    Q828224: 1000, // kilometre
    Q3710: 0.3048, // foot
    Q482798: 0.9144, // yard
    Q174728: 0.01, // centimetre
    Q218593: 0.0254, // inch
    Q253276: 1609.344, // mile
  }
  const factor = FACTORS[unitQid] ?? 1
  return Math.round(amount * factor)
}

function entityIdValues(claims: Claim[] | undefined): string[] {
  if (!claims) return []
  const ids: string[] = []
  for (const c of claims) {
    const dv = c.mainsnak?.datavalue
    if (dv?.type === 'wikibase-entityid') {
      const id = (dv.value as { id?: string }).id
      if (id) ids.push(id)
    }
  }
  return ids
}

export async function fetchWikidataBridge(opts: {
  qid?: string | null
  name?: string
}): Promise<WikidataBridgeData | null> {
  const qid = opts.qid ?? (opts.name ? await searchQid(opts.name) : null)
  if (!qid) return null

  const entity = await fetchEntity(qid)
  if (!entity) return null
  const claims = entity.claims ?? {}

  // P31 instance-of QIDs + architect (P84) + engineer (P631) all need labels.
  const p31Ids = entityIdValues(claims.P31)
  const architectIds = entityIdValues(claims.P84)
  const engineerIds = entityIdValues(claims.P631)
  const labels = await resolveLabels([...p31Ids, ...architectIds, ...engineerIds])

  const seen = new Set<string>()
  const structures: StructureFinding[] = []
  for (const id of p31Ids) {
    const label = labels[id]
    if (!label) continue
    const type = mapWikidataLabel(label)
    if (!type || seen.has(type)) continue
    seen.add(type)
    structures.push({ type, source: 'wikidata', raw: label })
  }

  // P571 inception (time, e.g. "+1883-05-24T00:00:00Z").
  const inception = claims.P571?.[0]?.mainsnak?.datavalue
  const yearBuilt =
    inception?.type === 'time'
      ? (inception.value as { time?: string }).time?.replace(/^\+/, '') ?? null
      : null

  // P2043 length. The quantity carries a unit QID (e.g. Brooklyn's value is in
  // FEET, not metres) — convert so the PE-facing number is correct.
  const lengthClaim = claims.P2043?.[0]?.mainsnak?.datavalue
  const lengthMeters =
    lengthClaim?.type === 'quantity'
      ? quantityToMeters(lengthClaim.value as { amount?: string; unit?: string })
      : null

  // P625 coordinate location — used to detect namesake collisions (a name search
  // can resolve a local bridge to a famous one that's actually far away).
  const coordClaim = claims.P625?.[0]?.mainsnak?.datavalue
  const coordinate =
    coordClaim?.type === 'globecoordinate'
      ? {
          lat: (coordClaim.value as { latitude: number }).latitude,
          lng: (coordClaim.value as { longitude: number }).longitude,
        }
      : null

  return {
    qid,
    label: entity.labels?.en?.value ?? null,
    structures,
    yearBuilt,
    architect: architectIds.map((id) => labels[id]).filter(Boolean).join(', ') || null,
    engineer: engineerIds.map((id) => labels[id]).filter(Boolean).join(', ') || null,
    lengthMeters,
    coordinate,
    wikipediaTitle: entity.sitelinks?.enwiki?.title ?? null,
  }
}
