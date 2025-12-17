import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import {
  Plus,
  Search,
  Package,
  X,
  Pencil,
  Trash2,
  HardHat,
  Wrench,
  Box,
  Truck,
  User,
} from 'lucide-react';
import {
  obtenerInventario,
  crearItem,
  actualizarItem,
  eliminarItem,
} from '../../services/inventory.service';
import { obtenerOperadores } from '../../services/operator.service';
import { obtenerTractocamiones } from '../../services/truck.service';
import type { ItemInventario, ItemInventarioFormInput, CategoriaInventario, CondicionItem } from '../../types/inventory.types';
import { CATEGORIAS_INVENTARIO, CONDICIONES_ITEM, EPP_COMUNES, HERRAMIENTAS_COMUNES } from '../../types/inventory.types';

export default function InventarioPage() {
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [todosItems, setTodosItems] = useState<ItemInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ItemInventario | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<CategoriaInventario | ''>('');
  const [filterCondicion, setFilterCondicion] = useState<CondicionItem | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [operadores, setOperadores] = useState<{ id: string; nombre: string }[]>([]);
  const [tractocamiones, setTractocamiones] = useState<{ id: string; label: string }[]>([]);

  const [formData, setFormData] = useState<ItemInventarioFormInput>({
    nombre: '',
    categoria: 'epp',
    cantidad: 1,
    condicion: 'bueno',
    asignadoA: undefined,
    foto: '',
    notas: '',
  });

  async function cargarDatos() {
    setLoading(true);
    try {
      const [itemsData, operadoresData, tractosData] = await Promise.all([
        obtenerInventario(),
        obtenerOperadores({ activo: true }),
        obtenerTractocamiones({ activo: true }),
      ]);
      setTodosItems(itemsData);
      setOperadores(operadoresData.map(o => ({ id: o.id, nombre: o.nombre })));
      setTractocamiones(tractosData.map(t => ({ id: t.id, label: `${t.numeroEconomico} - ${t.marca}` })));
      aplicarFiltros(itemsData);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  function aplicarFiltros(datos: ItemInventario[]) {
    let filtrados = [...datos];

    if (filterCategoria) filtrados = filtrados.filter(i => i.categoria === filterCategoria);
    if (filterCondicion) filtrados = filtrados.filter(i => i.condicion === filterCondicion);

    if (searchTerm) {
      const busqueda = searchTerm.toLowerCase();
      filtrados = filtrados.filter(i =>
        i.nombre.toLowerCase().includes(busqueda) ||
        i.asignadoA?.nombre?.toLowerCase().includes(busqueda)
      );
    }

    setItems(filtrados);
  }

  useEffect(() => { cargarDatos(); }, []);
  useEffect(() => { aplicarFiltros(todosItems); }, [filterCategoria, filterCondicion, searchTerm, todosItems]);

  function handleNuevo() {
    setEditing(null);
    setFormData({
      nombre: '',
      categoria: 'epp',
      cantidad: 1,
      condicion: 'bueno',
      asignadoA: undefined,
      foto: '',
      notas: '',
    });
    setError('');
    setShowModal(true);
  }

  function handleEditar(item: ItemInventario) {
    setEditing(item);
    setFormData({
      nombre: item.nombre,
      categoria: item.categoria,
      cantidad: item.cantidad,
      condicion: item.condicion,
      asignadoA: item.asignadoA,
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
        await actualizarItem(editing.id, formData);
      } else {
        await crearItem(formData);
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

  async function handleEliminar(item: ItemInventario) {
    if (!window.confirm(`¿Eliminar "${item.nombre}"?`)) return;
    try {
      await eliminarItem(item.id);
      cargarDatos();
    } catch (err) {
      console.error('Error:', err);
    }
  }

  function handleAsignacionChange(tipo: 'almacen' | 'operador' | 'tracto', id: string) {
    if (tipo === 'almacen') {
      setFormData({ ...formData, asignadoA: { tipo: 'almacen', id: 'almacen', nombre: 'Almacén' } });
    } else if (tipo === 'operador') {
      const op = operadores.find(o => o.id === id);
      if (op) setFormData({ ...formData, asignadoA: { tipo: 'operador', id, nombre: op.nombre } });
    } else if (tipo === 'tracto') {
      const tr = tractocamiones.find(t => t.id === id);
      if (tr) setFormData({ ...formData, asignadoA: { tipo: 'tracto', id, nombre: tr.label } });
    }
  }

  const getCategoriaIcon = (cat: CategoriaInventario) => {
    switch (cat) {
      case 'epp': return <HardHat size={16} className="text-yellow-600" />;
      case 'herramienta': return <Wrench size={16} className="text-blue-600" />;
      default: return <Box size={16} className="text-gray-600" />;
    }
  };

  const getCondicionColor = (cond: CondicionItem) => {
    switch (cond) {
      case 'nuevo': return 'bg-green-100 text-green-700';
      case 'bueno': return 'bg-blue-100 text-blue-700';
      case 'regular': return 'bg-yellow-100 text-yellow-700';
      case 'malo': return 'bg-red-100 text-red-700';
    }
  };

  const contadores = {
    total: todosItems.length,
    epp: todosItems.filter(i => i.categoria === 'epp').length,
    herramientas: todosItems.filter(i => i.categoria === 'herramienta').length,
    enMalEstado: todosItems.filter(i => i.condicion === 'malo').length,
  };

  const sugerenciasNombre = formData.categoria === 'epp' ? EPP_COMUNES : formData.categoria === 'herramienta' ? HERRAMIENTAS_COMUNES : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario EPP y Herramientas</h1>
          <p className="text-gray-600">Control de equipo y herramientas en resguardo</p>
        </div>
        <button onClick={handleNuevo} className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800">
          <Plus size={20} />
          Nuevo Item
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#BB0034]/10 rounded-lg"><Package size={20} className="text-[#BB0034]" /></div>
            <div><p className="text-sm text-gray-500">Total Items</p><p className="text-xl font-bold">{contadores.total}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg"><HardHat size={20} className="text-yellow-600" /></div>
            <div><p className="text-sm text-gray-500">EPP</p><p className="text-xl font-bold">{contadores.epp}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Wrench size={20} className="text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Herramientas</p><p className="text-xl font-bold">{contadores.herramientas}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg"><Package size={20} className="text-red-600" /></div>
            <div><p className="text-sm text-gray-500">Mal estado</p><p className="text-xl font-bold">{contadores.enMalEstado}</p></div>
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
            <select value={filterCategoria} onChange={(e) => setFilterCategoria(e.target.value as CategoriaInventario | '')} className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none">
              <option value="">Todas las categorías</option>
              {CATEGORIAS_INVENTARIO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={filterCondicion} onChange={(e) => setFilterCondicion(e.target.value as CondicionItem | '')} className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none">
              <option value="">Todas las condiciones</option>
              {CONDICIONES_ITEM.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center"><div className="w-12 h-12 border-4 border-[#BB0034] border-t-transparent rounded-full animate-spin mx-auto"></div></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center"><Package size={32} className="mx-auto mb-4 text-gray-400" /><p className="text-gray-500">No hay items</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condición</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asignado a</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getCategoriaIcon(item.categoria)}
                        <span className="font-medium">{item.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {CATEGORIAS_INVENTARIO.find(c => c.value === item.categoria)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">{item.cantidad}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getCondicionColor(item.condicion)}`}>
                        {CONDICIONES_ITEM.find(c => c.value === item.condicion)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.asignadoA ? (
                        <div className="flex items-center gap-1 text-sm">
                          {item.asignadoA.tipo === 'operador' ? <User size={14} /> : item.asignadoA.tipo === 'tracto' ? <Truck size={14} /> : <Box size={14} />}
                          {item.asignadoA.nombre}
                        </div>
                      ) : <span className="text-gray-400 text-sm">Sin asignar</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditar(item)} className="p-2 hover:bg-gray-100 rounded-lg"><Pencil size={18} className="text-gray-500" /></button>
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
                <h2 className="text-xl font-semibold">{editing ? 'Editar' : 'Nuevo'} Item</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
              </div>

              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                  <select value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value as CategoriaInventario, nombre: '' })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none">
                    {CATEGORIAS_INVENTARIO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input type="text" required list="sugerencias" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                  <datalist id="sugerencias">
                    {sugerenciasNombre.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
                    <input type="number" required min="1" value={formData.cantidad} onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condición *</label>
                    <select value={formData.condicion} onChange={(e) => setFormData({ ...formData, condicion: e.target.value as CondicionItem })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none">
                      {CONDICIONES_ITEM.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Asignar a</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleAsignacionChange('almacen', 'almacen')} className={`flex-1 px-3 py-2 rounded-lg text-sm ${formData.asignadoA?.tipo === 'almacen' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
                      <Box size={14} className="inline mr-1" /> Almacén
                    </button>
                    <select value={formData.asignadoA?.tipo === 'operador' ? formData.asignadoA.id : ''} onChange={(e) => handleAsignacionChange('operador', e.target.value)} className={`flex-1 px-3 py-2 border rounded-lg text-sm ${formData.asignadoA?.tipo === 'operador' ? 'ring-2 ring-[#BB0034]' : ''}`}>
                      <option value="">Operador...</option>
                      {operadores.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                    </select>
                    <select value={formData.asignadoA?.tipo === 'tracto' ? formData.asignadoA.id : ''} onChange={(e) => handleAsignacionChange('tracto', e.target.value)} className={`flex-1 px-3 py-2 border rounded-lg text-sm ${formData.asignadoA?.tipo === 'tracto' ? 'ring-2 ring-[#BB0034]' : ''}`}>
                      <option value="">Tracto...</option>
                      {tractocamiones.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
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
