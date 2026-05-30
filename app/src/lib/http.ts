// Shared HTTP concerns for the lookup pipeline.

// Wikimedia policy asks for a descriptive User-Agent.
export const USER_AGENT = 'BridgeBuddy/0.1 (https://bridge-buddy-zeta.vercel.app; jgoog612@gmail.com)'

// Headers for Wikimedia (Wikidata/Wikipedia) calls.
// CRITICAL (Phase 1 bug, 2026-05-29): in the BROWSER send NO custom headers.
// `User-Agent` is forbidden, and a custom `Api-User-Agent` makes the request
// non-simple → CORS preflight. Wikidata's `Special:EntityData` rejects that
// preflight (its Access-Control-Allow-Headers omits api-user-agent), so the
// browser blocks the call and structure type silently goes "unknown". A plain
// GET returns Access-Control-Allow-Origin: * and works. The browser's own UA +
// Referer satisfy Wikimedia policy. Node has no CORS, so it sends User-Agent.
export function wikimediaHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return { 'User-Agent': USER_AGENT }
  return {}
}

// Default timeout for any single upstream call. Overpass is the slow one;
// open decision #5 (§11) is what to do on a *timeout specifically* (fall back
// to cache? retry? show a tailored error?). Until that's decided, all callers
// get an AbortError they can surface generically.
export const DEFAULT_TIMEOUT_MS = 25_000

export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
