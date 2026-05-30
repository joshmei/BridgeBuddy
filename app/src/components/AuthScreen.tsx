import { useState } from 'react'
import { useAuth } from '../lib/auth'

// Google Sign-In (PRODUCT.md Phase 2 / PART 1). One button — no email, password,
// username, or avatar. Tapping it redirects to Google and back; on return she's
// signed in. Search + bridge detail stay fully browsable without an account;
// only logging a crossing opens this screen.
export function AuthScreen({ onClose }: { onClose?: () => void }) {
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onGoogle() {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle() // redirects away on success
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start sign-in. Try again.')
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-slate-50 px-4 py-6">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-slate-500">Bridge Buddy</p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
        ) : null}
      </div>

      <div className="mt-16 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
        <p className="text-sm text-slate-500">
          Your bridge log is saved to your account, so it follows you to any device.
        </p>
      </div>

      <button
        type="button"
        onClick={onGoogle}
        disabled={busy}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900 active:bg-slate-100 disabled:opacity-60"
      >
        <GoogleMark />
        {busy ? 'Redirecting…' : 'Continue with Google'}
      </button>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </main>
  )
}

// Google's "G" mark (official four-color), inline so there's no asset/library.
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.6-.21-2.36H12v4.47h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.73Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3a7.2 7.2 0 0 1-4.06 1.15 7.14 7.14 0 0 1-6.71-4.94H1.29v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.29a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44A11.99 11.99 0 0 0 12 0 12 12 0 0 0 1.29 6.6l4 3.1A7.14 7.14 0 0 1 12 4.77Z"
      />
    </svg>
  )
}
