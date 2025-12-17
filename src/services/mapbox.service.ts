/**
 * Servicio de Mapbox para geocodificación, rutas y optimización
 * Documentación: https://docs.mapbox.com/api/
 */

import type { Coordenadas, SegmentoRuta } from '../types/route.types'

// Token de Mapbox - debe configurarse en .env
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

// URLs base de la API
const GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places'
const DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox'
const OPTIMIZATION_URL = 'https://api.mapbox.com/optimized-trips/v1/mapbox'

// ============================================
// TIPOS DE RESPUESTA
// ============================================

export interface GeocodingResult {
  id: string
  placeName: string
  text: string
  coordinates: Coordenadas
  relevance: number
  placeType: string[]
  context: {
    id: string
    text: string
    shortCode?: string
  }[]
}

export interface DirectionsResult {
  distance: number      // metros
  duration: number      // segundos
  geometry: string      // Polyline encoded
  legs: {
    distance: number
    duration: number
    steps: {
      distance: number
      duration: number
      instruction: string
      maneuver: {
        type: string
        modifier?: string
        location: [number, number]
      }
    }[]
  }[]
  waypoints: {
    name: string
    location: [number, number]
  }[]
}

export interface OptimizationResult {
  trips: {
    distance: number
    duration: number
    geometry: string
    legs: {
      distance: number
      duration: number
    }[]
  }[]
  waypoints: {
    waypoint_index: number
    trips_index: number
    name: string
    location: [number, number]
  }[]
}

// ============================================
// GEOCODIFICACIÓN
// ============================================

/**
 * Busca direcciones y lugares
 * @param query Texto de búsqueda
 * @param options Opciones de búsqueda
 */
export async function geocode(
  query: string,
  options: {
    country?: string      // 'mx' para México
    types?: string[]      // 'address', 'poi', 'place', etc.
    proximity?: Coordenadas
    limit?: number
    language?: string
  } = {}
): Promise<GeocodingResult[]> {
  if (!MAPBOX_TOKEN) {
    console.error('MAPBOX_TOKEN no configurado')
    return []
  }

  const {
    country = 'mx',
    types = ['address', 'poi', 'place'],
    proximity,
    limit = 5,
    language = 'es',
  } = options

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    country,
    types: types.join(','),
    limit: limit.toString(),
    language,
  })

  if (proximity) {
    params.append('proximity', `${proximity.lng},${proximity.lat}`)
  }

  try {
    const response = await fetch(
      `${GEOCODING_URL}/${encodeURIComponent(query)}.json?${params}`
    )

    if (!response.ok) {
      throw new Error(`Geocoding error: ${response.status}`)
    }

    const data = await response.json()

    return data.features.map((feature: any) => ({
      id: feature.id,
      placeName: feature.place_name,
      text: feature.text,
      coordinates: {
        lat: feature.center[1],
        lng: feature.center[0],
      },
      relevance: feature.relevance,
      placeType: feature.place_type,
      context: feature.context || [],
    }))
  } catch (error) {
    console.error('Error en geocodificación:', error)
    return []
  }
}

/**
 * Geocodificación inversa (coordenadas a dirección)
 */
export async function reverseGeocode(
  coordinates: Coordenadas,
  options: {
    types?: string[]
    language?: string
  } = {}
): Promise<GeocodingResult | null> {
  if (!MAPBOX_TOKEN) {
    console.error('MAPBOX_TOKEN no configurado')
    return null
  }

  const { types = ['address'], language = 'es' } = options

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    types: types.join(','),
    language,
  })

  try {
    const response = await fetch(
      `${GEOCODING_URL}/${coordinates.lng},${coordinates.lat}.json?${params}`
    )

    if (!response.ok) {
      throw new Error(`Reverse geocoding error: ${response.status}`)
    }

    const data = await response.json()

    if (data.features.length === 0) return null

    const feature = data.features[0]
    return {
      id: feature.id,
      placeName: feature.place_name,
      text: feature.text,
      coordinates,
      relevance: feature.relevance,
      placeType: feature.place_type,
      context: feature.context || [],
    }
  } catch (error) {
    console.error('Error en geocodificación inversa:', error)
    return null
  }
}

// ============================================
// DIRECCIONES Y RUTAS
// ============================================

type DrivingProfile = 'driving' | 'driving-traffic'

