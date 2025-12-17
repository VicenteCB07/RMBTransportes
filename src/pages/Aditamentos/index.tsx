import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import {
  Plus,
  Search,
  Container,
  X,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Ruler,
  Weight,
} from 'lucide-react';
import {
  obtenerAditamentos,
  crearAditamento,
  actualizarAditamento,
  desactivarAditamento,
  reactivarAditamento,
  eliminarAditamento,
} from '../../services/attachment.service';
import type { Aditamento, AditamentoFormInput, TipoAditamento } from '../../types/attachment.types';
import { TIPOS_ADITAMENTO } from '../../types/attachment.types';

export default function AditamentosPage() {
  const [aditamentos, setAditamentos] = useState<Aditamento[]>([]);
  const [todosAditamentos, setTodosAditamentos] = useState<Aditamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Aditamento | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState<'todos' | 'activos' | 'inactivos'>('activos');
  const [filterTipo, setFilterTipo] = useState<TipoAditamento | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<AditamentoFormInput>({
    numeroEconomico: '',
    tipo: 'lowboy',
    marca: '',
    modelo: '',
    año: undefined,
    placas: '',
    numSerie: '',
    capacidadCarga: undefined,
    largo: undefined,
    ancho: undefined,
    foto: '',
    notas: '',
  });

  async function cargarDatos() {
    setLoading(true);
    try {
      const data = await obtenerAditamentos();
      setTodosAditamentos(data);
      aplicarFiltros(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  function aplicarFiltros(datos: Aditamento[]) {
    let filtrados = [...datos];

    if (filterActivo === 'activos') filtrados = filtrados.filter(a => a.activo);
    else if (filterActivo === 'inactivos') filtrados = filtrados.filter(a => !a.activo);

    if (filterTipo) filtrados = filtrados.filter(a => a.tipo === filterTipo);

    if (searchTerm) {
      const busqueda = searchTerm.toLowerCase();
      filtrados = filtrados.filter(a =>
        a.numeroEconomico.toLowerCase().includes(busqueda) ||
        a.tipo.toLowerCase().includes(busqueda) ||
        a.marca?.toLowerCase().includes(busqueda)
      );
    }

    setAditamentos(filtrados);
  }

  useEffect(() => { cargarDatos(); }, []);
  useEffect(() => { aplicarFiltros(todosAditamentos); }, [filterActivo, filterTipo, searchTerm, todosAditamentos]);

  function handleNuevo() {
    setEditing(null);
    setFormData({
      numeroEconomico: '',
      tipo: 'lowboy',
      marca: '',
      modelo: '',
      año: undefined,
      placas: '',
      numSerie: '',
      capacidadCarga: undefined,
      largo: undefined,
      ancho: undefined,
      foto: '',
      notas: '',
    });
    setError('');
    setShowModal(true);
  }

  function handleEditar(item: Aditamento) {
    setEditing(item);
    setFormData({
      numeroEconomico: item.numeroEconomico,
      tipo: item.tipo,
      marca: item.marca || '',
      modelo: item.modelo || '',
      año: item.año,
      placas: item.placas || '',
      numSerie: item.numSerie || '',
      capacidadCarga: item.capacidadCarga,
      largo: item.largo,
      ancho: item.ancho,
      foto: item.foto || '',
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
        await actualizarAditamento(editing.id, formData);
      } else {
        await crearAditamento(formData);
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

  async function handleToggleActivo(item: Aditamento) {
    try {
      if (item.activo) await desactivarAditamento(item.id);
      else await reactivarAditamento(item.id);
      cargarDatos();
    } catch (err) {
      console.error('Error:', err);
    }
  }

  async function handleEliminar(item: Aditamento) {
    if (!window.confirm(`¿Eliminar "${item.numeroEconomico}"?`)) return;
    try {
      await eliminarAditamento(item.id);
      cargarDatos();
    } catch (err) {
      console.error('Error:', err);
    }
  }

  const getTipoInfo = (tipo: TipoAditamento) => TIPOS_ADITAMENTO.find(t => t.value === tipo);

  const contadores = {
    total: todosAditamentos.length,
    activos: todosAditamentos.filter(a => a.activo).length,
    lowboys: todosAditamentos.filter(a => a.tipo === 'lowboy' && a.activo).length,
    plataformas: todosAditamentos.filter(a => a.tipo === 'plataforma-rolloff' && a.activo).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aditamentos</h1>
          <p className="text-gray-600">Lowboys, plataformas y remolques</p>
        </div>
        <button onClick={handleNuevo} className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800">
          <Plus size={20} />
          Nuevo Aditamento
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#BB0034]/10 rounded-lg"><Container size={20} className="text-[#BB0034]" /></div>
            <div><p className="text-sm text-gray-500">Total</p><p className="text-xl font-bold">{contadores.total}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><Container size={20} className="text-green-600" /></div>
            <div><p className="text-sm text-gray-500">Activos</p><p className="text-xl font-bold">{contadores.activos}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg"><Container size={20} className="text-orange-600" /></div>
            <div><p className="text-sm text-gray-500">Lowboys</p><p className="text-xl font-bold">{contadores.lowboys}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Container size={20} className="text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Roll-Off</p><p className="text-xl font-bold">{contadores.plataformas}</p></div>
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
            <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value as TipoAditamento | '')} className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none">
              <option value="">Todos los tipos</option>
              {TIPOS_ADITAMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center"><div className="w-12 h-12 border-4 border-[#BB0034] border-t-transparent rounded-full animate-spin mx-auto"></div></div>
        ) : aditamentos.length === 0 ? (
          <div className="p-12 text-center"><Container size={32} className="mx-auto mb-4 text-gray-400" /><p className="text-gray-500">No hay aditamentos</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aditamento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dimensiones</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Placas</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {aditamentos.map(item => {
                  const tipoInfo = getTipoInfo(item.tipo);
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 ${!item.activo ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                            {item.numeroEconomico}
                          </div>
                          <div>
                            <p className="font-medium">{item.numeroEconomico}</p>
                            {item.marca && <p className="text-xs text-gray-500">{item.marca} {item.modelo}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          item.tipo === 'lowboy' ? 'bg-orange-100 text-orange-700' :
                          item.tipo === 'plataforma-rolloff' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {tipoInfo?.label || item.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(item.largo || item.ancho) ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Ruler size={14} />
                            {item.largo && `${item.largo}m`}
                            {item.largo && item.ancho && ' x '}
                            {item.ancho && `${item.ancho}m`}
                          </div>
                        ) : <span className="text-gray-400 text-sm">-</span>}
                      </td>
                      <td className="px-6 py-4">
                        {item.capacidadCarga ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Weight size={14} />
                            {item.capacidadCarga} ton
                          </div>
                        ) : <span className="text-gray-400 text-sm">-</span>}
                      </td>
                      <td className="px-6 py-4">
                        {item.placas ? <span className="font-mono text-sm">{item.placas}</span> : <span className="text-gray-400 text-sm">-</span>}
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
                  );
                })}
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
                <h2 className="text-xl font-semibold">{editing ? 'Editar' : 'Nuevo'} Aditamento</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
              </div>

              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">No. Económico *</label>
                    <input type="text" required value={formData.numeroEconomico} onChange={(e) => setFormData({ ...formData, numeroEconomico: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select required value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoAditamento })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none">
                      {TIPOS_ADITAMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                    <input type="text" value={formData.marca} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                    <input type="text" value={formData.modelo} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Placas</label>
                    <input type="text" value={formData.placas} onChange={(e) => setFormData({ ...formData, placas: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad (ton)</label>
                    <input type="number" value={formData.capacidadCarga || ''} onChange={(e) => setFormData({ ...formData, capacidadCarga: parseFloat(e.target.value) || undefined })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Largo (m)</label>
                    <input type="number" step="0.1" value={formData.largo || ''} onChange={(e) => setFormData({ ...formData, largo: parseFloat(e.target.value) || undefined })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ancho (m)</label>
                    <input type="number" step="0.1" value={formData.ancho || ''} onChange={(e) => setFormData({ ...formData, ancho: parseFloat(e.target.value) || undefined })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
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
