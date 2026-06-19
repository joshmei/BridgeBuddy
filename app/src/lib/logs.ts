import type { Bridge, StructureFinding } from './bridge'
import type { StructureType } from './structureTypes'
import { parseYear } from './overpass'
import { supabase } from './supabase'

// Phase 2 personal-log data layer (PRODUCT.md §9). Maps the in-memory Bridge to
// the bridge_cache row, records crossings into user_logs, and reads them back
// for the My Bridges and Stats screens.
//
// Identity: a Bridge's `id` IS the synthetic stable key (identity.ts), stored in
// bridge_cache.bridge_key. user_logs references the cache row's uuid.

// --- date helpers -----------------------------------------------------------

// Local calendar date as YYYY-MM-DD (what `date` columns store). Uses local time
// so "today" matches her wall clock, not UTC.
function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// "May 30, 2026" from a YYYY-MM-DD string. Parsed as a LOCAL date (not via
// new Date('2026-05-30'), which is UTC midnight and can render the prior day in
// western timezones).
export function formatLogDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// --- types ------------------------------------------------------------------

export interface CrossingLog {
  id: string
  firstRecordedCrossing: string // YYYY-MM-DD
  lastCrossing: string // YYYY-MM-DD
  crossingCount: number
  notes: string | null
}

export interface LoggedBridge {
  log: CrossingLog
  bridge: Bridge
}

// Shape of the user_logs row joined with its bridge_cache row.
interface UserLogRow {
  id: string
  first_recorded_crossing: string
  last_crossing: string
  crossing_count: number
  notes: string | null
  bridge_cache: BridgeCacheRow | null
}

interface BridgeCacheRow {
  id: string
  bridge_key: string
  name: string
  lat: number | null
  lng: number | null
  structure: string | null
  structures: StructureFinding[] | null
  year_built: number | null
  architect: string | null
  structural_engineer: string | null
  wikipedia_summary: string | null
  wikipedia_image: string | null
  wikipedia_url: string | null
  wikidata_qid: string | null
  data: Bridge | null
}

// --- Bridge <-> row mapping --------------------------------------------------

function primaryStructure(b: Bridge): string | null {
  return b.structures[0]?.type ?? null
}

function toCacheRow(b: Bridge) {
  return {
    bridge_key: b.id,
    name: b.name,
    lat: b.coordinate?.lat ?? null,
    lng: b.coordinate?.lng ?? null,
    structure: primaryStructure(b),
    structures: b.structures,
    year_built: parseYear(b.yearBuilt),
    architect: b.architect,
    structural_engineer: b.engineer,
    wikipedia_summary: b.summary,
    wikipedia_image: b.thumbnailUrl,
    wikipedia_url: b.wikipediaUrl,
    wikidata_qid: b.wikidataQid,
    data: b,
    cached_at: new Date().toISOString(),
  }
}

// Reconstruct a Bridge from a cache row. Prefers the full `data` blob (lossless);
// falls back to the typed columns if it's ever absent.
function rowToBridge(row: BridgeCacheRow): Bridge {
  if (row.data) return row.data
  return {
    id: row.bridge_key,
    name: row.name,
    region: null,
    country: null,
    state: null,
    coordinate: row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : null,
    structures: row.structures ?? [],
    yearBuilt: row.year_built != null ? String(row.year_built) : null,
    architect: row.architect,
    engineer: row.structural_engineer,
    lengthMeters: null,
    summary: row.wikipedia_summary,
    thumbnailUrl: row.wikipedia_image,
    wikipediaUrl: row.wikipedia_url,
    wikidataQid: row.wikidata_qid,
    sources: { osm: false, wikidata: false, wikipedia: false },
  }
}

function rowToLog(row: UserLogRow): CrossingLog {
  return {
    id: row.id,
    firstRecordedCrossing: row.first_recorded_crossing,
    lastCrossing: row.last_crossing,
    crossingCount: row.crossing_count,
    notes: row.notes,
  }
}

// --- cache -------------------------------------------------------------------

