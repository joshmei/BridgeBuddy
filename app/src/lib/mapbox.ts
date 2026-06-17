// Mapbox config (Phase 3). The token is a public (pk.) token, safe in the client
// bundle and restricted by URL in the Mapbox account. Read from env so it's never
// hardcoded; if absent, the map degrades to a placeholder instead of crashing.
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
export const isMapboxConfigured = Boolean(MAPBOX_TOKEN)

// Dark style — contrasts with the warm light-mode app (decided 2026-06-13).
export const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11'

// Continental US fallback view when there are no pins to fit to.
export const US_CENTER: [number, number] = [-98.6, 39.5]
export const US_ZOOM = 3
