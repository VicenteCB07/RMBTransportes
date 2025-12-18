import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import {
  Plus,
  Search,
  HardHat,
  X,
  Pencil,
  Trash2,
  Phone,
  Calendar,
  FileText,
  AlertCircle,
  DollarSign,
  Truck,
  ToggleLeft,
  ToggleRight,
  Camera,
  Shield,
} from 'lucide-react';
import {
  obtenerOperadores,
  crearOperador,
  actualizarOperador,
  desactivarOperador,
  reactivarOperador,
  eliminarOperador,
} from '../../services/operator.service';
import { obtenerTractocamionesSelect } from '../../services/truck.service';
import type { Operador, OperadorFormInput, TipoLicencia } from '../../types/operator.types';
import { TIPOS_LICENCIA } from '../../types/operator.types';

export default function OperadoresPage() {
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [todosOperadores, setTodosOperadores] = useState<Operador[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOperador, setEditingOperador] = useState<Operador | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState<'todos' | 'activos' | 'inactivos'>('activos');
  const [filterLicencia, setFilterLicencia] = useState<TipoLicencia | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tractosDisponibles, setTractosDisponibles] = useState<{ id: string; label: string }[]>([]);

  // Form state
  const [formData, setFormData] = useState<OperadorFormInput>({
    nombre: '',
    telefono: '',
    telefonoEmergencia: '',
    foto: '',
    licencia: {
      numero: '',
      tipo: 'federal',
      vigencia: new Date(),
    },
    seguroSocial: undefined,
    sueldoDiario: 0,
    tractosAutorizados: [],
    fechaIngreso: new Date(),
    notas: '',
  });

  // Cargar datos
  async function cargarDatos() {
    setLoading(true);
    try {
      const [operadoresData, tractosData] = await Promise.all([
        obtenerOperadores(),
        obtenerTractocamionesSelect(),
      ]);
      setTodosOperadores(operadoresData);
      setTractosDisponibles(tractosData);
      aplicarFiltros(operadoresData);
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  }

  function aplicarFiltros(datos: Operador[]) {
    let filtrados = [...datos];

    // Filtro por activo
    if (filterActivo === 'activos') {
      filtrados = filtrados.filter(o => o.activo);
    } else if (filterActivo === 'inactivos') {
      filtrados = filtrados.filter(o => !o.activo);
    }

    // Filtro por tipo de licencia
    if (filterLicencia) {
      filtrados = filtrados.filter(o => o.licencia.tipo === filterLicencia);
    }

    // Filtro por búsqueda
    if (searchTerm) {
      const busqueda = searchTerm.toLowerCase();
      filtrados = filtrados.filter(o =>
        o.nombre.toLowerCase().includes(busqueda) ||
        o.licencia.numero.toLowerCase().includes(busqueda) ||
        o.telefono?.includes(busqueda)
      );
    }

    setOperadores(filtrados);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    aplicarFiltros(todosOperadores);
  }, [filterActivo, filterLicencia, searchTerm, todosOperadores]);

  // Abrir modal para nuevo operador
  function handleNuevoOperador() {
    setEditingOperador(null);
    setFormData({
      nombre: '',
      telefono: '',
      telefonoEmergencia: '',
      foto: '',
      licencia: {
        numero: '',
        tipo: 'federal',
        vigencia: new Date(),
      },
      seguroSocial: undefined,
      sueldoDiario: 0,
      tractosAutorizados: [],
      fechaIngreso: new Date(),
      notas: '',
    });
    setError('');
    setShowModal(true);
  }

  // Abrir modal para editar
  function handleEditarOperador(operador: Operador) {
    setEditingOperador(operador);
    setFormData({
      nombre: operador.nombre,
      telefono: operador.telefono,
      telefonoEmergencia: operador.telefonoEmergencia || '',
      foto: operador.foto || '',
      licencia: {
        numero: operador.licencia.numero,
        tipo: operador.licencia.tipo,
        vigencia: operador.licencia.vigencia,
      },
      seguroSocial: operador.seguroSocial,
      sueldoDiario: operador.sueldoDiario,
      tractosAutorizados: operador.tractosAutorizados || [],
      fechaIngreso: operador.fechaIngreso,
      notas: operador.notas || '',
    });
    setError('');
    setShowModal(true);
  }

  // Guardar operador
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editingOperador) {
        await actualizarOperador(editingOperador.id, formData);
      } else {
        await crearOperador(formData);
      }
      setShowModal(false);
      cargarDatos();
    } catch (err) {
      console.error('Error:', err);
      setError('Error al guardar operador');
    } finally {
      setSubmitting(false);
    }
  }

  // Cambiar estado activo/inactivo
  async function handleToggleActivo(operador: Operador) {
    try {
      if (operador.activo) {
        await desactivarOperador(operador.id);
      } else {
        await reactivarOperador(operador.id);
      }
      cargarDatos();
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    }
  }

  // Eliminar operador
  async function handleEliminarOperador(operador: Operador) {
    const confirmacion = window.confirm(
      `¿Estás seguro de ELIMINAR PERMANENTEMENTE al operador "${operador.nombre}"?\n\n` +
      `Esta acción NO se puede deshacer.`
    );
    if (!confirmacion) return;

    try {
      await eliminarOperador(operador.id);
      cargarDatos();
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  }

  // Verificar licencia próxima a vencer (30 días)
  function isLicenciaProximaVencer(fecha: Date | undefined) {
    if (!fecha) return false;
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    const diff = vencimiento.getTime() - hoy.getTime();
    const dias = diff / (1000 * 60 * 60 * 24);
    return dias > 0 && dias <= 30;
  }

  // Verificar licencia vencida
  function isLicenciaVencida(fecha: Date | undefined) {
    if (!fecha) return false;
    return new Date(fecha) < new Date();
  }

  // Toggle tracto autorizado
  function toggleTractoAutorizado(tractoId: string) {
    const actuales = formData.tractosAutorizados || [];
    if (actuales.includes(tractoId)) {
      setFormData({
        ...formData,
        tractosAutorizados: actuales.filter(id => id !== tractoId),
      });
    } else {
      setFormData({
        ...formData,
        tractosAutorizados: [...actuales, tractoId],
      });
    }
  }

  // Contadores
  const contadores = {
    total: todosOperadores.length,
    activos: todosOperadores.filter(o => o.activo).length,
    inactivos: todosOperadores.filter(o => !o.activo).length,
    licenciasVencer: todosOperadores.filter(o => isLicenciaProximaVencer(o.licencia.vigencia)).length,
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operadores</h1>
          <p className="text-gray-600">Gestión de conductores de tractocamiones</p>
        </div>
        <button
          onClick={handleNuevoOperador}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={20} />
          Nuevo Operador
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#BB0034]/10 rounded-lg">
              <HardHat size={20} className="text-[#BB0034]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{contadores.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <HardHat size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Activos</p>
              <p className="text-xl font-bold text-gray-900">{contadores.activos}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <HardHat size={20} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Inactivos</p>
              <p className="text-xl font-bold text-gray-900">{contadores.inactivos}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Licencias por vencer</p>
              <p className="text-xl font-bold text-gray-900">{contadores.licenciasVencer}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-sm">
        {/* Filtros */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, licencia, teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterActivo('todos')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterActivo === 'todos'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterActivo('activos')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterActivo === 'activos'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Activos
              </button>
              <button
                onClick={() => setFilterActivo('inactivos')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterActivo === 'inactivos'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Inactivos
              </button>
            </div>
            <select
              value={filterLicencia}
              onChange={(e) => setFilterLicencia(e.target.value as TipoLicencia | '')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
            >
              <option value="">Tipo de licencia</option>
              {TIPOS_LICENCIA.map(tipo => (
                <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-[#BB0034] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando operadores...</p>
          </div>
        ) : operadores.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <HardHat size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay operadores</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'No se encontraron resultados' : 'Agrega el primer operador'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operador</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Licencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sueldo/Día</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tractos</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {operadores.map((operador) => {
                  const licenciaVencida = isLicenciaVencida(operador.licencia.vigencia);
                  const licenciaProxima = isLicenciaProximaVencer(operador.licencia.vigencia);

                  return (
                    <tr key={operador.id} className={`hover:bg-gray-50 ${!operador.activo ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#BB0034] rounded-full flex items-center justify-center text-white font-medium">
                            {operador.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{operador.nombre}</p>
                            <p className="text-xs text-gray-500">
                              Desde {operador.fechaIngreso?.toLocaleDateString('es-MX')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <p className="font-medium">{operador.licencia.numero}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            operador.licencia.tipo === 'federal'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {operador.licencia.tipo === 'federal' ? 'Federal' : 'Estatal'}
                          </span>
                          {operador.licencia.vigencia && (
                            <div className={`flex items-center gap-1 text-xs mt-1 ${
                              licenciaVencida ? 'text-red-600' : licenciaProxima ? 'text-orange-600' : 'text-gray-500'
                            }`}>
                              {licenciaVencida ? <AlertCircle size={12} /> : licenciaProxima ? <AlertCircle size={12} /> : <Calendar size={12} />}
                              Vence: {new Date(operador.licencia.vigencia).toLocaleDateString('es-MX')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-gray-700">
                            <Phone size={14} />
                            {operador.telefono}
                          </div>
                          {operador.telefonoEmergencia && (
                            <div className="text-xs text-gray-500 mt-1">
                              Emergencia: {operador.telefonoEmergencia}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-700">
                          <DollarSign size={14} />
                          ${operador.sueldoDiario.toLocaleString('es-MX')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-700">
                          <Truck size={14} />
                          <span>{operador.tractosAutorizados?.length || 0} unidades</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditarOperador(operador)}
                            className="p-2 text-gray-500 hover:text-[#BB0034] hover:bg-gray-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleActivo(operador)}
                            className={`p-2 rounded-lg transition-colors ${
                              operador.activo
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={operador.activo ? 'Desactivar' : 'Activar'}
                          >
                            {operador.activo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button
                            onClick={() => handleEliminarOperador(operador)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#BB0034]/10 rounded-lg">
                    <HardHat size={24} className="text-[#BB0034]" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingOperador ? 'Editar Operador' : 'Nuevo Operador'}
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

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Datos básicos */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <HardHat size={16} />
                    Datos del Operador
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                      <input
                        type="text"
                        required
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                      <input
                        type="tel"
                        required
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de emergencia</label>
                      <input
                        type="tel"
                        value={formData.telefonoEmergencia}
                        onChange={(e) => setFormData({ ...formData, telefonoEmergencia: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Licencia */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <FileText size={16} />
                    Licencia de Conducir
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Número *</label>
                      <input
                        type="text"
                        required
                        value={formData.licencia.numero}
                        onChange={(e) => setFormData({
                          ...formData,
                          licencia: { ...formData.licencia, numero: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                      <select
                        required
                        value={formData.licencia.tipo}
                        onChange={(e) => setFormData({
                          ...formData,
                          licencia: { ...formData.licencia, tipo: e.target.value as TipoLicencia }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                      >
                        {TIPOS_LICENCIA.map(tipo => (
                          <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vigencia *</label>
                      <input
                        type="text"
                        required
                        placeholder="DD/MM/AAAA"
                        defaultValue={(() => {
                          try {
                            if (!formData.licencia.vigencia) return '';
                            const fecha = formData.licencia.vigencia instanceof Date
                              ? formData.licencia.vigencia
                              : new Date(formData.licencia.vigencia);
                            if (isNaN(fecha.getTime())) return '';
                            const day = String(fecha.getDate()).padStart(2, '0');
                            const month = String(fecha.getMonth() + 1).padStart(2, '0');
                            const year = fecha.getFullYear();
                            return `${day}/${month}/${year}`;
                          } catch {
                            return '';
                          }
                        })()}
                        key={editingOperador?.id || 'new'}
                        onBlur={(e) => {
                          const valor = e.target.value.trim();
                          if (!valor) return;
                          // Intentar parsear diferentes formatos
                          let fecha: Date | null = null;
                          // Formato DD/MM/YYYY o DD-MM-YYYY
                          const partes = valor.split(/[\/\-]/);
                          if (partes.length === 3) {
                            const [d, m, y] = partes.map(p => parseInt(p));
                            if (d && m && y && y > 1900) {
                              fecha = new Date(y, m - 1, d);
                            }
                          }
                          if (fecha && !isNaN(fecha.getTime())) {
                            setFormData({
                              ...formData,
                              licencia: { ...formData.licencia, vigencia: fecha }
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                      />
                      <p className="text-xs text-gray-400 mt-1">Formato: día/mes/año (ej: 15/03/2028)</p>
                    </div>
                  </div>
                </div>

                {/* Seguro Social */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Shield size={16} />
                    Seguro Social (IMSS)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NSS (Folio)</label>
                      <input
                        type="text"
                        value={formData.seguroSocial?.folio || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          seguroSocial: {
                            folio: e.target.value,
                            costoMensual: formData.seguroSocial?.costoMensual || 0,
                          }
                        })}
                        placeholder="12345678901"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Costo Mensual</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.seguroSocial?.costoMensual || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            seguroSocial: {
                              folio: formData.seguroSocial?.folio || '',
                              costoMensual: parseFloat(e.target.value) || 0,
                            }
                          })}
                          placeholder="2500"
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Económico */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <DollarSign size={16} />
                    Información Económica
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sueldo diario *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={formData.sueldoDiario}
                          onChange={(e) => setFormData({ ...formData, sueldoDiario: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de ingreso *</label>
                      <input
                        type="text"
                        required
                        placeholder="DD/MM/AAAA"
                        defaultValue={(() => {
                          try {
                            if (!formData.fechaIngreso) return '';
                            const fecha = formData.fechaIngreso instanceof Date
                              ? formData.fechaIngreso
                              : new Date(formData.fechaIngreso);
                            if (isNaN(fecha.getTime())) return '';
                            const day = String(fecha.getDate()).padStart(2, '0');
                            const month = String(fecha.getMonth() + 1).padStart(2, '0');
                            const year = fecha.getFullYear();
                            return `${day}/${month}/${year}`;
                          } catch {
                            return '';
                          }
                        })()}
                        key={`ingreso-${editingOperador?.id || 'new'}`}
                        onBlur={(e) => {
                          const valor = e.target.value.trim();
                          if (!valor) return;
                          let fecha: Date | null = null;
                          const partes = valor.split(/[\/\-]/);
                          if (partes.length === 3) {
                            const [d, m, y] = partes.map(p => parseInt(p));
                            if (d && m && y && y > 1900) {
                              fecha = new Date(y, m - 1, d);
                            }
                          }
                          if (fecha && !isNaN(fecha.getTime())) {
                            setFormData({ ...formData, fechaIngreso: fecha });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Tractos autorizados */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Truck size={16} />
                    Tractocamiones Autorizados
                  </h3>
                  {tractosDisponibles.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay tractocamiones registrados</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                      {tractosDisponibles.map(tracto => (
                        <label
                          key={tracto.id}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                            formData.tractosAutorizados?.includes(tracto.id)
                              ? 'bg-[#BB0034]/10 border border-[#BB0034]'
                              : 'bg-white border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.tractosAutorizados?.includes(tracto.id) || false}
                            onChange={() => toggleTractoAutorizado(tracto.id)}
                            className="sr-only"
                          />
                          <Truck size={16} className={formData.tractosAutorizados?.includes(tracto.id) ? 'text-[#BB0034]' : 'text-gray-400'} />
                          <span className="text-sm">{tracto.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notas */}
                <div className="space-y-4 border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none resize-none"
                  />
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Guardando...' : editingOperador ? 'Guardar Cambios' : 'Crear Operador'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