/**
 * Obtiene la ruta entre dos o más puntos
 * @param waypoints Array de coordenadas (mínimo 2)
 * @param options Opciones de la ruta
 */
export async function getDirections(
  waypoints: Coordenadas[],
  options: {
    profile?: DrivingProfile
    alternatives?: boolean
    geometries?: 'geojson' | 'polyline'
    overview?: 'full' | 'simplified' | 'false'
    steps?: boolean
    annotations?: string[]
    language?: string
  } = {}
): Promise<DirectionsResult | null> {
  if (!MAPBOX_TOKEN) {
    console.error('MAPBOX_TOKEN no configurado')
    return null
  }

  if (waypoints.length < 2) {
    console.error('Se necesitan al menos 2 puntos')
    return null
  }

  const {
    profile = 'driving-traffic',
    alternatives = false,
    geometries = 'polyline',
    overview = 'full',
    steps = true,
    annotations = ['distance', 'duration'],
    language = 'es',
  } = options

  const coordinatesString = waypoints
    .map((wp) => `${wp.lng},${wp.lat}`)
    .join(';')

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    alternatives: alternatives.toString(),
    geometries,
    overview,
    steps: steps.toString(),
    annotations: annotations.join(','),
    language,
  })

  try {
    const response = await fetch(
      `${DIRECTIONS_URL}/${profile}/${coordinatesString}?${params}`
    )

    if (!response.ok) {
      throw new Error(`Directions error: ${response.status}`)
    }

    const data = await response.json()

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('No se encontró ruta:', data.message || data.code)
      return null
    }

    const route = data.routes[0]
    return {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
      legs: route.legs.map((leg: any) => ({
        distance: leg.distance,
        duration: leg.duration,
        steps: leg.steps.map((step: any) => ({
          distance: step.distance,
          duration: step.duration,
          instruction: step.maneuver.instruction,
          maneuver: {
            type: step.maneuver.type,
            modifier: step.maneuver.modifier,
            location: step.maneuver.location,
          },
        })),
      })),
      waypoints: data.waypoints.map((wp: any) => ({
        name: wp.name,
        location: wp.location,
      })),
    }
  } catch (error) {
    console.error('Error obteniendo direcciones:', error)
    return null
  }
}

/**
 * Calcula ruta para camiones (considera restricciones)
 * Nota: Requiere plan de pago de Mapbox para perfil 'driving-traffic' con truck
 */
export async function getTruckDirections(
  waypoints: Coordenadas[],
  truckConfig: {
    height?: number       // metros
    width?: number        // metros
    length?: number       // metros
    weight?: number       // toneladas
  } = {}
): Promise<DirectionsResult | null> {
  // Por ahora usa driving normal
  // TODO: Implementar con API de truck routing cuando esté disponible
  return getDirections(waypoints, {
    profile: 'driving-traffic',
    steps: true,
  })
}

// ============================================
// OPTIMIZACIÓN DE RUTAS
// ============================================

/**
 * Interfaz para parada con ventana de tiempo
 */
export interface ParadaConVentana {
  coordenadas: Coordenadas
  nombre: string
  ventanaInicio?: string  // HH:MM formato 24h
  ventanaFin?: string     // HH:MM formato 24h
  duracionServicio?: number // minutos en el punto
}

/**
 * Optimiza el orden de múltiples puntos de entrega
 * @param waypoints Puntos a visitar (el primero es origen y destino)
 * @param options Opciones de optimización
 */
