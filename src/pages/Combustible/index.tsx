/**
 * Página de Gestión de Combustible
 * Registro de cargas, rendimiento y KPIs
 */

import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Fuel,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Gauge,
  AlertTriangle,
  X,
  Loader2,
  Calendar,
  Truck,
  User,
  MapPin,
  Receipt,
  BarChart3,
  Filter,
  Download,
  Eye,
  CheckCircle,
} from 'lucide-react'
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore'
import { db } from '../../services/firebase'
import toast from 'react-hot-toast'
import { cn } from '../../utils/cn'
import { formatCurrency } from '../../services/currency.service'
import {
  registrarCarga,
  obtenerHistorialCargas,
  calcularKPIs,
  calcularRendimientoPorPeriodo,
  obtenerAlertasPendientes,
  marcarAlertaRevisada,
} from '../../services/fuel.service'
import type {
  CargaCombustible,
  CargaCombustibleInput,
  KPICombustible,
  AlertaCombustible,
  RendimientoPeriodo,
  TipoCombustible,
} from '../../types/fuel.types'
import {
  TIPOS_COMBUSTIBLE,
  PRECIO_DIESEL_REFERENCIA,
} from '../../types/fuel.types'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

// Tabs disponibles
type TabType = 'cargas' | 'rendimiento' | 'alertas'

// Interfaz para vehículos (simplificada)
interface VehiculoSimple {
  id: string
  placa: string
  modelo: string
  tipo: string
}

