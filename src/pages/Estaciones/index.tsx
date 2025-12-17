import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import {
  Plus,
  Search,
  Fuel,
  X,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  obtenerEstaciones,
  crearEstacion,
  actualizarEstacion,
  desactivarEstacion,
  reactivarEstacion,
  eliminarEstacion,
} from '../../services/fuelstation.service';
import type { EstacionServicio, EstacionServicioFormInput, TipoCombustible } from '../../types/fuelstation.types';
import { TIPOS_COMBUSTIBLE } from '../../types/fuelstation.types';

export default function EstacionesPage() {
  const [estaciones, setEstaciones] = useState<EstacionServicio[]>([]);
  const [todasEstaciones, setTodasEstaciones] = useState<EstacionServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EstacionServicio | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState<'todos' | 'activos' | 'inactivos'>('activos');
  const [filterCombustible, setFilterCombustible] = useState<TipoCombustible | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<EstacionServicioFormInput>({
    nombre: '',
    direccion: {
      calle: '',
      numero: '',
      colonia: '',
      municipio: '',
      estado: '',
      codigoPostal: '',
    },
    telefono: '',
    tiposCombustible: ['diesel'],
    notas: '',
  });

  async function cargarDatos() {
    setLoading(true);
    try {
      const data = await obtenerEstaciones();
      setTodasEstaciones(data);
      aplicarFiltros(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  function aplicarFiltros(datos: EstacionServicio[]) {
    let filtrados = [...datos];

    if (filterActivo === 'activos') filtrados = filtrados.filter(e => e.activo);
    else if (filterActivo === 'inactivos') filtrados = filtrados.filter(e => !e.activo);

    if (filterCombustible) filtrados = filtrados.filter(e => e.tiposCombustible.includes(filterCombustible));

    if (searchTerm) {
      const busqueda = searchTerm.toLowerCase();
      filtrados = filtrados.filter(e =>
        e.nombre.toLowerCase().includes(busqueda) ||
        e.direccion.municipio?.toLowerCase().includes(busqueda) ||
        e.direccion.estado?.toLowerCase().includes(busqueda)
      );
    }

    setEstaciones(filtrados);
  }

  useEffect(() => { cargarDatos(); }, []);
  useEffect(() => { aplicarFiltros(todasEstaciones); }, [filterActivo, filterCombustible, searchTerm, todasEstaciones]);

  function handleNuevo() {
    setEditing(null);
    setFormData({
      nombre: '',
      direccion: { calle: '', numero: '', colonia: '', municipio: '', estado: '', codigoPostal: '' },
      telefono: '',
      tiposCombustible: ['diesel'],
      notas: '',
    });
    setError('');
    setShowModal(true);
  }

  function handleEditar(item: EstacionServicio) {
    setEditing(item);
    setFormData({
      nombre: item.nombre,
      direccion: { ...item.direccion },
      telefono: item.telefono || '',
      tiposCombustible: item.tiposCombustible,
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
        await actualizarEstacion(editing.id, formData);
      } else {
        await crearEstacion(formData);
      }
      setShowModal(false);
      cargarDatos();
    } catch (err) {
      console.error('Error:', err);
      setError('Error al guardar');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActivo(item: EstacionServicio) {
    try {
      if (item.activo) await desactivarEstacion(item.id);
      else await reactivarEstacion(item.id);
      cargarDatos();
    } catch (err) {
      console.error('Error:', err);
    }
  }

  async function handleEliminar(item: EstacionServicio) {
    if (!window.confirm(`¿Eliminar "${item.nombre}"?`)) return;
    try {
      await eliminarEstacion(item.id);
      cargarDatos();
    } catch (err) {
      console.error('Error:', err);
    }
  }

  function toggleCombustible(tipo: TipoCombustible) {
    const actuales = formData.tiposCombustible;
    if (actuales.includes(tipo)) {
      if (actuales.length > 1) {
        setFormData({ ...formData, tiposCombustible: actuales.filter(t => t !== tipo) });
      }
    } else {
      setFormData({ ...formData, tiposCombustible: [...actuales, tipo] });
    }
  }

  const getCombustibleColor = (tipo: TipoCombustible) => {
    switch (tipo) {
      case 'diesel': return 'bg-yellow-100 text-yellow-700';
      case 'magna': return 'bg-green-100 text-green-700';
      case 'premium': return 'bg-red-100 text-red-700';
    }
  };

  const contadores = {
    total: todasEstaciones.length,
    activas: todasEstaciones.filter(e => e.activo).length,
    conDiesel: todasEstaciones.filter(e => e.tiposCombustible.includes('diesel') && e.activo).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estaciones de Servicio</h1>
          <p className="text-gray-600">Gasolineras frecuentes para carga de combustible</p>
        </div>
        <button onClick={handleNuevo} className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800">
          <Plus size={20} />
          Nueva Estación
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#BB0034]/10 rounded-lg"><Fuel size={20} className="text-[#BB0034]" /></div>
            <div><p className="text-sm text-gray-500">Total</p><p className="text-xl font-bold">{contadores.total}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><Fuel size={20} className="text-green-600" /></div>
            <div><p className="text-sm text-gray-500">Activas</p><p className="text-xl font-bold">{contadores.activas}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg"><Fuel size={20} className="text-yellow-600" /></div>
            <div><p className="text-sm text-gray-500">Con Diesel</p><p className="text-xl font-bold">{contadores.conDiesel}</p></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
            </div>
            <div className="flex gap-2">
              {(['todos', 'activos', 'inactivos'] as const).map(f => (
                <button key={f} onClick={() => setFilterActivo(f)} className={`px-3 py-2 rounded-lg text-sm font-medium ${filterActivo === f ? (f === 'activos' ? 'bg-green-600 text-white' : f === 'inactivos' ? 'bg-gray-600 text-white' : 'bg-gray-900 text-white') : 'bg-gray-100 text-gray-700'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <select value={filterCombustible} onChange={(e) => setFilterCombustible(e.target.value as TipoCombustible | '')} className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none">
              <option value="">Todos los combustibles</option>
              {TIPOS_COMBUSTIBLE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center"><div className="w-12 h-12 border-4 border-[#BB0034] border-t-transparent rounded-full animate-spin mx-auto"></div></div>
        ) : estaciones.length === 0 ? (
          <div className="p-12 text-center"><Fuel size={32} className="mx-auto mb-4 text-gray-400" /><p className="text-gray-500">No hay estaciones</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Combustibles</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {estaciones.map(item => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${!item.activo ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center text-white">
                          <Fuel size={20} />
                        </div>
                        <span className="font-medium">{item.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-1 text-sm text-gray-600">
                        <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                        <div>
                          <p>{item.direccion.calle} {item.direccion.numero}</p>
                          <p className="text-xs text-gray-500">{item.direccion.municipio}, {item.direccion.estado}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {item.tiposCombustible.map(tipo => (
                          <span key={tipo} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCombustibleColor(tipo)}`}>
                            {TIPOS_COMBUSTIBLE.find(t => t.value === tipo)?.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.telefono ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone size={14} />
                          {item.telefono}
                        </div>
                      ) : <span className="text-gray-400 text-sm">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditar(item)} className="p-2 hover:bg-gray-100 rounded-lg"><Pencil size={18} className="text-gray-500" /></button>
                        <button onClick={() => handleToggleActivo(item)} className={`p-2 rounded-lg ${item.activo ? 'text-green-600' : 'text-gray-400'}`}>
                          {item.activo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button onClick={() => handleEliminar(item)} className="p-2 hover:bg-gray-100 rounded-lg"><Trash2 size={18} className="text-red-500" /></button>
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
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{editing ? 'Editar' : 'Nueva'} Estación</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
              </div>

              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input type="text" required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" placeholder="Ej: Gasolinera Pemex Centro" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Calle *</label>
                    <input type="text" required value={formData.direccion.calle} onChange={(e) => setFormData({ ...formData, direccion: { ...formData.direccion, calle: e.target.value } })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                    <input type="text" value={formData.direccion.numero} onChange={(e) => setFormData({ ...formData, direccion: { ...formData.direccion, numero: e.target.value } })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Colonia</label>
                    <input type="text" value={formData.direccion.colonia} onChange={(e) => setFormData({ ...formData, direccion: { ...formData.direccion, colonia: e.target.value } })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Municipio *</label>
                    <input type="text" required value={formData.direccion.municipio} onChange={(e) => setFormData({ ...formData, direccion: { ...formData.direccion, municipio: e.target.value } })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                    <input type="text" required value={formData.direccion.estado} onChange={(e) => setFormData({ ...formData, direccion: { ...formData.direccion, estado: e.target.value } })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input type="tel" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Combustibles disponibles *</label>
                  <div className="flex gap-2">
                    {TIPOS_COMBUSTIBLE.map(tipo => (
                      <button
                        key={tipo.value}
                        type="button"
                        onClick={() => toggleCombustible(tipo.value)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          formData.tiposCombustible.includes(tipo.value)
                            ? getCombustibleColor(tipo.value)
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {tipo.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none resize-none" />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
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