// Ensure the bridge is in bridge_cache; return its uuid. We never UPDATE an
// existing row (RLS grants insert only — no client-side update/delete), so a
// cached bridge's data is not refreshed here; that's a future/service-role job.
async function ensureCached(bridge: Bridge): Promise<string> {
  const existing = await supabase
    .from('bridge_cache')
    .select('id')
    .eq('bridge_key', bridge.id)
    .maybeSingle()
  if (existing.data) return existing.data.id

  const inserted = await supabase
    .from('bridge_cache')
    .insert(toCacheRow(bridge))
    .select('id')
    .single()
  if (inserted.error) {
    // Lost an insert race — the row now exists; re-read it.
    const again = await supabase
      .from('bridge_cache')
      .select('id')
      .eq('bridge_key', bridge.id)
      .maybeSingle()
    if (again.data) return again.data.id
    throw inserted.error
  }
  return inserted.data.id
}

// --- bridge_cache read-through (Phase 3 perf) --------------------------------

const CACHE_FRESH_MS = 30 * 24 * 60 * 60 * 1000 // §9: refresh when older than 30 days

// Cached enriched Bridge for a key, or null if absent/stale. Public read (RLS).
export async function getCachedBridge(bridgeKey: string): Promise<Bridge | null> {
  const { data, error } = await supabase
    .from('bridge_cache')
    .select('data, cached_at')
    .eq('bridge_key', bridgeKey)
    .maybeSingle()
  if (error || !data?.data) return null
  if (Date.now() - new Date(data.cached_at as string).getTime() > CACHE_FRESH_MS) return null
  return data.data as Bridge
}

// Batched lookup for the results list — returns fresh cached bridges by key, so
// already-cached results can show their badge immediately.
export async function getCachedBridges(bridgeKeys: string[]): Promise<Record<string, Bridge>> {
  if (bridgeKeys.length === 0) return {}
  const { data, error } = await supabase
    .from('bridge_cache')
    .select('bridge_key, data, cached_at')
    .in('bridge_key', bridgeKeys)
  if (error || !data) return {}
  const out: Record<string, Bridge> = {}
  for (const row of data as Array<{ bridge_key: string; data: Bridge | null; cached_at: string }>) {
    if (!row.data) continue
    if (Date.now() - new Date(row.cached_at).getTime() > CACHE_FRESH_MS) continue
    out[row.bridge_key] = row.data
  }
  return out
}

// Best-effort cache write after enriching a bridge on open, so future opens
// (incl. cross-device) are instant. No-ops silently if signed out (RLS allows
// insert only for authenticated) or on any error — never blocks the UI.
export async function cacheBridge(bridge: Bridge): Promise<void> {
  try {
    await ensureCached(bridge)
  } catch {
    /* signed out or transient — ignore */
  }
}

// --- crossings ---------------------------------------------------------------

const LOG_SELECT =
  'id, first_recorded_crossing, last_crossing, crossing_count, notes, bridge_cache(*)'

// The log for one bridge for the current user, or null if not yet logged.
// Used to set the "I've Crossed This" button's initial state.
export async function getLogForBridge(
  userId: string,
  bridge: Bridge,
): Promise<CrossingLog | null> {
  const { data, error } = await supabase
    .from('user_logs')
    .select(`${LOG_SELECT}, bridge_cache!inner(bridge_key)`)
    .eq('user_id', userId)
    .eq('bridge_cache.bridge_key', bridge.id)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) throw error
  return data ? rowToLog(data as unknown as UserLogRow) : null
}

// Record a crossing. There's at most one row per (user, bridge) — UNIQUE — so:
//   * no row        → insert a fresh log (count 1, first = last = today)
//   * soft-deleted  → revive as a FRESH log (is_deleted=false, count=1, dates today)
//   * active        → bump last_crossing + increment crossing_count
// Read-then-write is safe here: a single user, no concurrent writes.
export async function recordCrossing(userId: string, bridge: Bridge): Promise<CrossingLog> {
  const bridgeId = await ensureCached(bridge)
  const today = todayISO()

  const existing = await supabase
    .from('user_logs')
    .select('id, crossing_count, is_deleted')
    .eq('user_id', userId)
    .eq('bridge_id', bridgeId)
    .maybeSingle()
  if (existing.error) throw existing.error

  if (existing.data) {
    const update = existing.data.is_deleted
      ? // revive a previously-removed bridge as a fresh log
        {
          is_deleted: false,
          first_recorded_crossing: today,
          last_crossing: today,
          crossing_count: 1,
        }
      : // already active → count an additional crossing
        { last_crossing: today, crossing_count: existing.data.crossing_count + 1 }

    const { data, error } = await supabase
      .from('user_logs')
      .update(update)
      .eq('id', existing.data.id)
      .select(LOG_SELECT)
      .single()
    if (error) throw error
    return rowToLog(data as unknown as UserLogRow)
  }

  const { data, error } = await supabase
    .from('user_logs')
    .insert({
      user_id: userId,
      bridge_id: bridgeId,
      first_recorded_crossing: today,
      last_crossing: today,
      crossing_count: 1,
    })
    .select(LOG_SELECT)
    .single()
  if (error) throw error
  return rowToLog(data as unknown as UserLogRow)
}

