import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import {
  Plus,
  Search,
  Users,
  X,
  Pencil,
  Trash2,
  Phone,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Calendar,
} from 'lucide-react';
import {
  obtenerManiobristas,
  crearManiobrista,
  actualizarManiobrista,
  desactivarManiobrista,
  reactivarManiobrista,
  eliminarManiobrista,
} from '../../services/maniobrista.service';
import type { Maniobrista, ManiobristaFormInput } from '../../types/maniobrista.types';

export default function ManiosbristasPage() {
  const [maniobristas, setManiobristas] = useState<Maniobrista[]>([]);
  const [todosManiobristas, setTodosManiobristas] = useState<Maniobrista[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Maniobrista | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState<'todos' | 'activos' | 'inactivos'>('activos');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<ManiobristaFormInput>({
    nombre: '',
    telefono: '',
    foto: '',
    sueldoDiario: 0,
    fechaIngreso: new Date(),
    notas: '',
  });

  async function cargarDatos() {
    setLoading(true);
    try {
      const data = await obtenerManiobristas();
      setTodosManiobristas(data);
      aplicarFiltros(data);
    } catch (err) {
      console.error('Error al cargar maniobristas:', err);
    } finally {
      setLoading(false);
    }
  }

  function aplicarFiltros(datos: Maniobrista[]) {
    let filtrados = [...datos];

    if (filterActivo === 'activos') {
      filtrados = filtrados.filter(m => m.activo);
    } else if (filterActivo === 'inactivos') {
      filtrados = filtrados.filter(m => !m.activo);
    }

    if (searchTerm) {
      const busqueda = searchTerm.toLowerCase();
      filtrados = filtrados.filter(m =>
        m.nombre.toLowerCase().includes(busqueda) ||
        m.telefono?.includes(busqueda)
      );
    }

    setManiobristas(filtrados);
  }

  useEffect(() => { cargarDatos(); }, []);
  useEffect(() => { aplicarFiltros(todosManiobristas); }, [filterActivo, searchTerm, todosManiobristas]);

  function handleNuevo() {
    setEditing(null);
    setFormData({
      nombre: '',
      telefono: '',
      foto: '',
      sueldoDiario: 0,
      fechaIngreso: new Date(),
      notas: '',
    });
    setError('');
    setShowModal(true);
  }

  function handleEditar(item: Maniobrista) {
    setEditing(item);
    setFormData({
      nombre: item.nombre,
      telefono: item.telefono,
      foto: item.foto || '',
      sueldoDiario: item.sueldoDiario,
      fechaIngreso: item.fechaIngreso,
      notas: item.notas || '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editing) {
        await actualizarManiobrista(editing.id, formData);
      } else {
        await crearManiobrista(formData);
      }
      setShowModal(false);
      cargarDatos();
    } catch (err) {
      console.error('Error:', err);
      setError('Error al guardar maniobrista');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActivo(item: Maniobrista) {
    try {
      if (item.activo) {
        await desactivarManiobrista(item.id);
      } else {
        await reactivarManiobrista(item.id);
      }
      cargarDatos();
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    }
  }

  async function handleEliminar(item: Maniobrista) {
    if (!window.confirm(`¿Eliminar permanentemente a "${item.nombre}"?`)) return;
    try {
      await eliminarManiobrista(item.id);
      cargarDatos();
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  }

  const contadores = {
    total: todosManiobristas.length,
    activos: todosManiobristas.filter(m => m.activo).length,
    inactivos: todosManiobristas.filter(m => !m.activo).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maniobristas</h1>
          <p className="text-gray-600">Ayudantes para carga y descarga</p>
        </div>
        <button
          onClick={handleNuevo}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          <Plus size={20} />
          Nuevo Maniobrista
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#BB0034]/10 rounded-lg">
              <Users size={20} className="text-[#BB0034]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-bold">{contadores.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Activos</p>
              <p className="text-xl font-bold">{contadores.activos}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Users size={20} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Inactivos</p>
              <p className="text-xl font-bold">{contadores.inactivos}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
              />
            </div>
            <div className="flex gap-2">
              {(['todos', 'activos', 'inactivos'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterActivo(f)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    filterActivo === f
                      ? f === 'activos' ? 'bg-green-600 text-white' : f === 'inactivos' ? 'bg-gray-600 text-white' : 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-[#BB0034] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          </div>
        ) : maniobristas.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={32} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No hay maniobristas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sueldo/Día</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingreso</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {maniobristas.map(item => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${!item.activo ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-medium">
                          {item.nombre.charAt(0)}
                        </div>
                        <span className="font-medium">{item.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-700">
                        <Phone size={14} />
                        {item.telefono}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} />
                        ${item.sueldoDiario.toLocaleString('es-MX')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <Calendar size={14} />
                        {item.fechaIngreso?.toLocaleDateString('es-MX')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditar(item)} className="p-2 hover:bg-gray-100 rounded-lg">
                          <Pencil size={18} className="text-gray-500" />
                        </button>
                        <button onClick={() => handleToggleActivo(item)} className={`p-2 rounded-lg ${item.activo ? 'text-green-600' : 'text-gray-400'}`}>
                          {item.activo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button onClick={() => handleEliminar(item)} className="p-2 hover:bg-gray-100 rounded-lg">
                          <Trash2 size={18} className="text-red-500" />
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

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{editing ? 'Editar' : 'Nuevo'} Maniobrista</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                  <input
                    type="tel"
                    required
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sueldo diario *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.sueldoDiario}
                        onChange={(e) => setFormData({ ...formData, sueldoDiario: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha ingreso *</label>
                    <input
                      type="date"
                      required
                      value={formData.fechaIngreso instanceof Date ? formData.fechaIngreso.toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({ ...formData, fechaIngreso: new Date(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
                    {submitting ? 'Guardando...' : 'Guardar'}
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
