import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { AuthScreen } from './components/AuthScreen'
import { SearchScreen } from './components/SearchScreen'
import { MyBridgesScreen } from './components/MyBridgesScreen'
import { StatsScreen } from './components/StatsScreen'
import { TabBar, type Tab } from './components/TabBar'

function AppShell() {
  const { promptOpen, closeAuthPrompt } = useAuth()
  const [tab, setTab] = useState<Tab>('search')

  return (
    <>
      {/* Each tab stays mounted so its in-progress state (a search, an open
          detail view) survives switching tabs. */}
      <div className={tab === 'search' ? '' : 'hidden'}>
        <SearchScreen />
      </div>
      <div className={tab === 'bridges' ? '' : 'hidden'}>
        <MyBridgesScreen active={tab === 'bridges'} />
      </div>
      <div className={tab === 'stats' ? '' : 'hidden'}>
        <StatsScreen active={tab === 'stats'} />
      </div>

      <TabBar active={tab} onChange={setTab} />

      {/* App-root auth overlay: any screen can require login via openAuthPrompt(). */}
      {promptOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50">
          <AuthScreen onClose={closeAuthPrompt} />
        </div>
      ) : null}
    </>
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