export async function optimizeRoute(
  waypoints: Coordenadas[],
  options: {
    roundtrip?: boolean   // Volver al origen
    source?: 'first' | 'last' | 'any'
    destination?: 'first' | 'last' | 'any'
    geometries?: 'geojson' | 'polyline'
    overview?: 'full' | 'simplified' | 'false'
  } = {}
): Promise<OptimizationResult | null> {
  if (!MAPBOX_TOKEN) {
    console.error('MAPBOX_TOKEN no configurado')
    return null
  }

  if (waypoints.length < 2 || waypoints.length > 12) {
    console.error('Se necesitan entre 2 y 12 puntos')
    return null
  }

  const {
    roundtrip = false,
    source = 'first',
    destination = 'last',
    geometries = 'polyline',
    overview = 'full',
  } = options

  const coordinatesString = waypoints
    .map((wp) => `${wp.lng},${wp.lat}`)
    .join(';')

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    roundtrip: roundtrip.toString(),
    source,
    destination,
    geometries,
    overview,
  })

  try {
    const response = await fetch(
      `${OPTIMIZATION_URL}/driving/${coordinatesString}?${params}`
    )

    if (!response.ok) {
      throw new Error(`Optimization error: ${response.status}`)
    }

    const data = await response.json()

    if (data.code !== 'Ok') {
      console.error('Error en optimización:', data.message || data.code)
      return null
    }

    return {
      trips: data.trips.map((trip: any) => ({
        distance: trip.distance,
        duration: trip.duration,
        geometry: trip.geometry,
        legs: trip.legs.map((leg: any) => ({
          distance: leg.distance,
          duration: leg.duration,
        })),
      })),
      waypoints: data.waypoints.map((wp: any) => ({
        waypoint_index: wp.waypoint_index,
        trips_index: wp.trips_index,
        name: wp.name,
        location: wp.location,
      })),
    }
  } catch (error) {
    console.error('Error optimizando ruta:', error)
    return null
  }
}

/**
 * Optimiza ruta con ventanas de tiempo usando algoritmo greedy + mejoras locales
 * Considera: distancia, tiempo de viaje y restricciones de ventana
 */
