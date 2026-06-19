// Mapbox config (Phase 3). The token is a public (pk.) token, safe in the client
// bundle and restricted by URL in the Mapbox account. Read from env so it's never
// hardcoded; if absent, the map degrades to a placeholder instead of crashing.

/*
mapbox://styles/mapbox/dark-v11          current
mapbox://styles/mapbox/light-v11         clean white
mapbox://styles/mapbox/streets-v12       standard map
mapbox://styles/mapbox/outdoors-v12      terrain focus
mapbox://styles/mapbox/satellite-v9      satellite imagery
mapbox://styles/mapbox/satellite-streets-v12  satellite + roads
mapbox://styles/mapbox/navigation-day-v1      driving focus light
mapbox://styles/mapbox/navigation-night-v1    driving focus dark
*/

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
export const isMapboxConfigured = Boolean(MAPBOX_TOKEN)

// Default map style (Streets). Switchable in-app via the style pills.
export const MAP_STYLE = 'mapbox://styles/mapbox/streets-v12'

// Style switcher options (order = pill order), first is the default/active on load.
export const MAP_STYLES = [
  { label: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
  { label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { label: 'Terrain', url: 'mapbox://styles/mapbox/outdoors-v12' },
] as const

// Continental US fallback view when there are no pins to fit to.
export const US_CENTER: [number, number] = [-98.6, 39.5]
export const US_ZOOM = 3
