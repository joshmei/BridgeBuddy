import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Bridge } from '../lib/bridge'
import type { LoggedBridge } from '../lib/logs'
import {
  STRUCTURE_TYPE_COLORS,
  STRUCTURE_TYPE_LABELS,
  UNKNOWN_STRUCTURE_COLOR,
} from '../lib/structureTypes'
import { MAPBOX_TOKEN, MAP_STYLE, MAP_STYLES, US_CENTER, US_ZOOM } from '../lib/mapbox'

// Dark Mapbox map of the user's logged bridges (Phase 3), used as the fixed
// header on the My Bridges screen. Pins are colored by structure type from the
// SAME source of truth as the badges (structureTypes.ts) — no hardcoded colors.
// Built-in GL clustering; tapping a pin shows a callout (name + badge) that
// navigates to the bridge detail; fits bounds to her pins, US fallback if none.

type PinFeature = GeoJSON.Feature<GeoJSON.Point, { id: string; color: string }>

function pinColor(bridge: Bridge): string {
  const primary = bridge.structures[0]?.type // hybrids → primary/first type
  return primary ? STRUCTURE_TYPE_COLORS[primary].bg : UNKNOWN_STRUCTURE_COLOR.bg
}

function featuresFor(bridges: LoggedBridge[]): PinFeature[] {
  return bridges
    .filter((b) => b.bridge.coordinate)
    .map((b) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [b.bridge.coordinate!.lng, b.bridge.coordinate!.lat] },
      properties: { id: b.log.id, color: pinColor(b.bridge) },
    }))
}

function fitMap(map: mapboxgl.Map, features: PinFeature[]) {
  if (features.length === 0) return false
  if (features.length === 1) {
    map.easeTo({ center: features[0].geometry.coordinates as [number, number], zoom: 11, duration: 0 })
    return true
  }
  const bounds = new mapboxgl.LngLatBounds()
  features.forEach((f) => bounds.extend(f.geometry.coordinates as [number, number]))
  map.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 0 })
  return true
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

// Callout markup: bridge name + structure badge pills (reusing the badge colors),
// the whole thing tappable to open the detail page.
function popupHTML(bridge: Bridge): string {
  const types: Array<keyof typeof STRUCTURE_TYPE_COLORS> = []
  for (const s of bridge.structures) if (!types.includes(s.type)) types.push(s.type)
  const pill = (bg: string, fg: string, label: string) =>
    `<span style="display:inline-block;margin:3px 4px 0 0;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;background:${bg};color:${fg};">${esc(label)}</span>`
  const pills =
    types.length === 0
      ? pill(UNKNOWN_STRUCTURE_COLOR.bg, UNKNOWN_STRUCTURE_COLOR.fg, 'Structure type unknown')
      : types.map((t) => pill(STRUCTURE_TYPE_COLORS[t].bg, STRUCTURE_TYPE_COLORS[t].fg, STRUCTURE_TYPE_LABELS[t])).join('')
  return (
    `<button type="button" class="bb-popup-go" style="display:block;width:100%;text-align:left;border:0;background:none;cursor:pointer;padding:2px;">` +
    `<span style="display:block;font-size:14px;font-weight:600;color:#1a1a2e;">${esc(bridge.name)}</span>` +
    `<span style="display:block;">${pills}</span>` +
    `<span style="display:block;margin-top:6px;font-size:12px;font-weight:600;color:#d4879a;">View bridge ›</span>` +
    `</button>`
  )
}

// Add the bridge source + pin/cluster layers + 3D buildings. Run on initial load
// AND after every style switch (map.setStyle wipes custom sources/layers, so they
// must be re-added). Pins/clusters are added last so they draw on top; 3D
// buildings go beneath the labels. Click/zoom handlers persist across setStyle, so
// they're attached once in the component (not here).
function addBridgeLayers(map: mapboxgl.Map, features: PinFeature[]) {
  if (map.getSource('bridges')) return
  map.addSource('bridges', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
    cluster: true,
    clusterRadius: 50,
    clusterMaxZoom: 14,
  })
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'bridges',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#1a1a2e',
      'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 28],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  })
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'bridges',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-size': 13,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
    },
    paint: { 'text-color': '#ffffff' },
  })
  map.addLayer({
    id: 'points',
    type: 'circle',
    source: 'bridges',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': 7,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  })
  // 3D buildings (zoom 15+), beneath the first label layer. Wrapped because a
  // style without building extrusions would otherwise throw.
  try {
    const labelLayerId = map
      .getStyle()
      .layers?.find((l) => l.type === 'symbol' && l.layout?.['text-field'])?.id
    map.addLayer(
      {
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#1a1a2e',
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.8,
        },
      },
      labelLayerId,
    )
  } catch {
    /* style has no building extrusions — skip 3D */
  }
}

