/**
 * Módulo de Telemetría GPS
 * Dashboard de ubicación de flota e importación desde Mastrack
 */

import { useState, useEffect, useRef } from 'react';
import {
  Radio,
  MapPin,
  Truck,
  AlertTriangle,
  Activity,
  Navigation,
  Gauge,
  Clock,
  Upload,
  Settings,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Fuel,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Eye,
  Filter,
} from 'lucide-react';
import {
  obtenerDashboardTelemetria,
  obtenerEventosTelemetria,
  calcularAnalisisConduccion,
  importarDesdeExcel,
  importarDesdeMastrack,
  obtenerConfiguracionMastrack,
  guardarConfiguracionMastrack,
} from '../../services/telemetry.service';
import type {
  DashboardTelemetria,
  EventoTelemetria,
  AnalisisConduccion,
  ConfiguracionMastrack,
  TipoEventoGPS,
} from '../../types/telemetry.types';
import * as XLSX from 'xlsx';

// Colores por categoría de evento
const CATEGORIA_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  ubicacion: { bg: 'bg-blue-100', text: 'text-blue-700', icon: MapPin },
  motor: { bg: 'bg-green-100', text: 'text-green-700', icon: Zap },
  conduccion: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Activity },
  seguridad: { bg: 'bg-red-100', text: 'text-red-700', icon: Shield },
  geocerca: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Navigation },
  alerta: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
  sistema: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Settings },
};

