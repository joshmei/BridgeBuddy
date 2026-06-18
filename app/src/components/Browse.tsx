import { useState, type ReactNode } from 'react'
import {
  COUNTRIES_BROWSE_ORDER,
  COUNTRIES_WITH_STATES,
  statesFor,
  flagEmoji,
} from '../lib/browseLocations'
import { ARCHITECTS, ENGINEERS } from '../lib/filterMetadata'
import type { PersonRole } from '../lib/wikidataDiscovery'

// Browse — guided bridge discovery (replaces the old Filters sheet). Two bottom
// sheets: by location (country → state/province) and by type (architect /
// engineer for now; structure-type browse is deferred until it has a real
// backend). Every selection runs a search immediately and dismisses — no Apply.

function BottomSheet({
  title,
  onClose,
  onBack,
  children,
}: {
  title: string
  onClose: () => void
  onBack?: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div className="relative max-h-[80svh] overflow-y-auto rounded-t-2xl bg-page px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3">
        <div className="sticky -top-3 -mx-4 mb-1 flex items-center justify-between border-b border-divider bg-page px-4 py-2">
          {onBack ? (
            <button type="button" onClick={onBack} className="text-sm font-medium text-accent" aria-label="Back">
              ‹ Back
            </button>
          ) : (
            <span />
          )}
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-lg leading-none text-muted active:text-ink"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ListRow({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-base text-ink active:bg-surface"
    >
      {children}
    </button>
  )
}

// Browse by location — country list (US pinned first), then states/provinces for
// the US/Canada. Picking a leaf runs the search.
export function BrowseLocationSheet({
  onClose,
  onPick,
}: {
  onClose: () => void
  onPick: (query: string, title: string) => void
}) {
  const [country, setCountry] = useState<string | null>(null)

  function pickPlace(place: string) {
    onPick(`bridges in ${place}`, `Bridges in ${place}`)
  }

  if (country) {
    return (
      <BottomSheet title={country} onClose={onClose} onBack={() => setCountry(null)}>
        <div className="space-y-0.5">
          {statesFor(country).map((s) => (
            <ListRow key={s} onClick={() => pickPlace(s)}>
              {s}
            </ListRow>
          ))}
        </div>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet title="Browse by location" onClose={onClose}>
      <div className="space-y-0.5">
        {COUNTRIES_BROWSE_ORDER.map((c) => (
          <ListRow
            key={c.code}
            onClick={() =>
              COUNTRIES_WITH_STATES.includes(c.name) ? setCountry(c.name) : pickPlace(c.name)
            }
          >
            <span className="text-xl" aria-hidden>
              {flagEmoji(c.code)}
            </span>
            <span className="flex-1">{c.name}</span>
            {COUNTRIES_WITH_STATES.includes(c.name) ? (
              <span className="text-muted" aria-hidden>
                ›
              </span>
            ) : null}
          </ListRow>
        ))}
      </div>
    </BottomSheet>
  )
}

// Browse by builder — architect / engineer (existing lists + discovery search).
// (Structure-type browse is a separate future feature — it returns once it has a
// proper backend; it is intentionally absent here, not a placeholder.)
export function BrowseBuilderSheet({
  onClose,
  onPickPerson,
}: {
  onClose: () => void
  onPickPerson: (role: PersonRole, value: string) => void
}) {
  // Both sections collapsed by default so both options are visible at a glance
  // (each list is ~40 rows). Single-open accordion keeps the sheet compact.
  const [open, setOpen] = useState<PersonRole | null>(null)
  const toggle = (k: PersonRole) => setOpen((cur) => (cur === k ? null : k))

  return (
    <BottomSheet title="Browse by builder" onClose={onClose}>
      <CollapsibleSection
        label="Architect"
        count={ARCHITECTS.length}
        expanded={open === 'architect'}
        onToggle={() => toggle('architect')}
      >
        {ARCHITECTS.map((a) => (
          <ListRow key={a} onClick={() => onPickPerson('architect', a)}>
            {a}
          </ListRow>
        ))}
      </CollapsibleSection>
      <CollapsibleSection
        label="Structural engineer"
        count={ENGINEERS.length}
        expanded={open === 'engineer'}
        onToggle={() => toggle('engineer')}
      >
        {ENGINEERS.map((e) => (
          <ListRow key={e} onClick={() => onPickPerson('engineer', e)}>
            {e}
          </ListRow>
        ))}
      </CollapsibleSection>
    </BottomSheet>
  )
}

function CollapsibleSection({
  label,
  count,
  expanded,
  onToggle,
  children,
}: {
  label: string
  count: number
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className="border-b border-divider last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-3 text-left"
        aria-expanded={expanded}
      >
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="flex items-center gap-2 text-xs text-muted">
          {count}
          <span aria-hidden>{expanded ? '▾' : '▸'}</span>
        </span>
      </button>
      {expanded ? <div className="space-y-0.5 pb-2">{children}</div> : null}
    </section>
  )
}
