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
import type { TipoVehiculo, EstadoVehiculo, Usuario } from '../../types'

interface Vehiculo {
  id: string
  numeroInterno: string
  placa: string
  tipo: TipoVehiculo
  marca: string
  modelo: string
  anio: number
  estado: EstadoVehiculo
  capacidadCarga: number
  kilometraje: number
  conductorAsignado?: string
  activo: boolean
  fechaRegistro: Date
}

const TIPOS_VEHICULO: Record<TipoVehiculo, string> = {
  tractocamion: 'Tractocamión',
  lowboy: 'Lowboy',
  plataforma_rolloff: 'Plataforma con Roll-off',
  gondola: 'Góndola',
  remolque: 'Remolque',
}

// Estados determinados desde Mantenimiento
const ESTADOS_VEHICULO: Record<EstadoVehiculo, { label: string; color: string; icon: typeof Truck }> = {
  disponible: { label: 'Disponible', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  servicio_menor: { label: 'Servicio Menor', color: 'bg-yellow-100 text-yellow-700', icon: Wrench },
  fuera_servicio: { label: 'Fuera de Servicio', color: 'bg-red-100 text-red-700', icon: AlertCircle },
}

export default function Flota() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [operadores, setOperadores] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingVehiculo, setEditingVehiculo] = useState<Vehiculo | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState<TipoVehiculo | 'todos'>('todos')
  const [filterEstado, setFilterEstado] = useState<EstadoVehiculo | 'todos'>('todos')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form state (estado no se incluye - lo maneja Mantenimiento)
  const [formData, setFormData] = useState({
    numeroInterno: '',
    placa: '',
    tipo: 'tractocamion' as TipoVehiculo,
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    capacidadCarga: 0,
    kilometraje: 0,
    conductorAsignado: '',
  })

  // Cargar vehículos
  const fetchVehiculos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'vehiculos'))
      const vehiculosData: Vehiculo[] = []
      querySnapshot.forEach((doc) => {
        vehiculosData.push({ id: doc.id, ...doc.data() } as Vehiculo)
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

  // Abrir modal para nuevo vehículo
  const handleNewVehiculo = () => {
    setEditingVehiculo(null)
    setFormData({
      numeroInterno: '',
      placa: '',
      tipo: 'tractocamion',
      marca: '',
      modelo: '',
      anio: new Date().getFullYear(),
      capacidadCarga: 0,
      kilometraje: 0,
      conductorAsignado: '',
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
      tipo: vehiculo.tipo,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      capacidadCarga: vehiculo.capacidadCarga,
      kilometraje: vehiculo.kilometraje,
      conductorAsignado: vehiculo.conductorAsignado || '',
    })
    setError('')
    setShowModal(true)
  }

  // Crear o actualizar vehículo
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (editingVehiculo) {
        await updateDoc(doc(db, 'vehiculos', editingVehiculo.id), {
          ...formData,
          conductorAsignado: formData.conductorAsignado || null,
        })
      } else {
        // Nuevo vehículo siempre inicia como 'disponible'
        await addDoc(collection(db, 'vehiculos'), {
          ...formData,
          estado: 'disponible',
          conductorAsignado: formData.conductorAsignado || null,
          activo: true,
          fechaRegistro: serverTimestamp(),
        })
      }

      setShowModal(false)
      fetchVehiculos()
    } catch (err) {
      console.error('Error:', err)
      setError('Error al guardar el vehículo')
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

  // Filtrar vehículos
  const filteredVehiculos = vehiculos.filter((v) => {
    const matchesSearch =
      v.numeroInterno.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marca.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = filterTipo === 'todos' || v.tipo === filterTipo
    const matchesEstado = filterEstado === 'todos' || v.estado === filterEstado
    return matchesSearch && matchesTipo && matchesEstado
  })

  // Contadores por estado
  const contadores = {
    total: vehiculos.length,
    disponibles: vehiculos.filter((v) => v.estado === 'disponible').length,
    servicioMenor: vehiculos.filter((v) => v.estado === 'servicio_menor').length,
    fueraServicio: vehiculos.filter((v) => v.estado === 'fuera_servicio').length,
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Gestión de Flota</h1>
          <p className="text-[#3D3D3D]">Administra los vehículos de la empresa</p>
        </div>
        <button
          onClick={handleNewVehiculo}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#3D3D3D] transition-colors"
        >
          <Plus size={20} />
          Agregar Vehículo
        </button>
      </div>

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
                onClick={handleNewVehiculo}
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
                  // Manejar estados desconocidos (datos antiguos en Firebase)
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
                          {TIPOS_VEHICULO[vehiculo.tipo]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${estadoInfo.color}`}
                          title="Estado determinado por Mantenimiento"
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
                    <Truck size={24} className="text-[#BB0034]" />
                  </div>
                  <h2 className="text-xl font-semibold text-[#1a1a1a]">
                    {editingVehiculo ? 'Editar Vehículo' : 'Nuevo Vehículo'}
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

                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                    Tipo de Vehículo *
                  </label>
                  <select
                    required
                    value={formData.tipo}
                    onChange={(e) =>
                      setFormData({ ...formData, tipo: e.target.value as TipoVehiculo })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  >
                    {Object.entries(TIPOS_VEHICULO).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
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
                </div>

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
                        : 'Agregar Vehículo'}
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
