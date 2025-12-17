/**
 * Módulo de Casetas/Peajes
 * Registro manual e importación desde sistemas TAG (IAVE, Televia, Viapass)
 */

import { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  Upload,
  Search,
  Filter,
  Download,
  RefreshCw,
  Link2,
  Unlink,
  AlertCircle,
  CheckCircle,
  Clock,
  Truck,
  DollarSign,
  Calendar,
  FileSpreadsheet,
  X,
  Plus,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import {
  obtenerCasetas,
  registrarCaseta,
  importarDesdeIAVE,
  importarDesdeTelevia,
  importarDesdeViapass,
  correlacionarCasetasAutomaticamente,
  correlacionarCasetaManualmente,
  obtenerEstadisticasCasetas,
  obtenerHistorialImportaciones,
} from '../../services/toll.service';
import type {
  Caseta,
  CasetaFormInput,
  FiltrosCaseta,
  ImportacionTAG,
  MetodoPagoCaseta,
  EstadisticasCasetas,
} from '../../types/toll.types';
import * as XLSX from 'xlsx';

const METODOS_PAGO: { value: MetodoPagoCaseta; label: string }[] = [
  { value: 'TAG_IAVE', label: 'TAG IAVE' },
  { value: 'TAG_TELEVIA', label: 'TAG Televia' },
  { value: 'TAG_VIAPASS', label: 'TAG Viapass' },
  { value: 'TAG_PASE', label: 'TAG PASE' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
];

export default function Casetas() {
  const [casetas, setCasetas] = useState<Caseta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCorrelacionado, setFiltroCorrelacionado] = useState<boolean | undefined>(undefined);
  const [modalRegistro, setModalRegistro] = useState(false);
  const [modalImportacion, setModalImportacion] = useState(false);
  const [importando, setImportando] = useState(false);
  const [stats, setStats] = useState<EstadisticasCasetas | null>(null);
  const [historialImportaciones, setHistorialImportaciones] = useState<ImportacionTAG[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form de registro manual
  const [formData, setFormData] = useState<CasetaFormInput>({
    vehiculoId: '',
    fecha: new Date(),
    hora: '',
    nombreCaseta: '',
    importe: 0,
    metodoPago: 'TAG_IAVE',
  });

  // Estado de importación
  const [tipoImportacion, setTipoImportacion] = useState<'IAVE' | 'TELEVIA' | 'VIAPASS'>('IAVE');
  const [archivoImportacion, setArchivoImportacion] = useState<File | null>(null);
  const [resultadoImportacion, setResultadoImportacion] = useState<ImportacionTAG | null>(null);

  // Mapeo de TAGs a vehículos (esto debería venir de configuración)
  const [mapeoTags, setMapeoTags] = useState<Record<string, string>>({
    // TAG -> vehiculoId
  });

  useEffect(() => {
    cargarDatos();
  }, [filtroCorrelacionado]);

  async function cargarDatos() {
    setLoading(true);
    try {
      const filtros: FiltrosCaseta = {};
      if (filtroCorrelacionado !== undefined) {
        filtros.correlacionado = filtroCorrelacionado;
      }

      const [casetasData, statsData, historialData] = await Promise.all([
        obtenerCasetas(filtros),
        obtenerEstadisticasCasetas(),
        obtenerHistorialImportaciones(),
      ]);

      setCasetas(casetasData);
      setStats(statsData);
      setHistorialImportaciones(historialData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  }

  const casetasFiltradas = casetas.filter(c =>
    c.nombreCaseta.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.vehiculoId.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.numeroEconomico.toLowerCase().includes(busqueda.toLowerCase())
  );

  async function guardarCaseta() {
    try {
      await registrarCaseta(formData);
      setModalRegistro(false);
      setFormData({
        vehiculoId: '',
        fecha: new Date(),
        hora: '',
        nombreCaseta: '',
        importe: 0,
        metodoPago: 'TAG_IAVE',
      });
      cargarDatos();
    } catch (error) {
      console.error('Error al guardar caseta:', error);
    }
  }

  async function handleImportarArchivo() {
    if (!archivoImportacion) return;

    setImportando(true);
    try {
      const data = await archivoImportacion.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const registros = XLSX.utils.sheet_to_json(sheet);

      let resultado: ImportacionTAG;

      if (tipoImportacion === 'IAVE') {
        // Parsear formato IAVE
        const registrosIAVE = registros.map((r: any) => ({
          fecha: r.Fecha || r.fecha,
          hora: r.Hora || r.hora,
          tag: r.TAG || r.Tag || r.tag,
          plaza: r.Plaza || r.plaza || r.Caseta || r.caseta,
          carril: r.Carril || r.carril || '',
          importe: parseFloat(r.Importe || r.importe || r.Monto || r.monto || 0),
        }));
        resultado = await importarDesdeIAVE(registrosIAVE, mapeoTags, 'user');
      } else if (tipoImportacion === 'TELEVIA') {
        const registrosTelevia = registros.map((r: any) => ({
          fechaHora: r['Fecha/Hora'] || r.FechaHora || `${r.Fecha} ${r.Hora}`,
          numeroTag: r.TAG || r.Tag || r.tag,
          plaza: r.Plaza || r.plaza,
          tarifa: r.Tarifa || r.tarifa || '',
          monto: parseFloat(r.Monto || r.monto || r.Importe || 0),
          estatus: r.Estatus || r.estatus || '',
        }));
        resultado = await importarDesdeTelevia(registrosTelevia, mapeoTags, 'user');
      } else {
        const registrosViapass = registros.map((r: any) => ({
          Date: r.Date || r.Fecha,
          Time: r.Time || r.Hora,
          TAG: r.TAG || r.Tag,
          Toll: r.Toll || r.Plaza || r.Caseta,
          Amount: parseFloat(r.Amount || r.Monto || r.Importe || 0),
          Balance: parseFloat(r.Balance || r.Saldo || 0),
        }));
        resultado = await importarDesdeViapass(registrosViapass, mapeoTags, 'user');
      }

      setResultadoImportacion(resultado);
      cargarDatos();
    } catch (error) {
      console.error('Error en importación:', error);
      alert('Error al importar archivo. Verifica el formato.');
    } finally {
      setImportando(false);
    }
  }

  async function handleCorrelacionarAutomatico() {
    try {
      const resultado = await correlacionarCasetasAutomaticamente();
      alert(`Correlación completada:\n- Correlacionadas: ${resultado.correlacionadas}\n- Sin correlacionar: ${resultado.sinCorrelacionar}`);
      cargarDatos();
    } catch (error) {
      console.error('Error en correlación:', error);
    }
  }

  function formatearFecha(fecha?: Date): string {
    if (!fecha) return '--';
    return fecha.toLocaleDateString('es-MX');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Casetas</h1>
          <p className="text-gray-600">Gestión de peajes e importación de datos TAG</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalImportacion(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Upload className="w-5 h-5" />
            Importar TAG
          </button>
          <button
            onClick={() => setModalRegistro(true)}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            <Plus className="w-5 h-5" />
            Registrar Manual
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs">Total Cruces</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalCruces.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Gasto Total</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              ${stats.gastoTotal.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Promedio/Día</span>
            </div>
            <p className="text-2xl font-bold">
              ${stats.gastoPromedioDiario.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-2 text-blue-500 mb-1">
              <MapPin className="w-4 h-4" />
              <span className="text-xs">Más Frecuente</span>
            </div>
            <p className="text-sm font-medium truncate" title={stats.casetaMasFrecuente}>
              {stats.casetaMasFrecuente || '--'}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-2 text-purple-500 mb-1">
              <Truck className="w-4 h-4" />
              <span className="text-xs">Mayor Gasto</span>
            </div>
            <p className="text-lg font-bold">
              {stats.vehiculoMayorGasto || '--'}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <Link2 className="w-4 h-4" />
              <span className="text-xs">% Correlacionado</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {stats.porcentajeCorrelacionado.toFixed(0)}%
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 border">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por caseta, vehículo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltroCorrelacionado(undefined)}
              className={`px-3 py-1.5 rounded-lg text-sm ${filtroCorrelacionado === undefined ? 'bg-black text-white' : 'bg-gray-100'
                }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroCorrelacionado(true)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${filtroCorrelacionado === true ? 'bg-black text-white' : 'bg-gray-100'
                }`}
            >
              <Link2 className="w-3 h-3" />
              Correlacionados
            </button>
            <button
              onClick={() => setFiltroCorrelacionado(false)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${filtroCorrelacionado === false ? 'bg-black text-white' : 'bg-gray-100'
                }`}
            >
              <Unlink className="w-3 h-3" />
              Sin Correlacionar
            </button>
          </div>

          <button
            onClick={handleCorrelacionarAutomatico}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Auto-correlacionar
          </button>
        </div>
      </div>

      {/* Lista de casetas */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando casetas...</div>
        ) : casetasFiltradas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron registros de casetas
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600">Fecha/Hora</th>
                  <th className="text-left p-4 font-medium text-gray-600">Vehículo</th>
                  <th className="text-left p-4 font-medium text-gray-600">Caseta</th>
                  <th className="text-right p-4 font-medium text-gray-600">Importe</th>
                  <th className="text-center p-4 font-medium text-gray-600">Método</th>
                  <th className="text-center p-4 font-medium text-gray-600">Viaje</th>
                  <th className="text-center p-4 font-medium text-gray-600">Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {casetasFiltradas.slice(0, 100).map((caseta) => (
                  <tr key={caseta.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{formatearFecha(caseta.fecha)}</p>
                          <p className="text-xs text-gray-500">{caseta.hora}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">{caseta.vehiculoId || caseta.numeroEconomico}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{caseta.nombreCaseta}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-medium">${caseta.importe.toLocaleString()}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                        {caseta.metodoPago.replace('TAG_', '')}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {caseta.correlacionado ? (
                        <span className="flex items-center justify-center gap-1 text-green-600">
                          <Link2 className="w-4 h-4" />
                          <span className="text-xs">{caseta.viajeId?.slice(0, 8)}...</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          <Unlink className="w-4 h-4 mx-auto" />
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${caseta.fuenteDatos === 'MANUAL'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                        }`}>
                        {caseta.fuenteDatos.replace('IMPORTACION_', '')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {casetasFiltradas.length > 100 && (
          <div className="p-4 text-center text-gray-500 bg-gray-50 border-t">
            Mostrando 100 de {casetasFiltradas.length} registros
          </div>
        )}
      </div>

      {/* Modal de Registro Manual */}
      {modalRegistro && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Registrar Caseta</h2>
              <button onClick={() => setModalRegistro(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehículo *
                </label>
                <select
                  value={formData.vehiculoId}
                  onChange={(e) => setFormData({ ...formData, vehiculoId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="TRC02">TRC02</option>
                  <option value="TRC07">TRC07</option>
                  <option value="TRC08">TRC08</option>
                  <option value="TRC09">TRC09</option>
                  <option value="TRC10">TRC10</option>
                  <option value="TRC11">TRC11</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha.toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, fecha: new Date(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora *
                  </label>
                  <input
                    type="time"
                    value={formData.hora}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Caseta *
                </label>
                <input
                  type="text"
                  value={formData.nombreCaseta}
                  onChange={(e) => setFormData({ ...formData, nombreCaseta: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ej: CTO. EXT. MEXIQUENSE"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Importe *
                  </label>
                  <input
                    type="number"
                    value={formData.importe || ''}
                    onChange={(e) => setFormData({ ...formData, importe: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min={0}
                    step={0.01}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={formData.metodoPago}
                    onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value as MetodoPagoCaseta })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {METODOS_PAGO.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setModalRegistro(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCaseta}
                disabled={!formData.vehiculoId || !formData.nombreCaseta || !formData.importe}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importación */}
      {modalImportacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Importar desde TAG</h2>
              <button onClick={() => {
                setModalImportacion(false);
                setArchivoImportacion(null);
                setResultadoImportacion(null);
              }}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Tipo de importación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Sistema TAG
                </label>
                <div className="flex gap-2">
                  {(['IAVE', 'TELEVIA', 'VIAPASS'] as const).map(tipo => (
                    <button
                      key={tipo}
                      onClick={() => setTipoImportacion(tipo)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${tipoImportacion === tipo
                          ? 'bg-black text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Área de carga */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${archivoImportacion
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setArchivoImportacion(e.target.files?.[0] || null)}
                  className="hidden"
                />

                {archivoImportacion ? (
                  <div className="space-y-2">
                    <FileSpreadsheet className="w-12 h-12 text-green-600 mx-auto" />
                    <p className="font-medium">{archivoImportacion.name}</p>
                    <p className="text-sm text-gray-500">
                      {(archivoImportacion.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="font-medium">Arrastra o haz clic para seleccionar</p>
                    <p className="text-sm text-gray-500">
                      Archivos Excel (.xlsx, .xls) o CSV
                    </p>
                  </div>
                )}
              </div>

              {/* Instrucciones */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                <p className="font-medium mb-2">Formato esperado para {tipoImportacion}:</p>
                {tipoImportacion === 'IAVE' && (
                  <p>Columnas: Fecha, Hora, TAG, Plaza, Importe</p>
                )}
                {tipoImportacion === 'TELEVIA' && (
                  <p>Columnas: FechaHora, TAG, Plaza, Monto</p>
                )}
                {tipoImportacion === 'VIAPASS' && (
                  <p>Columnas: Date, Time, TAG, Toll, Amount</p>
                )}
              </div>

              {/* Resultado de importación */}
              {resultadoImportacion && (
                <div className={`rounded-lg p-4 ${resultadoImportacion.status === 'completado'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                  }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {resultadoImportacion.status === 'completado' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {resultadoImportacion.status === 'completado'
                        ? 'Importación completada'
                        : 'Error en importación'}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>Registros importados: {resultadoImportacion.registrosImportados}</p>
                    <p>Duplicados omitidos: {resultadoImportacion.registrosDuplicados}</p>
                    <p>Errores: {resultadoImportacion.registrosError}</p>
                    {resultadoImportacion.montoTotal > 0 && (
                      <p className="font-medium">
                        Monto total: ${resultadoImportacion.montoTotal.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setModalImportacion(false);
                  setArchivoImportacion(null);
                  setResultadoImportacion(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                {resultadoImportacion ? 'Cerrar' : 'Cancelar'}
              </button>
              {!resultadoImportacion && (
                <button
                  onClick={handleImportarArchivo}
                  disabled={!archivoImportacion || importando}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                  {importando ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Importar
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Historial de importaciones */}
      {historialImportaciones.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-medium mb-4">Historial de Importaciones</h3>
          <div className="space-y-2">
            {historialImportaciones.slice(0, 5).map((imp) => (
              <div key={imp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-sm">{imp.fuente.replace('IMPORTACION_', '')}</p>
                    <p className="text-xs text-gray-500">
                      {formatearFecha(imp.fechaImportacion)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{imp.registrosImportados} registros</p>
                  <p className="text-xs text-gray-500">
                    ${imp.montoTotal.toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${imp.status === 'completado'
                    ? 'bg-green-100 text-green-700'
                    : imp.status === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                  {imp.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
