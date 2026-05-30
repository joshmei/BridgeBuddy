import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Auth context for Bridge Buddy (Phase 2).
//
// Auth method: Google Sign-In only (Supabase Google OAuth). Chosen over Apple
// Sign-In (needs a paid Apple Developer account we don't have yet) and over
// email/password; Google OAuth is fastest to configure and works in iPhone
// Safari. The Google client ID/secret live in the Supabase dashboard, never in
// the app — signInWithOAuth just names the provider.
//
// - Session is persisted + auto-refreshed by supabase-js (localStorage) — she
//   stays logged in until she explicitly signs out.
// - `promptOpen` drives a single app-root auth overlay so any screen (e.g. the
//   "I've Crossed This" button) can require login with one call.
// - Login is a full-page redirect to Google and back (the only reliable flow in
//   iOS Safari), so the overlay state does not survive login; on return she's
//   signed in and lands in the app.

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean // true until the initial session check resolves
  promptOpen: boolean
  openAuthPrompt: () => void
  closeAuthPrompt: () => void
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [promptOpen, setPromptOpen] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      setLoading(false)
      if (event === 'SIGNED_IN') setPromptOpen(false) // dismiss the overlay once logged in
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    return {
      session,
      user: session?.user ?? null,
      loading,
      promptOpen,
      openAuthPrompt: () => setPromptOpen(true),
      closeAuthPrompt: () => setPromptOpen(false),

      async signInWithGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        })
        if (error) throw error
        // On success the browser redirects to Google; nothing runs after this.
      },

      async signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      },
    }
  }, [session, loading, promptOpen])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Standard context pattern: the provider component and its hook share one file.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