export default function Telemetria() {
  const [dashboard, setDashboard] = useState<DashboardTelemetria | null>(null);
  const [eventos, setEventos] = useState<EventoTelemetria[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<string | null>(null);
  const [analisis, setAnalisis] = useState<AnalisisConduccion | null>(null);
  const [modalConfiguracion, setModalConfiguracion] = useState(false);
  const [modalImportacion, setModalImportacion] = useState(false);
  const [vistaEventos, setVistaEventos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado de configuración Mastrack
  const [configMastrack, setConfigMastrack] = useState<Partial<ConfiguracionMastrack>>({
    apiUrl: '',
    apiKey: '',
    intervaloSincronizacion: 15,
    activo: false,
    vehiculosRegistrados: [],
  });

  // Estado de importación
  const [archivoImportacion, setArchivoImportacion] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultadoImportacion, setResultadoImportacion] = useState<any>(null);

  // Mapeo de alias a vehículos (esto debería venir de configuración)
  const mapeoVehiculos: Record<string, string> = {
    'TRC02': 'TRC02',
    'TRC07': 'TRC07',
    'TRC08': 'TRC08',
    'TRC09': 'TRC09',
    'TRC10': 'TRC10',
    'TRC11': 'TRC11',
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (vehiculoSeleccionado) {
      cargarAnalisis(vehiculoSeleccionado);
    }
  }, [vehiculoSeleccionado]);

  async function cargarDatos() {
    setLoading(true);
    try {
      const [dashboardData, eventosData] = await Promise.all([
        obtenerDashboardTelemetria(),
        obtenerEventosTelemetria({}, 500),
      ]);
      setDashboard(dashboardData);
      setEventos(eventosData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function cargarAnalisis(vehiculoId: string) {
    try {
      const hace30Dias = new Date();
      hace30Dias.setDate(hace30Dias.getDate() - 30);
      const hoy = new Date();

      const analisisData = await calcularAnalisisConduccion(vehiculoId, hace30Dias, hoy);
      setAnalisis(analisisData);
    } catch (error) {
      console.error('Error al cargar análisis:', error);
    }
  }

  async function handleImportarArchivo() {
    if (!archivoImportacion) return;

    setImportando(true);
    try {
      const data = await archivoImportacion.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const registros = XLSX.utils.sheet_to_json(sheet);

      // Parsear registros del Excel (formato de tu archivo)
      const registrosParsed = registros.map((r: any) => {
        let fecha: Date;
        let hora: string;

        // Manejar diferentes formatos de fecha
        if (r.Fecha instanceof Date) {
          fecha = r.Fecha;
        } else if (typeof r.Fecha === 'number') {
          // Excel serial date
          fecha = new Date((r.Fecha - 25569) * 86400 * 1000);
        } else {
          fecha = new Date(r.Fecha);
        }

        // Manejar hora
        if (typeof r.Hora === 'number') {
          const totalMinutes = r.Hora * 24 * 60;
          const hours = Math.floor(totalMinutes / 60);
          const minutes = Math.floor(totalMinutes % 60);
          hora = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } else {
          hora = String(r.Hora || '00:00');
        }

        return {
          fecha,
          hora,
          alias: r.Alias || r.alias || r.Vehiculo || r.vehiculo,
          odometro: parseFloat(r.Odometro || r.odometro || 0),
          evento: r.Evento || r.evento || r.TipoEvento || 'Otro',
        };
      });

      const resultado = await importarDesdeExcel(registrosParsed, mapeoVehiculos, 'user');
      setResultadoImportacion(resultado);
      cargarDatos();
    } catch (error) {
      console.error('Error en importación:', error);
      alert('Error al importar archivo. Verifica el formato.');
    } finally {
      setImportando(false);
    }
  }

  function formatearFecha(fecha?: Date): string {
    if (!fecha) return '--';
    return fecha.toLocaleDateString('es-MX');
  }

  function formatearHora(fecha?: Date): string {
    if (!fecha) return '--';
    return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  }

  function getScoreBgColor(score: number): string {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-amber-100';
    return 'bg-red-100';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Telemetría GPS</h1>
          <p className="text-gray-600">Monitoreo de flota en tiempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalImportacion(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Upload className="w-5 h-5" />
            Importar Datos
          </button>
          <button
            onClick={() => setModalConfiguracion(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Settings className="w-5 h-5" />
            Configurar Mastrack
          </button>
          <button
            onClick={cargarDatos}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            <RefreshCw className="w-5 h-5" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Estadísticas del día */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Truck className="w-4 h-4" />
              <span className="text-xs">Vehículos Activos</span>
            </div>
            <p className="text-2xl font-bold">{dashboard.estadisticasHoy.vehiculosActivos}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Navigation className="w-4 h-4" />
              <span className="text-xs">Km Hoy</span>
            </div>
            <p className="text-2xl font-bold">{dashboard.estadisticasHoy.kmTotales.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-xs">Eventos Conducción</span>
            </div>
            <p className="text-2xl font-bold">{dashboard.estadisticasHoy.eventosConduccion}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">Alertas Críticas</span>
            </div>
            <p className="text-2xl font-bold">{dashboard.estadisticasHoy.alertasCriticas}</p>
          </div>
        </div>
      )}

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ubicación de Flota */}
        <div className="lg:col-span-2 bg-white rounded-xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Radio className="w-5 h-5 text-green-500" />
              Ubicación de Flota
            </h2>
            <span className="text-xs text-gray-500">
              Última actualización: {new Date().toLocaleTimeString('es-MX')}
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando ubicaciones...</div>
          ) : dashboard && dashboard.ubicacionFlota.length > 0 ? (
            <div className="divide-y">
              {dashboard.ubicacionFlota.map((vehiculo) => (
                <div
                  key={vehiculo.vehiculoId}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${vehiculoSeleccionado === vehiculo.vehiculoId ? 'bg-blue-50' : ''
                    }`}
                  onClick={() => setVehiculoSeleccionado(
                    vehiculoSeleccionado === vehiculo.vehiculoId ? null : vehiculo.vehiculoId
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${vehiculo.motorEncendido
                          ? vehiculo.enMovimiento
                            ? 'bg-green-100 text-green-600'
                            : 'bg-amber-100 text-amber-600'
                          : 'bg-gray-100 text-gray-400'
                        }`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">{vehiculo.alias}</p>
                        <p className="text-xs text-gray-500">
                          {vehiculo.motorEncendido
                            ? vehiculo.enMovimiento
                              ? 'En movimiento'
                              : 'Motor encendido (detenido)'
                            : 'Motor apagado'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {vehiculo.ultimaUbicacion.velocidad !== undefined && (
                          <span className="flex items-center gap-1 text-sm">
                            <Gauge className="w-4 h-4 text-gray-400" />
                            {vehiculo.ultimaUbicacion.velocidad} km/h
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {formatearHora(vehiculo.ultimaActualizacion)}
                      </p>
                    </div>
                  </div>

                  {/* Panel expandido */}
                  {vehiculoSeleccionado === vehiculo.vehiculoId && analisis && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
                      <div className={`rounded-lg p-3 text-center ${getScoreBgColor(analisis.scoreConduccion)}`}>
                        <p className={`text-2xl font-bold ${getScoreColor(analisis.scoreConduccion)}`}>
                          {analisis.scoreConduccion}
                        </p>
                        <p className="text-xs text-gray-600">Score Conducción</p>
                      </div>
                      <div className={`rounded-lg p-3 text-center ${getScoreBgColor(analisis.scoreSeguridad)}`}>
                        <p className={`text-2xl font-bold ${getScoreColor(analisis.scoreSeguridad)}`}>
                          {analisis.scoreSeguridad}
                        </p>
                        <p className="text-xs text-gray-600">Score Seguridad</p>
                      </div>
                      <div className={`rounded-lg p-3 text-center ${getScoreBgColor(analisis.scoreEficiencia)}`}>
                        <p className={`text-2xl font-bold ${getScoreColor(analisis.scoreEficiencia)}`}>
                          {analisis.scoreEficiencia}
                        </p>
                        <p className="text-xs text-gray-600">Score Eficiencia</p>
                      </div>

                      <div className="col-span-3 grid grid-cols-4 gap-2 text-center text-sm">
                        <div className="bg-gray-50 rounded p-2">
                          <p className="font-bold">{analisis.kmRecorridos.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Km (30 días)</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="font-bold">{analisis.eventosConduccion.girosBruscos}</p>
                          <p className="text-xs text-gray-500">Giros bruscos</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="font-bold">{analisis.eventosConduccion.frenadosBruscos}</p>
                          <p className="text-xs text-gray-500">Frenados</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="font-bold">{analisis.eventosConduccion.excesosVelocidad}</p>
                          <p className="text-xs text-gray-500">Exc. velocidad</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Radio className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No hay datos de ubicación disponibles</p>
              <p className="text-sm mt-1">Importa datos de telemetría o configura la integración con Mastrack</p>
            </div>
          )}
        </div>

        {/* Panel lateral - Alertas y eventos recientes */}
        <div className="space-y-6">
          {/* Alertas activas */}
          {dashboard && dashboard.alertasActivas.length > 0 && (
            <div className="bg-white rounded-xl border">
              <div className="p-4 border-b">
                <h3 className="font-semibold flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Alertas Activas
                </h3>
              </div>
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {dashboard.alertasActivas.map((alerta, i) => (
                  <div key={i} className="p-3 hover:bg-red-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{alerta.alias}</span>
                      <span className="text-xs text-gray-500">{formatearHora(alerta.timestamp)}</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">{alerta.tipoAlerta}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Eventos recientes */}
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Eventos Recientes
              </h3>
              <button
                onClick={() => setVistaEventos(!vistaEventos)}
                className="text-sm text-blue-600 hover:underline"
              >
                {vistaEventos ? 'Ver menos' : 'Ver todos'}
              </button>
            </div>
            <div className={`divide-y ${vistaEventos ? 'max-h-[600px]' : 'max-h-[300px]'} overflow-y-auto`}>
              {eventos.slice(0, vistaEventos ? 50 : 10).map((evento) => {
                const config = CATEGORIA_COLORS[evento.categoriaEvento] || CATEGORIA_COLORS.sistema;
                const IconComponent = config.icon;
                return (
                  <div key={evento.id} className="p-3 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded ${config.bg}`}>
                        <IconComponent className={`w-4 h-4 ${config.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{evento.alias}</span>
                          <span className="text-xs text-gray-400">{evento.hora}</span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{evento.tipoEvento}</p>
                        <p className="text-xs text-gray-400">{formatearFecha(evento.fecha)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {eventos.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Sin eventos recientes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Importación */}
      {modalImportacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Importar Datos de Telemetría</h2>
              <button onClick={() => {
                setModalImportacion(false);
                setArchivoImportacion(null);
                setResultadoImportacion(null);
              }}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
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
                      Archivo Excel con datos de Recorridos
                    </p>
                  </div>
                )}
              </div>

              {/* Instrucciones */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                <p className="font-medium mb-2">Formato esperado:</p>
                <p>Columnas: Fecha, Hora, Alias, Odometro, Evento</p>
                <p className="mt-2 text-xs">Compatible con el formato de tu Excel actual (hoja Recorridos)</p>
              </div>

              {/* Resultado */}
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
                    <p>Duplicados: {resultadoImportacion.registrosDuplicados}</p>
                    <p>Errores: {resultadoImportacion.registrosError}</p>
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

      {/* Modal de Configuración Mastrack */}
      {modalConfiguracion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Configuración Mastrack</h2>
              <button onClick={() => setModalConfiguracion(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
                <p className="font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Integración API en desarrollo
                </p>
                <p className="mt-1">
                  La integración directa con la API de Mastrack está en desarrollo.
                  Por ahora, puedes importar datos manualmente desde archivos Excel.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de API
                </label>
                <input
                  type="url"
                  value={configMastrack.apiUrl}
                  onChange={(e) => setConfigMastrack({ ...configMastrack, apiUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="https://api.mastrack.com/v1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={configMastrack.apiKey}
                  onChange={(e) => setConfigMastrack({ ...configMastrack, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Tu API key de Mastrack"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Intervalo de sincronización (minutos)
                </label>
                <select
                  value={configMastrack.intervaloSincronizacion}
                  onChange={(e) => setConfigMastrack({
                    ...configMastrack,
                    intervaloSincronizacion: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value={5}>5 minutos</option>
                  <option value={10}>10 minutos</option>
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={60}>1 hora</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={configMastrack.activo}
                  onChange={(e) => setConfigMastrack({ ...configMastrack, activo: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="activo" className="text-sm text-gray-700">
                  Activar sincronización automática
                </label>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setModalConfiguracion(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  // Guardar configuración
                  setModalConfiguracion(false);
                }}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
