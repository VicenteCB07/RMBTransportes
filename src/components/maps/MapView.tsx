/**
 * Componente principal de mapa con Mapbox GL
 * Muestra rutas, puntos y permite interacción
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getMapboxToken, isMapboxConfigured, decodePolyline } from '../../services/mapbox.service'
import type { Coordenadas, PuntoEntrega, NivelRiesgo } from '../../types/route.types'
import { cn } from '../../utils/cn'

// Configurar token de Mapbox
if (isMapboxConfigured()) {
  mapboxgl.accessToken = getMapboxToken()
}

interface MapViewProps {
  center?: Coordenadas
  zoom?: number
  markers?: Array<{
    id: string
    coordinates: Coordenadas
    type: 'origin' | 'destination' | 'waypoint' | 'vehicle' | 'alert'
    label?: string
    popup?: string
    draggable?: boolean
  }>
  route?: {
    geometry: string // Polyline encoded
    color?: string
  }
  onMarkerDrag?: (id: string, coordinates: Coordenadas) => void
  onMapClick?: (coordinates: Coordenadas) => void
  className?: string
  showControls?: boolean
  interactive?: boolean
}

// Colores por tipo de marcador
const MARKER_COLORS: Record<string, string> = {
  origin: '#22c55e',      // Verde
  destination: '#ef4444', // Rojo
  waypoint: '#f59e0b',    // Amarillo
  vehicle: '#3b82f6',     // Azul
  alert: '#dc2626',       // Rojo intenso
}

export default function MapView({
  center = { lat: 23.6345, lng: -102.5528 }, // Centro de México
  zoom = 5,
  markers = [],
  route,
  onMarkerDrag,
  onMapClick,
  className,
  showControls = true,
  interactive = true,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const [mapLoaded, setMapLoaded] = useState(false)

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || !isMapboxConfigured()) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center.lng, center.lat],
      zoom,
      interactive,
    })

    // Controles
    if (showControls) {
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right')
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        }),
        'top-right'
      )
    }

    // Evento de carga
    map.current.on('load', () => {
      setMapLoaded(true)
    })

    // Evento de click
    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick({
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        })
      })
    }

    return () => {
      if (map.current) {
        map.current.remove()
      }
    }
  }, [])

  // Actualizar centro
  useEffect(() => {
    if (map.current && center) {
      map.current.flyTo({
        center: [center.lng, center.lat],
        zoom,
        duration: 1000,
      })
    }
  }, [center.lat, center.lng, zoom])

  // Manejar marcadores
  // Usamos un ref para guardar los datos previos y detectar cambios en labels
  const prevMarkersDataRef = useRef<Map<string, { label?: string; popup?: string }>>(new Map())

  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Obtener IDs actuales
    const currentIds = new Set(markers.map(m => m.id))

    // Remover marcadores que ya no existen
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
        prevMarkersDataRef.current.delete(id)
      }
    })

    // Añadir o actualizar marcadores
    markers.forEach((markerData) => {
      const existingMarker = markersRef.current.get(markerData.id)
      const prevData = prevMarkersDataRef.current.get(markerData.id)

      // Detectar si cambió el label o popup (requiere re-crear el marcador)
      const labelChanged = prevData && prevData.label !== markerData.label
      const popupChanged = prevData && prevData.popup !== markerData.popup

      if (existingMarker && !labelChanged && !popupChanged) {
        // Solo actualizar posición si no cambió el label
        existingMarker.setLngLat([markerData.coordinates.lng, markerData.coordinates.lat])
      } else {
        // Eliminar marcador existente si cambió el label
        if (existingMarker) {
          existingMarker.remove()
          markersRef.current.delete(markerData.id)
        }

        // Crear nuevo marcador
        const el = document.createElement('div')
        el.className = 'custom-marker'
        el.innerHTML = createMarkerHTML(markerData.type, markerData.label)

        const marker = new mapboxgl.Marker({
          element: el,
          draggable: markerData.draggable,
        })
          .setLngLat([markerData.coordinates.lng, markerData.coordinates.lat])
          .addTo(map.current!)

        // Popup
        if (markerData.popup) {
          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2 text-sm">${markerData.popup}</div>`
          )
          marker.setPopup(popup)
        }

        // Evento de arrastre
        if (markerData.draggable && onMarkerDrag) {
          marker.on('dragend', () => {
            const lngLat = marker.getLngLat()
            onMarkerDrag(markerData.id, { lat: lngLat.lat, lng: lngLat.lng })
          })
        }

        markersRef.current.set(markerData.id, marker)
      }

      // Guardar datos actuales para comparación futura
      prevMarkersDataRef.current.set(markerData.id, {
        label: markerData.label,
        popup: markerData.popup,
      })
    })
  }, [markers, mapLoaded, onMarkerDrag])

  // Dibujar ruta
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const sourceId = 'route-source'
    const layerId = 'route-layer'

    // Remover ruta existente
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId)
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId)
    }

    if (route?.geometry) {
      // Decodificar polyline
      const coordinates = decodePolyline(route.geometry)

      // Añadir fuente
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates.map((c) => [c.lng, c.lat]),
          },
        },
      })

      // Añadir capa de línea
      map.current.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': route.color || '#BB0034',
          'line-width': 4,
          'line-opacity': 0.8,
        },
      })

      // Ajustar vista a la ruta
      if (coordinates.length > 0) {
        const bounds = coordinates.reduce(
          (bounds, coord) => bounds.extend([coord.lng, coord.lat]),
          new mapboxgl.LngLatBounds(
            [coordinates[0].lng, coordinates[0].lat],
            [coordinates[0].lng, coordinates[0].lat]
          )
        )

        map.current.fitBounds(bounds, {
          padding: 50,
          duration: 1000,
        })
      }
    }
  }, [route, mapLoaded])

  if (!isMapboxConfigured()) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100 rounded-lg', className)}>
        <div className="text-center p-8">
          <p className="text-gray-600 mb-2">Mapbox no está configurado</p>
          <p className="text-sm text-gray-500">
            Agrega VITE_MAPBOX_TOKEN a tu archivo .env
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative rounded-lg overflow-hidden', className)}>
      <div ref={mapContainer} className="w-full h-full min-h-[400px]" />

      {/* Leyenda */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-xs shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span>Origen</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span>Destino</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          <span>Parada</span>
        </div>
      </div>
    </div>
  )
}

// Helper para crear HTML del marcador
function createMarkerHTML(type: string, label?: string): string {
  const color = MARKER_COLORS[type] || '#6b7280'
  const size = type === 'vehicle' ? 32 : 24

  if (type === 'vehicle') {
    return `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
      ">
        🚛
      </div>
    `
  }

  return `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
    ">
      ${label || ''}
    </div>
  `
}
