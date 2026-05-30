// The 9 canonical structure types Bridge Buddy recognizes (PRODUCT.md §6).
// Both data sources (OSM `bridge:structure`, Wikidata `P31 instance of`) are
// normalized into these. Anything we can't map stays as `null` canonical and
// surfaces as "Structure type unknown" (§6) — the gap is intentional.

export const STRUCTURE_TYPES = [
  'suspension',
  'cable-stayed',
  'arch',
  'truss',
  'beam',
  'viaduct',
  'movable',
  'cantilever',
  'floating',
] as const

export type StructureType = (typeof STRUCTURE_TYPES)[number]

// Display labels for the badge / detail header. Keep engineer-appropriate
// terminology (PRODUCT.md §10 — don't dumb it down).
export const STRUCTURE_TYPE_LABELS: Record<StructureType, string> = {
  suspension: 'Suspension',
  'cable-stayed': 'Cable-stayed',
  arch: 'Arch',
  truss: 'Truss',
  beam: 'Beam / girder',
  viaduct: 'Viaduct',
  movable: 'Movable',
  cantilever: 'Cantilever',
  floating: 'Floating',
}

// Badge colors per structure type. PLACEHOLDER (open decision #3, §11) — these
// are Tailwind -600/-700 hex values chosen only to be distinguishable while the
// app is built. The user will pick a proper ColorBrewer qualitative palette
// before ship; swapping it is editing this one object. `fg` is the text color
// for contrast against `bg` (all current bg values are dark enough for white).
export interface StructureTypeColor {
  bg: string
  fg: string
}

export const STRUCTURE_TYPE_COLORS: Record<StructureType, StructureTypeColor> = {
  suspension: { bg: '#2563eb', fg: '#ffffff' }, // blue-600
  'cable-stayed': { bg: '#0891b2', fg: '#ffffff' }, // cyan-600
  arch: { bg: '#059669', fg: '#ffffff' }, // emerald-600
  truss: { bg: '#d97706', fg: '#ffffff' }, // amber-600
  beam: { bg: '#475569', fg: '#ffffff' }, // slate-600 (most common type → neutral)
  viaduct: { bg: '#7c3aed', fg: '#ffffff' }, // violet-600
  movable: { bg: '#e11d48', fg: '#ffffff' }, // rose-600
  cantilever: { bg: '#ea580c', fg: '#ffffff' }, // orange-600
  floating: { bg: '#0d9488', fg: '#ffffff' }, // teal-600
}

// Neutral styling for "Structure type unknown" (§6 — shown, never hidden).
export const UNKNOWN_STRUCTURE_COLOR: StructureTypeColor = { bg: '#e2e8f0', fg: '#334155' }

// --- OSM bridge:structure normalization -------------------------------------
// OSM's tag values largely match our canonical names (§6 table). A few common
// variants get folded in. Unknown values return null.
const OSM_STRUCTURE_MAP: Record<string, StructureType> = {
  suspension: 'suspension',
  'simple-suspension': 'suspension',
  'cable-stayed': 'cable-stayed',
  arch: 'arch',
  truss: 'truss',
  beam: 'beam',
  girder: 'beam',
  viaduct: 'viaduct',
  movable: 'movable',
  cantilever: 'cantilever',
  floating: 'floating',
}

export function mapOsmStructure(raw: string): StructureType | null {
  return OSM_STRUCTURE_MAP[raw.trim().toLowerCase()] ?? null
}

// --- Wikidata P31 normalization ---------------------------------------------
// DRAFT — open decision #9 (PRODUCT.md §11). Wikidata uses finer-grained
// subtypes than our 9 canonical buckets (vertical-lift / swing / bascule all
// roll up to "movable", etc.). This keyword table is a first pass and needs a
// licensed-PE review before it's treated as authoritative.
//
// Matching is keyword-substring against the resolved English P31 label, tried
// in array order (most specific first) so e.g. "tied-arch bridge" matches
// `arch` and "cable-stayed bridge" doesn't get caught by a bare "cable" rule.
const WIKIDATA_KEYWORD_RULES: Array<[RegExp, StructureType]> = [
  [/cable[-\s]?stayed/i, 'cable-stayed'],
  [/suspension/i, 'suspension'],
  [/\bviaduct\b/i, 'viaduct'],
  [/cantilever/i, 'cantilever'],
  [/\barch\b/i, 'arch'],
  [/\btruss\b/i, 'truss'],
  // Movable family — vertical-lift, swing, bascule, drawbridge, transporter.
  [/movable|bascule|swing|vertical[-\s]?lift|\blift bridge\b|drawbridge|transporter|retractable/i, 'movable'],
  [/pontoon|floating/i, 'floating'],
  [/beam|girder/i, 'beam'],
]

export function mapWikidataLabel(label: string): StructureType | null {
  for (const [pattern, type] of WIKIDATA_KEYWORD_RULES) {
    if (pattern.test(label)) return type
  }
  return null
}
