/**
 * Módulo de Viajes
 * Gestión completa de viajes con integración a rutas, clientes, costos
 */

import { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  User,
  Filter,
  Play,
  CheckCircle,
  XCircle,
  Eye,
  Edit2,
  X,
  TrendingUp,
  AlertCircle,
  Navigation,
  Building2,
  Shield,
  FileText,
  HardHat,
  Phone,
  ChevronDown,
  ChevronUp,
  Upload,
  Check,
} from 'lucide-react';
import {
  obtenerViajes,
  crearViaje,
  actualizarViaje,
  iniciarViaje,
  registrarLlegada,
  completarViaje,
  cancelarViaje,
  obtenerEstadisticasViajes,
  obtenerViajesActivos,
} from '../../services/trip.service';
import { obtenerClientes } from '../../services/client.service';
import { obtenerTractocamionesSelect } from '../../services/truck.service';
import { obtenerOperadoresSelect } from '../../services/operator.service';
import { obtenerAditamentosSelect } from '../../services/attachment.service';
import { obtenerManiobristasSelect } from '../../services/maniobrista.service';
import type { Cliente, ObraCliente } from '../../types/client.types';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Container, Users, AlertTriangle, History } from 'lucide-react';
import type { Viaje, ViajeFormInput, FiltrosViaje, StatusViaje, TipoServicioViaje, CondicionesSeguridad, ArchivoAdjunto } from '../../types/trip.types';
import { CONDICIONES_SEGURIDAD_DEFAULT } from '../../types/trip.types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
import { Image, FileUp, Trash2 } from 'lucide-react';

// Generador simple de ID único
const generarId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const TIPOS_SERVICIO: TipoServicioViaje[] = [
  'Entrega',
  'Recolección',
  'Cambio',
  'Flete en falso',
  'Movimiento',
  'Regreso',
  'Entrega / Recoleccion',
];

const STATUS_COLORS: Record<StatusViaje, { bg: string; text: string; label: string }> = {
  programado: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Programado' },
  en_curso: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En Curso' },
  en_destino: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'En Destino' },
  completado: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completado' },
  cancelado: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelado' },
};