export function BridgesMap({
  bridges,
  onSelect,
  className,
}: {
  bridges: LoggedBridge[]
  onSelect: (bridge: Bridge) => void
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const popupRef = useRef<mapboxgl.Popup | null>(null)
  // Refs so the once-only init effect always reads the latest props.
  const bridgesRef = useRef(bridges)
  const onSelectRef = useRef(onSelect)
  const didFitRef = useRef(false)
  const [styleUrl, setStyleUrl] = useState<string>(MAP_STYLE)

  // Keep refs current so the once-only init effect's handlers read latest props.
  useEffect(() => {
    bridgesRef.current = bridges
    onSelectRef.current = onSelect
  })

  // Switch the basemap style. setStyle wipes custom sources/layers, so re-add
  // them once the new style finishes loading. Camera + click/zoom handlers persist.
  function switchStyle(url: string) {
    const map = mapRef.current
    if (!map || url === styleUrl) return
    setStyleUrl(url)
    map.setStyle(url)
    map.once('style.load', () => addBridgeLayers(map, featuresFor(bridgesRef.current)))
  }

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN) return
    const map = new mapboxgl.Map({
      container: containerRef.current,
      accessToken: MAPBOX_TOKEN,
      style: MAP_STYLE,
      center: US_CENTER,
      zoom: US_ZOOM,
      attributionControl: false,
    })
    mapRef.current = map
    map.addControl(new mapboxgl.AttributionControl({ compact: true }))

    map.on('load', () => {
      addBridgeLayers(map, featuresFor(bridgesRef.current))

      // Auto-tilt into 3D past zoom 15; flatten on the way back out. On zoomend
      // (not zoom) so it never fights an in-progress pinch.
      let tilted = false
      map.on('zoomend', () => {
        const z = map.getZoom()
        if (z >= 15 && !tilted) {
          tilted = true
          map.easeTo({ pitch: 45, bearing: -17.6, duration: 600 })
        } else if (z < 15 && tilted) {
          tilted = false
          map.easeTo({ pitch: 0, bearing: 0, duration: 600 })
        }
      })

      if (fitMap(map, featuresFor(bridgesRef.current))) didFitRef.current = true

      for (const id of ['clusters', 'points']) {
        map.on('mouseenter', id, () => (map.getCanvas().style.cursor = 'pointer'))
        map.on('mouseleave', id, () => (map.getCanvas().style.cursor = ''))
      }

      // Cluster → zoom in to expand.
      map.on('click', 'clusters', (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0]
        const clusterId = f?.properties?.cluster_id
        if (clusterId == null) return
        const source = map.getSource('bridges') as mapboxgl.GeoJSONSource
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return
          map.easeTo({
            center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom ?? map.getZoom() + 2,
          })
        })
      })

      // Pin → callout (name + badge) → tapping it navigates to the detail.
      map.on('click', 'points', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const id = f.properties?.id as string
        const item = bridgesRef.current.find((b) => b.log.id === id)
        if (!item) return
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number]
        popupRef.current?.remove()
        const popup = new mapboxgl.Popup({ offset: 14, maxWidth: '260px' })
          .setLngLat(coords)
          .setHTML(popupHTML(item.bridge))
          .addTo(map)
        popupRef.current = popup
        popup
          .getElement()
          ?.querySelector('.bb-popup-go')
          ?.addEventListener('click', () => {
            popup.remove()
            onSelectRef.current(item.bridge)
          })
      })
    })

    return () => {
      popupRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update pins when the bridge set changes (e.g. after a removal); fit once.
  useEffect(() => {
    const map = mapRef.current
    const source = map?.getSource('bridges') as mapboxgl.GeoJSONSource | undefined
    if (!map || !source) return
    const features = featuresFor(bridges)
    source.setData({ type: 'FeatureCollection', features })
    if (!didFitRef.current) didFitRef.current = fitMap(map, features)
  }, [bridges])

  // No token → dark placeholder so the layout still reserves the header space.
  if (!MAPBOX_TOKEN) {
    return (
      <div className={className} style={{ backgroundColor: '#1a1a2e' }}>
        <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
          Map unavailable
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <div ref={containerRef} className="h-full w-full" />
      {/* Style switcher pills — overlaid top-right, readable over any basemap. */}
      <div
        className="absolute right-2 top-2 z-10 flex gap-1"
        style={{ background: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: 3 }}
      >
        {MAP_STYLES.map((s) => {
          const active = s.url === styleUrl
          return (
            <button
              key={s.url}
              type="button"
              onClick={() => switchStyle(s.url)}
              style={{
                fontSize: 12,
                lineHeight: 1.2,
                padding: '4px 10px',
                borderRadius: 20,
                fontWeight: 500,
                background: active ? '#D4879A' : '#ffffff',
                color: active ? '#ffffff' : '#1a1a2e',
                border: active ? '0.5px solid transparent' : '0.5px solid #e8d8dc',
              }}
            >
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
