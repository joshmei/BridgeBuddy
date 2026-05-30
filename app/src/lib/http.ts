// Shared HTTP concerns for the lookup pipeline.

// Wikimedia policy requires a descriptive User-Agent. Browsers forbid setting
// `User-Agent` from fetch() (it's silently dropped), so we ALSO send
// `Api-User-Agent`, which Wikimedia honors and browsers allow. In Node (smoke
// tests, future server-side caching) the `User-Agent` header is what applies.
export const USER_AGENT = 'BridgeBuddy/0.1 (https://bridge-buddy-zeta.vercel.app; jgoog612@gmail.com)'

export const WIKIMEDIA_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  'Api-User-Agent': USER_AGENT,
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
