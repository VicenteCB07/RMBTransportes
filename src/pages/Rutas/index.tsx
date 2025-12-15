/**
 * Página de Gestión de Rutas
 * Planificación, visualización y seguimiento de rutas
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Search,
  MapPin,
  Clock,
  Truck,
  Route,
  AlertTriangle,
  Play,
  Eye,
  Edit,
  Trash2,
  Navigation,
  ChevronRight,
  RefreshCw,
  Shield,
  X,
  Loader2,
  Map as MapIcon,
} from 'lucide-react'
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'
import toast from 'react-hot-toast'
import { cn } from '../../utils/cn'
import { formatCurrency } from '../../services/currency.service'
import {
  getDirections,
  optimizeRoute,
  metersToKm,
  formatDuration,
  estimateTollCost,
  isMapboxConfigured,
} from '../../services/mapbox.service'
import { estimarCostoCombustibleRuta } from '../../services/fuel.service'
import { PRECIO_DIESEL_REFERENCIA } from '../../types/fuel.types'
import type { Coordenadas, NivelRiesgo } from '../../types/route.types'
import { NIVELES_RIESGO, ESTADOS_VIAJE } from '../../types/route.types'
import MapView from '../../components/maps/MapView'
import AddressSearch from '../../components/maps/AddressSearch'
import RouteInfo from '../../components/maps/RouteInfo'

// Tabs disponibles
type TabType = 'rutas' | 'planificar' | 'puntos' | 'mapa'

// Interfaz para ruta guardada
interface RutaGuardada {
  id: string
  nombre: string
  codigo: string
  origen: {
    nombre: string
    coordenadas: Coordenadas
  }
  destino: {
    nombre: string
    coordenadas: Coordenadas
  }
  puntosIntermedios: Array<{
    nombre: string
    coordenadas: Coordenadas
  }>
  distanciaKm: number
  tiempoEstimadoMin: number
  costoCasetas: number
  costoCombustible: number
  nivelRiesgo: NivelRiesgo
  restricciones: string[]
  geometry?: string
  activa: boolean
  vecesUsada: number
  fechaCreacion: Date
}

// Interfaz para punto de entrega guardado
interface PuntoGuardado {
  id: string
  nombre: string
  direccion: string
  coordenadas: Coordenadas
  tipo: 'cliente' | 'proveedor' | 'bodega' | 'caseta' | 'gasolinera'
  horarioAcceso?: string
  restricciones?: string[]
  contacto?: string
  telefono?: string
  activo: boolean
}

// Interfaz para vehículos
interface VehiculoSimple {
  id: string
  placa: string
  modelo: string
  tipo: string
}

export default function Rutas() {
  // Estado principal
  const [activeTab, setActiveTab] = useState<TabType>('rutas')
  const [rutas, setRutas] = useState<RutaGuardada[]>([])
  const [puntos, setPuntos] = useState<PuntoGuardado[]>([])
  const [vehiculos, setVehiculos] = useState<VehiculoSimple[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Origen por defecto: Base RMB Transportes en Tecámac
  const ORIGEN_DEFAULT = {
    nombre: 'Av. Miguel Hidalgo 30, Centro, 55740 Tecámac de Felipe Villanueva, Méx.',
    coordenadas: { lat: 19.7129, lng: -98.9688 },
  }

  // Estado para planificación de nueva ruta
  const [origen, setOrigen] = useState<{ nombre: string; coordenadas: Coordenadas } | null>(ORIGEN_DEFAULT)
  const [destino, setDestino] = useState<{ nombre: string; coordenadas: Coordenadas } | null>(null)
  const [paradas, setParadas] = useState<Array<{ nombre: string; coordenadas: Coordenadas }>>([])
  const [rutaCalculada, setRutaCalculada] = useState<{
    geometry: string
    distanciaKm: number
    tiempoMin: number
    costoCasetas: number
    costoCombustible: number
    litrosEstimados: number
    rendimientoUsado: number
    esRendimientoReal: boolean
  } | null>(null)
  const [calculandoRuta, setCalculandoRuta] = useState(false)
  const [optimizandoRuta, setOptimizandoRuta] = useState(false)
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState('')

  // Estado para modal de guardar ruta
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [nombreRuta, setNombreRuta] = useState('')
  const [codigoRuta, setCodigoRuta] = useState('')
  const [guardandoRuta, setGuardandoRuta] = useState(false)

  // Estado para visualización de ruta existente
  const [rutaSeleccionada, setRutaSeleccionada] = useState<RutaGuardada | null>(null)

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      // Cargar rutas
      const rutasRef = collection(db, 'rutas')
      const rutasQuery = query(rutasRef, orderBy('fechaCreacion', 'desc'))
      const rutasSnapshot = await getDocs(rutasQuery)
      const rutasData = rutasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date(),
      })) as RutaGuardada[]
      setRutas(rutasData)

      // Cargar puntos
      const puntosRef = collection(db, 'puntosEntrega')
      const puntosSnapshot = await getDocs(puntosRef)
      const puntosData = puntosSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PuntoGuardado[]
      setPuntos(puntosData)

      // Cargar vehículos
      const vehiculosRef = collection(db, 'vehiculos')
      const vehiculosSnapshot = await getDocs(vehiculosRef)
      const vehiculosData = vehiculosSnapshot.docs.map((doc) => ({
        id: doc.id,
        placa: doc.data().placa || '',
        modelo: doc.data().modelo || '',
        tipo: doc.data().tipo || 'torton',
      }))
      setVehiculos(vehiculosData)
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar rutas')
    } finally {
      setLoading(false)
    }
  }

  // Calcular ruta con Mapbox
  const calcularRuta = useCallback(async () => {
    if (!origen || !destino) {
      toast.error('Selecciona origen y destino')
      return
    }

    setCalculandoRuta(true)
    try {
      // Preparar waypoints
      const waypoints: Coordenadas[] = [
        origen.coordenadas,
        ...paradas.map((p) => p.coordenadas),
        destino.coordenadas,
      ]

      const result = await getDirections(waypoints)

      if (result) {
        const distanciaKm = metersToKm(result.distance)
        const tiempoMin = Math.round(result.duration / 60)

        // Obtener tipo de vehículo si está seleccionado
        const vehiculo = vehiculos.find((v) => v.id === vehiculoSeleccionado)

        // Estimar combustible usando rendimiento real si está disponible
        const estimacionCombustible = await estimarCostoCombustibleRuta(
          distanciaKm,
          vehiculoSeleccionado || undefined,
          vehiculo?.tipo
        )

        setRutaCalculada({
          geometry: result.geometry,
          distanciaKm,
          tiempoMin,
          costoCasetas: estimateTollCost(distanciaKm, 'camion_2ejes'),
          costoCombustible: estimacionCombustible.costoEstimado,
          litrosEstimados: estimacionCombustible.litrosEstimados,
          rendimientoUsado: estimacionCombustible.rendimientoUsado,
          esRendimientoReal: estimacionCombustible.esRendimientoReal,
        })

        if (estimacionCombustible.esRendimientoReal) {
          toast.success(`Ruta calculada con rendimiento real: ${estimacionCombustible.rendimientoUsado.toFixed(2)} km/L`)
        } else {
          toast.success('Ruta calculada correctamente')
        }
      } else {
        toast.error('No se pudo calcular la ruta')
      }
    } catch (error) {
      console.error('Error calculando ruta:', error)
      toast.error('Error al calcular ruta')
    } finally {
      setCalculandoRuta(false)
    }
  }, [origen, destino, paradas])

  // Optimizar orden de paradas
  const optimizarParadas = useCallback(async () => {
    if (!origen || !destino || paradas.length < 1) {
      toast.error('Necesitas al menos una parada intermedia')
      return
    }

    setOptimizandoRuta(true)
    try {
      const waypoints: Coordenadas[] = [
        origen.coordenadas,
        ...paradas.map((p) => p.coordenadas),
        destino.coordenadas,
      ]

      const result = await optimizeRoute(waypoints, {
        roundtrip: false,
        source: 'first',
        destination: 'last',
      })

      if (result && result.waypoints) {
        // Reordenar paradas según optimización
        const nuevoOrden = result.waypoints
          .filter((wp) => wp.waypoint_index !== 0 && wp.waypoint_index !== waypoints.length - 1)
          .sort((a, b) => a.trips_index - b.trips_index)
          .map((wp) => paradas[wp.waypoint_index - 1])
          .filter(Boolean)

        setParadas(nuevoOrden)

        // Recalcular ruta con nuevo orden
        setTimeout(() => calcularRuta(), 100)
        toast.success('Paradas optimizadas')
      }
    } catch (error) {
      console.error('Error optimizando:', error)
      toast.error('Error al optimizar ruta')
    } finally {
      setOptimizandoRuta(false)
    }
  }, [origen, destino, paradas, calcularRuta])

  // Guardar ruta
  const guardarRuta = async () => {
    if (!origen || !destino || !rutaCalculada) {
      toast.error('Primero calcula una ruta')
      return
    }

    if (!nombreRuta.trim() || !codigoRuta.trim()) {
      toast.error('Ingresa nombre y código de la ruta')
      return
    }

    setGuardandoRuta(true)
    try {
      const nuevaRuta: Omit<RutaGuardada, 'id'> = {
        nombre: nombreRuta,
        codigo: codigoRuta.toUpperCase(),
        origen,
        destino,
        puntosIntermedios: paradas,
        distanciaKm: rutaCalculada.distanciaKm,
        tiempoEstimadoMin: rutaCalculada.tiempoMin,
        costoCasetas: rutaCalculada.costoCasetas,
        costoCombustible: rutaCalculada.costoCombustible,
        nivelRiesgo: 'bajo',
        restricciones: [],
        geometry: rutaCalculada.geometry,
        activa: true,
        vecesUsada: 0,
        fechaCreacion: new Date(),
      }

      const docRef = await addDoc(collection(db, 'rutas'), {
        ...nuevaRuta,
        fechaCreacion: Timestamp.now(),
      })

      setRutas((prev) => [{ ...nuevaRuta, id: docRef.id }, ...prev])
      toast.success('Ruta guardada correctamente')

      // Limpiar formulario (mantener origen por defecto)
      setShowSaveModal(false)
      setNombreRuta('')
      setCodigoRuta('')
      setOrigen(ORIGEN_DEFAULT)
      setDestino(null)
      setParadas([])
      setRutaCalculada(null)
      setActiveTab('rutas')
    } catch (error) {
      console.error('Error guardando ruta:', error)
      toast.error('Error al guardar ruta')
    } finally {
      setGuardandoRuta(false)
    }
  }

  // Eliminar ruta
  const eliminarRuta = async (rutaId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta ruta?')) return

    try {
      await deleteDoc(doc(db, 'rutas', rutaId))
      setRutas((prev) => prev.filter((r) => r.id !== rutaId))
      toast.success('Ruta eliminada')
    } catch (error) {
      console.error('Error eliminando ruta:', error)
      toast.error('Error al eliminar ruta')
    }
  }

  // Agregar parada intermedia
  const agregarParada = () => {
    if (paradas.length >= 10) {
      toast.error('Máximo 10 paradas intermedias')
      return
    }
    setParadas([...paradas, { nombre: '', coordenadas: { lat: 0, lng: 0 } }])
  }

  // Remover parada
  const removerParada = (index: number) => {
    setParadas(paradas.filter((_, i) => i !== index))
  }

  // Filtrar rutas
  const rutasFiltradas = rutas.filter(
    (ruta) =>
      ruta.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ruta.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ruta.origen.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ruta.destino.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Marcadores para el mapa
  const getMapMarkers = () => {
    const markers: Array<{
      id: string
      coordinates: Coordenadas
      type: 'origin' | 'destination' | 'waypoint'
      label?: string
      popup?: string
    }> = []

    if (origen) {
      markers.push({
        id: 'origen',
        coordinates: origen.coordenadas,
        type: 'origin',
        label: 'A',
        popup: `<strong>Origen</strong><br/>${origen.nombre}`,
      })
    }

    paradas.forEach((parada, index) => {
      if (parada.coordenadas.lat !== 0) {
        markers.push({
          id: `parada-${index}`,
          coordinates: parada.coordenadas,
          type: 'waypoint',
          label: String(index + 1),
          popup: `<strong>Parada ${index + 1}</strong><br/>${parada.nombre}`,
        })
      }
    })

    if (destino) {
      markers.push({
        id: 'destino',
        coordinates: destino.coordenadas,
        type: 'destination',
        label: 'B',
        popup: `<strong>Destino</strong><br/>${destino.nombre}`,
      })
    }

    return markers
  }

  // Centro del mapa basado en puntos seleccionados
  const getMapCenter = (): Coordenadas => {
    if (origen && destino) {
      return {
        lat: (origen.coordenadas.lat + destino.coordenadas.lat) / 2,
        lng: (origen.coordenadas.lng + destino.coordenadas.lng) / 2,
      }
    }
    if (origen) return origen.coordenadas
    if (destino) return destino.coordenadas
    // Base RMB en Tecámac por defecto
    return ORIGEN_DEFAULT.coordenadas
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Gestión de Rutas</h1>
          <p className="text-[#3D3D3D]">Planifica y administra las rutas de transporte</p>
        </div>
        <button
          onClick={() => setActiveTab('planificar')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#BB0034] text-white rounded-lg hover:bg-[#9a002b] transition-colors"
        >
          <Plus size={20} />
          Nueva Ruta
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex gap-0 overflow-x-auto">
            {[
              { id: 'rutas', label: 'Rutas Guardadas', icon: Route },
              { id: 'planificar', label: 'Planificar Ruta', icon: Navigation },
              { id: 'puntos', label: 'Puntos de Entrega', icon: MapPin },
              { id: 'mapa', label: 'Mapa General', icon: MapIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  'flex items-center gap-2 py-4 px-6 border-b-2 font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'border-[#BB0034] text-[#BB0034]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenido según tab */}
        <div className="p-4">
          {/* Tab: Rutas Guardadas */}
          {activeTab === 'rutas' && (
            <div className="space-y-4">
              {/* Búsqueda */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, código, origen o destino..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-[#BB0034]" />
                </div>
              ) : rutasFiltradas.length === 0 ? (
                <div className="text-center py-12">
                  <Route size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    {searchTerm ? 'No se encontraron rutas' : 'No hay rutas guardadas'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm
                      ? 'Intenta con otra búsqueda'
                      : 'Comienza planificando tu primera ruta'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => setActiveTab('planificar')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#BB0034] text-white rounded-lg hover:bg-[#9a002b] transition-colors"
                    >
                      <Plus size={18} />
                      Crear Ruta
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4">
                  {rutasFiltradas.map((ruta) => (
                    <div
                      key={ruta.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-[#BB0034] text-white text-xs font-bold rounded">
                              {ruta.codigo}
                            </span>
                            <h3 className="font-bold text-[#1a1a1a] truncate">{ruta.nombre}</h3>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded text-xs',
                                NIVELES_RIESGO[ruta.nivelRiesgo].bgColor,
                                NIVELES_RIESGO[ruta.nivelRiesgo].color
                              )}
                            >
                              {NIVELES_RIESGO[ruta.nivelRiesgo].label}
                            </span>
                          </div>

                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <MapPin size={14} className="text-green-500 mr-1" />
                            <span className="truncate">{ruta.origen.nombre}</span>
                            <ChevronRight size={14} className="mx-1 flex-shrink-0" />
                            <MapPin size={14} className="text-red-500 mr-1" />
                            <span className="truncate">{ruta.destino.nombre}</span>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Route size={14} />
                              {ruta.distanciaKm.toFixed(1)} km
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {Math.floor(ruta.tiempoEstimadoMin / 60)}h {ruta.tiempoEstimadoMin % 60}m
                            </span>
                            <span className="flex items-center gap-1 text-[#BB0034] font-medium">
                              {formatCurrency(ruta.costoCasetas + ruta.costoCombustible)}
                            </span>
                            {ruta.puntosIntermedios.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Navigation size={14} />
                                {ruta.puntosIntermedios.length} parada(s)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setRutaSeleccionada(ruta)
                              setActiveTab('mapa')
                            }}
                            className="p-2 text-gray-500 hover:text-[#BB0034] hover:bg-gray-100 rounded-lg transition-colors"
                            title="Ver en mapa"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => eliminarRuta(ruta.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Planificar Ruta */}
          {activeTab === 'planificar' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Panel izquierdo - Formulario */}
              <div className="space-y-4">
                <h3 className="font-bold text-[#1a1a1a] flex items-center gap-2">
                  <Navigation size={20} className="text-[#BB0034]" />
                  Planificar Nueva Ruta
                </h3>

                {!isMapboxConfigured() && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle size={18} />
                      <span className="font-medium">Mapbox no configurado</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      Agrega VITE_MAPBOX_TOKEN a tu archivo .env para habilitar mapas y geocodificación
                    </p>
                  </div>
                )}

                {/* Origen */}
                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                    Origen *
                  </label>
                  <AddressSearch
                    value={origen?.nombre || ''}
                    placeholder="Buscar dirección de origen..."
                    onSelect={(result) =>
                      setOrigen({
                        nombre: result.placeName,
                        coordenadas: result.coordinates,
                      })
                    }
                  />
                </div>

                {/* Paradas intermedias */}
                {paradas.map((parada, index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Parada {index + 1}
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <AddressSearch
                          value={parada.nombre}
                          placeholder={`Buscar parada ${index + 1}...`}
                          onSelect={(result) => {
                            const nuevasParadas = [...paradas]
                            nuevasParadas[index] = {
                              nombre: result.placeName,
                              coordenadas: result.coordinates,
                            }
                            setParadas(nuevasParadas)
                          }}
                          proximity={origen?.coordenadas}
                        />
                      </div>
                      <button
                        onClick={() => removerParada(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Botón agregar parada */}
                <button
                  onClick={agregarParada}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#BB0034] hover:text-[#BB0034] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Agregar parada intermedia
                </button>

                {/* Destino */}
                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                    Destino *
                  </label>
                  <AddressSearch
                    value={destino?.nombre || ''}
                    placeholder="Buscar dirección de destino..."
                    onSelect={(result) =>
                      setDestino({
                        nombre: result.placeName,
                        coordenadas: result.coordinates,
                      })
                    }
                    proximity={origen?.coordenadas}
                  />
                </div>

                {/* Vehículo (opcional para cálculo de combustible) */}
                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                    Vehículo (opcional)
                  </label>
                  <select
                    value={vehiculoSeleccionado}
                    onChange={(e) => setVehiculoSeleccionado(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  >
                    <option value="">Usar estimado general</option>
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.placa} - {v.modelo} ({v.tipo})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Selecciona un vehículo para usar su rendimiento real de combustible
                  </p>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={calcularRuta}
                    disabled={!origen || !destino || calculandoRuta}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                      'bg-[#1a1a1a] text-white hover:bg-[#3D3D3D]',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {calculandoRuta ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Calculando...
                      </>
                    ) : (
                      <>
                        <Route size={18} />
                        Calcular Ruta
                      </>
                    )}
                  </button>

                  {paradas.length > 0 && (
                    <button
                      onClick={optimizarParadas}
                      disabled={optimizandoRuta || !origen || !destino}
                      className={cn(
                        'py-2 px-4 rounded-lg font-medium transition-colors flex items-center gap-2',
                        'border border-[#BB0034] text-[#BB0034] hover:bg-[#BB0034]/10',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {optimizandoRuta ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <RefreshCw size={18} />
                      )}
                      Optimizar
                    </button>
                  )}
                </div>

                {/* Info de ruta calculada */}
                {rutaCalculada && (
                  <div className="mt-4">
                    <RouteInfo
                      distanceKm={rutaCalculada.distanciaKm}
                      durationMin={rutaCalculada.tiempoMin}
                      costoCasetas={rutaCalculada.costoCasetas}
                      costoCombustible={rutaCalculada.costoCombustible}
                      waypoints={[
                        { name: origen?.nombre || 'Origen', type: 'origen' },
                        ...paradas.map((p, i) => ({
                          name: p.nombre || `Parada ${i + 1}`,
                          type: 'parada',
                        })),
                        { name: destino?.nombre || 'Destino', type: 'destino' },
                      ]}
                      onOptimize={paradas.length > 0 ? optimizarParadas : undefined}
                      isOptimizing={optimizandoRuta}
                    />

                    {/* Info de rendimiento */}
                    <div className={cn(
                      'mt-3 p-3 rounded-lg text-sm',
                      rutaCalculada.esRendimientoReal
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    )}>
                      <div className="flex items-center justify-between">
                        <span className={rutaCalculada.esRendimientoReal ? 'text-green-700' : 'text-gray-600'}>
                          {rutaCalculada.esRendimientoReal ? '✓ Rendimiento real' : 'Rendimiento estimado'}
                        </span>
                        <span className="font-bold">
                          {rutaCalculada.rendimientoUsado.toFixed(2)} km/L
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <span className="text-gray-500">Litros estimados:</span>
                        <span className="font-medium">{rutaCalculada.litrosEstimados.toFixed(1)} L</span>
                      </div>
                    </div>

                    {/* Botón guardar */}
                    <button
                      onClick={() => setShowSaveModal(true)}
                      className="w-full mt-4 py-2 px-4 bg-[#BB0034] text-white rounded-lg hover:bg-[#9a002b] transition-colors font-medium"
                    >
                      Guardar Ruta
                    </button>
                  </div>
                )}
              </div>

              {/* Panel derecho - Mapa */}
              <div className="lg:sticky lg:top-4">
                <MapView
                  center={getMapCenter()}
                  zoom={origen && destino ? 6 : 5}
                  markers={getMapMarkers()}
                  route={rutaCalculada ? { geometry: rutaCalculada.geometry, color: '#BB0034' } : undefined}
                  className="h-[500px]"
                />
              </div>
            </div>
          )}

          {/* Tab: Puntos de Entrega */}
          {activeTab === 'puntos' && (
            <div className="text-center py-12">
              <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                Gestión de Puntos de Entrega
              </h3>
              <p className="text-gray-500 mb-4">
                Próximamente: Administra clientes, proveedores y puntos frecuentes
              </p>
            </div>
          )}

          {/* Tab: Mapa General */}
          {activeTab === 'mapa' && (
            <div>
              {rutaSeleccionada ? (
                <div className="grid lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <MapView
                      center={{
                        lat: (rutaSeleccionada.origen.coordenadas.lat + rutaSeleccionada.destino.coordenadas.lat) / 2,
                        lng: (rutaSeleccionada.origen.coordenadas.lng + rutaSeleccionada.destino.coordenadas.lng) / 2,
                      }}
                      zoom={6}
                      markers={[
                        {
                          id: 'origen',
                          coordinates: rutaSeleccionada.origen.coordenadas,
                          type: 'origin',
                          label: 'A',
                          popup: rutaSeleccionada.origen.nombre,
                        },
                        ...rutaSeleccionada.puntosIntermedios.map((p, i) => ({
                          id: `parada-${i}`,
                          coordinates: p.coordenadas,
                          type: 'waypoint' as const,
                          label: String(i + 1),
                          popup: p.nombre,
                        })),
                        {
                          id: 'destino',
                          coordinates: rutaSeleccionada.destino.coordenadas,
                          type: 'destination',
                          label: 'B',
                          popup: rutaSeleccionada.destino.nombre,
                        },
                      ]}
                      route={rutaSeleccionada.geometry ? { geometry: rutaSeleccionada.geometry, color: '#BB0034' } : undefined}
                      className="h-[600px]"
                    />
                  </div>
                  <div>
                    <div className="bg-white border rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-[#1a1a1a]">{rutaSeleccionada.nombre}</h3>
                        <button
                          onClick={() => setRutaSeleccionada(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <span className="inline-block px-2 py-1 bg-[#BB0034] text-white text-xs font-bold rounded mb-3">
                        {rutaSeleccionada.codigo}
                      </span>
                      <RouteInfo
                        distanceKm={rutaSeleccionada.distanciaKm}
                        durationMin={rutaSeleccionada.tiempoEstimadoMin}
                        costoCasetas={rutaSeleccionada.costoCasetas}
                        costoCombustible={rutaSeleccionada.costoCombustible}
                        nivelRiesgo={rutaSeleccionada.nivelRiesgo}
                        restricciones={rutaSeleccionada.restricciones}
                        waypoints={[
                          { name: rutaSeleccionada.origen.nombre, type: 'origen' },
                          ...rutaSeleccionada.puntosIntermedios.map((p) => ({
                            name: p.nombre,
                            type: 'parada',
                          })),
                          { name: rutaSeleccionada.destino.nombre, type: 'destino' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <MapView
                    zoom={5}
                    markers={rutas.flatMap((ruta) => [
                      {
                        id: `${ruta.id}-origen`,
                        coordinates: ruta.origen.coordenadas,
                        type: 'origin' as const,
                        popup: `<strong>${ruta.codigo}</strong><br/>Origen: ${ruta.origen.nombre}`,
                      },
                      {
                        id: `${ruta.id}-destino`,
                        coordinates: ruta.destino.coordenadas,
                        type: 'destination' as const,
                        popup: `<strong>${ruta.codigo}</strong><br/>Destino: ${ruta.destino.nombre}`,
                      },
                    ])}
                    className="h-[600px]"
                    onMapClick={(coords) => console.log('Click en:', coords)}
                  />
                  <p className="text-center text-gray-500 mt-4">
                    Mostrando {rutas.length} rutas guardadas. Haz clic en una ruta de la lista para ver el detalle.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal para guardar ruta */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowSaveModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-[#1a1a1a] mb-4">Guardar Ruta</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Nombre de la ruta *
                </label>
                <input
                  type="text"
                  value={nombreRuta}
                  onChange={(e) => setNombreRuta(e.target.value)}
                  placeholder="Ej: Monterrey - Guadalajara"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Código de ruta *
                </label>
                <input
                  type="text"
                  value={codigoRuta}
                  onChange={(e) => setCodigoRuta(e.target.value.toUpperCase())}
                  placeholder="Ej: MTY-GDL-001"
                  maxLength={15}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none uppercase"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarRuta}
                disabled={guardandoRuta || !nombreRuta.trim() || !codigoRuta.trim()}
                className="flex-1 py-2 px-4 bg-[#BB0034] text-white rounded-lg hover:bg-[#9a002b] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guardandoRuta ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
