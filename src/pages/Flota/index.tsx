import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import {
  Plus,
  Search,
  Truck,
  X,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle,
  Wrench,
  Link2,
  Unlink,
} from 'lucide-react'
import {
  collection,
  getDocs,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import type { TipoVehiculo, EstadoVehiculo, Usuario, TipoAccesorio, CategoriaFlota } from '../../types'
import { cn } from '../../utils/cn'

interface Vehiculo {
  id: string
  numeroInterno: string
  placa: string
  categoria: CategoriaFlota
  tipo: TipoVehiculo | TipoAccesorio
  marca: string
  modelo: string
  anio: number
  estado: EstadoVehiculo
  capacidadCarga: number
  kilometraje: number
  conductorAsignado?: string
  asignadoA?: string // ID del tractocamión (para accesorios)
  activo: boolean
  fechaRegistro: Date
}

// Categorías de flota
const CATEGORIAS_FLOTA: Record<CategoriaFlota, string> = {
  vehiculo: 'Vehículo',
  accesorio: 'Accesorio',
}

// Tipos de vehículos motorizados
const TIPOS_VEHICULO: Record<TipoVehiculo, string> = {
  tractocamion: 'Tractocamión',
  torton: 'Torton',
  rabon: 'Rabón',
  plataforma_rolloff: 'Plataforma con Roll-off',
}

// Tipos de accesorios/remolques
const TIPOS_ACCESORIO: Record<TipoAccesorio, string> = {
  lowboy: 'Lowboy',
  cama_baja: 'Cama Baja',
  plataforma: 'Plataforma',
  gondola: 'Góndola',
  tolva: 'Tolva',
  caja_seca: 'Caja Seca',
  dolly: 'Dolly',
  contenedor: 'Contenedor',
}

// Estados determinados desde Mantenimiento
const ESTADOS_VEHICULO: Record<EstadoVehiculo, { label: string; color: string; icon: typeof Truck }> = {
  disponible: { label: 'Disponible', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  servicio_menor: { label: 'Servicio Menor', color: 'bg-yellow-100 text-yellow-700', icon: Wrench },
  fuera_servicio: { label: 'Fuera de Servicio', color: 'bg-red-100 text-red-700', icon: AlertCircle },
}

// Tabs disponibles
type TabType = 'vehiculos' | 'accesorios'

export default function Flota() {
  const [activeTab, setActiveTab] = useState<TabType>('vehiculos')
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [operadores, setOperadores] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingVehiculo, setEditingVehiculo] = useState<Vehiculo | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategoria, setFilterCategoria] = useState<CategoriaFlota | 'todos'>('todos')
  const [filterTipo, setFilterTipo] = useState<TipoVehiculo | TipoAccesorio | 'todos'>('todos')
  const [filterTipoAccesorio, setFilterTipoAccesorio] = useState<TipoAccesorio | 'todos'>('todos')
  const [filterEstado, setFilterEstado] = useState<EstadoVehiculo | 'todos'>('todos')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form state unificado
  const [formData, setFormData] = useState({
    numeroInterno: '',
    placa: '',
    categoria: 'vehiculo' as CategoriaFlota,
    tipo: 'tractocamion' as TipoVehiculo | TipoAccesorio,
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    capacidadCarga: 0,
    kilometraje: 0,
    conductorAsignado: '',
    asignadoA: '', // Para accesorios: ID del tractocamión
  })

  // Cargar vehículos desde Firebase (incluye vehículos y accesorios)
  const fetchVehiculos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'vehiculos'))
      const vehiculosData: Vehiculo[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        vehiculosData.push({
          id: doc.id,
          ...data,
          // Asegurar que tenga categoría (compatibilidad con datos antiguos)
          categoria: data.categoria || 'vehiculo',
        } as Vehiculo)
      })
      setVehiculos(vehiculosData)
    } catch (err) {
      console.error('Error al cargar vehículos:', err)
    } finally {
      setLoading(false)
    }
  }

  // Cargar operadores para asignación
  const fetchOperadores = async () => {
    try {
      const q = query(collection(db, 'usuarios'), where('rol', '==', 'operador'))
      const querySnapshot = await getDocs(q)
      const operadoresData: Usuario[] = []
      querySnapshot.forEach((doc) => {
        operadoresData.push({ id: doc.id, ...doc.data() } as Usuario)
      })
      setOperadores(operadoresData)
    } catch (err) {
      console.error('Error al cargar operadores:', err)
    }
  }

  useEffect(() => {
    fetchVehiculos()
    fetchOperadores()
  }, [])

  // Abrir modal para nuevo vehículo/accesorio
  const handleNewVehiculo = (categoria: CategoriaFlota = 'vehiculo') => {
    setEditingVehiculo(null)
    setFormData({
      numeroInterno: '',
      placa: '',
      categoria,
      tipo: categoria === 'vehiculo' ? 'tractocamion' : 'lowboy',
      marca: '',
      modelo: '',
      anio: new Date().getFullYear(),
      capacidadCarga: 0,
      kilometraje: 0,
      conductorAsignado: '',
      asignadoA: '',
    })
    setError('')
    setShowModal(true)
  }

  // Abrir modal para editar
  const handleEditVehiculo = (vehiculo: Vehiculo) => {
    setEditingVehiculo(vehiculo)
    setFormData({
      numeroInterno: vehiculo.numeroInterno,
      placa: vehiculo.placa,
      categoria: vehiculo.categoria || 'vehiculo',
      tipo: vehiculo.tipo,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      capacidadCarga: vehiculo.capacidadCarga,
      kilometraje: vehiculo.kilometraje,
      conductorAsignado: vehiculo.conductorAsignado || '',
      asignadoA: vehiculo.asignadoA || '',
    })
    setError('')
    setShowModal(true)
  }

  // Crear o actualizar vehículo/accesorio
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const dataToSave = {
        ...formData,
        conductorAsignado: formData.categoria === 'vehiculo' ? (formData.conductorAsignado || null) : null,
        asignadoA: formData.categoria === 'accesorio' ? (formData.asignadoA || null) : null,
        // Para accesorios no tiene sentido kilometraje
        kilometraje: formData.categoria === 'vehiculo' ? formData.kilometraje : 0,
      }

      if (editingVehiculo) {
        await updateDoc(doc(db, 'vehiculos', editingVehiculo.id), dataToSave)
      } else {
        // Nuevo vehículo/accesorio siempre inicia como 'disponible'
        await addDoc(collection(db, 'vehiculos'), {
          ...dataToSave,
          estado: 'disponible',
          activo: true,
          fechaRegistro: serverTimestamp(),
        })
      }

      setShowModal(false)
      fetchVehiculos()
    } catch (err) {
      console.error('Error:', err)
      setError('Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  // Eliminar vehículo
  const handleDeleteVehiculo = async (vehiculoId: string) => {
    if (!confirm('¿Estás seguro de eliminar este vehículo?')) return

    try {
      await deleteDoc(doc(db, 'vehiculos', vehiculoId))
      fetchVehiculos()
    } catch (err) {
      console.error('Error al eliminar:', err)
    }
  }

  // Obtener nombre del operador
  const getOperadorNombre = (operadorId: string | undefined) => {
    if (!operadorId) return 'Sin asignar'
    const operador = operadores.find((o) => o.id === operadorId)
    return operador ? `${operador.nombre} ${operador.apellidos}` : 'Sin asignar'
  }

  // Obtener nombre del tractocamión al que está asignado un accesorio
  const getTractoAsignadoNombre = (tractoId: string | undefined) => {
    if (!tractoId) return 'Sin asignar'
    const tracto = vehiculos.find((v) => v.id === tractoId && v.categoria === 'vehiculo')
    return tracto ? tracto.numeroInterno : 'Sin asignar'
  }

  // Obtener tipo legible
  const getTipoLabel = (tipo: TipoVehiculo | TipoAccesorio, categoria: CategoriaFlota) => {
    if (categoria === 'vehiculo') {
      return TIPOS_VEHICULO[tipo as TipoVehiculo] || tipo
    }
    return TIPOS_ACCESORIO[tipo as TipoAccesorio] || tipo
  }

  // Filtrar vehículos (solo los de categoría 'vehiculo')
  const filteredVehiculos = vehiculos.filter((v) => {
    const isVehiculo = v.categoria === 'vehiculo' || !v.categoria
    if (!isVehiculo) return false

    const matchesSearch =
      v.numeroInterno.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marca.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = filterTipo === 'todos' || v.tipo === filterTipo
    const matchesEstado = filterEstado === 'todos' || v.estado === filterEstado

    return matchesSearch && matchesTipo && matchesEstado
  })

  // Filtrar accesorios (solo los de categoría 'accesorio')
  const filteredAccesorios = vehiculos.filter((v) => {
    if (v.categoria !== 'accesorio') return false

    const matchesSearch =
      v.numeroInterno.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marca.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = filterTipoAccesorio === 'todos' || v.tipo === filterTipoAccesorio

    return matchesSearch && matchesTipo
  })

  // Separar vehículos y accesorios para contadores
  const soloVehiculos = vehiculos.filter(v => v.categoria === 'vehiculo' || !v.categoria)
  const soloAccesorios = vehiculos.filter(v => v.categoria === 'accesorio')

  // Contadores por estado (solo vehículos)
  const contadores = {
    total: soloVehiculos.length,
    disponibles: soloVehiculos.filter((v) => v.estado === 'disponible').length,
    servicioMenor: soloVehiculos.filter((v) => v.estado === 'servicio_menor').length,
    fueraServicio: soloVehiculos.filter((v) => v.estado === 'fuera_servicio').length,
  }

  // Contadores de accesorios
  const contadoresAccesorios = {
    total: soloAccesorios.length,
    asignados: soloAccesorios.filter((a) => a.asignadoA).length,
    disponibles: soloAccesorios.filter((a) => !a.asignadoA).length,
  }

  // Obtener tractocamiones disponibles para asignar accesorios
  const getTractosDisponibles = () => {
    return vehiculos.filter(v =>
      (v.categoria === 'vehiculo' || !v.categoria) && v.tipo === 'tractocamion'
    )
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Gestión de Flota</h1>
          <p className="text-[#3D3D3D]">Administra los vehículos y accesorios de la empresa</p>
        </div>
        <button
          onClick={() => handleNewVehiculo(activeTab === 'vehiculos' ? 'vehiculo' : 'accesorio')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#3D3D3D] transition-colors"
        >
          <Plus size={20} />
          {activeTab === 'vehiculos' ? 'Agregar Vehículo' : 'Agregar Accesorio'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex gap-0">
            <button
              onClick={() => {
                setActiveTab('vehiculos')
                setFilterTipo('todos')
              }}
              className={cn(
                'flex items-center gap-2 py-4 px-6 border-b-2 font-medium whitespace-nowrap transition-colors',
                activeTab === 'vehiculos'
                  ? 'border-[#BB0034] text-[#BB0034]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Truck size={18} />
              Vehículos ({soloVehiculos.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('accesorios')
                setFilterTipo('todos')
              }}
              className={cn(
                'flex items-center gap-2 py-4 px-6 border-b-2 font-medium whitespace-nowrap transition-colors',
                activeTab === 'accesorios'
                  ? 'border-[#BB0034] text-[#BB0034]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Link2 size={18} />
              Accesorios ({soloAccesorios.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Tab: Vehículos */}
      {activeTab === 'vehiculos' && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#BB0034]/10 rounded-lg">
                  <Truck size={20} className="text-[#BB0034]" />
                </div>
                <div>
                  <p className="text-sm text-[#3D3D3D]">Total</p>
                  <p className="text-xl font-bold text-[#1a1a1a]">{contadores.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-[#3D3D3D]">Disponibles</p>
                  <p className="text-xl font-bold text-[#1a1a1a]">{contadores.disponibles}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Wrench size={20} className="text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-[#3D3D3D]">Servicio Menor</p>
                  <p className="text-xl font-bold text-[#1a1a1a]">{contadores.servicioMenor}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-[#3D3D3D]">Fuera de Servicio</p>
                  <p className="text-xl font-bold text-[#1a1a1a]">{contadores.fueraServicio}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de vehículos */}
          <div className="bg-white rounded-xl shadow-sm">
            {/* Filtros */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search
                    size={20}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Buscar por placa, número interno, marca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  />
                </div>
                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value as TipoVehiculo | 'todos')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                >
                  <option value="todos">Todos los tipos</option>
                  {Object.entries(TIPOS_VEHICULO).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value as EstadoVehiculo | 'todos')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                >
                  <option value="todos">Todos los estados</option>
                  {Object.entries(ESTADOS_VEHICULO).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabla o estado vacío */}
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-[#BB0034] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[#3D3D3D]">Cargando vehículos...</p>
              </div>
            ) : filteredVehiculos.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <Truck size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">
                  {searchTerm || filterTipo !== 'todos' || filterEstado !== 'todos'
                    ? 'No se encontraron vehículos'
                    : 'No hay vehículos registrados'}
                </h3>
                <p className="text-[#3D3D3D] mb-4">
                  {searchTerm || filterTipo !== 'todos' || filterEstado !== 'todos'
                    ? 'Intenta con otros filtros'
                    : 'Comienza agregando el primer vehículo a tu flota'}
                </p>
                {!searchTerm && filterTipo === 'todos' && filterEstado === 'todos' && (
                  <button
                    onClick={() => handleNewVehiculo('vehiculo')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#3D3D3D] transition-colors"
                  >
                    <Plus size={20} />
                    Agregar Vehículo
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehículo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Operador
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kilometraje
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredVehiculos.map((vehiculo) => {
                      const estadoInfo = ESTADOS_VEHICULO[vehiculo.estado] || ESTADOS_VEHICULO.disponible
                      const EstadoIcon = estadoInfo.icon
                      return (
                        <tr key={vehiculo.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                                <Truck size={20} className="text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-[#1a1a1a]">
                                  {vehiculo.numeroInterno}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {vehiculo.placa} • {vehiculo.marca} {vehiculo.modelo}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-[#3D3D3D]">
                              {getTipoLabel(vehiculo.tipo, vehiculo.categoria || 'vehiculo')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${estadoInfo.color}`}
                            >
                              <EstadoIcon size={14} />
                              {estadoInfo.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#3D3D3D]">
                            {getOperadorNombre(vehiculo.conductorAsignado)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#3D3D3D]">
                            {vehiculo.kilometraje.toLocaleString()} km
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditVehiculo(vehiculo)}
                                className="p-2 text-gray-500 hover:text-[#BB0034] hover:bg-gray-100 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteVehiculo(vehiculo.id)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab: Accesorios */}
      {activeTab === 'accesorios' && (
        <>
          {/* Resumen de accesorios */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#BB0034]/10 rounded-lg">
                  <Link2 size={20} className="text-[#BB0034]" />
                </div>
                <div>
                  <p className="text-sm text-[#3D3D3D]">Total</p>
                  <p className="text-xl font-bold text-[#1a1a1a]">{contadoresAccesorios.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Link2 size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-[#3D3D3D]">Asignados</p>
                  <p className="text-xl font-bold text-[#1a1a1a]">{contadoresAccesorios.asignados}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-[#3D3D3D]">Disponibles</p>
                  <p className="text-xl font-bold text-[#1a1a1a]">{contadoresAccesorios.disponibles}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de accesorios */}
          <div className="bg-white rounded-xl shadow-sm">
            {/* Filtros */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search
                    size={20}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Buscar por número interno, marca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  />
                </div>
                <select
                  value={filterTipoAccesorio}
                  onChange={(e) => setFilterTipoAccesorio(e.target.value as TipoAccesorio | 'todos')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                >
                  <option value="todos">Todos los tipos</option>
                  {Object.entries(TIPOS_ACCESORIO).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabla de accesorios o estado vacío */}
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-[#BB0034] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[#3D3D3D]">Cargando accesorios...</p>
              </div>
            ) : filteredAccesorios.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <Link2 size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">
                  {searchTerm || filterTipoAccesorio !== 'todos'
                    ? 'No se encontraron accesorios'
                    : 'No hay accesorios registrados'}
                </h3>
                <p className="text-[#3D3D3D] mb-4">
                  {searchTerm || filterTipoAccesorio !== 'todos'
                    ? 'Intenta con otros filtros'
                    : 'Comienza agregando el primer accesorio'}
                </p>
                {!searchTerm && filterTipoAccesorio === 'todos' && (
                  <button
                    onClick={() => handleNewVehiculo('accesorio')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#3D3D3D] transition-colors"
                  >
                    <Plus size={20} />
                    Agregar Accesorio
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Accesorio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capacidad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asignado a
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAccesorios.map((accesorio) => (
                      <tr key={accesorio.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#BB0034] rounded-lg flex items-center justify-center">
                              <Link2 size={20} className="text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-[#1a1a1a]">
                                {accesorio.numeroInterno}
                              </p>
                              <p className="text-sm text-gray-500">
                                {accesorio.placa} • {accesorio.marca} {accesorio.modelo} ({accesorio.anio})
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-[#3D3D3D]">
                            {TIPOS_ACCESORIO[accesorio.tipo as TipoAccesorio]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#3D3D3D]">
                          {accesorio.capacidadCarga} tons
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {accesorio.asignadoA ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                              <Link2 size={12} />
                              {getTractoAsignadoNombre(accesorio.asignadoA)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                              <Unlink size={12} />
                              Sin asignar
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditVehiculo(accesorio)}
                              className="p-2 text-gray-500 hover:text-[#BB0034] hover:bg-gray-100 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteVehiculo(accesorio.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de Vehículo */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowModal(false)}
            />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#BB0034]/10 rounded-lg">
                    {formData.categoria === 'vehiculo' ? (
                      <Truck size={24} className="text-[#BB0034]" />
                    ) : (
                      <Link2 size={24} className="text-[#BB0034]" />
                    )}
                  </div>
                  <h2 className="text-xl font-semibold text-[#1a1a1a]">
                    {editingVehiculo
                      ? `Editar ${formData.categoria === 'vehiculo' ? 'Vehículo' : 'Accesorio'}`
                      : `Nuevo ${formData.categoria === 'vehiculo' ? 'Vehículo' : 'Accesorio'}`}
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Número Interno *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: T-001"
                      value={formData.numeroInterno}
                      onChange={(e) =>
                        setFormData({ ...formData, numeroInterno: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Placa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: ABC-123"
                      value={formData.placa}
                      onChange={(e) =>
                        setFormData({ ...formData, placa: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Categoría *
                    </label>
                    <select
                      required
                      value={formData.categoria}
                      onChange={(e) => {
                        const newCategoria = e.target.value as CategoriaFlota
                        setFormData({
                          ...formData,
                          categoria: newCategoria,
                          tipo: newCategoria === 'vehiculo' ? 'tractocamion' : 'lowboy',
                          // Limpiar campos no aplicables
                          conductorAsignado: newCategoria === 'vehiculo' ? formData.conductorAsignado : '',
                          asignadoA: newCategoria === 'accesorio' ? formData.asignadoA : '',
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    >
                      {Object.entries(CATEGORIAS_FLOTA).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Tipo *
                    </label>
                    <select
                      required
                      value={formData.tipo}
                      onChange={(e) =>
                        setFormData({ ...formData, tipo: e.target.value as TipoVehiculo | TipoAccesorio })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    >
                      {formData.categoria === 'vehiculo'
                        ? Object.entries(TIPOS_VEHICULO).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))
                        : Object.entries(TIPOS_ACCESORIO).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Marca *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Kenworth"
                      value={formData.marca}
                      onChange={(e) =>
                        setFormData({ ...formData, marca: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: T680"
                      value={formData.modelo}
                      onChange={(e) =>
                        setFormData({ ...formData, modelo: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Año *
                    </label>
                    <input
                      type="number"
                      required
                      min="1990"
                      max={new Date().getFullYear() + 1}
                      value={formData.anio}
                      onChange={(e) =>
                        setFormData({ ...formData, anio: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Capacidad de Carga (tons) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      value={formData.capacidadCarga}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          capacidadCarga: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    />
                  </div>
                  {formData.categoria === 'vehiculo' && (
                    <div>
                      <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                        Kilometraje *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.kilometraje}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            kilometraje: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Operador Asignado (solo para vehículos) */}
                {formData.categoria === 'vehiculo' && (
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Operador Asignado
                    </label>
                    <select
                      value={formData.conductorAsignado}
                      onChange={(e) =>
                        setFormData({ ...formData, conductorAsignado: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    >
                      <option value="">Sin asignar</option>
                      {operadores.map((operador) => (
                        <option key={operador.id} value={operador.id}>
                          {operador.nombre} {operador.apellidos}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Asignado a Tractocamión (solo para accesorios) */}
                {formData.categoria === 'accesorio' && (
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Asignado a Tractocamión
                    </label>
                    <select
                      value={formData.asignadoA}
                      onChange={(e) =>
                        setFormData({ ...formData, asignadoA: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    >
                      <option value="">Sin asignar</option>
                      {getTractosDisponibles().map((tracto) => (
                        <option key={tracto.id} value={tracto.id}>
                          {tracto.numeroInterno} - {tracto.placa}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-[#3D3D3D] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#3D3D3D] transition-colors disabled:opacity-50"
                  >
                    {submitting
                      ? 'Guardando...'
                      : editingVehiculo
                        ? 'Guardar Cambios'
                        : `Agregar ${formData.categoria === 'vehiculo' ? 'Vehículo' : 'Accesorio'}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