export default function Viajes() {
  const { user, userData } = useAuth();
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardandoViaje, setGuardandoViaje] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusViaje | ''>('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [viajeDetalle, setViajeDetalle] = useState<Viaje | null>(null);

  // Catálogos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tractocamiones, setTractocamiones] = useState<{ id: string; label: string; marca: string; tipoUnidad: string }[]>([]);
  const [operadores, setOperadores] = useState<{ id: string; nombre: string; licenciaTipo: string; sueldoDiario: number; tractosAutorizados: string[] }[]>([]);
  const [maniobristas, setManiobristas] = useState<{ id: string; nombre: string; sueldoDiario: number }[]>([]);
  const [aditamentos, setAditamentos] = useState<{ id: string; label: string; tipo: string }[]>([]);
  const [viajesActivos, setViajesActivos] = useState<Viaje[]>([]);

  // Selecciones del formulario
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [obraSeleccionada, setObraSeleccionada] = useState<ObraCliente | null>(null);
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<string[]>([]);

  // Alertas de validación
  const [alertaOperador, setAlertaOperador] = useState<string | null>(null);
  const [alertaTracto, setAlertaTracto] = useState<string | null>(null);

  // Historial del cliente seleccionado
  const [historialCliente, setHistorialCliente] = useState<Viaje[]>([]);

  // Modo edición
  const [modoEdicion, setModoEdicion] = useState(false);
  const [viajeEditando, setViajeEditando] = useState<Viaje | null>(null);

  const [showCondicionesSeguridad, setShowCondicionesSeguridad] = useState(false);
  const [condicionesSeguridad, setCondicionesSeguridad] = useState<CondicionesSeguridad>({ ...CONDICIONES_SEGURIDAD_DEFAULT });
  const [nuevoCurso, setNuevoCurso] = useState('');
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [documentosViaje, setDocumentosViaje] = useState<ArchivoAdjunto[]>([]);
  const [imagenesViaje, setImagenesViaje] = useState<ArchivoAdjunto[]>([]);

  // Handler cuando se selecciona un cliente
  function handleClienteChange(clienteId: string) {
    const cliente = clientes.find(c => c.id === clienteId);
    setClienteSeleccionado(cliente || null);
    setObraSeleccionada(null);
    setFormData({ ...formData, clienteId });

    // Cargar historial de viajes del cliente
    if (clienteId) {
      const viajesDelCliente = viajes
        .filter(v => v.clienteId === clienteId)
        .sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0))
        .slice(0, 5); // Últimos 5 viajes
      setHistorialCliente(viajesDelCliente);
    } else {
      setHistorialCliente([]);
    }

    if (cliente) {
      const obrasActivas = cliente.obras?.filter(o => o.activa) || [];

      // Si tiene exactamente 1 obra, auto-seleccionarla
      if (obrasActivas.length === 1) {
        handleObraChange(obrasActivas[0]);
      } else if (obrasActivas.length === 0) {
        // Si no tiene obras, usar la dirección fiscal como destino
        setFormData(prev => ({
          ...prev,
          clienteId,
          destino: {
            nombre: cliente.nombreComercial || cliente.nombre,
            direccion: cliente.direccion ?
              `${cliente.direccion.calle || ''} ${cliente.direccion.numeroExterior || ''}, ${cliente.direccion.colonia || ''}, ${cliente.direccion.municipio || ''}, ${cliente.direccion.estado || ''}`.trim() : '',
            contactoNombre: cliente.contactoPrincipal || '',
            contactoTelefono: cliente.telefono || '',
            ventanaInicio: '',
            ventanaFin: '',
          }
        }));
      } else {
        // Si tiene múltiples obras, limpiar destino para que seleccione una
        setFormData(prev => ({
          ...prev,
          clienteId,
          destino: {
            nombre: '',
            contactoNombre: '',
            contactoTelefono: '',
            ventanaInicio: '',
            ventanaFin: '',
          }
        }));
      }
    }
  }

  // Handler cuando se selecciona una obra
  function handleObraChange(obra: ObraCliente) {
    setObraSeleccionada(obra);

    // Buscar contacto principal de la obra
    const contactoPrincipal = obra.contactos?.find(c => c.esPrincipal) || obra.contactos?.[0];

    setFormData(prev => ({
      ...prev,
      destino: {
        nombre: obra.nombre,
        direccion: `${obra.direccion.calle || ''} ${obra.direccion.numeroExterior || ''}, ${obra.direccion.colonia || ''}, ${obra.direccion.municipio || ''}, ${obra.direccion.estado || ''}`.trim(),
        contactoNombre: contactoPrincipal?.nombre || '',
        contactoTelefono: contactoPrincipal?.celular || contactoPrincipal?.telefono || '',
        ventanaInicio: obra.condicionesAcceso?.horarioRecepcion?.inicio || '',
        ventanaFin: obra.condicionesAcceso?.horarioRecepcion?.fin || '',
      }
    }));

    // Si la obra tiene condiciones de acceso, pre-llenarlas
    if (obra.condicionesAcceso) {
      setCondicionesSeguridad(prev => ({
        ...prev,
        cascoConBarbiquejo: obra.condicionesAcceso?.requiereCasco || false,
        chaleco: obra.condicionesAcceso?.requiereChaleco || false,
        botasConCasquillo: obra.condicionesAcceso?.requiereBotas || false,
        guantes: obra.condicionesAcceso?.requiereGuantes || false,
        lentes: obra.condicionesAcceso?.requiereLentes || false,
        taponesAuditivos: obra.condicionesAcceso?.requiereTaponesAuditivos || false,
        cursosRequeridos: obra.condicionesAcceso?.cursosRequeridos || [],
        notasAcceso: obra.condicionesAcceso?.instruccionesEspeciales || '',
      }));
    }
  }

  // Estadísticas
  const [stats, setStats] = useState({
    totalViajes: 0,
    viajesCompletados: 0,
    viajesCancelados: 0,
    ingresoTotal: 0,
    costoTotal: 0,
    utilidadTotal: 0,
    margenPromedio: 0,
    kmTotales: 0,
  });

  // Form state
  const [formData, setFormData] = useState<Partial<ViajeFormInput>>({
    fecha: new Date(),
    tractoId: '',
    operadorId: '',
    clienteId: '',
    destino: {
      nombre: '',
      contactoNombre: '',
      contactoTelefono: '',
      ventanaInicio: '',
      ventanaFin: '',
    },
    condicionesSeguridad: { ...CONDICIONES_SEGURIDAD_DEFAULT },
    tipoServicio: 'Entrega',
    distanciaKm: 0,
    precioFlete: 0,
    equipos: [],
  });

  useEffect(() => {
    cargarDatos();
  }, [filtroStatus]);

  async function cargarDatos() {
    setLoading(true);
    try {
      const filtros: FiltrosViaje = {};
      if (filtroStatus) filtros.status = filtroStatus;

      const [viajesData, statsData, clientesData, tractosData, operadoresData, maniobristasData, aditamentosData, viajesActivosData] = await Promise.all([
        obtenerViajes(filtros),
        obtenerEstadisticasViajes(),
        obtenerClientes({ activo: true }),
        obtenerTractocamionesSelect(),
        obtenerOperadoresSelect(),
        obtenerManiobristasSelect(),
        obtenerAditamentosSelect(),
        obtenerViajesActivos(),
      ]);

      setViajes(viajesData);
      setStats(statsData);
      setClientes(clientesData);
      setTractocamiones(tractosData);
      setOperadores(operadoresData);
      setManiobristas(maniobristasData);
      setAditamentos(aditamentosData);
      setViajesActivos(viajesActivosData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  }

  const viajesFiltrados = viajes.filter(v =>
    v.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
    v.clienteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    v.destino.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  async function handleIniciarViaje(viaje: Viaje) {
    try {
      await iniciarViaje(viaje.id);
      cargarDatos();
    } catch (error) {
      console.error('Error al iniciar viaje:', error);
    }
  }

  async function handleLlegada(viaje: Viaje) {
    try {
      await registrarLlegada(viaje.id);
      cargarDatos();
    } catch (error) {
      console.error('Error al registrar llegada:', error);
    }
  }

  async function handleCompletar(viaje: Viaje) {
    try {
      await completarViaje(viaje.id);
      cargarDatos();
      setViajeDetalle(null);
    } catch (error) {
      console.error('Error al completar viaje:', error);
    }
  }

  async function handleCancelar(viaje: Viaje) {
    const motivo = prompt('Motivo de cancelación:');
    if (motivo) {
      try {
        await cancelarViaje(viaje.id, motivo);
        cargarDatos();
        setViajeDetalle(null);
      } catch (error) {
        console.error('Error al cancelar viaje:', error);
      }
    }
  }

  function formatearHora(fecha?: Date): string {
    if (!fecha) return '--:--';
    return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  function formatearDuracion(minutos?: number): string {
    if (!minutos) return '--';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Viajes</h1>
          <p className="text-gray-600">Gestión y seguimiento de viajes</p>
        </div>
        <button
          onClick={async () => {
            // Recargar lista de clientes al abrir el modal
            try {
              const clientesActualizados = await obtenerClientes({ activo: true });
              setClientes(clientesActualizados);
            } catch (error) {
              console.error('Error al cargar clientes:', error);
            }
            // Limpiar selección anterior y modo edición
            setClienteSeleccionado(null);
            setObraSeleccionada(null);
            setEquiposSeleccionados([]);
            setCondicionesSeguridad({ ...CONDICIONES_SEGURIDAD_DEFAULT });
            setDocumentosViaje([]);
            setImagenesViaje([]);
            setAlertaOperador(null);
            setAlertaTracto(null);
            setHistorialCliente([]);
            setModoEdicion(false);
            setViajeEditando(null);
            setFormData({
              fecha: new Date(),
              tractoId: '',
              operadorId: '',
              clienteId: '',
              maniobristaId: undefined,
              destino: {
                nombre: '',
                contactoNombre: '',
                contactoTelefono: '',
                ventanaInicio: '',
                ventanaFin: '',
              },
              condicionesSeguridad: { ...CONDICIONES_SEGURIDAD_DEFAULT },
              tipoServicio: 'Entrega',
              distanciaKm: 0,
              precioFlete: 0,
              equipos: [],
            });
            setModalAbierto(true);
          }}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
        >
          <Plus className="w-5 h-5" />
          Nuevo Viaje
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-white rounded-xl p-4 border col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Truck className="w-4 h-4" />
            <span className="text-xs">Total</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalViajes}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs">Completados</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.viajesCompletados}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 text-red-500 mb-1">
            <XCircle className="w-4 h-4" />
            <span className="text-xs">Cancelados</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{stats.viajesCancelados}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Navigation className="w-4 h-4" />
            <span className="text-xs">Km Totales</span>
          </div>
          <p className="text-2xl font-bold">{stats.kmTotales.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Ingresos</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">${(stats.ingresoTotal / 1000).toFixed(0)}k</p>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 text-red-500 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Costos</span>
          </div>
          <p className="text-xl font-bold text-red-500">${(stats.costoTotal / 1000).toFixed(0)}k</p>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Utilidad</span>
          </div>
          <p className="text-xl font-bold text-amber-600">${(stats.utilidadTotal / 1000).toFixed(0)}k</p>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Margen</span>
          </div>
          <p className="text-xl font-bold text-purple-600">{stats.margenPromedio.toFixed(1)}%</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 border">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por folio, cliente, destino..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFiltroStatus('')}
              className={`px-3 py-1.5 rounded-lg text-sm ${!filtroStatus ? 'bg-black text-white' : 'bg-gray-100'
                }`}
            >
              Todos
            </button>
            {Object.entries(STATUS_COLORS).map(([status, { label }]) => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status as StatusViaje)}
                className={`px-3 py-1.5 rounded-lg text-sm ${filtroStatus === status ? 'bg-black text-white' : 'bg-gray-100'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de viajes */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando viajes...</div>
        ) : viajesFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron viajes
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600">Folio</th>
                  <th className="text-left p-4 font-medium text-gray-600">Fecha</th>
                  <th className="text-left p-4 font-medium text-gray-600">Cliente</th>
                  <th className="text-left p-4 font-medium text-gray-600">Destino</th>
                  <th className="text-left p-4 font-medium text-gray-600">Unidad</th>
                  <th className="text-center p-4 font-medium text-gray-600">Km</th>
                  <th className="text-right p-4 font-medium text-gray-600">Utilidad</th>
                  <th className="text-center p-4 font-medium text-gray-600">Estado</th>
                  <th className="text-center p-4 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {viajesFiltrados.map((viaje) => {
                  const statusConfig = STATUS_COLORS[viaje.status];
                  return (
                    <tr
                      key={viaje.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setViajeDetalle(viaje)}
                    >
                      <td className="p-4">
                        <span className="font-mono font-medium">{viaje.folio}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {viaje.fecha?.toLocaleDateString('es-MX')}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="truncate max-w-[150px]">{viaje.clienteNombre}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="truncate max-w-[120px]">{viaje.destino.nombre}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium">{viaje.tractoId}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm">{viaje.distanciaKm} km</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-medium ${viaje.utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${viaje.utilidad.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">
                          ({viaje.margenUtilidad.toFixed(0)}%)
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          {viaje.status === 'programado' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleIniciarViaje(viaje);
                              }}
                              className="p-1.5 hover:bg-green-100 rounded text-green-600"
                              title="Iniciar viaje"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          {viaje.status === 'en_curso' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLlegada(viaje);
                              }}
                              className="p-1.5 hover:bg-amber-100 rounded text-amber-600"
                              title="Registrar llegada"
                            >
                              <MapPin className="w-4 h-4" />
                            </button>
                          )}
                          {viaje.status === 'en_destino' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompletar(viaje);
                              }}
                              className="p-1.5 hover:bg-green-100 rounded text-green-600"
                              title="Completar viaje"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViajeDetalle(viaje);
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
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

      {/* Modal de Detalle */}
      {viajeDetalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold font-mono">{viajeDetalle.folio}</h2>
                  <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[viajeDetalle.status].bg} ${STATUS_COLORS[viajeDetalle.status].text}`}>
                    {STATUS_COLORS[viajeDetalle.status].label}
                  </span>
                </div>
                <p className="text-gray-500">{viajeDetalle.tipoServicio}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Botón editar - disponible para viajes que no están completados o cancelados */}
                {(viajeDetalle.status === 'programado' || viajeDetalle.status === 'en_curso' || viajeDetalle.status === 'en_destino') && (
                  <button
                    onClick={() => {
                      // Cargar datos del viaje en el formulario
                      const cliente = clientes.find(c => c.id === viajeDetalle.clienteId);
                      setClienteSeleccionado(cliente || null);
                      setObraSeleccionada(null);
                      setEquiposSeleccionados(viajeDetalle.equipos || []);
                      setCondicionesSeguridad(viajeDetalle.condicionesSeguridad || { ...CONDICIONES_SEGURIDAD_DEFAULT });
                      setAlertaOperador(null);
                      setAlertaTracto(null);
                      setHistorialCliente([]);
                      setFormData({
                        fecha: viajeDetalle.fecha || new Date(),
                        tractoId: viajeDetalle.tractoId,
                        operadorId: viajeDetalle.operadorId,
                        clienteId: viajeDetalle.clienteId,
                        maniobristaId: viajeDetalle.maniobristaId,
                        destino: viajeDetalle.destino,
                        condicionesSeguridad: viajeDetalle.condicionesSeguridad || { ...CONDICIONES_SEGURIDAD_DEFAULT },
                        tipoServicio: viajeDetalle.tipoServicio,
                        distanciaKm: viajeDetalle.distanciaKm,
                        precioFlete: viajeDetalle.ingresos?.flete || 0,
                        equipos: viajeDetalle.equipos || [],
                        notas: viajeDetalle.notas,
                      });
                      setModoEdicion(true);
                      setViajeEditando(viajeDetalle);
                      setViajeDetalle(null);
                      setModalAbierto(true);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                    title="Editar viaje"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
                {/* Botón eliminar - solo admin */}
                {userData?.rol === 'admin' && (
                  <button
                    onClick={async () => {
                      if (confirm(`¿Estás seguro de eliminar el viaje ${viajeDetalle.folio}?\n\nEsta acción no se puede deshacer.`)) {
                        try {
                          // Importar función de eliminar
                          const { eliminarViaje } = await import('../../services/trip.service');
                          await eliminarViaje(viajeDetalle.id);
                          toast.success('Viaje eliminado correctamente');
                          setViajeDetalle(null);
                          cargarDatos();
                        } catch (error: any) {
                          console.error('Error al eliminar viaje:', error);
                          toast.error(`Error al eliminar: ${error?.message || 'Error desconocido'}`);
                        }
                      }
                    }}
                    className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                    title="Eliminar viaje (solo admin)"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => setViajeDetalle(null)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Timeline de tiempos */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium mb-4">Timeline del Viaje</h3>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${viajeDetalle.tiempos.inicio ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                      }`}>
                      <Play className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-gray-500">Inicio</p>
                    <p className="font-medium">{formatearHora(viajeDetalle.tiempos.inicio)}</p>
                  </div>

                  <div className="flex-1 h-0.5 bg-gray-200 mx-2" />

                  <div className="text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${viajeDetalle.tiempos.llegada ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'
                      }`}>
                      <MapPin className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-gray-500">Llegada</p>
                    <p className="font-medium">{formatearHora(viajeDetalle.tiempos.llegada)}</p>
                  </div>

                  <div className="flex-1 h-0.5 bg-gray-200 mx-2" />

                  <div className="text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${viajeDetalle.tiempos.tiempoEspera ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-400'
                      }`}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-gray-500">Espera</p>
                    <p className="font-medium">{formatearDuracion(viajeDetalle.tiempos.tiempoEspera)}</p>
                  </div>

                  <div className="flex-1 h-0.5 bg-gray-200 mx-2" />

                  <div className="text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${viajeDetalle.tiempos.partida ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-400'
                      }`}>
                      <Navigation className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-gray-500">Partida</p>
                    <p className="font-medium">{formatearHora(viajeDetalle.tiempos.partida)}</p>
                  </div>

                  <div className="flex-1 h-0.5 bg-gray-200 mx-2" />

                  <div className="text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${viajeDetalle.tiempos.fin ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                      }`}>
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-gray-500">Fin</p>
                    <p className="font-medium">{formatearHora(viajeDetalle.tiempos.fin)}</p>
                  </div>
                </div>

                {viajeDetalle.tiempos.duracionTotal && (
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Duración total: <span className="font-medium">{formatearDuracion(viajeDetalle.tiempos.duracionTotal)}</span>
                  </p>
                )}
              </div>

              {/* Información general */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3">Información del Viaje</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fecha:</span>
                      <span>{viajeDetalle.fecha?.toLocaleDateString('es-MX')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cliente:</span>
                      <span className="font-medium">{viajeDetalle.clienteNombre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Destino:</span>
                      <span>{viajeDetalle.destino.nombre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Distancia:</span>
                      <span>{viajeDetalle.distanciaKm} km</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Asignaciones</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tracto:</span>
                      <span className="font-medium">
                        {tractocamiones.find(t => t.id === viajeDetalle.tractoId)?.label || viajeDetalle.tractoId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Operador:</span>
                      <span>
                        {operadores.find(o => o.id === viajeDetalle.operadorId)?.nombre || viajeDetalle.operadorId}
                      </span>
                    </div>
                    {viajeDetalle.maniobristaId && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Maniobrista:</span>
                        <span>
                          {maniobristas.find(m => m.id === viajeDetalle.maniobristaId)?.nombre || viajeDetalle.maniobristaId}
                        </span>
                      </div>
                    )}
                    {viajeDetalle.equipos.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Equipos:</span>
                        <span>
                          {viajeDetalle.equipos.map(eqId =>
                            aditamentos.find(a => a.id === eqId)?.label || eqId
                          ).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Desglose de costos e ingresos */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3 text-red-600">Costos</h3>
                  <div className="space-y-2 text-sm bg-red-50 rounded-lg p-4">
                    <div className="flex justify-between">
                      <span>Sueldos:</span>
                      <span>${viajeDetalle.costos.sueldos.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Seguros:</span>
                      <span>${viajeDetalle.costos.seguros.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Casetas:</span>
                      <span>${viajeDetalle.costos.casetas.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Combustible:</span>
                      <span>${viajeDetalle.costos.combustible.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Comidas:</span>
                      <span>${viajeDetalle.costos.comidas.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Otros:</span>
                      <span>${viajeDetalle.costos.otros.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2 mt-2">
                      <span>Total:</span>
                      <span>${viajeDetalle.costos.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3 text-emerald-600">Ingresos</h3>
                  <div className="space-y-2 text-sm bg-emerald-50 rounded-lg p-4">
                    <div className="flex justify-between">
                      <span>Flete:</span>
                      <span>${viajeDetalle.ingresos.flete.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Recargos:</span>
                      <span>${viajeDetalle.ingresos.recargos.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2 mt-2">
                      <span>Total:</span>
                      <span>${viajeDetalle.ingresos.total.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Utilidad:</span>
                      <span className={`text-xl font-bold ${viajeDetalle.utilidad >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        ${viajeDetalle.utilidad.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Margen:</span>
                      <span>{viajeDetalle.margenUtilidad.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {viajeDetalle.notas && (
                <div>
                  <h3 className="font-medium mb-2">Notas</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {viajeDetalle.notas}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-between">
              <div>
                {viajeDetalle.status !== 'completado' && viajeDetalle.status !== 'cancelado' && (
                  <button
                    onClick={() => handleCancelar(viajeDetalle)}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancelar Viaje
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                {viajeDetalle.status === 'programado' && (
                  <button
                    onClick={() => handleIniciarViaje(viajeDetalle)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Play className="w-4 h-4" />
                    Iniciar Viaje
                  </button>
                )}
                {viajeDetalle.status === 'en_curso' && (
                  <button
                    onClick={() => handleLlegada(viajeDetalle)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >
                    <MapPin className="w-4 h-4" />
                    Registrar Llegada
                  </button>
                )}
                {viajeDetalle.status === 'en_destino' && (
                  <button
                    onClick={() => handleCompletar(viajeDetalle)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Completar Viaje
                  </button>
                )}
                <button
                  onClick={() => setViajeDetalle(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nuevo/Editar Viaje */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold">
                  {modoEdicion ? 'Editar Orden de Trabajo' : 'Nueva Orden de Trabajo'}
                </h2>
                {modoEdicion && viajeEditando && (
                  <p className="text-sm text-gray-500 font-mono">{viajeEditando.folio}</p>
                )}
              </div>
              <button onClick={() => {
                setModalAbierto(false);
                setModoEdicion(false);
                setViajeEditando(null);
              }}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Servicio *
                  </label>
                  <select
                    value={formData.tipoServicio}
                    onChange={(e) => setFormData({ ...formData, tipoServicio: e.target.value as TipoServicioViaje })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  >
                    {TIPOS_SERVICIO.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.clienteId}
                      onChange={(e) => handleClienteChange(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    >
                      <option value="">Seleccionar cliente...</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>{c.nombreComercial || c.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Historial del Cliente */}
              {clienteSeleccionado && historialCliente.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-medium flex items-center gap-2 text-gray-700">
                    <History className="w-4 h-4" />
                    Últimos viajes de {clienteSeleccionado.nombreComercial || clienteSeleccionado.nombre}
                  </h3>
                  <div className="space-y-2">
                    {historialCliente.map(viaje => (
                      <div key={viaje.id} className="flex items-center justify-between text-sm p-2 bg-white rounded border">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-gray-500">{viaje.folio}</span>
                          <span>{viaje.destino.nombre}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">{viaje.fecha?.toLocaleDateString('es-MX')}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[viaje.status]?.bg} ${STATUS_COLORS[viaje.status]?.text}`}>
                            {STATUS_COLORS[viaje.status]?.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selector de Obra */}
              {clienteSeleccionado && (
                <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-medium flex items-center gap-2 text-blue-800">
                    <Building2 className="w-4 h-4" />
                    Obras / Sucursales
                  </h3>

                  {/* Lista de obras existentes */}
                  {(clienteSeleccionado.obras?.filter(o => o.activa) || []).length > 0 ? (
                    <>
                      <p className="text-sm text-blue-600">
                        {(clienteSeleccionado.obras?.filter(o => o.activa) || []).length === 1
                          ? 'Este cliente tiene 1 obra registrada:'
                          : `Este cliente tiene ${clienteSeleccionado.obras?.filter(o => o.activa).length} obras registradas. Selecciona el destino:`}
                      </p>
                      <div className="grid gap-2">
                        {clienteSeleccionado.obras?.filter(o => o.activa).map(obra => (
                          <button
                            key={obra.id}
                            type="button"
                            onClick={() => handleObraChange(obra)}
                            className={`text-left p-3 rounded-lg border transition-colors ${
                              obraSeleccionada?.id === obra.id
                                ? 'border-[#BB0034] bg-red-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{obra.nombre}</p>
                                <p className="text-sm text-gray-500">
                                  {obra.direccion.calle} {obra.direccion.numeroExterior}, {obra.direccion.colonia}, {obra.direccion.municipio}
                                </p>
                              </div>
                              {obraSeleccionada?.id === obra.id && (
                                <Check className="w-5 h-5 text-[#BB0034]" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-blue-600">
                      Este cliente no tiene obras registradas. Agrega una o usa la dirección fiscal.
                    </p>
                  )}
                </div>
              )}

              {/* Asignación de Unidad y Operador */}
              <div className="bg-amber-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium flex items-center gap-2 text-amber-800">
                  <Truck className="w-4 h-4" />
                  Asignación de Unidad
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tractocamión *
                    </label>
                    <select
                      value={formData.tractoId}
                      onChange={(e) => {
                        const tractoId = e.target.value;
                        const tractoSeleccionado = tractocamiones.find(t => t.id === tractoId);

                        // Si es Roll-Off, limpiar equipos seleccionados
                        if (tractoSeleccionado?.tipoUnidad === 'rolloff-plataforma') {
                          setEquiposSeleccionados([]);
                          setFormData({ ...formData, tractoId, equipos: [] });
                        } else {
                          setFormData({ ...formData, tractoId });
                        }

                        // Validar disponibilidad del tracto
                        if (tractoId) {
                          const viajeActivo = viajesActivos.find(v => v.tractoId === tractoId);
                          if (viajeActivo) {
                            setAlertaTracto(`Este tracto está en un viaje activo (${viajeActivo.folio})`);
                          } else {
                            setAlertaTracto(null);
                          }

                          // Validar si el operador seleccionado puede manejar este tracto
                          if (formData.operadorId) {
                            const operador = operadores.find(o => o.id === formData.operadorId);
                            if (operador && operador.tractosAutorizados.length > 0 && !operador.tractosAutorizados.includes(tractoId)) {
                              // Limpiar operador no autorizado
                              setFormData(prev => ({ ...prev, tractoId, operadorId: '' }));
                              setAlertaOperador(null);
                            } else {
                              setAlertaOperador(null);
                            }
                          }
                        } else {
                          setAlertaTracto(null);
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none ${
                        alertaTracto ? 'border-amber-500 bg-amber-50' : ''
                      }`}
                    >
                      <option value="">Seleccionar unidad...</option>
                      {tractocamiones.map(t => {
                        const enViaje = viajesActivos.some(v => v.tractoId === t.id);
                        return (
                          <option key={t.id} value={t.id}>
                            {t.label} {enViaje ? '(En viaje)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {alertaTracto && (
                      <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {alertaTracto}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Operador *
                    </label>
                    <select
                      value={formData.operadorId}
                      onChange={(e) => {
                        const operadorId = e.target.value;
                        setFormData({ ...formData, operadorId });

                        // Validar disponibilidad del operador
                        if (operadorId) {
                          const viajeActivo = viajesActivos.find(v => v.operadorId === operadorId);
                          const operador = operadores.find(o => o.id === operadorId);

                          if (viajeActivo) {
                            setAlertaOperador(`Este operador está en un viaje activo (${viajeActivo.folio})`);
                          } else if (operador && formData.tractoId && operador.tractosAutorizados.length > 0 && !operador.tractosAutorizados.includes(formData.tractoId)) {
                            setAlertaOperador(`${operador.nombre} no está autorizado para el tracto seleccionado`);
                          } else {
                            setAlertaOperador(null);
                          }
                        } else {
                          setAlertaOperador(null);
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none ${
                        alertaOperador ? 'border-amber-500 bg-amber-50' : ''
                      }`}
                    >
                      <option value="">Seleccionar operador...</option>
                      {operadores
                        .filter(o => {
                          // Si no hay tracto seleccionado, mostrar todos
                          if (!formData.tractoId) return true;
                          // Si el operador no tiene restricciones, puede manejar cualquier tracto
                          if (!o.tractosAutorizados || o.tractosAutorizados.length === 0) return true;
                          // Filtrar solo los autorizados para el tracto seleccionado
                          return o.tractosAutorizados.includes(formData.tractoId);
                        })
                        .map(o => {
                          const enViaje = viajesActivos.some(v => v.operadorId === o.id);
                          return (
                            <option key={o.id} value={o.id}>
                              {o.nombre} ({o.licenciaTipo}) - ${o.sueldoDiario}/día {enViaje ? '(En viaje)' : ''}
                            </option>
                          );
                        })}
                    </select>
                    {alertaOperador && (
                      <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {alertaOperador}
                      </p>
                    )}
                  </div>
                </div>

                {/* Selector de Maniobrista */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Users className="w-3 h-3 inline mr-1" />
                    Maniobrista (opcional)
                  </label>
                  <select
                    value={formData.maniobristaId || ''}
                    onChange={(e) => setFormData({ ...formData, maniobristaId: e.target.value || undefined })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  >
                    <option value="">Sin maniobrista asignado</option>
                    {maniobristas.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} - ${m.sueldoDiario}/día
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de Aditamentos/Equipos - Solo para Tractocamiones, no para Roll-Off */}
                {(() => {
                  const tractoActual = tractocamiones.find(t => t.id === formData.tractoId);
                  const esRollOff = tractoActual?.tipoUnidad === 'rolloff-plataforma';

                  if (esRollOff) {
                    return (
                      <div className="bg-gray-100 rounded-lg p-3 text-center">
                        <p className="text-sm text-gray-500">
                          <Container className="w-4 h-4 inline mr-1" />
                          Las unidades Roll-Off no requieren aditamentos
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Container className="w-3 h-3 inline mr-1" />
                        Aditamentos / Equipos (opcional)
                      </label>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg bg-white">
                        {aditamentos.length === 0 ? (
                          <p className="text-sm text-gray-400 col-span-2 text-center py-2">
                            No hay aditamentos registrados
                          </p>
                        ) : (
                          aditamentos.map(a => (
                            <label
                              key={a.id}
                              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                equiposSeleccionados.includes(a.id)
                                  ? 'bg-amber-100 border-amber-300 border'
                                  : 'hover:bg-gray-50 border border-transparent'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={equiposSeleccionados.includes(a.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEquiposSeleccionados([...equiposSeleccionados, a.id]);
                                    setFormData({ ...formData, equipos: [...equiposSeleccionados, a.id] });
                                  } else {
                                    const nuevosEquipos = equiposSeleccionados.filter(id => id !== a.id);
                                    setEquiposSeleccionados(nuevosEquipos);
                                    setFormData({ ...formData, equipos: nuevosEquipos });
                                  }
                                }}
                                className="rounded border-gray-300 text-[#BB0034] focus:ring-[#BB0034]"
                              />
                              <span className="text-sm">{a.label}</span>
                            </label>
                          ))
                        )}
                      </div>
                      {equiposSeleccionados.length > 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          {equiposSeleccionados.length} equipo(s) seleccionado(s)
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Destino */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#BB0034]" />
                  Información del Destino
                  {obraSeleccionada && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2">
                      Datos cargados de: {obraSeleccionada.nombre}
                    </span>
                  )}
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Destino / Obra *
                  </label>
                  <input
                    type="text"
                    value={formData.destino?.nombre || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      destino: { ...formData.destino!, nombre: e.target.value }
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    placeholder="Ej: Planta Industrial CEMEX"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Phone className="w-3 h-3 inline mr-1" />
                      Contacto en Destino
                    </label>
                    <input
                      type="text"
                      value={formData.destino?.contactoNombre || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        destino: { ...formData.destino!, contactoNombre: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                      placeholder="Nombre del contacto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.destino?.contactoTelefono || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        destino: { ...formData.destino!, contactoTelefono: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                      placeholder="55 1234 5678"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Ventana de Recepción - Desde
                    </label>
                    <input
                      type="time"
                      value={formData.destino?.ventanaInicio || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        destino: { ...formData.destino!, ventanaInicio: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ventana de Recepción - Hasta
                    </label>
                    <input
                      type="time"
                      value={formData.destino?.ventanaFin || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        destino: { ...formData.destino!, ventanaFin: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Condiciones de Seguridad (expandible) */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowCondicionesSeguridad(!showCondicionesSeguridad)}
                  className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#BB0034]" />
                    <span className="font-medium">Condiciones de Seguridad</span>
                    <span className="text-xs text-gray-500">(requisitos para entrar a obra)</span>
                  </div>
                  {showCondicionesSeguridad ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {showCondicionesSeguridad && (
                  <div className="p-4 space-y-6">
                    {/* Documentación del Operador */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Documentación del Operador
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={condicionesSeguridad.licenciaVigente}
                            onChange={(e) => setCondicionesSeguridad({ ...condicionesSeguridad, licenciaVigente: e.target.checked })}
                            className="rounded border-gray-300 text-[#BB0034] focus:ring-[#BB0034]"
                          />
                          <span className="text-sm">Licencia vigente</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={condicionesSeguridad.certificadoMedico}
                            onChange={(e) => setCondicionesSeguridad({ ...condicionesSeguridad, certificadoMedico: e.target.checked })}
                            className="rounded border-gray-300 text-[#BB0034] focus:ring-[#BB0034]"
                          />
                          <span className="text-sm">Certificado médico</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={condicionesSeguridad.seguroSocial}
                            onChange={(e) => setCondicionesSeguridad({ ...condicionesSeguridad, seguroSocial: e.target.checked })}
                            className="rounded border-gray-300 text-[#BB0034] focus:ring-[#BB0034]"
                          />
                          <span className="text-sm">Seguro Social</span>
                        </label>
                      </div>
                    </div>

                    {/* Documentación del Vehículo */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Documentación del Vehículo
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={condicionesSeguridad.tarjetaCirculacion}
                            onChange={(e) => setCondicionesSeguridad({ ...condicionesSeguridad, tarjetaCirculacion: e.target.checked })}
                            className="rounded border-gray-300 text-[#BB0034] focus:ring-[#BB0034]"
                          />
                          <span className="text-sm">Tarjeta de circulación</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={condicionesSeguridad.polizaSeguro}
                            onChange={(e) => setCondicionesSeguridad({ ...condicionesSeguridad, polizaSeguro: e.target.checked })}
                            className="rounded border-gray-300 text-[#BB0034] focus:ring-[#BB0034]"
                          />
                          <span className="text-sm">Póliza de seguro</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={condicionesSeguridad.verificacionAmbiental}
                            onChange={(e) => setCondicionesSeguridad({ ...condicionesSeguridad, verificacionAmbiental: e.target.checked })}
                            className="rounded border-gray-300 text-[#BB0034] focus:ring-[#BB0034]"
                          />
                          <span className="text-sm">Verificación ambiental</span>
                        </label>
                      </div>
                    </div>

                    {/* EPP */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <HardHat className="w-4 h-4" />
                        Equipo de Protección Personal (EPP)
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={condicionesSeguridad.cascoConBarbiquejo}
                            onChange={(e) => setCondicionesSeguridad({ ...condicionesSeguridad, cascoConBarbiquejo: e.target.checked })}
                            className="rounded border-gray-300 text-[#BB0034] focus:ring-[#BB0034]"
                          />
                          <span className="text-sm">Casco con barbiquejo</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={condicionesSeguridad.chaleco}
                            onChange={(e) => setCondicionesSeguridad({ ...condicionesSeguridad, chaleco: e.target.checked })}
                            className="rounded border-gray-300 text-[#BB0034] focus:ring-[#BB0034]"
                          />
                          <span className="text-sm">Chaleco</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={condicionesSeguridad.botasConCasquillo}
                            onChange={(e) => setCondicionesSeguridad({ ...condicionesSeguridad, botasConCasquillo: e.target.checked })}
                            className="rounded border-gray-300 text-[#BB0034] focus:ring-[#BB0034]"
                          />
                          <span className="text-sm">Botas con casquillo</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={condicionesSeguridad.guantes}
                            onChange={(e) => setCondicionesSeguridad({ ...condicionesSeguridad, guantes: e.target.checked })}
                            className="rounded border-gray-300 text-[#BB0034] focus:ring-[#BB0034]"
                          />
                          <span className="text-sm">Guantes</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={condicionesSeguridad.lentes}
                            onChange={(e) => setCondicionesSeguridad({ ...condicionesSeguridad, lentes: e.target.checked })}
                            className="rounded border-gray-300 text-[#BB0034] focus:ring-[#BB0034]"
                          />
                          <span className="text-sm">Lentes</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={condicionesSeguridad.taponesAuditivos}
                            onChange={(e) => setCondicionesSeguridad({ ...condicionesSeguridad, taponesAuditivos: e.target.checked })}
                            className="rounded border-gray-300 text-[#BB0034] focus:ring-[#BB0034]"
                          />
                          <span className="text-sm">Tapones auditivos</span>
                        </label>
                      </div>
                    </div>

                    {/* Cursos Requeridos */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Cursos/Certificaciones Requeridas
                      </h4>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={nuevoCurso}
                          onChange={(e) => setNuevoCurso(e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                          placeholder="Ej: Curso de seguridad industrial"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && nuevoCurso.trim()) {
                              setCondicionesSeguridad({
                                ...condicionesSeguridad,
                                cursosRequeridos: [...condicionesSeguridad.cursosRequeridos, nuevoCurso.trim()]
                              });
                              setNuevoCurso('');
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (nuevoCurso.trim()) {
                              setCondicionesSeguridad({
                                ...condicionesSeguridad,
                                cursosRequeridos: [...condicionesSeguridad.cursosRequeridos, nuevoCurso.trim()]
                              });
                              setNuevoCurso('');
                            }
                          }}
                          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {condicionesSeguridad.cursosRequeridos.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {condicionesSeguridad.cursosRequeridos.map((curso, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                              {curso}
                              <button
                                type="button"
                                onClick={() => setCondicionesSeguridad({
                                  ...condicionesSeguridad,
                                  cursosRequeridos: condicionesSeguridad.cursosRequeridos.filter((_, idx) => idx !== i)
                                })}
                                className="hover:text-blue-900"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Notas de Acceso */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notas especiales de acceso
                      </label>
                      <textarea
                        value={condicionesSeguridad.notasAcceso || ''}
                        onChange={(e) => setCondicionesSeguridad({ ...condicionesSeguridad, notasAcceso: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                        rows={2}
                        placeholder="Ej: Presentarse en caseta de vigilancia con INE, registrar placa..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notas generales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas adicionales
                </label>
                <textarea
                  value={formData.notas || ''}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  rows={2}
                  placeholder="Instrucciones especiales para el viaje..."
                />
              </div>

              {/* Documentos Adjuntos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FileUp className="w-4 h-4" />
                  Documentos Adjuntos
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#BB0034] transition-colors">
                  <input
                    type="file"
                    id="documento-upload"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;

                      setSubiendoDocumento(true);
                      try {
                        const nuevosDocumentos: ArchivoAdjunto[] = [];
                        for (const file of Array.from(files)) {
                          const id = generarId();
                          const storageRef = ref(storage, `viajes/documentos/${id}_${file.name}`);
                          await uploadBytes(storageRef, file);
                          const url = await getDownloadURL(storageRef);
                          nuevosDocumentos.push({
                            id,
                            nombre: file.name,
                            url,
                            tipo: file.type,
                            tamanio: file.size,
                            fechaSubida: new Date(),
                          });
                        }
                        setDocumentosViaje([...documentosViaje, ...nuevosDocumentos]);
                      } catch (error) {
                        console.error('Error subiendo documento:', error);
                      } finally {
                        setSubiendoDocumento(false);
                      }
                    }}
                  />
                  <label htmlFor="documento-upload" className="cursor-pointer">
                    {subiendoDocumento ? (
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        <span>Subiendo...</span>
                      </div>
                    ) : (
                      <>
                        <FileUp className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Haz clic para subir documentos</p>
                        <p className="text-xs text-gray-400">PDF, Word, Excel (máx. 10MB)</p>
                      </>
                    )}
                  </label>
                </div>
                {documentosViaje.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {documentosViaje.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#BB0034]" />
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                            {doc.nombre}
                          </a>
                          <span className="text-xs text-gray-400">
                            ({(doc.tamanio / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDocumentosViaje(documentosViaje.filter((d) => d.id !== doc.id))}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Imágenes Adjuntas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Imágenes Adjuntas
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#BB0034] transition-colors">
                  <input
                    type="file"
                    id="imagen-upload"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;

                      setSubiendoImagen(true);
                      try {
                        const nuevasImagenes: ArchivoAdjunto[] = [];
                        for (const file of Array.from(files)) {
                          const id = generarId();
                          const storageRef = ref(storage, `viajes/imagenes/${id}_${file.name}`);
                          await uploadBytes(storageRef, file);
                          const url = await getDownloadURL(storageRef);
                          nuevasImagenes.push({
                            id,
                            nombre: file.name,
                            url,
                            tipo: file.type,
                            tamanio: file.size,
                            fechaSubida: new Date(),
                          });
                        }
                        setImagenesViaje([...imagenesViaje, ...nuevasImagenes]);
                      } catch (error) {
                        console.error('Error subiendo imagen:', error);
                      } finally {
                        setSubiendoImagen(false);
                      }
                    }}
                  />
                  <label htmlFor="imagen-upload" className="cursor-pointer">
                    {subiendoImagen ? (
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        <span>Subiendo...</span>
                      </div>
                    ) : (
                      <>
                        <Image className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Haz clic para subir imágenes</p>
                        <p className="text-xs text-gray-400">JPG, PNG, GIF (máx. 10MB)</p>
                      </>
                    )}
                  </label>
                </div>
                {imagenesViaje.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-3">
                    {imagenesViaje.map((img) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.url}
                          alt={img.nombre}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setImagenesViaje(imagenesViaje.filter((i) => i.id !== img.id))}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <p className="text-xs text-gray-500 mt-1 truncate">{img.nombre}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t flex justify-between sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setModalAbierto(false);
                  setModoEdicion(false);
                  setViajeEditando(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <div className="flex gap-3">
                <button
                  disabled={guardandoViaje}
                  onClick={async () => {
                    // Validaciones
                    if (!formData.clienteId) {
                      toast.error('Selecciona un cliente');
                      return;
                    }
                    if (!formData.tractoId) {
                      toast.error('Selecciona un tractocamión');
                      return;
                    }
                    if (!formData.operadorId) {
                      toast.error('Selecciona un operador');
                      return;
                    }
                    if (!formData.destino?.nombre) {
                      toast.error('Ingresa el nombre del destino');
                      return;
                    }

                    setGuardandoViaje(true);
                    try {
                      // Obtener datos adicionales para el viaje
                      const cliente = clientes.find(c => c.id === formData.clienteId);
                      const tracto = tractocamiones.find(t => t.id === formData.tractoId);
                      const operador = operadores.find(o => o.id === formData.operadorId);
                      const maniobrista = formData.maniobristaId
                        ? maniobristas.find(m => m.id === formData.maniobristaId)
                        : null;

                      // Calcular sueldo total (operador + maniobrista si aplica)
                      const sueldoOperador = operador?.sueldoDiario || 500;
                      const sueldoManiobrista = maniobrista?.sueldoDiario || 0;
                      const sueldoTotal = sueldoOperador + sueldoManiobrista;

                      const viajeInput: ViajeFormInput = {
                        fecha: formData.fecha || new Date(),
                        tractoId: formData.tractoId || '',
                        operadorId: formData.operadorId || '',
                        clienteId: formData.clienteId || '',
                        maniobristaId: formData.maniobristaId,
                        destino: formData.destino!,
                        condicionesSeguridad,
                        tipoServicio: formData.tipoServicio || 'Entrega',
                        distanciaKm: formData.distanciaKm || 0,
                        precioFlete: formData.precioFlete || 0,
                        equipos: equiposSeleccionados,
                        notas: formData.notas,
                      };

                      const datosAdicionales = {
                        tractoNumero: tracto?.label?.split(' - ')[0] || formData.tractoId || '',
                        operadorSueldoDia: sueldoTotal,
                        vehiculoSeguroDia: 200, // TODO: obtener del vehículo cuando se implemente seguro
                        clienteNombre: cliente?.nombreComercial || cliente?.nombre || '',
                      };

                      if (modoEdicion && viajeEditando) {
                        // Actualizar viaje existente
                        await actualizarViaje(viajeEditando.id, viajeInput, datosAdicionales);
                        toast.success('Orden de trabajo actualizada correctamente');
                      } else {
                        // Crear nuevo viaje
                        await crearViaje(viajeInput, user?.uid || 'sistema', datosAdicionales);
                        toast.success('Orden de trabajo creada correctamente');
                      }

                      setModalAbierto(false);
                      setModoEdicion(false);
                      setViajeEditando(null);
                      cargarDatos();

                      // Limpiar formulario
                      setClienteSeleccionado(null);
                      setObraSeleccionada(null);
                      setEquiposSeleccionados([]);
                      setCondicionesSeguridad({ ...CONDICIONES_SEGURIDAD_DEFAULT });
                      setDocumentosViaje([]);
                      setImagenesViaje([]);
                    } catch (error: any) {
                      console.error('Error al guardar viaje:', error);
                      // Mostrar mensaje de error más detallado
                      const mensajeError = error?.message || 'Error desconocido';
                      toast.error(`Error: ${mensajeError}`);
                    } finally {
                      setGuardandoViaje(false);
                    }
                  }}
                  className="px-4 py-2 bg-[#BB0034] text-white rounded-lg hover:bg-[#9a002b] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {guardandoViaje && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {modoEdicion ? 'Guardar Cambios' : 'Crear Orden'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
