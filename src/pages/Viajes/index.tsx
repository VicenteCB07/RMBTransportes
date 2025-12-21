/**
 * Módulo de Viajes
 * Gestión completa de viajes con integración a rutas, clientes, costos
 */

import { useState, useEffect, useRef } from 'react';
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
  iniciarEspera,
  registrarPartida,
  completarViaje,
  cancelarViaje,
  obtenerEstadisticasViajes,
  obtenerViajesActivos,
} from '../../services/trip.service';
import { obtenerClientes } from '../../services/client.service';
import { obtenerTractocamionesSelect, type TractocamionSelectItem } from '../../services/truck.service';
import { obtenerOperadoresSelect } from '../../services/operator.service';
import { obtenerAditamentosSelect, type AditamentoSelectItem } from '../../services/attachment.service';
import { obtenerManiobristasSelect } from '../../services/maniobrista.service';
import { getDirections, geocode } from '../../services/mapbox.service';
import { ORIGEN_BASE_RMB } from '../../types/workload.types';
import type { Cliente, ObraCliente } from '../../types/client.types';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Container, Users, AlertTriangle, History } from 'lucide-react';
import type { Viaje, ViajeFormInput, FiltrosViaje, StatusViaje, TipoServicioViaje, CondicionesSeguridad, ArchivoAdjunto, EquipoCargaViaje } from '../../types/trip.types';
import { CONDICIONES_SEGURIDAD_DEFAULT } from '../../types/trip.types';
import { CATALOGO_EQUIPOS, MARCAS_EQUIPO, buscarEquipoPorModelo } from '../../types/equipment.types';
import type { MarcaEquipo } from '../../types/equipment.types';
import { Package } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
import { Image, FileUp, Trash2, Move } from 'lucide-react';
import EditorCargaVisual from '../../components/viajes/EditorCargaVisual';

// Generador simple de ID único
const generarId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Tipo para resultado de validación de capacidad
interface ValidacionCapacidad {
  valido: boolean;
  tipo: 'warning' | 'error' | null;
  mensaje: string;
  detalles: string[];
}

/**
 * Valida si los equipos de carga caben en la capacidad de transporte
 * @param equiposCarga - Equipos a transportar
 * @param tracto - Tractocamión seleccionado (con plataforma si es rolloff)
 * @param aditamentosSeleccionados - Aditamentos seleccionados (lowboys, etc)
 * @param aditamentosCatalogo - Catálogo de aditamentos con capacidades
 */
function validarCapacidadCarga(
  equiposCarga: EquipoCargaViaje[],
  tracto: TractocamionSelectItem | undefined,
  aditamentosSeleccionados: string[],
  aditamentosCatalogo: AditamentoSelectItem[]
): ValidacionCapacidad {
  // Si no hay equipos de carga, no hay nada que validar
  if (equiposCarga.length === 0) {
    return { valido: true, tipo: null, mensaje: '', detalles: [] };
  }

  // Calcular totales de la carga
  const pesoTotalKg = equiposCarga.reduce((sum, e) => sum + e.peso, 0);
  const pesoTotalTon = pesoTotalKg / 1000;

  // Calcular dimensiones totales
  // Largo: suma de todos los equipos (asumiendo que van en línea)
  const largoTotalEquipos = equiposCarga.reduce((sum, e) => sum + e.dimensiones.largo, 0);
  // Ancho: el más ancho de todos (los equipos van uno detrás de otro)
  const anchoMaxEquipo = Math.max(...equiposCarga.map(e => e.dimensiones.ancho));

  const detalles: string[] = [];
  let tipoAlerta: 'warning' | 'error' | null = null;

  // Determinar capacidades disponibles
  let capacidadToneladas = 0;
  let largoDisponible = 0;
  let anchoDisponible = 0;
  let tipoTransporte = '';

  if (tracto?.tipoUnidad === 'rolloff-plataforma' && tracto.plataformaCarga) {
    // Roll-off con plataforma integrada
    capacidadToneladas = tracto.plataformaCarga.capacidadToneladas;
    largoDisponible = tracto.plataformaCarga.largo;
    anchoDisponible = tracto.plataformaCarga.ancho;
    tipoTransporte = 'Roll-Off';
  } else if (tracto?.tipoUnidad === 'tractocamion' && aditamentosSeleccionados.length > 0) {
    // Tractocamión con aditamento - buscar el aditamento con mayor capacidad
    const aditamentosConCapacidad = aditamentosSeleccionados
      .map(id => aditamentosCatalogo.find(a => a.id === id))
      .filter((a): a is AditamentoSelectItem => a !== undefined && a.capacidadCarga !== undefined);

    if (aditamentosConCapacidad.length > 0) {
      // Usar el aditamento con mayor capacidad (normalmente solo hay uno)
      const aditamento = aditamentosConCapacidad[0];
      capacidadToneladas = aditamento.capacidadCarga || 0;
      largoDisponible = aditamento.largo || 0;
      anchoDisponible = aditamento.ancho || 0;
      tipoTransporte = aditamento.label;
    }
  }

  // Si no hay capacidades definidas, mostrar advertencia
  if (capacidadToneladas === 0 && largoDisponible === 0 && anchoDisponible === 0) {
    if (tracto?.tipoUnidad === 'rolloff-plataforma') {
      return {
        valido: true,
        tipo: 'warning',
        mensaje: 'Sin datos de capacidad',
        detalles: ['La unidad Roll-Off no tiene configuradas las dimensiones de su plataforma.']
      };
    } else if (tracto?.tipoUnidad === 'tractocamion' && aditamentosSeleccionados.length === 0) {
      return {
        valido: true,
        tipo: 'warning',
        mensaje: 'Sin aditamento seleccionado',
        detalles: ['Selecciona un aditamento (lowboy) para validar la capacidad de carga.']
      };
    } else if (tracto?.tipoUnidad === 'tractocamion') {
      return {
        valido: true,
        tipo: 'warning',
        mensaje: 'Sin datos de capacidad',
        detalles: ['El aditamento seleccionado no tiene configuradas las dimensiones.']
      };
    }
    // Sin tracto seleccionado
    return { valido: true, tipo: null, mensaje: '', detalles: [] };
  }

  // Validar peso
  if (capacidadToneladas > 0 && pesoTotalTon > capacidadToneladas) {
    tipoAlerta = 'error';
    detalles.push(`⚠️ Peso excedido: ${pesoTotalTon.toFixed(1)} ton > ${capacidadToneladas} ton de capacidad`);
  } else if (capacidadToneladas > 0 && pesoTotalTon > capacidadToneladas * 0.9) {
    tipoAlerta = tipoAlerta || 'warning';
    detalles.push(`⚡ Peso cercano al límite: ${pesoTotalTon.toFixed(1)} ton / ${capacidadToneladas} ton (${((pesoTotalTon / capacidadToneladas) * 100).toFixed(0)}%)`);
  }

  // Validar largo
  if (largoDisponible > 0 && largoTotalEquipos > largoDisponible) {
    tipoAlerta = 'error';
    detalles.push(`⚠️ Largo excedido: ${largoTotalEquipos.toFixed(2)}m > ${largoDisponible}m disponibles`);
  } else if (largoDisponible > 0 && largoTotalEquipos > largoDisponible * 0.95) {
    tipoAlerta = tipoAlerta || 'warning';
    detalles.push(`⚡ Largo ajustado: ${largoTotalEquipos.toFixed(2)}m / ${largoDisponible}m disponibles`);
  }

  // Validar ancho
  if (anchoDisponible > 0 && anchoMaxEquipo > anchoDisponible) {
    tipoAlerta = 'error';
    detalles.push(`⚠️ Ancho excedido: ${anchoMaxEquipo.toFixed(2)}m > ${anchoDisponible}m disponibles`);
  } else if (anchoDisponible > 0 && anchoMaxEquipo > anchoDisponible * 0.95) {
    tipoAlerta = tipoAlerta || 'warning';
    detalles.push(`⚡ Ancho ajustado: ${anchoMaxEquipo.toFixed(2)}m / ${anchoDisponible}m disponibles`);
  }

  // Si todo está bien, mostrar resumen positivo
  if (tipoAlerta === null && detalles.length === 0) {
    const usoPeso = capacidadToneladas > 0 ? ((pesoTotalTon / capacidadToneladas) * 100).toFixed(0) : '-';
    const detallesOK: string[] = [];

    // Mostrar peso
    if (capacidadToneladas > 0) {
      detallesOK.push(`Peso: ${pesoTotalTon.toFixed(1)}t / ${capacidadToneladas}t (${usoPeso}%)`);
    }

    // Mostrar dimensiones
    if (largoDisponible > 0 || anchoDisponible > 0) {
      const dimEquipo = `${largoTotalEquipos.toFixed(2)}m × ${anchoMaxEquipo.toFixed(2)}m`;
      const dimDisp = `${largoDisponible}m × ${anchoDisponible}m`;
      detallesOK.push(`Dimensiones: ${dimEquipo} en plataforma de ${dimDisp}`);
    }

    return {
      valido: true,
      tipo: null,
      mensaje: `✓ Capacidad OK - ${tipoTransporte}`,
      detalles: detallesOK
    };
  }

  return {
    valido: tipoAlerta !== 'error',
    tipo: tipoAlerta,
    mensaje: tipoAlerta === 'error' ? 'Capacidad excedida' : 'Revisar capacidad',
    detalles
  };
}

