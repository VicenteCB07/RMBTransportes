/**
 * Página de Finanzas - Centro de Costos
 * Gestión completa de gastos con exportación PDF/Excel
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import toast, { Toaster } from 'react-hot-toast'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { cn } from '../../utils/cn'
import { formatCurrency, toMXN } from '../../services/currency.service'
import { exportCostosToExcel, calcularResumenCostos } from '../../services/export.service'
import CostFormModal from '../../components/admin/CostFormModal'
import CostReportPDF from '../../components/admin/CostReportPDF'
import type { Costo, CategoriaGasto, EstadoGasto, ResumenCostos } from '../../types/cost.types'
import { CATEGORIAS_GASTO, ESTADOS_GASTO } from '../../types/cost.types'
import { useAuth } from '../../context/AuthContext'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

// Colores para gráficos
const CHART_COLORS = [
  '#BB0034', '#1a1a1a', '#3D3D3D', '#6366f1', '#22c55e',
  '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899',
]

export default function Finanzas() {
  const { userData } = useAuth()
  const [costos, setCostos] = useState<Costo[]>([])
  const [vehiculos, setVehiculos] = useState<Array<{ id: string; numeroInterno: string; placa: string }>>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCosto, setEditingCosto] = useState<Costo | null>(null)
  const [activeTab, setActiveTab] = useState<'gastos' | 'reportes'>('gastos')

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategoria, setFilterCategoria] = useState<CategoriaGasto | 'todas'>('todas')
  const [filterEstado, setFilterEstado] = useState<EstadoGasto | 'todos'>('todos')
  const [filterVehiculo, setFilterVehiculo] = useState<string>('todos')
  const [dateRange, setDateRange] = useState({
    inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fin: new Date().toISOString().split('T')[0],
  })

  // Cargar costos
  const fetchCostos = async () => {
    try {
      const q = query(collection(db, 'costos'), orderBy('fecha', 'desc'))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data().fecha?.toDate?.() || new Date(doc.data().fecha),
        fechaRegistro: doc.data().fechaRegistro?.toDate?.() || new Date(),
      })) as Costo[]
      setCostos(data)
    } catch (error) {
      console.error('Error fetching costos:', error)
      toast.error('Error al cargar los costos')
    } finally {
      setLoading(false)
    }
  }

  // Cargar vehículos para el selector
  const fetchVehiculos = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'vehiculos'))
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        numeroInterno: doc.data().numeroInterno,
        placa: doc.data().placa,
      }))
      setVehiculos(data)
    } catch (error) {
      console.error('Error fetching vehiculos:', error)
    }
  }

  useEffect(() => {
    fetchCostos()
    fetchVehiculos()
  }, [])

  // Filtrar costos
  const filteredCostos = useMemo(() => {
    return costos.filter((costo) => {
      const matchesSearch =
        costo.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        costo.proveedorNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        costo.numeroFactura?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategoria = filterCategoria === 'todas' || costo.categoria === filterCategoria
      const matchesEstado = filterEstado === 'todos' || costo.estado === filterEstado
      const matchesVehiculo = filterVehiculo === 'todos' || costo.vehiculoId === filterVehiculo

      const costoDate = new Date(costo.fecha)
      const inicio = new Date(dateRange.inicio)
      const fin = new Date(dateRange.fin)
      fin.setHours(23, 59, 59) // Incluir todo el día final
      const matchesDate = costoDate >= inicio && costoDate <= fin

      return matchesSearch && matchesCategoria && matchesEstado && matchesVehiculo && matchesDate
    })
  }, [costos, searchTerm, filterCategoria, filterEstado, filterVehiculo, dateRange])

  // Calcular resumen
  const resumen = useMemo(() => calcularResumenCostos(filteredCostos), [filteredCostos])

  // Totales
  const totales = useMemo(() => {
    const totalMXN = filteredCostos.reduce((acc, c) => acc + c.montoMXN, 0)
    const pagados = filteredCostos.filter((c) => c.estado === 'pagado').reduce((acc, c) => acc + c.montoMXN, 0)
    const pendientes = filteredCostos.filter((c) => c.estado === 'pendiente').reduce((acc, c) => acc + c.montoMXN, 0)
    return { totalMXN, pagados, pendientes }
  }, [filteredCostos])

  // Guardar costo
  const handleSaveCosto = async (data: any) => {
    try {
      if (editingCosto) {
        await updateDoc(doc(db, 'costos', editingCosto.id), {
          ...data,
          fecha: new Date(data.fecha),
          fechaActualizacion: serverTimestamp(),
        })
        toast.success('Gasto actualizado')
      } else {
        await addDoc(collection(db, 'costos'), {
          ...data,
          fecha: new Date(data.fecha),
          comprobantes: [],
          registradoPor: userData?.id || 'unknown',
          fechaRegistro: serverTimestamp(),
        })
        toast.success('Gasto registrado')
      }
      fetchCostos()
      setShowModal(false)
      setEditingCosto(null)
    } catch (error) {
      console.error('Error saving costo:', error)
      toast.error('Error al guardar el gasto')
      throw error
    }
  }

  // Eliminar costo
  const handleDeleteCosto = async (costoId: string) => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return

    try {
      await deleteDoc(doc(db, 'costos', costoId))
      toast.success('Gasto eliminado')
      fetchCostos()
    } catch (error) {
      console.error('Error deleting costo:', error)
      toast.error('Error al eliminar el gasto')
    }
  }

  // Exportar a Excel
  const handleExportExcel = () => {
    try {
      exportCostosToExcel(filteredCostos, resumen, 'reporte_costos_rmb')
      toast.success('Archivo Excel generado')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      toast.error('Error al exportar a Excel')
    }
  }

  // Exportar a PDF
  const handleExportPDF = async () => {
    try {
      toast.loading('Generando PDF...')
      const blob = await pdf(
        <CostReportPDF
          costos={filteredCostos}
          resumen={resumen}
          fechaInicio={new Date(dateRange.inicio)}
          fechaFin={new Date(dateRange.fin)}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `reporte_costos_${new Date().toISOString().split('T')[0]}.pdf`
      link.click()
      URL.revokeObjectURL(url)

      toast.dismiss()
      toast.success('PDF generado exitosamente')
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      toast.dismiss()
      toast.error('Error al generar PDF')
    }
  }

  // Editar costo
  const handleEditCosto = (costo: Costo) => {
    setEditingCosto(costo)
    setShowModal(true)
  }

  // Abrir modal nuevo
  const handleNewCosto = () => {
    setEditingCosto(null)
    setShowModal(true)
  }

  // Datos para gráficos
  const pieChartData = resumen.slice(0, 6).map((item, index) => ({
    name: CATEGORIAS_GASTO[item.categoria].label,
    value: item.totalMXN,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }))

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#BB0034]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Centro de Costos</h1>
          <p className="text-[#3D3D3D]">Gestión de gastos y reportes financieros</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileSpreadsheet size={18} />
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText size={18} />
            PDF
          </button>
          <button
            onClick={handleNewCosto}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#BB0034] text-white rounded-lg hover:bg-[#9a002b] transition-colors"
          >
            <Plus size={18} />
            Nuevo Gasto
          </button>
        </div>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-[#3D3D3D]">Total del Período</p>
              <p className="text-xl font-bold text-[#1a1a1a]">{formatCurrency(totales.totalMXN)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-[#3D3D3D]">Pagados</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totales.pagados)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingDown size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-[#3D3D3D]">Pendientes</p>
              <p className="text-xl font-bold text-yellow-600">{formatCurrency(totales.pendientes)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-[#3D3D3D]">Registros</p>
              <p className="text-xl font-bold text-[#1a1a1a]">{filteredCostos.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab('gastos')}
              className={cn(
                'py-4 px-2 border-b-2 font-medium transition-colors',
                activeTab === 'gastos'
                  ? 'border-[#BB0034] text-[#BB0034]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              Gastos
            </button>
            <button
              onClick={() => setActiveTab('reportes')}
              className={cn(
                'py-4 px-2 border-b-2 font-medium transition-colors',
                activeTab === 'reportes'
                  ? 'border-[#BB0034] text-[#BB0034]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              Reportes
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'gastos' && (
            <>
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                <div className="md:col-span-2 relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por descripción, proveedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  />
                </div>
                <select
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value as CategoriaGasto | 'todas')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                >
                  <option value="todas">Todas las categorías</option>
                  {Object.entries(CATEGORIAS_GASTO).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value as EstadoGasto | 'todos')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                >
                  <option value="todos">Todos los estados</option>
                  {Object.entries(ESTADOS_GASTO).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dateRange.inicio}
                  onChange={(e) => setDateRange({ ...dateRange, inicio: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                />
                <input
                  type="date"
                  value={dateRange.fin}
                  onChange={(e) => setDateRange({ ...dateRange, fin: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                />
              </div>

              {/* Tabla de gastos */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCostos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                          No hay gastos registrados en este período
                        </td>
                      </tr>
                    ) : (
                      filteredCostos.map((costo) => {
                        const catInfo = CATEGORIAS_GASTO[costo.categoria]
                        const estadoInfo = ESTADOS_GASTO[costo.estado]
                        return (
                          <tr key={costo.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {formatDate(costo.fecha)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={cn('px-2 py-1 text-xs font-medium rounded', catInfo?.color)}>
                                {catInfo?.label || costo.categoria}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm max-w-xs truncate">
                              {costo.descripcion}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                              {formatCurrency(costo.montoMXN)}
                              {costo.moneda === 'USD' && (
                                <span className="text-xs text-gray-400 block">
                                  ({formatCurrency(costo.monto, 'USD')})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className={cn('px-2 py-1 text-xs font-medium rounded', estadoInfo?.color)}>
                                {estadoInfo?.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {costo.proveedorNombre || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => handleEditCosto(costo)}
                                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Pencil size={16} className="text-gray-500" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCosto(costo.id)}
                                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 size={16} className="text-red-500" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'reportes' && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Gráfico de pie */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-[#1a1a1a] mb-4">Distribución por Categoría</h3>
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-12">No hay datos para mostrar</p>
                )}
              </div>

              {/* Tabla resumen */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-[#1a1a1a] mb-4">Resumen por Categoría</h3>
                <div className="space-y-2">
                  {resumen.map((item) => (
                    <div
                      key={item.categoria}
                      className="flex items-center justify-between p-3 bg-white rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn('px-2 py-1 text-xs font-medium rounded', CATEGORIAS_GASTO[item.categoria].color)}>
                          {CATEGORIAS_GASTO[item.categoria].label}
                        </span>
                        <span className="text-sm text-gray-500">{item.cantidad} reg.</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.totalMXN)}</p>
                        <p className="text-xs text-gray-500">{item.porcentaje.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                  {resumen.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No hay datos para mostrar</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de costo */}
      <CostFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingCosto(null)
        }}
        onSubmit={handleSaveCosto}
        vehiculos={vehiculos}
        initialData={editingCosto ? {
          fecha: new Date(editingCosto.fecha).toISOString().split('T')[0],
          categoria: editingCosto.categoria,
          descripcion: editingCosto.descripcion,
          monto: editingCosto.monto,
          moneda: editingCosto.moneda,
          estado: editingCosto.estado,
          metodoPago: editingCosto.metodoPago,
          vehiculoId: editingCosto.vehiculoId,
          proveedorNombre: editingCosto.proveedorNombre,
          proveedorRFC: editingCosto.proveedorRFC,
          numeroFactura: editingCosto.numeroFactura,
          notas: editingCosto.notas,
        } : undefined}
        isEditing={!!editingCosto}
      />
    </div>
  )
}