// Undo (soft delete). Never hard-deletes — soft-deleted rows are preserved for a
// future "Recently Removed"/recovery feature. If this was a single crossing
// (count 1) → set is_deleted=true and return null (bridge removed). If there were
// multiple crossings (count > 1) → decrement the count and keep the log.
export async function undoCrossing(userId: string, logId: string): Promise<CrossingLog | null> {
  const current = await supabase
    .from('user_logs')
    .select('crossing_count')
    .eq('id', logId)
    .eq('user_id', userId)
    .maybeSingle()
  if (current.error) throw current.error
  if (!current.data) return null

  if (current.data.crossing_count > 1) {
    const { data, error } = await supabase
      .from('user_logs')
      .update({ crossing_count: current.data.crossing_count - 1 })
      .eq('id', logId)
      .select(LOG_SELECT)
      .single()
    if (error) throw error
    return rowToLog(data as unknown as UserLogRow)
  }

  const { error } = await supabase
    .from('user_logs')
    .update({ is_deleted: true })
    .eq('id', logId)
    .eq('user_id', userId)
  if (error) throw error
  return null
}

// Remove a bridge from the collection (My Bridges edit mode). Always a soft
// delete — sets is_deleted=true regardless of crossing_count (unlike
// undoCrossing, which decrements a multi-crossing log). Row preserved for a
// future "Recently Removed"/recovery feature. Uses the existing update RLS
// policy, so no DELETE policy is required.
export async function softDeleteCrossing(userId: string, logId: string): Promise<void> {
  const { error } = await supabase
    .from('user_logs')
    .update({ is_deleted: true })
    .eq('id', logId)
    .eq('user_id', userId)
  if (error) throw error
}

// --- My Bridges --------------------------------------------------------------

// All of the user's logged bridges, most recently crossed first.
export async function getMyBridges(userId: string): Promise<LoggedBridge[]> {
  const { data, error } = await supabase
    .from('user_logs')
    .select(LOG_SELECT)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('last_crossing', { ascending: false })
  if (error) throw error

  return (data as unknown as UserLogRow[])
    .filter((row) => row.bridge_cache != null)
    .map((row) => ({ log: rowToLog(row), bridge: rowToBridge(row.bridge_cache!) }))
}

// --- Stats -------------------------------------------------------------------

export interface Stats {
  total: number
  // Per canonical structure type, in descending count. Hybrids count in EVERY
  // type they carry, so the buckets can sum to more than `total` (see §6/§10 —
  // structure type is never buried; accuracy over a clean partition).
  byStructure: Array<{ type: StructureType; count: number }>
  firstEver: LoggedBridge | null // earliest first_recorded_crossing — a milestone
  mostCrossed: LoggedBridge | null // highest crossing_count
}

function distinctTypes(bridge: Bridge): StructureType[] {
  const seen: StructureType[] = []
  for (const s of bridge.structures) if (!seen.includes(s.type)) seen.push(s.type)
  return seen
}

export function computeStats(logged: LoggedBridge[]): Stats {
  const counts = new Map<StructureType, number>()
  for (const { bridge } of logged) {
    for (const type of distinctTypes(bridge)) {
      counts.set(type, (counts.get(type) ?? 0) + 1)
    }
  }
  const byStructure = [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  let firstEver: LoggedBridge | null = null
  let mostCrossed: LoggedBridge | null = null
  for (const item of logged) {
    if (!firstEver || item.log.firstRecordedCrossing < firstEver.log.firstRecordedCrossing) {
      firstEver = item
    }
    if (!mostCrossed || item.log.crossingCount > mostCrossed.log.crossingCount) {
      mostCrossed = item
    }
  }

  return { total: logged.length, byStructure, firstEver, mostCrossed }
}