const TIPOS_SERVICIO: TipoServicioViaje[] = [
  'Entrega',
  'Recolección',
  'Cambio',
  'Entrega / Recoleccion',
  'Flete en falso',
];

const STATUS_COLORS: Record<StatusViaje, { bg: string; text: string; label: string }> = {
  sin_asignar: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Sin Asignar' },
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
  const [tractocamiones, setTractocamiones] = useState<TractocamionSelectItem[]>([]);
  const [operadores, setOperadores] = useState<{ id: string; nombre: string; licenciaTipo: string; sueldoDiario: number; tractosAutorizados: string[] }[]>([]);
  const [maniobristas, setManiobristas] = useState<{ id: string; nombre: string; sueldoDiario: number }[]>([]);
  const [aditamentos, setAditamentos] = useState<AditamentoSelectItem[]>([]);
  const [viajesActivos, setViajesActivos] = useState<Viaje[]>([]);

  // Selecciones del formulario
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [obraSeleccionada, setObraSeleccionada] = useState<ObraCliente | null>(null);
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<string[]>([]);

  // Equipos de carga (maquinaria a transportar)
  const [equiposCargaSeleccionados, setEquiposCargaSeleccionados] = useState<EquipoCargaViaje[]>([]);
  const [filtroMarcaCarga, setFiltroMarcaCarga] = useState<MarcaEquipo | ''>('');
  const [busquedaCarga, setBusquedaCarga] = useState('');

  // Alertas de validación
  const [alertaOperador, setAlertaOperador] = useState<string | null>(null);
  const [alertaTracto, setAlertaTracto] = useState<string | null>(null);
  const [alertaCapacidad, setAlertaCapacidad] = useState<{
    tipo: 'warning' | 'error';
    mensaje: string;
    detalles?: string[];
  } | null>(null);

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

  // Timeline - estado de carga
  const [procesandoTimeline, setProcesandoTimeline] = useState(false);

  // Editor visual de carga
  const [mostrarEditorCarga, setMostrarEditorCarga] = useState(false);

  // Modal de reagendamiento para Flete en falso
  const [mostrarModalReagendar, setMostrarModalReagendar] = useState(false);
  const [fechaReagendamiento, setFechaReagendamiento] = useState<Date>(new Date());
  const [tipoServicioAnterior, setTipoServicioAnterior] = useState<TipoServicioViaje>('Entrega');

  // AbortController para cancelar operaciones de upload pendientes
  const uploadAbortControllerRef = useRef<AbortController | null>(null);
  const isUploadCancelledRef = useRef(false);

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
  async function handleObraChange(obra: ObraCliente) {
    setObraSeleccionada(obra);

    // Buscar contacto principal de la obra
    const contactoPrincipal = obra.contactos?.find(c => c.esPrincipal) || obra.contactos?.[0];

    // Obtener coordenadas de la obra (o geocodificar si no existen)
    let coordenadas = obra.direccion.coordenadas;
    const direccionCompleta = `${obra.direccion.calle || ''} ${obra.direccion.numeroExterior || ''}, ${obra.direccion.colonia || ''}, ${obra.direccion.municipio || ''}, ${obra.direccion.estado || ''}`.trim();

    // Si no hay coordenadas, intentar geocodificar la dirección
    if (!coordenadas && direccionCompleta) {
      try {
        const resultados = await geocode(direccionCompleta, {
          country: 'mx',
          types: ['address', 'poi', 'place'],
          limit: 1,
        });
        if (resultados.length > 0) {
          coordenadas = resultados[0].coordinates;
          toast.success('Ubicación encontrada automáticamente');
        }
      } catch (error) {
        console.error('Error geocodificando dirección:', error);
      }
    }

    setFormData(prev => ({
      ...prev,
      destino: {
        nombre: obra.nombre,
        direccion: direccionCompleta,
        coordenadas: coordenadas,
        municipio: obra.direccion.municipio,
        estado: obra.direccion.estado,
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

    // Calcular distancia automáticamente si hay coordenadas
    if (coordenadas) {
      try {
        const resultado = await getDirections([ORIGEN_BASE_RMB, coordenadas]);
        if (resultado) {
          const distanciaKm = Math.round(resultado.distance / 1000); // metros a km
          setFormData(prev => ({
            ...prev,
            distanciaKm,
          }));
          toast.success(`Distancia calculada: ${distanciaKm} km`);
        }
      } catch (error) {
        console.error('Error calculando distancia:', error);
      }
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
    equiposCarga: [],
    regresaABase: false,
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  // Validar capacidad de carga cuando cambian los equipos, tracto o aditamentos
  useEffect(() => {
    if (modalAbierto && equiposCargaSeleccionados.length > 0) {
      const tracto = tractocamiones.find(t => t.id === formData.tractoId);
      const validacion = validarCapacidadCarga(
        equiposCargaSeleccionados,
        tracto,
        equiposSeleccionados,
        aditamentos
      );

      if (validacion.tipo) {
        setAlertaCapacidad({
          tipo: validacion.tipo,
          mensaje: validacion.mensaje,
          detalles: validacion.detalles
        });
      } else if (validacion.mensaje) {
        // Mostrar mensaje positivo de capacidad OK
        setAlertaCapacidad({
          tipo: 'warning', // Usamos warning para el estilo pero el mensaje es positivo
          mensaje: validacion.mensaje,
          detalles: validacion.detalles
        });
      } else {
        setAlertaCapacidad(null);
      }
    } else {
      setAlertaCapacidad(null);
    }
  }, [equiposCargaSeleccionados, formData.tractoId, equiposSeleccionados, modalAbierto, tractocamiones, aditamentos]);

  async function cargarDatos() {
    setLoading(true);
    try {
      // Cargar todos los viajes, el filtro por status se hace en el cliente
      const [viajesData, statsData, clientesData, tractosData, operadoresData, maniobristasData, aditamentosData, viajesActivosData] = await Promise.all([
        obtenerViajes(),
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

  const viajesFiltrados = viajes.filter(v => {
    // Filtro por status
    if (filtroStatus && v.status !== filtroStatus) return false;

    // Filtro por búsqueda de texto
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      return (
        v.folio.toLowerCase().includes(busquedaLower) ||
        v.clienteNombre.toLowerCase().includes(busquedaLower) ||
        v.destino.nombre.toLowerCase().includes(busquedaLower)
      );
    }

    return true;
  });

  async function handleIniciarViaje(viaje: Viaje) {
    setProcesandoTimeline(true);
    try {
      await iniciarViaje(viaje.id);
      toast.success('Viaje iniciado');
      setViajeDetalle({
        ...viaje,
        status: 'en_curso',
        tiempos: { ...viaje.tiempos, inicio: new Date() }
      });
      cargarDatos();
    } catch (error) {
      console.error('Error al iniciar viaje:', error);
      toast.error('Error al iniciar viaje');
    } finally {
      setProcesandoTimeline(false);
    }
  }

  async function handleLlegada(viaje: Viaje) {
    setProcesandoTimeline(true);
    try {
      await registrarLlegada(viaje.id);
      toast.success('Llegada registrada');
      setViajeDetalle({
        ...viaje,
        status: 'en_destino',
        tiempos: { ...viaje.tiempos, llegada: new Date() }
      });
      cargarDatos();
    } catch (error) {
      console.error('Error al registrar llegada:', error);
      toast.error('Error al registrar llegada');
    } finally {
      setProcesandoTimeline(false);
    }
  }

  async function handleIniciarEspera(viaje: Viaje) {
    setProcesandoTimeline(true);
    try {
      await iniciarEspera(viaje.id);
      toast.success('Espera iniciada');
      // Actualizar el viaje en detalle con el nuevo tiempo
      setViajeDetalle({
        ...viaje,
        tiempos: { ...viaje.tiempos, inicioEspera: new Date() }
      });
      cargarDatos();
    } catch (error) {
      console.error('Error al iniciar espera:', error);
      toast.error('Error al iniciar espera');
    } finally {
      setProcesandoTimeline(false);
    }
  }

  async function handleRegistrarPartida(viaje: Viaje) {
    setProcesandoTimeline(true);
    try {
      await registrarPartida(viaje.id);
      toast.success('Partida registrada');
      // Calcular tiempo de espera para actualizar la UI
      let tiempoEsperaCalculado: number | undefined;
      if (viaje.tiempos.inicioEspera) {
        tiempoEsperaCalculado = Math.round(
          (Date.now() - viaje.tiempos.inicioEspera.getTime()) / 60000
        );
      }
      setViajeDetalle({
        ...viaje,
        tiempos: {
          ...viaje.tiempos,
          partida: new Date(),
          tiempoEspera: tiempoEsperaCalculado
        }
      });
      cargarDatos();
    } catch (error) {
      console.error('Error al registrar partida:', error);
      toast.error('Error al registrar partida');
    } finally {
      setProcesandoTimeline(false);
    }
  }

  async function handleCompletar(viaje: Viaje) {
    setProcesandoTimeline(true);
    try {
      await completarViaje(viaje.id);
      toast.success('Viaje completado');
      cargarDatos();
      setViajeDetalle(null);
    } catch (error) {
      console.error('Error al completar viaje:', error);
      toast.error('Error al completar viaje');
    } finally {
      setProcesandoTimeline(false);
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

  function formatearFechaCorta(fecha?: Date): string {
    if (!fecha) return '--/--/--';
    const d = fecha.getDate().toString().padStart(2, '0');
    const m = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const y = fecha.getFullYear().toString().slice(-2);
    return `${d}/${m}/${y}`;
  }

  function formatearDuracion(minutos?: number): string {
    if (!minutos) return '--';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
  }

  // Función para cerrar el modal y cancelar operaciones pendientes
  function cerrarModalViaje() {
    // Cancelar cualquier upload en progreso
    isUploadCancelledRef.current = true;
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort();
      uploadAbortControllerRef.current = null;
    }

    // Resetear estados de carga
    setSubiendoDocumento(false);
    setSubiendoImagen(false);

    // Cerrar modal y limpiar estados
    setModalAbierto(false);
    setModoEdicion(false);
    setViajeEditando(null);
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
            setEquiposCargaSeleccionados([]);
            setCondicionesSeguridad({ ...CONDICIONES_SEGURIDAD_DEFAULT });
            setDocumentosViaje([]);
            setImagenesViaje([]);
            setAlertaOperador(null);
            setAlertaTracto(null);
            setAlertaCapacidad(null);
            setHistorialCliente([]);
            setModoEdicion(false);
            setViajeEditando(null);
            setFormData({
              fecha: new Date(),
              fechaCompromiso: new Date(),
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
              regresaABase: false,
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
                  <th className="text-left p-4 font-medium text-gray-600">Fecha Compromiso</th>
                  <th className="text-left p-4 font-medium text-gray-600">Cliente</th>
                  <th className="text-left p-4 font-medium text-gray-600">Destino</th>
                  <th className="text-left p-4 font-medium text-gray-600">Carga</th>
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
                          {formatearFechaCorta(viaje.fechaCompromiso)}
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
                        {viaje.equiposCarga && viaje.equiposCarga.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4 text-blue-500" />
                            <span className="text-sm text-blue-700 font-medium">
                              {viaje.equiposCarga.length === 1
                                ? viaje.equiposCarga[0].modelo
                                : `${viaje.equiposCarga.length} equipos`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Sin carga</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium">
                          {tractocamiones.find(t => t.id === viaje.tractoId)?.label?.split(' - ')[0] || viaje.tractoId}
                        </span>
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
                {(viajeDetalle.status === 'sin_asignar' || viajeDetalle.status === 'programado' || viajeDetalle.status === 'en_curso' || viajeDetalle.status === 'en_destino') && (
                  <button
                    onClick={() => {
                      // Cargar datos del viaje en el formulario
                      const cliente = clientes.find(c => c.id === viajeDetalle.clienteId);
                      setClienteSeleccionado(cliente || null);
                      setObraSeleccionada(null);
                      setEquiposSeleccionados(viajeDetalle.equipos || []);
                      setEquiposCargaSeleccionados(viajeDetalle.equiposCarga || []);
                      setCondicionesSeguridad(viajeDetalle.condicionesSeguridad || { ...CONDICIONES_SEGURIDAD_DEFAULT });
                      setAlertaOperador(null);
                      setAlertaTracto(null);
                      setAlertaCapacidad(null);
                      setHistorialCliente([]);
                      setFormData({
                        fecha: viajeDetalle.fecha || new Date(),
                        fechaCompromiso: viajeDetalle.fechaCompromiso,
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
                        regresaABase: viajeDetalle.regresaABase || false,
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
              {/* Timeline de tiempos - Clickeable */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Timeline del Viaje</h3>
                  <span className="text-xs text-gray-500">Click en cada paso para registrar</span>
                </div>
                <div className="flex items-center justify-between">
                  {/* 1. Inicio - Click cuando está programado */}
                  <div className="text-center">
                    <button
                      onClick={() => viajeDetalle.status === 'programado' && !procesandoTimeline && handleIniciarViaje(viajeDetalle)}
                      disabled={viajeDetalle.status !== 'programado' || procesandoTimeline}
                      className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 transition-all
                        ${viajeDetalle.tiempos.inicio
                          ? 'bg-green-100 text-green-600'
                          : viajeDetalle.status === 'programado'
                            ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer ring-2 ring-green-300 ring-offset-2 animate-pulse'
                            : 'bg-gray-200 text-gray-400'
                        }
                        disabled:cursor-not-allowed disabled:opacity-70`}
                      title={viajeDetalle.status === 'programado' ? 'Click para iniciar viaje' : ''}
                    >
                      <Play className="w-5 h-5" />
                    </button>
                    <p className="text-xs text-gray-500">Inicio</p>
                    <p className="font-medium text-sm">{formatearHora(viajeDetalle.tiempos.inicio)}</p>
                  </div>

                  <div className={`flex-1 h-1 mx-2 rounded ${viajeDetalle.tiempos.inicio ? 'bg-green-300' : 'bg-gray-200'}`} />

                  {/* 2. Llegada - Click cuando está en_curso */}
                  <div className="text-center">
                    <button
                      onClick={() => viajeDetalle.status === 'en_curso' && !procesandoTimeline && handleLlegada(viajeDetalle)}
                      disabled={viajeDetalle.status !== 'en_curso' || procesandoTimeline}
                      className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 transition-all
                        ${viajeDetalle.tiempos.llegada
                          ? 'bg-blue-100 text-blue-600'
                          : viajeDetalle.status === 'en_curso'
                            ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer ring-2 ring-blue-300 ring-offset-2 animate-pulse'
                            : 'bg-gray-200 text-gray-400'
                        }
                        disabled:cursor-not-allowed disabled:opacity-70`}
                      title={viajeDetalle.status === 'en_curso' ? 'Click para registrar llegada' : ''}
                    >
                      <MapPin className="w-5 h-5" />
                    </button>
                    <p className="text-xs text-gray-500">Llegada</p>
                    <p className="font-medium text-sm">{formatearHora(viajeDetalle.tiempos.llegada)}</p>
                  </div>

                  <div className={`flex-1 h-1 mx-2 rounded ${viajeDetalle.tiempos.llegada ? 'bg-blue-300' : 'bg-gray-200'}`} />

                  {/* 3. Espera - Click cuando en_destino y no hay inicioEspera */}
                  <div className="text-center">
                    <button
                      onClick={() => viajeDetalle.status === 'en_destino' && !viajeDetalle.tiempos.inicioEspera && !procesandoTimeline && handleIniciarEspera(viajeDetalle)}
                      disabled={viajeDetalle.status !== 'en_destino' || !!viajeDetalle.tiempos.inicioEspera || procesandoTimeline}
                      className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 transition-all
                        ${viajeDetalle.tiempos.tiempoEspera !== undefined && viajeDetalle.tiempos.tiempoEspera !== null
                          ? 'bg-amber-100 text-amber-600'
                          : viajeDetalle.tiempos.inicioEspera
                            ? 'bg-amber-400 text-white animate-pulse'
                          : viajeDetalle.status === 'en_destino'
                            ? 'bg-amber-500 text-white hover:bg-amber-600 cursor-pointer ring-2 ring-amber-300 ring-offset-2 animate-pulse'
                            : 'bg-gray-200 text-gray-400'
                        }
                        disabled:cursor-not-allowed disabled:opacity-70`}
                      title={viajeDetalle.status === 'en_destino' && !viajeDetalle.tiempos.inicioEspera ? 'Click para iniciar espera' : viajeDetalle.tiempos.inicioEspera && !viajeDetalle.tiempos.partida ? 'Espera en curso...' : ''}
                    >
                      <Clock className="w-5 h-5" />
                    </button>
                    <p className="text-xs text-gray-500">Espera</p>
                    {viajeDetalle.tiempos.inicioEspera && !viajeDetalle.tiempos.partida ? (
                      <p className="font-medium text-sm text-amber-600">En espera...</p>
                    ) : (
                      <p className="font-medium text-sm">{formatearDuracion(viajeDetalle.tiempos.tiempoEspera)}</p>
                    )}
                  </div>

                  <div className={`flex-1 h-1 mx-2 rounded ${viajeDetalle.tiempos.inicioEspera ? 'bg-amber-300' : 'bg-gray-200'}`} />

                  {/* 4. Partida - Click cuando hay inicioEspera pero no partida */}
                  <div className="text-center">
                    <button
                      onClick={() => viajeDetalle.status === 'en_destino' && viajeDetalle.tiempos.inicioEspera && !viajeDetalle.tiempos.partida && !procesandoTimeline && handleRegistrarPartida(viajeDetalle)}
                      disabled={!(viajeDetalle.status === 'en_destino' && viajeDetalle.tiempos.inicioEspera && !viajeDetalle.tiempos.partida) || procesandoTimeline}
                      className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 transition-all
                        ${viajeDetalle.tiempos.partida
                          ? 'bg-purple-100 text-purple-600'
                          : viajeDetalle.tiempos.inicioEspera && !viajeDetalle.tiempos.partida
                            ? 'bg-purple-500 text-white hover:bg-purple-600 cursor-pointer ring-2 ring-purple-300 ring-offset-2 animate-pulse'
                            : 'bg-gray-200 text-gray-400'
                        }
                        disabled:cursor-not-allowed disabled:opacity-70`}
                      title={viajeDetalle.tiempos.inicioEspera && !viajeDetalle.tiempos.partida ? 'Click para registrar partida' : ''}
                    >
                      <Navigation className="w-5 h-5" />
                    </button>
                    <p className="text-xs text-gray-500">Partida</p>
                    <p className="font-medium text-sm">{formatearHora(viajeDetalle.tiempos.partida)}</p>
                  </div>

                  <div className={`flex-1 h-1 mx-2 rounded ${viajeDetalle.tiempos.partida ? 'bg-purple-300' : 'bg-gray-200'}`} />

                  {/* 5. Fin - Click cuando hay partida pero no fin */}
                  <div className="text-center">
                    <button
                      onClick={() => viajeDetalle.status === 'en_destino' && viajeDetalle.tiempos.partida && !viajeDetalle.tiempos.fin && !procesandoTimeline && handleCompletar(viajeDetalle)}
                      disabled={!(viajeDetalle.status === 'en_destino' && viajeDetalle.tiempos.partida && !viajeDetalle.tiempos.fin) || procesandoTimeline}
                      className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 transition-all
                        ${viajeDetalle.tiempos.fin
                          ? 'bg-green-100 text-green-600'
                          : viajeDetalle.tiempos.partida && !viajeDetalle.tiempos.fin
                            ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer ring-2 ring-green-300 ring-offset-2 animate-pulse'
                            : 'bg-gray-200 text-gray-400'
                        }
                        disabled:cursor-not-allowed disabled:opacity-70`}
                      title={viajeDetalle.tiempos.partida && !viajeDetalle.tiempos.fin ? 'Click para completar viaje' : ''}
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <p className="text-xs text-gray-500">Fin</p>
                    <p className="font-medium text-sm">{formatearHora(viajeDetalle.tiempos.fin)}</p>
                  </div>
                </div>

                {/* Indicador de estado actual */}
                {viajeDetalle.status !== 'completado' && viajeDetalle.status !== 'cancelado' && (
                  <div className="mt-4 text-center">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                      ${viajeDetalle.status === 'programado' ? 'bg-green-100 text-green-700' : ''}
                      ${viajeDetalle.status === 'en_curso' ? 'bg-blue-100 text-blue-700' : ''}
                      ${viajeDetalle.status === 'en_destino' && !viajeDetalle.tiempos.inicioEspera ? 'bg-amber-100 text-amber-700' : ''}
                      ${viajeDetalle.status === 'en_destino' && viajeDetalle.tiempos.inicioEspera && !viajeDetalle.tiempos.partida ? 'bg-amber-100 text-amber-700' : ''}
                      ${viajeDetalle.status === 'en_destino' && viajeDetalle.tiempos.partida ? 'bg-green-100 text-green-700' : ''}
                    `}>
                      {procesandoTimeline && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                      {viajeDetalle.status === 'programado' && 'Click en Inicio para comenzar'}
                      {viajeDetalle.status === 'en_curso' && 'Click en Llegada al arribar'}
                      {viajeDetalle.status === 'en_destino' && !viajeDetalle.tiempos.inicioEspera && 'Click en Espera para iniciar conteo'}
                      {viajeDetalle.status === 'en_destino' && viajeDetalle.tiempos.inicioEspera && !viajeDetalle.tiempos.partida && 'Click en Partida al salir'}
                      {viajeDetalle.status === 'en_destino' && viajeDetalle.tiempos.partida && !viajeDetalle.tiempos.fin && 'Click en Fin para completar'}
                    </span>
                  </div>
                )}

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
                      <span className="text-gray-500">Fecha Compromiso:</span>
                      <span>{formatearFechaCorta(viajeDetalle.fechaCompromiso)}</span>
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
              <button
                onClick={() => setViajeDetalle(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cerrar
              </button>
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
                  {modoEdicion ? 'Editar Orden de Servicio' : 'Nueva Orden de Servicio'}
                </h2>
                {modoEdicion && viajeEditando && (
                  <p className="text-sm text-gray-500 font-mono">{viajeEditando.folio}</p>
                )}
              </div>
              <button onClick={cerrarModalViaje}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Fecha Compromiso - Parte superior */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Fecha Compromiso *
                  </label>
                  <input
                    type="date"
                    value={formData.fechaCompromiso ? formData.fechaCompromiso.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      fechaCompromiso: e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Fecha en que debe realizarse el flete</p>
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

              {/* Tipo de Servicio */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Servicio *
                  </label>
                  <select
                    value={formData.tipoServicio}
                    onChange={(e) => {
                      const nuevoTipo = e.target.value as TipoServicioViaje;
                      // Si se selecciona "Flete en falso", mostrar modal de reagendamiento
                      if (nuevoTipo === 'Flete en falso' && formData.tipoServicio !== 'Flete en falso') {
                        setTipoServicioAnterior(formData.tipoServicio || 'Entrega');
                        // Inicializar fecha de reagendamiento al día siguiente
                        const manana = new Date();
                        manana.setDate(manana.getDate() + 1);
                        setFechaReagendamiento(manana);
                        setMostrarModalReagendar(true);
                      }
                      setFormData({ ...formData, tipoServicio: nuevoTipo });
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  >
                    {TIPOS_SERVICIO.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
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
                          <span className="text-gray-500">{formatearFechaCorta(viaje.fechaCompromiso)}</span>
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
                        Aditamento (opcional)
                      </label>
                      <select
                        value={equiposSeleccionados[0] || ''}
                        onChange={(e) => {
                          const nuevoEquipo = e.target.value;
                          if (nuevoEquipo) {
                            setEquiposSeleccionados([nuevoEquipo]);
                            setFormData({ ...formData, equipos: [nuevoEquipo] });
                          } else {
                            setEquiposSeleccionados([]);
                            setFormData({ ...formData, equipos: [] });
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                      >
                        <option value="">Sin aditamento</option>
                        {aditamentos.map(a => (
                          <option key={a.id} value={a.id}>{a.label}</option>
                        ))}
                      </select>
                      {equiposSeleccionados.length > 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          1 aditamento asignado
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Equipos de Carga (Maquinaria a transportar) */}
              <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  Equipos de Carga (Maquinaria)
                  {equiposCargaSeleccionados.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">
                      {equiposCargaSeleccionados.length} equipo(s)
                    </span>
                  )}
                </h3>

                {/* Equipos seleccionados */}
                {equiposCargaSeleccionados.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 font-medium">Equipos a transportar:</p>
                    <div className="space-y-2">
                      {equiposCargaSeleccionados.map((equipo, idx) => (
                        <div key={equipo.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-blue-700">{equipo.marca}</span>
                              <span className="text-gray-700">{equipo.modelo}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {equipo.dimensiones.largo}m × {equipo.dimensiones.ancho}m × {equipo.dimensiones.alto}m | {equipo.peso.toLocaleString()} kg
                            </div>
                            {(equipo.numeroSerie || equipo.numeroEconomico) && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                {equipo.numeroSerie && <span>S/N: {equipo.numeroSerie}</span>}
                                {equipo.numeroSerie && equipo.numeroEconomico && <span> | </span>}
                                {equipo.numeroEconomico && <span>Eco: {equipo.numeroEconomico}</span>}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const nuevos = equiposCargaSeleccionados.filter((_, i) => i !== idx);
                              setEquiposCargaSeleccionados(nuevos);
                              setFormData({ ...formData, equiposCarga: nuevos });
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* Resumen de peso total */}
                    <div className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
                      <strong>Peso total:</strong> {equiposCargaSeleccionados.reduce((sum, e) => sum + e.peso, 0).toLocaleString()} kg
                      {' '}({(equiposCargaSeleccionados.reduce((sum, e) => sum + e.peso, 0) / 1000).toFixed(2)} ton)
                    </div>

                    {/* Alerta de validación de capacidad */}
                    {alertaCapacidad && (
                      <div className={`p-3 rounded-lg border ${
                        alertaCapacidad.tipo === 'error'
                          ? 'bg-red-50 border-red-300 text-red-800'
                          : alertaCapacidad.mensaje.includes('✓')
                            ? 'bg-green-50 border-green-300 text-green-800'
                            : 'bg-amber-50 border-amber-300 text-amber-800'
                      }`}>
                        <div className="flex items-center gap-2 font-medium">
                          {alertaCapacidad.tipo === 'error' ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : alertaCapacidad.mensaje.includes('✓') ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                          {alertaCapacidad.mensaje}
                        </div>
                        {alertaCapacidad.detalles && alertaCapacidad.detalles.length > 0 && (
                          <ul className="mt-1 text-sm space-y-0.5">
                            {alertaCapacidad.detalles.map((detalle, idx) => (
                              <li key={idx}>{detalle}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Botón para abrir editor visual de acomodo */}
                    {(() => {
                      const tractoSeleccionado = tractocamiones.find(t => t.id === formData.tractoId);
                      const tieneCapacidadDefinida =
                        (tractoSeleccionado?.tipoUnidad === 'rolloff-plataforma' && tractoSeleccionado?.plataformaCarga) ||
                        (tractoSeleccionado?.tipoUnidad === 'tractocamion' && equiposSeleccionados.length > 0);

                      if (!tieneCapacidadDefinida) return null;

                      return (
                        <button
                          type="button"
                          onClick={() => setMostrarEditorCarga(true)}
                          className="w-full mt-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-indigo-700 text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                          <Move className="w-4 h-4" />
                          Abrir Editor Visual de Acomodo
                        </button>
                      );
                    })()}
                  </div>
                )}

                {/* Agregar equipo */}
                <div className="border-t border-blue-200 pt-3">
                  <p className="text-sm text-gray-600 mb-2">Agregar equipo del catálogo:</p>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={filtroMarcaCarga}
                      onChange={(e) => setFiltroMarcaCarga(e.target.value as MarcaEquipo | '')}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="">Todas las marcas</option>
                      {MARCAS_EQUIPO.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={busquedaCarga}
                      onChange={(e) => setBusquedaCarga(e.target.value)}
                      placeholder="Buscar modelo..."
                      className="flex-1 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded bg-white">
                    {CATALOGO_EQUIPOS
                      .filter(e => !filtroMarcaCarga || e.marca === filtroMarcaCarga)
                      .filter(e => !busquedaCarga || e.modelo.toLowerCase().includes(busquedaCarga.toLowerCase()))
                      .slice(0, 20)
                      .map(equipo => (
                        <button
                          key={equipo.modelo}
                          type="button"
                          onClick={() => {
                            const nuevoEquipo: EquipoCargaViaje = {
                              id: generarId(),
                              modelo: equipo.modelo,
                              marca: equipo.marca,
                              categoria: equipo.categoria,
                              dimensiones: { ...equipo.dimensiones },
                              peso: equipo.peso,
                            };
                            const nuevos = [...equiposCargaSeleccionados, nuevoEquipo];
                            setEquiposCargaSeleccionados(nuevos);
                            setFormData({ ...formData, equiposCarga: nuevos });
                            toast.success(`${equipo.marca} ${equipo.modelo} agregado`);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 flex justify-between items-center"
                        >
                          <div>
                            <span className="font-medium text-blue-600">{equipo.marca}</span>
                            <span className="ml-2 text-gray-700">{equipo.modelo}</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {equipo.peso.toLocaleString()} kg
                          </span>
                        </button>
                      ))}
                    {CATALOGO_EQUIPOS
                      .filter(e => !filtroMarcaCarga || e.marca === filtroMarcaCarga)
                      .filter(e => !busquedaCarga || e.modelo.toLowerCase().includes(busquedaCarga.toLowerCase()))
                      .length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">No se encontraron equipos</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Mostrando máx. 20 resultados. Usa los filtros para encontrar el equipo.
                  </p>
                </div>
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

                {/* Distancia */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Navigation className="w-3 h-3 inline mr-1" />
                      Distancia (km)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.distanciaKm || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          distanciaKm: parseInt(e.target.value) || 0
                        })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                        placeholder="0"
                        min="0"
                      />
                      {formData.destino?.coordenadas && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600">
                          Auto
                        </span>
                      )}
                    </div>
                    {!formData.destino?.coordenadas && formData.distanciaKm === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Sin coordenadas. Ingresa la distancia manualmente.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <DollarSign className="w-3 h-3 inline mr-1" />
                      Precio del Flete
                    </label>
                    <input
                      type="number"
                      value={formData.precioFlete || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        precioFlete: parseFloat(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                      placeholder="0.00"
                      min="0"
                      step="100"
                    />
                  </div>
                </div>

                {/* Checkbox regresa a base */}
                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer mt-4">
                  <input
                    type="checkbox"
                    checked={formData.regresaABase || false}
                    onChange={(e) => setFormData({
                      ...formData,
                      regresaABase: e.target.checked
                    })}
                    className="w-4 h-4 rounded border-gray-300 text-[#BB0034] focus:ring-[#BB0034]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Regresa a Base</span>
                    <p className="text-xs text-gray-500">La unidad vuelve a base después de este servicio (cargar/descargar equipos)</p>
                  </div>
                </label>
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

                      // Validar tamaño máximo (10MB)
                      const maxSize = 10 * 1024 * 1024;
                      for (const file of Array.from(files)) {
                        if (file.size > maxSize) {
                          toast.error(`El archivo "${file.name}" excede el tamaño máximo de 10MB`);
                          return;
                        }
                      }

                      // Resetear flag de cancelación
                      isUploadCancelledRef.current = false;
                      setSubiendoDocumento(true);

                      const loadingToast = toast.loading('Subiendo documento...');

                      try {
                        const nuevosDocumentos: ArchivoAdjunto[] = [];
                        let uploadedCount = 0;

                        for (const file of Array.from(files)) {
                          // Verificar si se canceló la operación
                          if (isUploadCancelledRef.current) {
                            toast.dismiss(loadingToast);
                            toast.error('Subida de documentos cancelada');
                            break;
                          }

                          const id = generarId();
                          // Limpiar nombre de archivo (remover caracteres especiales)
                          const nombreLimpio = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                          const path = `viajes/documentos/${id}_${nombreLimpio}`;

                          console.log('Intentando subir a:', path);
                          console.log('Archivo:', file.name, 'Tamaño:', file.size, 'bytes');

                          const storageRef = ref(storage, path);

                          // Subir archivo
                          const snapshot = await uploadBytes(storageRef, file);
                          console.log('Upload completado:', snapshot.metadata.fullPath);

                          // Obtener URL
                          const url = await getDownloadURL(storageRef);
                          console.log('URL obtenida:', url);

                          nuevosDocumentos.push({
                            id,
                            nombre: file.name,
                            url,
                            tipo: file.type || 'application/octet-stream',
                            tamanio: file.size,
                            fechaSubida: new Date(),
                          });
                          uploadedCount++;
                        }

                        toast.dismiss(loadingToast);

                        if (nuevosDocumentos.length > 0 && !isUploadCancelledRef.current) {
                          setDocumentosViaje(prev => [...prev, ...nuevosDocumentos]);
                          toast.success(`${uploadedCount} documento${uploadedCount > 1 ? 's' : ''} subido${uploadedCount > 1 ? 's' : ''}`);
                        }
                      } catch (error: any) {
                        toast.dismiss(loadingToast);
                        console.error('Error completo subiendo documento:', error);
                        console.error('Código de error:', error?.code);
                        console.error('Mensaje:', error?.message);

                        if (!isUploadCancelledRef.current) {
                          // Mensajes de error más específicos
                          let mensajeError = 'Error desconocido';
                          if (error?.code === 'storage/unauthorized') {
                            mensajeError = 'Sin permisos. Verifica las reglas de Firebase Storage.';
                          } else if (error?.code === 'storage/canceled') {
                            mensajeError = 'Subida cancelada';
                          } else if (error?.code === 'storage/unknown') {
                            mensajeError = 'Error de red. Verifica tu conexión.';
                          } else if (error?.message) {
                            mensajeError = error.message;
                          }
                          toast.error(`Error: ${mensajeError}`);
                        }
                      } finally {
                        setSubiendoDocumento(false);
                        // Limpiar el input para permitir subir el mismo archivo de nuevo
                        e.target.value = '';
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

                      // Validar tamaño máximo (10MB)
                      const maxSize = 10 * 1024 * 1024;
                      for (const file of Array.from(files)) {
                        if (file.size > maxSize) {
                          toast.error(`La imagen "${file.name}" excede el tamaño máximo de 10MB`);
                          return;
                        }
                      }

                      // Resetear flag de cancelación
                      isUploadCancelledRef.current = false;
                      setSubiendoImagen(true);

                      const loadingToast = toast.loading('Subiendo imagen...');

                      try {
                        const nuevasImagenes: ArchivoAdjunto[] = [];
                        let uploadedCount = 0;

                        for (const file of Array.from(files)) {
                          // Verificar si se canceló la operación
                          if (isUploadCancelledRef.current) {
                            toast.dismiss(loadingToast);
                            toast.error('Subida de imágenes cancelada');
                            break;
                          }

                          const id = generarId();
                          // Limpiar nombre de archivo (remover caracteres especiales)
                          const nombreLimpio = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                          const path = `viajes/imagenes/${id}_${nombreLimpio}`;

                          console.log('Intentando subir imagen a:', path);
                          console.log('Archivo:', file.name, 'Tamaño:', file.size, 'bytes');

                          const storageRef = ref(storage, path);

                          // Subir archivo
                          const snapshot = await uploadBytes(storageRef, file);
                          console.log('Upload imagen completado:', snapshot.metadata.fullPath);

                          // Obtener URL
                          const url = await getDownloadURL(storageRef);
                          console.log('URL imagen obtenida:', url);

                          nuevasImagenes.push({
                            id,
                            nombre: file.name,
                            url,
                            tipo: file.type || 'image/jpeg',
                            tamanio: file.size,
                            fechaSubida: new Date(),
                          });
                          uploadedCount++;
                        }

                        toast.dismiss(loadingToast);

                        if (nuevasImagenes.length > 0 && !isUploadCancelledRef.current) {
                          setImagenesViaje(prev => [...prev, ...nuevasImagenes]);
                          toast.success(`${uploadedCount} imagen${uploadedCount > 1 ? 'es' : ''} subida${uploadedCount > 1 ? 's' : ''}`);
                        }
                      } catch (error: any) {
                        toast.dismiss(loadingToast);
                        console.error('Error completo subiendo imagen:', error);
                        console.error('Código de error:', error?.code);
                        console.error('Mensaje:', error?.message);

                        if (!isUploadCancelledRef.current) {
                          // Mensajes de error más específicos
                          let mensajeError = 'Error desconocido';
                          if (error?.code === 'storage/unauthorized') {
                            mensajeError = 'Sin permisos. Verifica las reglas de Firebase Storage.';
                          } else if (error?.code === 'storage/canceled') {
                            mensajeError = 'Subida cancelada';
                          } else if (error?.code === 'storage/unknown') {
                            mensajeError = 'Error de red. Verifica tu conexión.';
                          } else if (error?.message) {
                            mensajeError = error.message;
                          }
                          toast.error(`Error: ${mensajeError}`);
                        }
                      } finally {
                        setSubiendoImagen(false);
                        // Limpiar el input para permitir subir la misma imagen de nuevo
                        e.target.value = '';
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
                onClick={cerrarModalViaje}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <div className="flex gap-3">
                <button
                  disabled={guardandoViaje}
                  onClick={async () => {
                    // Validaciones mínimas
                    if (!formData.clienteId) {
                      toast.error('Selecciona un cliente');
                      return;
                    }
                    if (!formData.destino?.nombre) {
                      toast.error('Ingresa el nombre del destino');
                      return;
                    }
                    if (!formData.fechaCompromiso) {
                      toast.error('Selecciona la fecha compromiso');
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

                      // Determinar status basado en si tiene asignación
                      const tieneAsignacion = formData.tractoId && formData.operadorId;
                      const statusViaje = tieneAsignacion ? 'programado' : 'sin_asignar';

                      const viajeInput: ViajeFormInput = {
                        fecha: formData.fecha || new Date(),
                        fechaCompromiso: formData.fechaCompromiso,
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
                        equiposCarga: equiposCargaSeleccionados,
                        notas: formData.notas,
                        status: statusViaje,
                        regresaABase: formData.regresaABase || false,
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
                        toast.success('Orden de servicio actualizada correctamente');
                      } else {
                        // Crear nuevo viaje
                        await crearViaje(viajeInput, user?.uid || 'sistema', datosAdicionales);
                        toast.success('Orden de servicio creada correctamente');
                      }

                      setModalAbierto(false);
                      setModoEdicion(false);
                      setViajeEditando(null);
                      cargarDatos();

                      // Limpiar formulario
                      setClienteSeleccionado(null);
                      setObraSeleccionada(null);
                      setEquiposSeleccionados([]);
                      setEquiposCargaSeleccionados([]);
                      setFiltroMarcaCarga('');
                      setBusquedaCarga('');
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

      {/* Modal del Editor Visual de Carga */}
      {mostrarEditorCarga && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setMostrarEditorCarga(false)}
            />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[95vw] max-h-[95vh] overflow-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Move size={20} />
                  Editor Visual de Acomodo
                </h2>
                <button
                  onClick={() => setMostrarEditorCarga(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Contenido */}
              <div className="p-4">
                {(() => {
                  const tractoSeleccionado = tractocamiones.find(t => t.id === formData.tractoId);

                  // Determinar configuración de plataforma
                  let plataformaConfig = {
                    largo: 0,
                    ancho: 0,
                    capacidadTon: 0,
                    nombre: 'Sin seleccionar',
                  };

                  if (tractoSeleccionado?.tipoUnidad === 'rolloff-plataforma' && tractoSeleccionado.plataformaCarga) {
                    plataformaConfig = {
                      largo: tractoSeleccionado.plataformaCarga.largo,
                      ancho: tractoSeleccionado.plataformaCarga.ancho,
                      capacidadTon: tractoSeleccionado.plataformaCarga.capacidadToneladas,
                      nombre: `${tractoSeleccionado.label} (Roll-Off)`,
                    };
                  } else if (tractoSeleccionado?.tipoUnidad === 'tractocamion' && equiposSeleccionados.length > 0) {
                    // Buscar el aditamento seleccionado
                    const aditamento = aditamentos.find(a => equiposSeleccionados.includes(a.id));
                    if (aditamento) {
                      plataformaConfig = {
                        largo: aditamento.largo || 12,
                        ancho: aditamento.ancho || 2.6,
                        capacidadTon: aditamento.capacidadCarga || 40,
                        nombre: `${aditamento.label}`,
                      };
                    }
                  }

                  if (plataformaConfig.largo === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>No hay una plataforma seleccionada con dimensiones definidas.</p>
                        <p className="text-sm mt-1">
                          Selecciona un tractocamión con aditamento o una unidad Roll-Off.
                        </p>
                      </div>
                    );
                  }

                  if (equiposCargaSeleccionados.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>No hay equipos de carga seleccionados.</p>
                        <p className="text-sm mt-1">
                          Agrega equipos desde el catálogo para visualizar el acomodo.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <EditorCargaVisual
                      plataforma={plataformaConfig}
                      equipos={equiposCargaSeleccionados}
                      onAcomodoCambiado={(equiposAcomodados) => {
                        // Aquí podríamos guardar el orden/posición de los equipos
                        console.log('Acomodo cambiado:', equiposAcomodados);
                      }}
                    />
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="p-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  onClick={() => setMostrarEditorCarga(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reagendamiento para Flete en falso */}
      {mostrarModalReagendar && (
        <div className="fixed inset-0 z-[70] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => {
                setMostrarModalReagendar(false);
                // Revertir al tipo de servicio anterior si se cierra sin confirmar
                setFormData(prev => ({ ...prev, tipoServicio: tipoServicioAnterior }));
              }}
            />

            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#BB0034]" />
                  Reagendar Servicio
                </h3>
                <button
                  onClick={() => {
                    setMostrarModalReagendar(false);
                    setFormData(prev => ({ ...prev, tipoServicio: tipoServicioAnterior }));
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    Al marcar como <strong>Flete en falso</strong>, este intento de servicio quedara registrado
                    en la planificacion del dia. Se creara una nueva OS para la fecha de reagendamiento.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Reagendamiento *
                  </label>
                  <input
                    type="date"
                    value={fechaReagendamiento.toISOString().split('T')[0]}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFechaReagendamiento(new Date(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  />
                </div>

                <div className="text-sm text-gray-600">
                  <p><strong>OS Original:</strong> Quedara marcada como Flete en falso</p>
                  <p><strong>Nueva OS:</strong> Se creara para {fechaReagendamiento.toLocaleDateString('es-MX', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setMostrarModalReagendar(false);
                    setFormData(prev => ({ ...prev, tipoServicio: tipoServicioAnterior }));
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    // Crear la OS duplicada para la nueva fecha
                    try {
                      const cliente = clientes.find(c => c.id === formData.clienteId);
                      const tracto = tractocamiones.find(t => t.id === formData.tractoId);
                      const operador = operadores.find(o => o.id === formData.operadorId);

                      // Crear input para la nueva OS reagendada
                      const nuevaOSInput: ViajeFormInput = {
                        fecha: fechaReagendamiento,
                        fechaCompromiso: fechaReagendamiento,
                        tractoId: formData.tractoId || '',
                        operadorId: formData.operadorId || '',
                        maniobristaId: formData.maniobristaId,
                        clienteId: formData.clienteId || '',
                        destino: formData.destino!,
                        condicionesSeguridad,
                        tipoServicio: tipoServicioAnterior, // Usar el tipo original (Entrega, Recoleccion, etc)
                        distanciaKm: formData.distanciaKm || 0,
                        precioFlete: formData.precioFlete || 0,
                        equipos: equiposSeleccionados,
                        equiposCarga: equiposCargaSeleccionados,
                        notas: `Reagendado desde Flete en falso del ${new Date().toLocaleDateString('es-MX')}. ${formData.notas || ''}`.trim(),
                        status: 'programado',
                        regresaABase: formData.regresaABase || false,
                      };

                      const datosAdicionales = {
                        tractoNumero: tracto?.label?.split(' - ')[0] || formData.tractoId || '',
                        operadorSueldoDia: operador?.sueldoDiario || 0,
                        vehiculoSeguroDia: 200,
                        clienteNombre: cliente?.nombreComercial || cliente?.nombre || '',
                      };

                      // Crear la nueva OS
                      await crearViaje(nuevaOSInput, user?.uid || 'sistema', datosAdicionales);
                      toast.success(`Nueva OS creada para ${fechaReagendamiento.toLocaleDateString('es-MX')}`);

                      setMostrarModalReagendar(false);
                      // El tipo de servicio ya esta en "Flete en falso" en formData
                    } catch (error) {
                      console.error('Error al crear OS reagendada:', error);
                      toast.error('Error al crear la OS reagendada');
                    }
                  }}
                  className="px-4 py-2 bg-[#BB0034] text-white rounded-lg hover:bg-[#9a002b] flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Confirmar Reagendamiento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
