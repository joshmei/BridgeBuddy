import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth'

// Welcome / front-door screen (Phase 2.6). Bright, warm landing shown on every
// open while logged out (skip is per-session). Two paths: log in with Google, or
// skip straight into the app — browsing never requires an account.
//
// Hero visual: a muted, looping, inline video at /welcome.mp4 with its own first
// frame as the poster (/video-poster.jpg) so there's no flash before playback.
// Neither is imported, so a missing file can't break the build — if the video
// errors the animated "shimmering water" gradient (.welcome-water) shows instead.

export function WelcomeScreen({ onSkip }: { onSkip: () => void }) {
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showVideo, setShowVideo] = useState(true)
  const [playing, setPlaying] = useState(false) // true once it actually plays
  const videoRef = useRef<HTMLVideoElement>(null)

  // Mobile browsers (esp. iOS) only autoplay a genuinely muted + inline video,
  // and reject .play() if it's called before the media is ready. React also
  // doesn't reliably set the `muted` attribute on the DOM node. So: set muted
  // imperatively and attempt play both on mount AND once the media can play
  // (onCanPlay/onLoadedData). If the browser still blocks it (e.g. iOS Low Power
  // Mode, which only a tap can override), the poster holds on the first frame and
  // a tap anywhere on the screen starts playback.
  function startVideo() {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.playsInline = true
    const p = v.play()
    if (p) p.catch(() => {})
  }

  useEffect(() => {
    startVideo()
  }, [])

  async function onLogin() {
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
    <main
      className="relative min-h-svh w-full overflow-hidden"
      onClick={() => {
        if (!playing) startVideo() // tap-to-start fallback (covers Low Power Mode)
      }}
    >
      {/* Animated water fallback — always present behind the video. */}
      <div className="welcome-water absolute inset-0" aria-hidden />

      {/* Hero video (asset at /welcome.mp4). The poster is the video's own first
          frame (/video-poster.jpg), shown instantly so there's no gradient/blank
          flash before playback — and it's the loop point, so it's seamless. The
          element is visible immediately; if autoplay is blocked the poster simply
          holds on frame 1 (a still of the bridge), and a tap starts playback.
          Hidden only if the video itself errors out → gradient fallback. */}
      {showVideo ? (
        <video
          ref={videoRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          poster="/video-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={startVideo}
          onCanPlay={startVideo}
          onPlaying={() => setPlaying(true)}
          onError={() => setShowVideo(false)}
          aria-hidden
        >
          <source src="/welcome.mp4" type="video/mp4" />
        </video>
      ) : null}

      {/* Legibility scrim — darkens toward the bottom where the text/buttons sit. */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/60"
        aria-hidden
      />

      {/* Content */}
      <div className="relative flex min-h-svh w-full max-w-md mx-auto flex-col justify-between px-6 py-10">
        <header className="pt-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/80">Bridge Buddy</p>
        </header>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white drop-shadow">
            Exploring the World, One Bridge at a time.
          </h1>
          <p className="text-base text-white/90 drop-shadow">
            Search any named bridge, see how it's built, and start your own collection.
          </p>
        </div>

        <div className="space-y-3 pb-2">
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50/95 p-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onLogin}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-base font-semibold text-slate-900 shadow-lg active:bg-slate-100 disabled:opacity-60"
          >
            <GoogleMark />
            {busy ? 'Redirecting…' : 'Log in with Google'}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="w-full rounded-xl px-4 py-3 text-base font-medium text-white/90 active:text-white"
          >
            Skip for now
          </button>
        </div>
      </div>
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
      <path fill="#FBBC05" d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.29a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44A11.99 11.99 0 0 0 12 0 12 12 0 0 0 1.29 6.6l4 3.1A7.14 7.14 0 0 1 12 4.77Z"
      />
    </svg>
  )
}