export async function optimizeRouteWithTimeWindows(
  origen: Coordenadas,
  destino: Coordenadas,
  paradas: ParadaConVentana[],
  horaInicio: string = '08:00' // Hora de salida
): Promise<{
  ordenOptimo: number[]
  distanciaTotal: number
  tiempoTotal: number
  llegadasEstimadas: string[]
  cumpleVentanas: boolean[]
  geometry?: string
} | null> {
  if (paradas.length === 0) {
    return {
      ordenOptimo: [],
      distanciaTotal: 0,
      tiempoTotal: 0,
      llegadasEstimadas: [],
      cumpleVentanas: [],
    }
  }

  // Calcular matriz de distancias/tiempos
  const todosLosPuntos = [origen, ...paradas.map(p => p.coordenadas), destino]
  const n = todosLosPuntos.length
  const matrizTiempo: number[][] = Array(n).fill(null).map(() => Array(n).fill(0))
  const matrizDistancia: number[][] = Array(n).fill(null).map(() => Array(n).fill(0))

  // Calcular tiempos entre todos los pares de puntos
  // Velocidad promedio para vehículo pesado: 30 km/h
  // (considera tráfico, maniobras, zonas urbanas, pendientes)
  const VELOCIDAD_PROMEDIO_KMH = 30

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const dist = calculateDistance(todosLosPuntos[i], todosLosPuntos[j])
        matrizDistancia[i][j] = dist
        matrizTiempo[i][j] = (dist / VELOCIDAD_PROMEDIO_KMH) * 60 // en minutos
      }
    }
  }

  // Algoritmo de inserción más cercana considerando ventanas de tiempo
  const visitados = new Set<number>([0, n - 1]) // Origen y destino fijos
  const ruta: number[] = [0] // Empieza en origen

  // Índices de paradas (1 a n-2)
  const paradasDisponibles = paradas.map((_, i) => i + 1)

  // Ordenar paradas por ventana de inicio (las más tempranas primero)
  const paradasOrdenadas = [...paradasDisponibles].sort((a, b) => {
    const ventanaA = paradas[a - 1].ventanaInicio || '23:59'
    const ventanaB = paradas[b - 1].ventanaInicio || '23:59'
    return ventanaA.localeCompare(ventanaB)
  })

  // Inserción greedy considerando tiempo
  let tiempoActual = parseTime(horaInicio)

  for (const paradaIdx of paradasOrdenadas) {
    if (visitados.has(paradaIdx)) continue

    // Encontrar mejor posición para insertar esta parada
    let mejorPosicion = ruta.length
    let mejorCosto = Infinity

    for (let pos = 1; pos <= ruta.length; pos++) {
      const prevIdx = ruta[pos - 1]
      const nextIdx = pos < ruta.length ? ruta[pos] : n - 1

      // Costo de inserción = tiempo adicional
      const costoActual = matrizTiempo[prevIdx][nextIdx]
      const costoNuevo = matrizTiempo[prevIdx][paradaIdx] + matrizTiempo[paradaIdx][nextIdx]
      const costoAdicional = costoNuevo - costoActual

      // Penalizar si no cumple ventana de tiempo
      const parada = paradas[paradaIdx - 1]
      let penalizacion = 0
      if (parada.ventanaInicio || parada.ventanaFin) {
        const tiempoLlegada = calcularTiempoLlegada(ruta, pos, paradaIdx, matrizTiempo, horaInicio)
        if (parada.ventanaInicio && tiempoLlegada < parseTime(parada.ventanaInicio)) {
          penalizacion += (parseTime(parada.ventanaInicio) - tiempoLlegada) * 2 // Espera
        }
        if (parada.ventanaFin && tiempoLlegada > parseTime(parada.ventanaFin)) {
          penalizacion += (tiempoLlegada - parseTime(parada.ventanaFin)) * 10 // Penalización fuerte por llegar tarde
        }
      }

      const costoTotal = costoAdicional + penalizacion

      if (costoTotal < mejorCosto) {
        mejorCosto = costoTotal
        mejorPosicion = pos
      }
    }

    // Insertar en mejor posición
    ruta.splice(mejorPosicion, 0, paradaIdx)
    visitados.add(paradaIdx)
  }

  // Agregar destino al final
  ruta.push(n - 1)

  // Mejora local: 2-opt
  let mejorado = true
  while (mejorado) {
    mejorado = false
    for (let i = 1; i < ruta.length - 2; i++) {
      for (let j = i + 1; j < ruta.length - 1; j++) {
        // Solo intercambiar paradas intermedias (no origen/destino)
        if (ruta[i] === 0 || ruta[j] === n - 1) continue

        const costoActual =
          matrizDistancia[ruta[i - 1]][ruta[i]] +
          matrizDistancia[ruta[j]][ruta[j + 1]]

        const costoNuevo =
          matrizDistancia[ruta[i - 1]][ruta[j]] +
          matrizDistancia[ruta[i]][ruta[j + 1]]

        if (costoNuevo < costoActual - 0.1) {
          // Invertir segmento entre i y j
          const segmento = ruta.slice(i, j + 1).reverse()
          ruta.splice(i, j - i + 1, ...segmento)
          mejorado = true
        }
      }
    }
  }

  // Calcular métricas finales
  let distanciaTotal = 0
  let tiempoTotal = 0
  let tiempoAcumulado = parseTime(horaInicio)

  // Crear arrays temporales para almacenar info por orden de visita
  const infoParadas: Array<{
    indiceOriginal: number
    llegadaEstimada: string
    cumpleVentana: boolean
  }> = []

  for (let i = 0; i < ruta.length - 1; i++) {
    const desde = ruta[i]
    const hasta = ruta[i + 1]

    distanciaTotal += matrizDistancia[desde][hasta]
    tiempoTotal += matrizTiempo[desde][hasta]
    tiempoAcumulado += matrizTiempo[desde][hasta]

    // Si es una parada intermedia
    if (hasta !== 0 && hasta !== n - 1) {
      const indiceOriginal = hasta - 1
      const parada = paradas[indiceOriginal]
      const llegadaEstimada = formatTimeFromMinutes(tiempoAcumulado)

      const cumpleVentana =
        (!parada.ventanaInicio || tiempoAcumulado >= parseTime(parada.ventanaInicio)) &&
        (!parada.ventanaFin || tiempoAcumulado <= parseTime(parada.ventanaFin))

      infoParadas.push({
        indiceOriginal,
        llegadaEstimada,
        cumpleVentana,
      })

      // Agregar tiempo de servicio
      if (parada.duracionServicio) {
        tiempoAcumulado += parada.duracionServicio
        tiempoTotal += parada.duracionServicio
      }
    }
  }

  // Obtener geometría de la ruta optimizada
  const waypointsOrdenados = ruta.map(idx => todosLosPuntos[idx])
  const rutaMapbox = await getDirections(waypointsOrdenados)

  // El ordenOptimo son los índices originales en el nuevo orden de visita
  const ordenOptimo = infoParadas.map(info => info.indiceOriginal)

  // llegadasEstimadas y cumpleVentanas están en el NUEVO orden (orden de visita)
  // Esto es correcto porque en el componente, las paradas se reordenan con ordenOptimo
  const llegadasEstimadas = infoParadas.map(info => info.llegadaEstimada)
  const cumpleVentanas = infoParadas.map(info => info.cumpleVentana)

  return {
    ordenOptimo,
    distanciaTotal: Math.round(distanciaTotal * 10) / 10,
    tiempoTotal: Math.round(tiempoTotal),
    llegadasEstimadas,
    cumpleVentanas,
    geometry: rutaMapbox?.geometry,
  }
}

