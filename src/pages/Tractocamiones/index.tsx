import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import {
  Plus,
  Search,
  Truck,
  X,
  Pencil,
  Trash2,
  Gauge,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Fuel,
  MapPin,
  FileText,
  Ruler,
  Shield,
  Upload,
  FolderOpen,
  Download,
  File,
  Loader2,
} from 'lucide-react';
import {
  obtenerTractocamiones,
  crearTractocamion,
  actualizarTractocamion,
  desactivarTractocamion,
  reactivarTractocamion,
  eliminarTractocamion,
  subirDocumentoTractocamion,
  eliminarDocumentoTractocamion,
} from '../../services/truck.service';
import type { Tractocamion, TractocamionFormInput, TipoUnidad, DocumentoExpediente, TipoDocumento } from '../../types/truck.types';
import { MARCAS_TRACTOCAMION, TIPOS_UNIDAD, TIPOS_DOCUMENTO } from '../../types/truck.types';
import { formatFileSize } from '../../services/storage.service';

export default function TractocamionesPage() {
  const [tractocamiones, setTractocamiones] = useState<Tractocamion[]>([]);
  const [todosTractocamiones, setTodosTractocamiones] = useState<Tractocamion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tractocamion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState<'todos' | 'activos' | 'inactivos'>('activos');
  const [filterMarca, setFilterMarca] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Estado para modal de documentos
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [selectedTracto, setSelectedTracto] = useState<Tractocamion | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [docCategoria, setDocCategoria] = useState<TipoDocumento>('otro');

  const [formData, setFormData] = useState<TractocamionFormInput>({
    tipoUnidad: 'tractocamion',
    numeroEconomico: '',
    marca: '',
    modelo: '',
    año: new Date().getFullYear(),
    placas: '',
    numSerie: '',
    color: '',
    capacidadCombustible: undefined,
    rendimientoPromedio: undefined,
    odometroActual: 0,
    plataformaCarga: undefined,
    gpsId: '',
    tagId: '',
    seguro: undefined,
    fechaAdquisicion: undefined,
    foto: '',
    notas: '',
  });

  async function cargarDatos() {
    setLoading(true);
    try {
      const data = await obtenerTractocamiones();
      setTodosTractocamiones(data);
      aplicarFiltros(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  function aplicarFiltros(datos: Tractocamion[]) {
    let filtrados = [...datos];

    if (filterActivo === 'activos') filtrados = filtrados.filter(t => t.activo);
    else if (filterActivo === 'inactivos') filtrados = filtrados.filter(t => !t.activo);

    if (filterMarca) filtrados = filtrados.filter(t => t.marca === filterMarca);

    if (searchTerm) {
      const busqueda = searchTerm.toLowerCase();
      filtrados = filtrados.filter(t =>
        t.numeroEconomico.toLowerCase().includes(busqueda) ||
        t.marca.toLowerCase().includes(busqueda) ||
        t.modelo.toLowerCase().includes(busqueda) ||
        t.placas.toLowerCase().includes(busqueda)
      );
    }

    setTractocamiones(filtrados);
  }

  useEffect(() => { cargarDatos(); }, []);
  useEffect(() => { aplicarFiltros(todosTractocamiones); }, [filterActivo, filterMarca, searchTerm, todosTractocamiones]);

  function handleNuevo() {
    setEditing(null);
    setFormData({
      tipoUnidad: 'tractocamion',
      numeroEconomico: '',
      marca: '',
      modelo: '',
      año: new Date().getFullYear(),
      placas: '',
      numSerie: '',
      color: '',
      capacidadCombustible: undefined,
      rendimientoPromedio: undefined,
      odometroActual: 0,
      plataformaCarga: undefined,
      gpsId: '',
      tagId: '',
      fechaAdquisicion: undefined,
      foto: '',
      notas: '',
    });
    setError('');
    setShowModal(true);
  }

  function handleEditar(item: Tractocamion) {
    setEditing(item);
    setFormData({
      tipoUnidad: item.tipoUnidad || 'tractocamion',
      numeroEconomico: item.numeroEconomico,
      marca: item.marca,
      modelo: item.modelo,
      año: item.año,
      placas: item.placas,
      numSerie: item.numSerie,
      color: item.color || '',
      capacidadCombustible: item.capacidadCombustible,
      rendimientoPromedio: item.rendimientoPromedio,
      odometroActual: item.odometroActual || 0,
      plataformaCarga: item.plataformaCarga,
      gpsId: item.gpsId || '',
      tagId: item.tagId || '',
      seguro: item.seguro,
      fechaAdquisicion: item.fechaAdquisicion,
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
        await actualizarTractocamion(editing.id, formData);
      } else {
        await crearTractocamion(formData);
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

  async function handleToggleActivo(item: Tractocamion) {
    try {
      if (item.activo) await desactivarTractocamion(item.id);
      else await reactivarTractocamion(item.id);
      cargarDatos();
    } catch (err) {
      console.error('Error:', err);
    }
  }

  async function handleEliminar(item: Tractocamion) {
    if (!window.confirm(`¿Eliminar "${item.numeroEconomico}"?`)) return;
    try {
      await eliminarTractocamion(item.id);
      cargarDatos();
    } catch (err) {
      console.error('Error:', err);
    }
  }

  // Funciones para documentos
  function handleVerDocumentos(item: Tractocamion) {
    setSelectedTracto(item);
    setShowDocsModal(true);
  }

  async function handleSubirDocumento(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedTracto) return;

    setUploadingDoc(true);
    setUploadProgress(0);

    try {
      await subirDocumentoTractocamion(
        selectedTracto.id,
        file,
        docCategoria,
        undefined,
        (progress) => setUploadProgress(progress.progress)
      );

      // Recargar datos y actualizar el tracto seleccionado
      const datosActualizados = await obtenerTractocamiones();
      setTodosTractocamiones(datosActualizados);
      aplicarFiltros(datosActualizados);
      const tractoActualizado = datosActualizados.find(t => t.id === selectedTracto.id);
      if (tractoActualizado) setSelectedTracto(tractoActualizado);
    } catch (err) {
      console.error('Error al subir documento:', err);
      alert('Error al subir documento');
    } finally {
      setUploadingDoc(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  }

  async function handleEliminarDocumento(doc: DocumentoExpediente) {
    if (!selectedTracto) return;
    if (!window.confirm(`¿Eliminar "${doc.nombre}"?`)) return;

    try {
      await eliminarDocumentoTractocamion(selectedTracto.id, doc);

      // Recargar datos
      const datosActualizados = await obtenerTractocamiones();
      setTodosTractocamiones(datosActualizados);
      aplicarFiltros(datosActualizados);
      const tractoActualizado = datosActualizados.find(t => t.id === selectedTracto.id);
      if (tractoActualizado) setSelectedTracto(tractoActualizado);
    } catch (err) {
      console.error('Error al eliminar documento:', err);
      alert('Error al eliminar documento');
    }
  }

  const contadores = {
    total: todosTractocamiones.length,
    activos: todosTractocamiones.filter(t => t.activo).length,
    inactivos: todosTractocamiones.filter(t => !t.activo).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tractocamiones</h1>
          <p className="text-gray-600">Gestión de unidades tractoras</p>
        </div>
        <button onClick={handleNuevo} className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800">
          <Plus size={20} />
          Nuevo Tractocamión
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#BB0034]/10 rounded-lg"><Truck size={20} className="text-[#BB0034]" /></div>
            <div><p className="text-sm text-gray-500">Total</p><p className="text-xl font-bold">{contadores.total}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><Truck size={20} className="text-green-600" /></div>
            <div><p className="text-sm text-gray-500">Activos</p><p className="text-xl font-bold">{contadores.activos}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg"><Truck size={20} className="text-gray-500" /></div>
            <div><p className="text-sm text-gray-500">Inactivos</p><p className="text-xl font-bold">{contadores.inactivos}</p></div>
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
                    filterActivo === f ? (f === 'activos' ? 'bg-green-600 text-white' : f === 'inactivos' ? 'bg-gray-600 text-white' : 'bg-gray-900 text-white') : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <select
              value={filterMarca}
              onChange={(e) => setFilterMarca(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
            >
              <option value="">Todas las marcas</option>
              {MARCAS_TRACTOCAMION.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-[#BB0034] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : tractocamiones.length === 0 ? (
          <div className="p-12 text-center">
            <Truck size={32} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No hay tractocamiones</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca / Modelo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Placas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Odómetro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seguro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expediente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TAG/GPS</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tractocamiones.map(item => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${!item.activo ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${item.tipoUnidad === 'rolloff-plataforma' ? 'bg-orange-600' : 'bg-blue-600'} rounded-lg flex items-center justify-center text-white font-bold text-xs`}>
                          {item.numeroEconomico}
                        </div>
                        <div>
                          <p className="font-medium">{item.numeroEconomico}</p>
                          <p className="text-xs text-gray-500">
                            {item.tipoUnidad === 'rolloff-plataforma' ? 'Roll-Off' : 'Tracto'} • {item.año}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{item.marca}</p>
                      <p className="text-sm text-gray-500">{item.modelo}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm">{item.placas}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Gauge size={14} />
                        {(item.odometroActual || 0).toLocaleString()} km
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.seguro ? (
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1">
                            <Shield size={12} className="text-green-600" />
                            <span className="font-medium">{item.seguro.poliza}</span>
                          </div>
                          <p className="text-gray-500">${(item.seguro.costoAnual || 0).toLocaleString()}/año</p>
                          {item.seguro.vigenciaFin && (
                            <p className={`text-xs ${new Date(item.seguro.vigenciaFin) < new Date() ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                              Vence: {new Date(item.seguro.vigenciaFin).toLocaleDateString('es-MX')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin seguro</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleVerDocumentos(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                      >
                        <FolderOpen size={12} />
                        {item.documentos?.length || 0} docs
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs">
                        {item.tagId && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">TAG: {item.tagId}</span>}
                        {item.gpsId && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded"><MapPin size={10} /> {item.gpsId}</span>}
                      </div>
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
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{editing ? 'Editar' : 'Nuevo'} Tractocamión</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
              </div>

              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2"><Truck size={16} /> Datos del Vehículo</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Unidad *</label>
                      <select required value={formData.tipoUnidad} onChange={(e) => setFormData({ ...formData, tipoUnidad: e.target.value as TipoUnidad })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none">
                        {TIPOS_UNIDAD.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">No. Económico *</label>
                      <input type="text" required value={formData.numeroEconomico} onChange={(e) => setFormData({ ...formData, numeroEconomico: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                      <select required value={formData.marca} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none">
                        <option value="">Seleccionar...</option>
                        {MARCAS_TRACTOCAMION.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
                      <input type="text" required value={formData.modelo} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Año *</label>
                      <input type="number" required min="1990" max="2030" value={formData.año} onChange={(e) => setFormData({ ...formData, año: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Placas *</label>
                      <input type="text" required value={formData.placas} onChange={(e) => setFormData({ ...formData, placas: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">No. Serie (VIN) *</label>
                      <input type="text" required value={formData.numSerie} onChange={(e) => setFormData({ ...formData, numSerie: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                      <input type="text" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2"><Fuel size={16} /> Combustible y Rendimiento</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad Tanque (L)</label>
                      <input type="number" value={formData.capacidadCombustible || ''} onChange={(e) => setFormData({ ...formData, capacidadCombustible: parseFloat(e.target.value) || undefined })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rendimiento (km/L)</label>
                      <input type="number" step="0.1" value={formData.rendimientoPromedio || ''} onChange={(e) => setFormData({ ...formData, rendimientoPromedio: parseFloat(e.target.value) || undefined })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Odómetro actual (km)</label>
                      <input type="number" value={formData.odometroActual || ''} onChange={(e) => setFormData({ ...formData, odometroActual: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2"><MapPin size={16} /> Integraciones</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID GPS (Mastrack)</label>
                      <input type="text" value={formData.gpsId} onChange={(e) => setFormData({ ...formData, gpsId: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">No. TAG (Casetas)</label>
                      <input type="text" value={formData.tagId} onChange={(e) => setFormData({ ...formData, tagId: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none" />
                    </div>
                  </div>
                </div>

                {formData.tipoUnidad === 'rolloff-plataforma' && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2"><Ruler size={16} /> Capacidad de Carga (Plataforma)</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Largo (m)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.plataformaCarga?.largo || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            plataformaCarga: {
                              largo: parseFloat(e.target.value) || 0,
                              ancho: formData.plataformaCarga?.ancho || 0,
                              capacidadToneladas: formData.plataformaCarga?.capacidadToneladas || 0,
                            }
                          })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                          placeholder="ej. 12.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ancho (m)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.plataformaCarga?.ancho || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            plataformaCarga: {
                              largo: formData.plataformaCarga?.largo || 0,
                              ancho: parseFloat(e.target.value) || 0,
                              capacidadToneladas: formData.plataformaCarga?.capacidadToneladas || 0,
                            }
                          })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                          placeholder="ej. 2.6"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad (ton)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.plataformaCarga?.capacidadToneladas || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            plataformaCarga: {
                              largo: formData.plataformaCarga?.largo || 0,
                              ancho: formData.plataformaCarga?.ancho || 0,
                              capacidadToneladas: parseFloat(e.target.value) || 0,
                            }
                          })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                          placeholder="ej. 25"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Estas dimensiones se usan para calcular si una maquinaria cabe en la plataforma.</p>
                  </div>
                )}

                {/* Seguro */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Shield size={16} /> Póliza de Seguro
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">No. Póliza</label>
                      <input
                        type="text"
                        value={formData.seguro?.poliza || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          seguro: {
                            poliza: e.target.value,
                            aseguradora: formData.seguro?.aseguradora || '',
                            costoAnual: formData.seguro?.costoAnual || 0,
                            vigenciaInicio: formData.seguro?.vigenciaInicio,
                            vigenciaFin: formData.seguro?.vigenciaFin,
                          }
                        })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                        placeholder="ej. POL-2025-12345"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Aseguradora</label>
                      <input
                        type="text"
                        value={formData.seguro?.aseguradora || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          seguro: {
                            poliza: formData.seguro?.poliza || '',
                            aseguradora: e.target.value,
                            costoAnual: formData.seguro?.costoAnual || 0,
                            vigenciaInicio: formData.seguro?.vigenciaInicio,
                            vigenciaFin: formData.seguro?.vigenciaFin,
                          }
                        })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                        placeholder="ej. GNP, Qualitas, HDI"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Costo Anual (MXN)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.seguro?.costoAnual || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          seguro: {
                            poliza: formData.seguro?.poliza || '',
                            aseguradora: formData.seguro?.aseguradora || '',
                            costoAnual: parseFloat(e.target.value) || 0,
                            vigenciaInicio: formData.seguro?.vigenciaInicio,
                            vigenciaFin: formData.seguro?.vigenciaFin,
                          }
                        })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                        placeholder="ej. 45000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vigencia Inicio</label>
                      <input
                        type="date"
                        value={formData.seguro?.vigenciaInicio instanceof Date
                          ? formData.seguro.vigenciaInicio.toISOString().split('T')[0]
                          : formData.seguro?.vigenciaInicio || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          seguro: {
                            poliza: formData.seguro?.poliza || '',
                            aseguradora: formData.seguro?.aseguradora || '',
                            costoAnual: formData.seguro?.costoAnual || 0,
                            vigenciaInicio: e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined,
                            vigenciaFin: formData.seguro?.vigenciaFin,
                          }
                        })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vigencia Fin</label>
                      <input
                        type="date"
                        value={formData.seguro?.vigenciaFin instanceof Date
                          ? formData.seguro.vigenciaFin.toISOString().split('T')[0]
                          : formData.seguro?.vigenciaFin || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          seguro: {
                            poliza: formData.seguro?.poliza || '',
                            aseguradora: formData.seguro?.aseguradora || '',
                            costoAnual: formData.seguro?.costoAnual || 0,
                            vigenciaInicio: formData.seguro?.vigenciaInicio,
                            vigenciaFin: e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined,
                          }
                        })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none resize-none" />
                </div>

                <div className="flex gap-3 pt-4 border-t">
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

      {/* Modal de Documentos */}
      {showDocsModal && selectedTracto && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowDocsModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Expediente de Documentos</h2>
                  <p className="text-sm text-gray-500">{selectedTracto.numeroEconomico} - {selectedTracto.marca} {selectedTracto.modelo}</p>
                </div>
                <button onClick={() => setShowDocsModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
              </div>

              {/* Subir documento */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Upload size={16} /> Subir nuevo documento
                </h3>
                <div className="flex gap-3">
                  <select
                    value={docCategoria}
                    onChange={(e) => setDocCategoria(e.target.value as TipoDocumento)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                  >
                    {TIPOS_DOCUMENTO.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <label className="flex-1">
                    <input
                      type="file"
                      onChange={handleSubirDocumento}
                      disabled={uploadingDoc}
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                    />
                    <div className={`flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploadingDoc ? 'bg-gray-100 border-gray-300' : 'border-purple-300 hover:border-purple-500 hover:bg-purple-50'}`}>
                      {uploadingDoc ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-sm">Subiendo... {Math.round(uploadProgress)}%</span>
                        </>
                      ) : (
                        <>
                          <Upload size={16} className="text-purple-600" />
                          <span className="text-sm text-gray-600">Seleccionar archivo (PDF, DOC)</span>
                        </>
                      )}
                    </div>
                  </label>
                </div>
                {uploadingDoc && (
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
              </div>

              {/* Lista de documentos */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Documentos ({selectedTracto.documentos?.length || 0})
                </h3>
                {!selectedTracto.documentos?.length ? (
                  <div className="text-center py-8 text-gray-400">
                    <FolderOpen size={32} className="mx-auto mb-2" />
                    <p>No hay documentos en el expediente</p>
                  </div>
                ) : (
                  selectedTracto.documentos.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:bg-gray-50">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <File size={20} className="text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.nombre}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded">
                            {TIPOS_DOCUMENTO.find(t => t.value === doc.categoria)?.label || doc.categoria}
                          </span>
                          <span>{formatFileSize(doc.tamaño)}</span>
                          <span>{new Date(doc.fechaSubida).toLocaleDateString('es-MX')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                          title="Descargar"
                        >
                          <Download size={16} />
                        </a>
                        <button
                          onClick={() => handleEliminarDocumento(doc)}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-500"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowDocsModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
