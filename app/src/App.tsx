import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { AuthScreen } from './components/AuthScreen'
import { WelcomeScreen } from './components/WelcomeScreen'
import { SearchScreen } from './components/SearchScreen'
import { MyBridgesScreen } from './components/MyBridgesScreen'
import { StatsScreen } from './components/StatsScreen'
import { TabBar, type Tab } from './components/TabBar'

function AppShell() {
  const { user, loading, promptOpen, closeAuthPrompt } = useAuth()
  const [tab, setTab] = useState<Tab>('search')
  // Bumped every time the Search tab is tapped → remounts SearchScreen, resetting
  // it to the clean default home (empty box, no detail, NY list). Phase 2.5 #2.
  const [searchKey, setSearchKey] = useState(0)
  // Welcome screen (Phase 2.6): shown on every open while logged out; "Skip for
  // now" dismisses it for this session only (in-memory → returns on reload).
  // Logged-in users never see it.
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)

  function selectTab(next: Tab) {
    if (next === 'search') setSearchKey((k) => k + 1)
    setTab(next)
  }

  // Avoid flashing the welcome to an already-signed-in user while the initial
  // session check resolves.
  if (loading) return null
  if (!user && !welcomeDismissed) {
    return <WelcomeScreen onSkip={() => setWelcomeDismissed(true)} />
  }

  return (
    // Root app container: fills slate-50 to the physical bottom edge (incl. the
    // safe-area zone) so the navy body never shows through below the tab bar.
    // The welcome screen is a separate return path, so it keeps its navy bg.
    <div className="min-h-[100dvh] bg-slate-50">
      {/* My Bridges / Stats stay mounted so their state survives tab switches.
          Search is intentionally remounted on tab-tap (via searchKey) so the
          bottom Search tab always lands on a clean home (Phase 2.5 #2). */}
      <div className={tab === 'search' ? '' : 'hidden'}>
        <SearchScreen key={searchKey} onGoToProfile={() => setTab('bridges')} />
      </div>
      <div className={tab === 'bridges' ? '' : 'hidden'}>
        <MyBridgesScreen active={tab === 'bridges'} />
      </div>
      <div className={tab === 'stats' ? '' : 'hidden'}>
        <StatsScreen active={tab === 'stats'} />
      </div>

      <TabBar active={tab} onChange={selectTab} />

      {/* App-root auth overlay: any screen can require login via openAuthPrompt(). */}
      {promptOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50">
          <AuthScreen onClose={closeAuthPrompt} />
        </div>
      ) : null}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

export default App
