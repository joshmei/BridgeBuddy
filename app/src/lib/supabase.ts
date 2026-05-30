import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// True only when both env vars were inlined at build time. Auth + logging need
// these; search/detail do not. We must NOT throw when they're missing — that
// would white-screen the whole app (including the no-account browse experience,
// §4 "no broken states"). Instead we degrade: browsing works, and auth/logging
// surface a clear error.
export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  // Visible in the console for diagnosis; not fatal.
  console.error(
    'Supabase is not configured: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY were ' +
      'not present at build time. Browsing works; sign-in and logging are disabled. ' +
      'Set both (VITE_ prefix required) in the Vercel project env vars and redeploy.',
  )
}

// createClient throws only if the URL is falsy, so fall back to a harmless
// placeholder when unconfigured. getSession() then just reports "logged out"
// (it reads localStorage, no network), so the app renders normally; any actual
// auth call is gated on isSupabaseConfigured by the caller.
export const supabase = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'placeholder-anon-key',
)
