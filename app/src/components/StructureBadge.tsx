import type { StructureFinding } from '../lib/bridge'
import {
  STRUCTURE_TYPE_COLORS,
  STRUCTURE_TYPE_LABELS,
  UNKNOWN_STRUCTURE_COLOR,
  type StructureType,
} from '../lib/structureTypes'

// The structure-type badge — the feature the user interacts with most
// (CLAUDE.md): shown on every card and at the top of every detail page, never
// buried. Multiple distinct types are shown side by side (hybrid bridges like
// Brooklyn = suspension + cable-stayed; OSM/Wikidata disagreements like
// Hawthorne = truss + movable — open decision #8 keeps both visible for now).

function Pill({ bg, fg, children }: { bg: string; fg: string; children: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-tight"
      style={{ backgroundColor: bg, color: fg }}
    >
      {children}
    </span>
  )
}

export function StructureBadge({ structures }: { structures: StructureFinding[] }) {
  // Distinct canonical types, in first-seen order (provenance is preserved in
  // the data but the badge collapses to one pill per type).
  const types: StructureType[] = []
  for (const s of structures) {
    if (!types.includes(s.type)) types.push(s.type)
  }

  if (types.length === 0) {
    // §6: "Structure type unknown" is shown, never hidden.
    return (
      <Pill bg={UNKNOWN_STRUCTURE_COLOR.bg} fg={UNKNOWN_STRUCTURE_COLOR.fg}>
        Structure type unknown
      </Pill>
    )
  }

  return (
    <span className="inline-flex flex-wrap gap-1">
      {types.map((type) => (
        <Pill key={type} bg={STRUCTURE_TYPE_COLORS[type].bg} fg={STRUCTURE_TYPE_COLORS[type].fg}>
          {STRUCTURE_TYPE_LABELS[type]}
        </Pill>
      ))}
    </span>
  )
}
