import type { BridgeCoordinate } from './bridge'

// Stable machine identity for a bridge (open decision: resolved 2026-05-29).
// A bridge name is NOT unique (many "Walnut Street Bridge"s worldwide), and a
// bridge is many OSM elements, so neither the name nor any single OSM id can be
// the key. We use a synthetic key: slug(name) + rounded centroid coordinate,
// computed AFTER clustering a name's elements into one physical bridge.
//
// - Universal: works for regional bridges that have no Wikidata QID.
// - Stable: derived from name + location, both fixed; the QID (when present) is
//   stored as a field, never part of the key, so the key can't shift later.
// - Doubles as the §9 bridge_cache primary key / user_logs foreign key.

export function bridgeSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ~2 decimal places ≈ 1.1 km cells. Distinct same-named bridges are in
// different cities (far apart), so this separates them; the same bridge's
// centroid is stable, so its key is stable. Full-precision coordinate is kept
// separately for the map pin.
function roundCoord(n: number): string {
  return n.toFixed(2)
}

export function bridgeId(name: string, coordinate: BridgeCoordinate | null): string {
  const slug = bridgeSlug(name)
  if (!coordinate) return slug // no location → name-only (degenerate, but stable)
  return `${slug}@${roundCoord(coordinate.lat)},${roundCoord(coordinate.lng)}`
}