// Helpers para tiempo
function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function formatTimeFromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = Math.floor(minutes % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function calcularTiempoLlegada(
  rutaParcial: number[],
  posInsercion: number,
  paradaIdx: number,
  matrizTiempo: number[][],
  horaInicio: string
): number {
  let tiempo = parseTime(horaInicio)

  for (let i = 0; i < posInsercion; i++) {
    const desde = i === 0 ? rutaParcial[0] : rutaParcial[i]
    const hasta = i === posInsercion - 1 ? paradaIdx : rutaParcial[i + 1]
    tiempo += matrizTiempo[desde][hasta]
  }

  return tiempo
}

// ============================================
// HELPERS
// ============================================

/**
 * Convierte metros a kilómetros
 */
export function metersToKm(meters: number): number {
  return Math.round((meters / 1000) * 10) / 10
}

/**
 * Convierte segundos a formato legible
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }
  return `${minutes} min`
}

/**
 * Decodifica polyline a coordenadas
 * Algoritmo de Google Polyline
 */
export function decodePolyline(encoded: string): Coordenadas[] {
  const points: Coordenadas[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let b
    let shift = 0
    let result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlat = result & 1 ? ~(result >> 1) : result >> 1
    lat += dlat

    shift = 0
    result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlng = result & 1 ? ~(result >> 1) : result >> 1
    lng += dlng

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    })
  }

  return points
}

/**
 * Calcula la distancia entre dos puntos (Haversine)
 */
export function calculateDistance(
  point1: Coordenadas,
  point2: Coordenadas
): number {
  const R = 6371 // Radio de la tierra en km
  const dLat = toRad(point2.lat - point1.lat)
  const dLon = toRad(point2.lng - point1.lng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Estima el costo de combustible para una distancia
 */
export function estimateFuelCost(
  distanceKm: number,
  fuelEfficiency: number = 3.5, // km/litro para camión
  fuelPrice: number = 24.5      // precio por litro en MXN
): number {
  const litersNeeded = distanceKm / fuelEfficiency
  return Math.round(litersNeeded * fuelPrice)
}

/**
 * Estima el costo de casetas para una ruta
 * Valores aproximados para rutas principales en México
 */
export function estimateTollCost(
  distanceKm: number,
  vehicleType: 'auto' | 'camion_2ejes' | 'camion_3ejes' | 'camion_multieje' = 'camion_2ejes'
): number {
  // Costo promedio por km en casetas mexicanas
  const costPerKm: Record<string, number> = {
    auto: 1.2,
    camion_2ejes: 2.5,
    camion_3ejes: 3.5,
    camion_multieje: 5.0,
  }

  // Asumimos que ~60% de la ruta puede tener casetas
  const tollableDistance = distanceKm * 0.6
  return Math.round(tollableDistance * costPerKm[vehicleType])
}

/**
 * Genera URL del mapa estático
 */
export function getStaticMapUrl(
  center: Coordenadas,
  options: {
    zoom?: number
    width?: number
    height?: number
    markers?: Coordenadas[]
    path?: Coordenadas[]
  } = {}
): string {
  if (!MAPBOX_TOKEN) return ''

  const {
    zoom = 12,
    width = 600,
    height = 400,
    markers = [],
    path = [],
  } = options

  let url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/`

  // Añadir marcadores
  if (markers.length > 0) {
    const markerString = markers
      .map((m, i) => {
        const color = i === 0 ? '00ff00' : i === markers.length - 1 ? 'ff0000' : 'ffaa00'
        return `pin-s+${color}(${m.lng},${m.lat})`
      })
      .join(',')
    url += markerString + '/'
  }

  // Centro y dimensiones
  url += `${center.lng},${center.lat},${zoom}/${width}x${height}`
  url += `?access_token=${MAPBOX_TOKEN}`

  return url
}

/**
 * Verifica si el token de Mapbox está configurado
 */
export function isMapboxConfigured(): boolean {
  return !!MAPBOX_TOKEN && MAPBOX_TOKEN.length > 0
}

/**
 * Obtiene el token de Mapbox
 */
export function getMapboxToken(): string {
  return MAPBOX_TOKEN
}
