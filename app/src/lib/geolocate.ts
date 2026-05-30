import { fetchWithTimeout, USER_AGENT } from './http'

// Country pinning for the geographic filter (§5.6). GPS is requested ONLY when
// the user taps the Country filter (never on page load), so the permission
// prompt appears in context. Any failure falls back silently to United States.

export const DEFAULT_PINNED_COUNTRY = 'United States'

export interface PinnedCountry {
  country: string
  isDefault: boolean // true = US fallback (→ Canada pinned second); false = from GPS
}

// Nominatim reverse geocode → country name. Free, no key; same OSM ecosystem.
async function reverseGeocodeCountry(lat: number, lon: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
  const headers: Record<string, string> = {}
  if (typeof window === 'undefined') headers['User-Agent'] = USER_AGENT
  try {
    const res = await fetchWithTimeout(url, { headers }, 8000)
    if (!res.ok) return null
    const data = (await res.json()) as { address?: { country?: string } }
    return data.address?.country ?? null
  } catch {
    return null
  }
}

function getPosition(timeoutMs = 8000): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null), // denied / unavailable / timeout → silent fallback
      { timeout: timeoutMs, maximumAge: 10 * 60 * 1000 },
    )
  })
}

// Cached per session so we never re-prompt for location.
let cached: PinnedCountry | null = null

export async function detectPinnedCountry(): Promise<PinnedCountry> {
  if (cached) return cached
  const pos = await getPosition()
  if (pos) {
    const country = await reverseGeocodeCountry(pos.coords.latitude, pos.coords.longitude)
    if (country) {
      cached = { country, isDefault: false }
      return cached
    }
  }
  cached = { country: DEFAULT_PINNED_COUNTRY, isDefault: true }
  return cached
}