export default function Combustible() {
  // Estado principal
  const [activeTab, setActiveTab] = useState<TabType>('cargas')
  const [cargas, setCargas] = useState<CargaCombustible[]>([])
  const [vehiculos, setVehiculos] = useState<VehiculoSimple[]>([])
  const [alertas, setAlertas] = useState<AlertaCombustible[]>([])
  const [kpis, setKpis] = useState<KPICombustible | null>(null)
  const [rendimientoPeriodos, setRendimientoPeriodos] = useState<RendimientoPeriodo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Estado para modal de nueva carga
  const [showModal, setShowModal] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Formulario de nueva carga
  const [formData, setFormData] = useState<{
    vehiculoId: string
    fecha: string
    tipoCombustible: TipoCombustible
    litros: string
    precioPorLitro: string
    odometro: string
    estacion: string
    ubicacion: string
    numeroFactura: string
    tanqueLleno: boolean
    notas: string
  }>({
    vehiculoId: '',
    fecha: new Date().toISOString().split('T')[0],
    tipoCombustible: 'diesel',
    litros: '',
    precioPorLitro: PRECIO_DIESEL_REFERENCIA.toString(),
    odometro: '',
    estacion: '',
    ubicacion: '',
    numeroFactura: '',
    tanqueLleno: true,
    notas: '',
  })

  // Filtros
  const [filtroVehiculo, setFiltroVehiculo] = useState('')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    try {
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

      // Cargar cargas
      const cargasData = await obtenerHistorialCargas()
      setCargas(cargasData)

      // Cargar KPIs
      const kpisData = await calcularKPIs()
      setKpis(kpisData)

      // Cargar alertas
      const alertasData = await obtenerAlertasPendientes()
      setAlertas(alertasData)

      // Cargar rendimiento por período (últimos 6 meses)
      if (vehiculosData.length > 0) {
        // Por ahora, calcular para toda la flota
        // En el futuro, se puede seleccionar un vehículo específico
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  // Guardar nueva carga
  const handleGuardarCarga = async () => {
    // Validaciones
    if (!formData.vehiculoId) {
      toast.error('Selecciona un vehículo')
      return
    }
    if (!formData.litros || parseFloat(formData.litros) <= 0) {
      toast.error('Ingresa los litros cargados')
      return
    }
    if (!formData.odometro || parseFloat(formData.odometro) <= 0) {
      toast.error('Ingresa la lectura del odómetro')
      return
    }

    setGuardando(true)
    try {
      const vehiculo = vehiculos.find((v) => v.id === formData.vehiculoId)
      if (!vehiculo) throw new Error('Vehículo no encontrado')

      const input: CargaCombustibleInput = {
        vehiculoId: formData.vehiculoId,
        vehiculoPlaca: vehiculo.placa,
        vehiculoModelo: vehiculo.modelo,
        fecha: new Date(formData.fecha),
        tipoCombustible: formData.tipoCombustible,
        litros: parseFloat(formData.litros),
        precioPorLitro: parseFloat(formData.precioPorLitro),
        odometro: parseFloat(formData.odometro),
        estacion: formData.estacion,
        ubicacion: formData.ubicacion,
        numeroFactura: formData.numeroFactura,
        tanqueLleno: formData.tanqueLleno,
        notas: formData.notas,
      }

      const { carga, alerta } = await registrarCarga(input, 'admin') // TODO: usar usuario real

      setCargas((prev) => [carga, ...prev])
      toast.success('Carga registrada correctamente')

      if (alerta) {
        setAlertas((prev) => [alerta, ...prev])
        toast.error(`Alerta: ${alerta.mensaje}`, { duration: 5000 })
      }

      // Limpiar formulario
      setShowModal(false)
      setFormData({
        vehiculoId: '',
        fecha: new Date().toISOString().split('T')[0],
        tipoCombustible: 'diesel',
        litros: '',
        precioPorLitro: PRECIO_DIESEL_REFERENCIA.toString(),
        odometro: '',
        estacion: '',
        ubicacion: '',
        numeroFactura: '',
        tanqueLleno: true,
        notas: '',
      })

      // Recargar KPIs
      const kpisData = await calcularKPIs()
      setKpis(kpisData)
    } catch (error) {
      console.error('Error guardando carga:', error)
      toast.error('Error al registrar carga')
    } finally {
      setGuardando(false)
    }
  }

  // Marcar alerta como revisada
  const handleRevisarAlerta = async (alertaId: string) => {
    try {
      await marcarAlertaRevisada(alertaId)
      setAlertas((prev) => prev.filter((a) => a.id !== alertaId))
      toast.success('Alerta marcada como revisada')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar alerta')
    }
  }

  // Filtrar cargas
  const cargasFiltradas = cargas.filter((carga) => {
    if (filtroVehiculo && carga.vehiculoId !== filtroVehiculo) return false
    if (filtroFechaDesde && carga.fecha < new Date(filtroFechaDesde)) return false
    if (filtroFechaHasta && carga.fecha > new Date(filtroFechaHasta)) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        carga.vehiculoPlaca.toLowerCase().includes(term) ||
        carga.estacion?.toLowerCase().includes(term) ||
        carga.ubicacion?.toLowerCase().includes(term)
      )
    }
    return true
  })

  // Calcular costo total de carga
  const calcularCostoTotal = () => {
    const litros = parseFloat(formData.litros) || 0
    const precio = parseFloat(formData.precioPorLitro) || 0
    return (litros * precio).toFixed(2)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Combustible</h1>
          <p className="text-[#3D3D3D]">Control de cargas y rendimiento de la flota</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#BB0034] text-white rounded-lg hover:bg-[#9a002b] transition-colors"
        >
          <Plus size={20} />
          Registrar Carga
        </button>
      </div>

      {/* KPIs Cards */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Gauge size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Rendimiento Flota</p>
                <p className="text-2xl font-bold text-[#1a1a1a]">
                  {kpis.rendimientoPromedioFlota.toFixed(1)} <span className="text-sm font-normal">km/L</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Fuel size={24} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Litros este mes</p>
                <p className="text-2xl font-bold text-[#1a1a1a]">
                  {kpis.litrosTotalMes.toLocaleString()} <span className="text-sm font-normal">L</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Gasto este mes</p>
                <p className="text-2xl font-bold text-[#1a1a1a]">
                  {formatCurrency(kpis.gastoTotalMes)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 size={24} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Precio promedio</p>
                <p className="text-2xl font-bold text-[#1a1a1a]">
                  ${kpis.costoPromedioLitro.toFixed(2)} <span className="text-sm font-normal">/L</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alertas pendientes */}
      {alertas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={20} className="text-red-600" />
            <h3 className="font-bold text-red-800">Alertas pendientes ({alertas.length})</h3>
          </div>
          <div className="space-y-2">
            {alertas.slice(0, 3).map((alerta) => (
              <div
                key={alerta.id}
                className="flex items-center justify-between bg-white rounded-lg p-3"
              >
                <div>
                  <p className="font-medium text-red-800">{alerta.vehiculoPlaca}</p>
                  <p className="text-sm text-red-600">{alerta.mensaje}</p>
                </div>
                <button
                  onClick={() => handleRevisarAlerta(alerta.id)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                  title="Marcar como revisada"
                >
                  <CheckCircle size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex gap-0 overflow-x-auto">
            {[
              { id: 'cargas', label: 'Historial de Cargas', icon: Fuel },
              { id: 'rendimiento', label: 'Rendimiento', icon: Gauge },
              { id: 'alertas', label: 'Alertas', icon: AlertTriangle, count: alertas.length },
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
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4">
          {/* Tab: Historial de Cargas */}
          {activeTab === 'cargas' && (
            <div className="space-y-4">
              {/* Filtros */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por placa, estación..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    />
                  </div>
                </div>
                <select
                  value={filtroVehiculo}
                  onChange={(e) => setFiltroVehiculo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                >
                  <option value="">Todos los vehículos</option>
                  {vehiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa} - {v.modelo}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={filtroFechaDesde}
                  onChange={(e) => setFiltroFechaDesde(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                />
                <input
                  type="date"
                  value={filtroFechaHasta}
                  onChange={(e) => setFiltroFechaHasta(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                />
              </div>

              {/* Lista de cargas */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-[#BB0034]" />
                </div>
              ) : cargasFiltradas.length === 0 ? (
                <div className="text-center py-12">
                  <Fuel size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    No hay cargas registradas
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Comienza registrando la primera carga de combustible
                  </p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#BB0034] text-white rounded-lg hover:bg-[#9a002b] transition-colors"
                  >
                    <Plus size={18} />
                    Registrar Carga
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-3 text-sm font-medium text-gray-600">Fecha</th>
                        <th className="px-4 py-3 text-sm font-medium text-gray-600">Vehículo</th>
                        <th className="px-4 py-3 text-sm font-medium text-gray-600">Litros</th>
                        <th className="px-4 py-3 text-sm font-medium text-gray-600">Costo</th>
                        <th className="px-4 py-3 text-sm font-medium text-gray-600">Odómetro</th>
                        <th className="px-4 py-3 text-sm font-medium text-gray-600">Rendimiento</th>
                        <th className="px-4 py-3 text-sm font-medium text-gray-600">Estación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cargasFiltradas.map((carga) => (
                        <tr key={carga.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            {carga.fecha.toLocaleDateString('es-MX')}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-[#1a1a1a]">{carga.vehiculoPlaca}</p>
                              <p className="text-xs text-gray-500">{carga.vehiculoModelo}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium">{carga.litros.toFixed(1)} L</span>
                            <span
                              className={cn(
                                'ml-2 px-1.5 py-0.5 rounded text-xs',
                                TIPOS_COMBUSTIBLE[carga.tipoCombustible].color,
                                'text-white'
                              )}
                            >
                              {TIPOS_COMBUSTIBLE[carga.tipoCombustible].label}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-[#BB0034]">
                            {formatCurrency(carga.costoTotal)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {carga.odometro.toLocaleString()} km
                            {carga.kmRecorridos && (
                              <span className="text-xs text-gray-500 block">
                                (+{carga.kmRecorridos.toLocaleString()} km)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {carga.rendimientoKmL ? (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{carga.rendimientoKmL.toFixed(2)}</span>
                                <span className="text-xs text-gray-500">km/L</span>
                                {carga.rendimientoKmL >= 4 ? (
                                  <TrendingUp size={14} className="text-green-500" />
                                ) : carga.rendimientoKmL < 3 ? (
                                  <TrendingDown size={14} className="text-red-500" />
                                ) : (
                                  <Minus size={14} className="text-gray-400" />
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {carga.estacion || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Rendimiento */}
          {activeTab === 'rendimiento' && kpis && (
            <div className="space-y-6">
              {/* Top Performers */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Mejores vehículos */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                    <TrendingUp size={18} />
                    Mejor Rendimiento
                  </h3>
                  <div className="space-y-2">
                    {kpis.mejoresVehiculos.length > 0 ? (
                      kpis.mejoresVehiculos.map((v, i) => (
                        <div
                          key={v.placa}
                          className="flex items-center justify-between bg-white rounded-lg p-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 flex items-center justify-center bg-green-500 text-white rounded-full text-xs font-bold">
                              {i + 1}
                            </span>
                            <span className="font-medium">{v.placa}</span>
                          </div>
                          <span className="font-bold text-green-700">{v.rendimiento.toFixed(2)} km/L</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">Sin datos suficientes</p>
                    )}
                  </div>
                </div>

                {/* Peores vehículos */}
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                    <TrendingDown size={18} />
                    Requieren Atención
                  </h3>
                  <div className="space-y-2">
                    {kpis.peoresVehiculos.length > 0 ? (
                      kpis.peoresVehiculos.map((v, i) => (
                        <div
                          key={v.placa}
                          className="flex items-center justify-between bg-white rounded-lg p-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full text-xs font-bold">
                              {i + 1}
                            </span>
                            <span className="font-medium">{v.placa}</span>
                          </div>
                          <span className="font-bold text-red-700">{v.rendimiento.toFixed(2)} km/L</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">Sin datos suficientes</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Rendimiento por conductor */}
              {kpis.rendimientoPorConductor.length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                    <User size={18} />
                    Rendimiento por Conductor
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                            Conductor
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">
                            Rendimiento
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">
                            Km Recorridos
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {kpis.rendimientoPorConductor.map((c) => (
                          <tr key={c.conductorId}>
                            <td className="px-4 py-2 font-medium">{c.nombre}</td>
                            <td className="px-4 py-2 text-right">
                              <span
                                className={cn(
                                  'font-bold',
                                  c.rendimiento >= 4
                                    ? 'text-green-600'
                                    : c.rendimiento < 3
                                    ? 'text-red-600'
                                    : 'text-gray-800'
                                )}
                              >
                                {c.rendimiento.toFixed(2)} km/L
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right text-gray-600">
                              {c.kmRecorridos.toLocaleString()} km
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Alertas */}
          {activeTab === 'alertas' && (
            <div className="space-y-4">
              {alertas.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle size={48} className="mx-auto text-green-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    Sin alertas pendientes
                  </h3>
                  <p className="text-gray-500">
                    Todos los vehículos están dentro de los parámetros normales
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alertas.map((alerta) => (
                    <div
                      key={alerta.id}
                      className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-red-800">{alerta.vehiculoPlaca}</p>
                          <p className="text-red-700">{alerta.mensaje}</p>
                          <p className="text-sm text-red-600 mt-1">
                            Desviación: {alerta.desviacion.toFixed(1)}% del promedio
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {alerta.fecha.toLocaleDateString('es-MX')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevisarAlerta(alerta.id)}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle size={16} />
                        Revisada
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de nueva carga */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1a1a1a]">Registrar Carga de Combustible</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Vehículo */}
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Vehículo *
                </label>
                <select
                  value={formData.vehiculoId}
                  onChange={(e) => setFormData({ ...formData, vehiculoId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                >
                  <option value="">Seleccionar vehículo</option>
                  {vehiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa} - {v.modelo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha y tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                    Tipo
                  </label>
                  <select
                    value={formData.tipoCombustible}
                    onChange={(e) =>
                      setFormData({ ...formData, tipoCombustible: e.target.value as TipoCombustible })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  >
                    {Object.entries(TIPOS_COMBUSTIBLE).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Litros y precio */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                    Litros *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.litros}
                    onChange={(e) => setFormData({ ...formData, litros: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                    Precio/Litro *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.precioPorLitro}
                    onChange={(e) => setFormData({ ...formData, precioPorLitro: e.target.value })}
                    placeholder="24.50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  />
                </div>
              </div>

              {/* Total calculado */}
              <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="text-xl font-bold text-[#BB0034]">
                  ${calcularCostoTotal()}
                </span>
              </div>

              {/* Odómetro */}
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Lectura Odómetro (km) *
                </label>
                <input
                  type="number"
                  value={formData.odometro}
                  onChange={(e) => setFormData({ ...formData, odometro: e.target.value })}
                  placeholder="150000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa la lectura actual del odómetro
                </p>
              </div>

              {/* Tanque lleno */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tanqueLleno"
                  checked={formData.tanqueLleno}
                  onChange={(e) => setFormData({ ...formData, tanqueLleno: e.target.checked })}
                  className="w-4 h-4 text-[#BB0034] rounded focus:ring-[#BB0034]"
                />
                <label htmlFor="tanqueLleno" className="text-sm text-gray-700">
                  Se llenó el tanque completo
                </label>
              </div>

              {/* Estación y ubicación */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                    Estación
                  </label>
                  <input
                    type="text"
                    value={formData.estacion}
                    onChange={(e) => setFormData({ ...formData, estacion: e.target.value })}
                    placeholder="PEMEX, Mobil..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={formData.ubicacion}
                    onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                    placeholder="Ciudad, Estado"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  />
                </div>
              </div>

              {/* Factura */}
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  No. Factura / Ticket
                </label>
                <input
                  type="text"
                  value={formData.numeroFactura}
                  onChange={(e) => setFormData({ ...formData, numeroFactura: e.target.value })}
                  placeholder="Opcional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Notas
                </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Observaciones adicionales..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none resize-none"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarCarga}
                disabled={guardando}
                className="flex-1 py-2 px-4 bg-[#BB0034] text-white rounded-lg hover:bg-[#9a002b] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Registrar Carga
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
