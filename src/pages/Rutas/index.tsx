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
  Eye,
  Trash2,
  Navigation,
  ChevronRight,
  RefreshCw,
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
  optimizeRouteWithTimeWindows,
  metersToKm,
  formatDuration,
  estimateTollCost,
  isMapboxConfigured,
  type ParadaConVentana,
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
  numeroInterno: string
  placa: string
  modelo: string
  tipo: string
  categoria: 'vehiculo' | 'accesorio'
  asignadoA?: string // Para accesorios: ID del tractocamión
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

  // Interfaz extendida para parada con ventana de tiempo
  interface ParadaConTiempo {
    nombre: string
    coordenadas: Coordenadas
    ventanaInicio?: string
    ventanaFin?: string
    duracionServicio?: number
  }

  // Estado para planificación de nueva ruta
  const [origen, setOrigen] = useState<{ nombre: string; coordenadas: Coordenadas } | null>(ORIGEN_DEFAULT)
  const [destino, setDestino] = useState<{ nombre: string; coordenadas: Coordenadas } | null>(null)
  const [destinoVentanaInicio, setDestinoVentanaInicio] = useState<string>('')
  const [destinoVentanaFin, setDestinoVentanaFin] = useState<string>('')
  const [paradas, setParadas] = useState<ParadaConTiempo[]>([])
  const [horaSalida, setHoraSalida] = useState('08:00')
  const [llegadasEstimadas, setLlegadasEstimadas] = useState<string[]>([])
  const [cumpleVentanas, setCumpleVentanas] = useState<boolean[]>([])
  const [horaLlegadaDestino, setHoraLlegadaDestino] = useState<string>('')
  const [cumpleVentanaDestino, setCumpleVentanaDestino] = useState<boolean>(true)
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
  const [accesorioSeleccionado, setAccesorioSeleccionado] = useState('')

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
        numeroInterno: doc.data().numeroInterno || '',
        placa: doc.data().placa || '',
        modelo: doc.data().modelo || '',
        tipo: doc.data().tipo || 'torton',
        categoria: doc.data().categoria || 'vehiculo',
        asignadoA: doc.data().asignadoA || undefined,
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

        // Calcular hora de llegada al destino
        const [horaH, horaM] = horaSalida.split(':').map(Number)
        const salidaMinutos = horaH * 60 + horaM

        // Sumar tiempo de viaje + tiempos de servicio en paradas
        let tiempoTotalMinutos = tiempoMin
        paradas.forEach(p => {
          tiempoTotalMinutos += p.duracionServicio || 30 // 30 min por defecto
        })

        const llegadaMinutos = salidaMinutos + tiempoTotalMinutos
        const llegadaHora = Math.floor(llegadaMinutos / 60) % 24
        const llegadaMin = llegadaMinutos % 60
        const horaLlegada = `${llegadaHora.toString().padStart(2, '0')}:${llegadaMin.toString().padStart(2, '0')}`
        setHoraLlegadaDestino(horaLlegada)

        // Verificar si cumple ventana de tiempo del destino
        if (destinoVentanaInicio || destinoVentanaFin) {
          const llegadaMinutosDestino = llegadaHora * 60 + llegadaMin
          const inicioMinutos = destinoVentanaInicio
            ? parseInt(destinoVentanaInicio.split(':')[0]) * 60 + parseInt(destinoVentanaInicio.split(':')[1])
            : 0
          const finMinutos = destinoVentanaFin
            ? parseInt(destinoVentanaFin.split(':')[0]) * 60 + parseInt(destinoVentanaFin.split(':')[1])
            : 1440
          setCumpleVentanaDestino(llegadaMinutosDestino >= inicioMinutos && llegadaMinutosDestino <= finMinutos)
        } else {
          setCumpleVentanaDestino(true)
        }

        // Calcular llegadas estimadas a cada parada
        if (result.legs && result.legs.length > 0) {
          let tiempoAcumulado = salidaMinutos
          const llegadas: string[] = []

          for (let i = 0; i < result.legs.length - 1; i++) {
            tiempoAcumulado += Math.round(result.legs[i].duration / 60)
            const h = Math.floor(tiempoAcumulado / 60) % 24
            const m = tiempoAcumulado % 60
            llegadas.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)

            // Agregar tiempo de servicio de la parada
            if (paradas[i]) {
              tiempoAcumulado += paradas[i].duracionServicio || 30
            }
          }
          setLlegadasEstimadas(llegadas)

          // Verificar cumplimiento de ventanas
          const cumple = paradas.map((p, i) => {
            if (!p.ventanaInicio && !p.ventanaFin) return true
            const llegadaStr = llegadas[i]
            if (!llegadaStr) return true

            const llegadaMinutosParada = parseInt(llegadaStr.split(':')[0]) * 60 + parseInt(llegadaStr.split(':')[1])
            const inicioMinutos = p.ventanaInicio ? parseInt(p.ventanaInicio.split(':')[0]) * 60 + parseInt(p.ventanaInicio.split(':')[1]) : 0
            const finMinutos = p.ventanaFin ? parseInt(p.ventanaFin.split(':')[0]) * 60 + parseInt(p.ventanaFin.split(':')[1]) : 1440

            return llegadaMinutosParada >= inicioMinutos && llegadaMinutosParada <= finMinutos
          })
          setCumpleVentanas(cumple)
        }

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
  }, [origen, destino, paradas, horaSalida, vehiculoSeleccionado, vehiculos, destinoVentanaInicio, destinoVentanaFin])

  // Optimizar orden de paradas con ventanas de tiempo
  const optimizarParadas = useCallback(async () => {
    if (!origen || !destino || paradas.length < 1) {
      toast.error('Necesitas al menos una parada intermedia')
      return
    }

    setOptimizandoRuta(true)
    try {
      // Verificar si hay ventanas de tiempo definidas
      const tieneVentanas = paradas.some(p => p.ventanaInicio || p.ventanaFin)

      if (tieneVentanas) {
        // Usar algoritmo con ventanas de tiempo
        const paradasConVentana: ParadaConVentana[] = paradas.map(p => ({
          coordenadas: p.coordenadas,
          nombre: p.nombre,
          ventanaInicio: p.ventanaInicio,
          ventanaFin: p.ventanaFin,
          duracionServicio: p.duracionServicio || 30, // 30 min por defecto
        }))

        const resultado = await optimizeRouteWithTimeWindows(
          origen.coordenadas,
          destino.coordenadas,
          paradasConVentana,
          horaSalida
        )

        if (resultado) {
          // Reordenar paradas según el orden óptimo
          const paradasReordenadas = resultado.ordenOptimo.map(idx => paradas[idx])
          setParadas(paradasReordenadas)
          setLlegadasEstimadas(resultado.llegadasEstimadas)
          setCumpleVentanas(resultado.cumpleVentanas)

          // Actualizar ruta calculada con nueva geometría
          if (resultado.geometry) {
            const vehiculo = vehiculos.find((v) => v.id === vehiculoSeleccionado)
            const estimacionCombustible = await estimarCostoCombustibleRuta(
              resultado.distanciaTotal,
              vehiculoSeleccionado || undefined,
              vehiculo?.tipo
            )

            setRutaCalculada({
              geometry: resultado.geometry,
              distanciaKm: resultado.distanciaTotal,
              tiempoMin: resultado.tiempoTotal,
              costoCasetas: estimateTollCost(resultado.distanciaTotal, 'camion_2ejes'),
              costoCombustible: estimacionCombustible.costoEstimado,
              litrosEstimados: estimacionCombustible.litrosEstimados,
              rendimientoUsado: estimacionCombustible.rendimientoUsado,
              esRendimientoReal: estimacionCombustible.esRendimientoReal,
            })
          }

          const ventanasIncumplidas = resultado.cumpleVentanas.filter(c => !c).length
          if (ventanasIncumplidas > 0) {
            toast.error(`Ruta optimizada pero ${ventanasIncumplidas} ventana(s) no se pueden cumplir`)
          } else {
            toast.success('Ruta optimizada respetando ventanas de tiempo')
          }
        }
      } else {
        // Usar algoritmo simple de Mapbox sin ventanas
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
          const ordenMap = new Map<number, number>()
          result.waypoints.forEach((wp, idx) => {
            ordenMap.set(wp.waypoint_index, idx)
          })

          // Filtrar solo las paradas intermedias (excluyendo origen y destino)
          const paradasConOrden = paradas.map((parada, idx) => ({
            parada,
            nuevoOrden: ordenMap.get(idx + 1) || idx + 1
          }))

          paradasConOrden.sort((a, b) => a.nuevoOrden - b.nuevoOrden)
          const nuevoOrden = paradasConOrden.map(p => p.parada)

          setParadas(nuevoOrden)
          setLlegadasEstimadas([])
          setCumpleVentanas([])

          // Recalcular ruta con nuevo orden
          setTimeout(() => calcularRuta(), 100)
          toast.success('Paradas optimizadas por distancia')
        }
      }
    } catch (error) {
      console.error('Error optimizando:', error)
      toast.error('Error al optimizar ruta')
    } finally {
      setOptimizandoRuta(false)
    }
  }, [origen, destino, paradas, horaSalida, vehiculoSeleccionado, vehiculos, calcularRuta])

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
      setDestinoVentanaInicio('')
      setDestinoVentanaFin('')
      setParadas([])
      setRutaCalculada(null)
      setHoraLlegadaDestino('')
      setCumpleVentanaDestino(true)
      setLlegadasEstimadas([])
      setCumpleVentanas([])
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
    setParadas([...paradas, {
      nombre: '',
      coordenadas: { lat: 0, lng: 0 },
      ventanaInicio: undefined,
      ventanaFin: undefined,
      duracionServicio: 30, // 30 minutos por defecto
    }])
    // Limpiar estimaciones previas
    setLlegadasEstimadas([])
    setCumpleVentanas([])
  }

  // Remover parada
  const removerParada = (index: number) => {
    setParadas(paradas.filter((_, i) => i !== index))
    // Actualizar estimaciones
    setLlegadasEstimadas(prev => prev.filter((_, i) => i !== index))
    setCumpleVentanas(prev => prev.filter((_, i) => i !== index))
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

                {/* Hora de salida */}
                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                    Hora de Salida
                  </label>
                  <input
                    type="time"
                    value={horaSalida}
                    onChange={(e) => setHoraSalida(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  />
                </div>

                {/* Paradas intermedias con ventanas de tiempo */}
                {paradas.map((parada, index) => (
                  <div key={`parada-${index}-${parada.nombre}`} className="border border-gray-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-[#3D3D3D]">
                        Parada {index + 1}
                        {llegadasEstimadas.length === paradas.length && llegadasEstimadas[index] && (
                          <span className={cn(
                            'ml-2 text-xs px-2 py-0.5 rounded',
                            cumpleVentanas[index]
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          )}>
                            ETA: {llegadasEstimadas[index]}
                            {!cumpleVentanas[index] && ' ⚠️'}
                          </span>
                        )}
                      </label>
                      <button
                        onClick={() => removerParada(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Dirección */}
                    <AddressSearch
                      value={parada.nombre}
                      placeholder={`Buscar parada ${index + 1}...`}
                      onSelect={(result) => {
                        const nuevasParadas = [...paradas]
                        nuevasParadas[index] = {
                          ...nuevasParadas[index],
                          nombre: result.placeName,
                          coordenadas: result.coordinates,
                        }
                        setParadas(nuevasParadas)
                        // Limpiar estimaciones al modificar dirección
                        setLlegadasEstimadas([])
                        setCumpleVentanas([])
                      }}
                      proximity={origen?.coordenadas}
                    />

                    {/* Ventana de tiempo */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          <Clock size={12} className="inline mr-1" />
                          Desde
                        </label>
                        <input
                          type="time"
                          value={parada.ventanaInicio || ''}
                          onChange={(e) => {
                            const nuevasParadas = [...paradas]
                            nuevasParadas[index] = {
                              ...nuevasParadas[index],
                              ventanaInicio: e.target.value || undefined,
                            }
                            setParadas(nuevasParadas)
                            // Limpiar estimaciones al modificar ventana
                            setLlegadasEstimadas([])
                            setCumpleVentanas([])
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#BB0034] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Hasta
                        </label>
                        <input
                          type="time"
                          value={parada.ventanaFin || ''}
                          onChange={(e) => {
                            const nuevasParadas = [...paradas]
                            nuevasParadas[index] = {
                              ...nuevasParadas[index],
                              ventanaFin: e.target.value || undefined,
                            }
                            setParadas(nuevasParadas)
                            // Limpiar estimaciones al modificar ventana
                            setLlegadasEstimadas([])
                            setCumpleVentanas([])
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#BB0034] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Servicio (min)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={parada.duracionServicio ?? ''}
                          onChange={(e) => {
                            const inputValue = e.target.value
                            // Permitir campo vacío o solo números
                            if (inputValue === '' || /^\d+$/.test(inputValue)) {
                              const valor = inputValue === '' ? undefined : Math.min(480, parseInt(inputValue))
                              const nuevasParadas = [...paradas]
                              nuevasParadas[index] = {
                                ...nuevasParadas[index],
                                duracionServicio: valor,
                              }
                              setParadas(nuevasParadas)
                              // Limpiar estimaciones al modificar duración
                              setLlegadasEstimadas([])
                              setCumpleVentanas([])
                            }
                          }}
                          placeholder="30"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#BB0034] outline-none"
                        />
                      </div>
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
                <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                  <label className="block text-sm font-medium text-[#3D3D3D]">
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

                  {/* Ventana de tiempo del destino */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        <Clock size={12} className="inline mr-1" />
                        Recepción desde
                      </label>
                      <input
                        type="time"
                        value={destinoVentanaInicio}
                        onChange={(e) => {
                          setDestinoVentanaInicio(e.target.value)
                          setCumpleVentanaDestino(true) // Reset al cambiar
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#BB0034] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Recepción hasta
                      </label>
                      <input
                        type="time"
                        value={destinoVentanaFin}
                        onChange={(e) => {
                          setDestinoVentanaFin(e.target.value)
                          setCumpleVentanaDestino(true) // Reset al cambiar
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#BB0034] outline-none"
                      />
                    </div>
                  </div>

                  {/* Hora de llegada estimada al destino */}
                  {horaLlegadaDestino && rutaCalculada && (
                    <div className={cn(
                      'mt-2 p-3 border rounded-lg',
                      cumpleVentanaDestino
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    )}>
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          'text-sm font-medium',
                          cumpleVentanaDestino ? 'text-green-700' : 'text-red-700'
                        )}>
                          Llegada estimada al destino
                          {!cumpleVentanaDestino && ' ⚠️'}
                        </span>
                        <span className={cn(
                          'text-lg font-bold',
                          cumpleVentanaDestino ? 'text-green-800' : 'text-red-800'
                        )}>
                          {horaLlegadaDestino}
                        </span>
                      </div>
                      <p className={cn(
                        'text-xs mt-1',
                        cumpleVentanaDestino ? 'text-green-600' : 'text-red-600'
                      )}>
                        {cumpleVentanaDestino
                          ? `Basado en salida a las ${horaSalida} + ${rutaCalculada.tiempoMin} min de viaje${paradas.length > 0 ? ` + ${paradas.reduce((sum, p) => sum + (p.duracionServicio || 30), 0)} min en paradas` : ''}`
                          : `No cumple con la ventana de recepción (${destinoVentanaInicio || '00:00'} - ${destinoVentanaFin || '23:59'})`
                        }
                      </p>
                    </div>
                  )}
                </div>

                {/* Vehículo (opcional para cálculo de combustible) */}
                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                    Vehículo (opcional)
                  </label>
                  <select
                    value={vehiculoSeleccionado}
                    onChange={(e) => {
                      setVehiculoSeleccionado(e.target.value)
                      // Limpiar accesorio si cambia el vehículo
                      setAccesorioSeleccionado('')
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  >
                    <option value="">Usar estimado general</option>
                    {vehiculos
                      .filter((v) => v.categoria === 'vehiculo' || !v.categoria)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.numeroInterno} - {v.modelo} ({v.tipo})
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Selecciona un vehículo para usar su rendimiento real de combustible
                  </p>
                </div>

                {/* Selector de Accesorio (solo si el vehículo es tractocamión) */}
                {vehiculoSeleccionado && vehiculos.find(v => v.id === vehiculoSeleccionado)?.tipo === 'tractocamion' && (
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Accesorio / Remolque
                    </label>
                    <select
                      value={accesorioSeleccionado}
                      onChange={(e) => setAccesorioSeleccionado(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    >
                      <option value="">Sin accesorio</option>
                      {vehiculos
                        .filter((v) => v.categoria === 'accesorio')
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.numeroInterno} - {acc.tipo}
                            {acc.asignadoA && acc.asignadoA !== vehiculoSeleccionado
                              ? ' (asignado a otro tracto)'
                              : ''}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Selecciona el remolque o accesorio para este viaje
                    </p>
                  </div>
                )}

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
