import { useState } from 'react'
import { STRUCTURE_TYPE_LABELS } from '../lib/structureTypes'
import {
  DEFAULT_PIN,
  hasStates,
  isFilterActive,
  orderCountries,
  type FilterOptions,
  type Filters,
} from '../lib/filters'
import { detectPinnedCountry, type PinnedCountry } from '../lib/geolocate'

export type PersonRole = 'architect' | 'engineer'

// Phase 1.5 filter UI: a chip row (active filters, at-a-glance + removable) above
// the results, backed by a bottom sheet with accordion sections. Mobile-first,
// 390px. All filters AND across facets; OR within structure type (§5.6).

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-900 py-1 pl-3 pr-2 text-xs font-medium text-white">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="grid h-4 w-4 place-items-center rounded-full bg-white/25 text-[10px] leading-none"
      >
        ✕
      </button>
    </span>
  )
}

function Row({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
        selected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800 active:bg-slate-200'
      }`}
    >
      <span>{label}</span>
      {selected ? <span aria-hidden>✓</span> : null}
    </button>
  )
}

function Section({
  title,
  summary,
  expanded,
  onToggle,
  children,
}: {
  title: string
  summary: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-slate-100 py-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-1.5 text-left"
      >
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        <span className="text-xs text-slate-500">
          {summary} <span aria-hidden>{expanded ? '▾' : '▸'}</span>
        </span>
      </button>
      {expanded ? <div className="mt-1 space-y-1.5">{children}</div> : null}
    </section>
  )
}

export function FilterControls({
  options,
  filters,
  onChange,
  onSelectPerson,
  onClearAll,
}: {
  options: FilterOptions
  filters: Filters
  onChange: (f: Filters) => void
  // When provided (home screen), tapping an architect/engineer triggers a
  // discovery search rather than a client-side refine.
  onSelectPerson?: (role: PersonRole, value: string) => void
  // "Clear all" resets to the home state (full option lists return). If absent,
  // it just empties the filters.
  onClearAll?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [pin, setPin] = useState<PinnedCountry | null>(null)
  const [countryTried, setCountryTried] = useState(false)

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const pickPerson = (role: PersonRole, value: string) => {
    if (onSelectPerson) {
      onSelectPerson(role, value)
      setOpen(false)
      return
    }
    const cur = role === 'architect' ? filters.architect : filters.engineer
    const next = cur === value ? null : value
    set(role === 'architect' ? { architect: next } : { engineer: next })
  }

  // Active-filter chips for the bar above results.
  const chips: Array<{ label: string; onRemove: () => void }> = []
  if (filters.country)
    chips.push({ label: filters.country, onRemove: () => set({ country: null, state: null }) })
  if (filters.state) chips.push({ label: filters.state, onRemove: () => set({ state: null }) })
  for (const t of filters.structureTypes)
    chips.push({
      label: STRUCTURE_TYPE_LABELS[t],
      onRemove: () => set({ structureTypes: filters.structureTypes.filter((x) => x !== t) }),
    })
  if (filters.architect)
    chips.push({ label: filters.architect, onRemove: () => set({ architect: null }) })
  if (filters.engineer)
    chips.push({ label: filters.engineer, onRemove: () => set({ engineer: null }) })

  const toggleSection = (key: string) => setExpanded((cur) => (cur === key ? null : key))

  // GPS is requested only here — when the user expands the Country section
  // (§5.6: in-context, never on page load). Cached after the first attempt.
  const expandCountry = () => {
    toggleSection('country')
    if (!countryTried) {
      setCountryTried(true)
      detectPinnedCountry().then(setPin)
    }
  }

  const orderedCountries = orderCountries(options.countries, pin ?? DEFAULT_PIN)

  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700"
        >
          <span aria-hidden>⚙</span> Filters{chips.length > 0 ? ` · ${chips.length}` : ''}
        </button>
        {chips.map((c, i) => (
          <Chip key={`${c.label}-${i}`} label={c.label} onRemove={c.onRemove} />
        ))}
      </div>

      {open ? (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative max-h-[80svh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-6 pt-3">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Filters</h2>
              <button
                type="button"
                onClick={() =>
                  onClearAll
                    ? onClearAll()
                    : onChange({ country: null, state: null, structureTypes: [], architect: null, engineer: null })
                }
                disabled={!isFilterActive(filters)}
                className="text-xs font-medium text-slate-500 disabled:opacity-40"
              >
                Clear all
              </button>
            </div>

            <Section
              title="Country"
              summary={filters.country ?? 'Any'}
              expanded={expanded === 'country'}
              onToggle={expandCountry}
            >
              {orderedCountries.length === 0 ? (
                <p className="text-xs text-slate-400">No country data in these results.</p>
              ) : (
                orderedCountries.map((c) => (
                  <Row
                    key={c}
                    label={c}
                    selected={filters.country === c}
                    onClick={() => set({ country: filters.country === c ? null : c, state: null })}
                  />
                ))
              )}
            </Section>

            {hasStates(filters.country) && options.states.length > 0 ? (
              <Section
                title="State / Province"
                summary={filters.state ?? 'Any'}
                expanded={expanded === 'state'}
                onToggle={() => toggleSection('state')}
              >
                {options.states.map((s) => (
                  <Row
                    key={s}
                    label={s}
                    selected={filters.state === s}
                    onClick={() => set({ state: filters.state === s ? null : s })}
                  />
                ))}
              </Section>
            ) : null}

            <Section
              title="Structure type"
              summary={filters.structureTypes.length > 0 ? `${filters.structureTypes.length} selected` : 'Any'}
              expanded={expanded === 'type'}
              onToggle={() => toggleSection('type')}
            >
              {options.structureTypes.map((t) => (
                <Row
                  key={t}
                  label={STRUCTURE_TYPE_LABELS[t]}
                  selected={filters.structureTypes.includes(t)}
                  onClick={() =>
                    set({
                      structureTypes: filters.structureTypes.includes(t)
                        ? filters.structureTypes.filter((x) => x !== t)
                        : [...filters.structureTypes, t],
                    })
                  }
                />
              ))}
            </Section>

            {options.architects.length > 0 ? (
              <Section
                title="Architect"
                summary={filters.architect ?? 'Any'}
                expanded={expanded === 'architect'}
                onToggle={() => toggleSection('architect')}
              >
                {options.architects.map((a) => (
                  <Row
                    key={a}
                    label={a}
                    selected={filters.architect === a}
                    onClick={() => pickPerson('architect', a)}
                  />
                ))}
              </Section>
            ) : null}

            {options.engineers.length > 0 ? (
              <Section
                title="Structural engineer"
                summary={filters.engineer ?? 'Any'}
                expanded={expanded === 'engineer'}
                onToggle={() => toggleSection('engineer')}
              >
                {options.engineers.map((e) => (
                  <Row
                    key={e}
                    label={e}
                    selected={filters.engineer === e}
                    onClick={() => pickPerson('engineer', e)}
                  />
                ))}
              </Section>
            ) : null}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
