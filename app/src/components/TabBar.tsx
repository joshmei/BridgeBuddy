// Bottom tab bar — the app's primary navigation (iOS-native pattern, 390px-first).
// Fixed to the bottom; screens reserve space with bottom padding. Dependency-free
// inline SVG icons so there's no icon-library weight.

export type Tab = 'search' | 'bridges' | 'stats'

const TABS: Array<{ id: Tab; label: string; icon: (active: boolean) => React.ReactNode }> = [
  {
    id: 'search',
    label: 'Search',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} />
        <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'bridges',
    label: 'My Bridges',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        {/* A simple suspension-bridge glyph */}
        <path d="M3 17V8M21 17V8" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" />
        <path d="M3 9c4.5 4 13.5 4 18 0" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" />
        <path d="M3 17h18" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" />
        <path d="M7 17v-4M12 17v-6M17 17v-4" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'stats',
    label: 'Stats',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <path d="M5 20V11M12 20V5M19 20v-6" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" />
      </svg>
    ),
  },
]

export function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                isActive ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              {tab.icon(isActive)}
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
