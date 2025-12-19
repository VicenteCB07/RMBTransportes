/**
 * Planificador de Viajes - Vista Kanban
 * Drag & drop para asignar viajes a unidades
 * Con panel de optimización de carga de trabajo
 */

import { useState, useEffect, useMemo, type DragEvent } from 'react';
import {
  Truck,
  Calendar,
  MapPin,
  User,
  Clock,
  Building2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Filter,
  RefreshCw,
  GripVertical,
  Package,
  BarChart3,
  X,
  ArrowDown,
  ArrowUp,
  RefreshCcw,
  XCircle,
} from 'lucide-react';
import { obtenerViajes, actualizarViaje } from '../../services/trip.service';
import { obtenerTractocamionesSelect, type TractocamionSelectItem } from '../../services/truck.service';
import { obtenerOperadoresSelect } from '../../services/operator.service';
import { obtenerAditamentosSelect, type AditamentoSelectItem } from '../../services/attachment.service';
import {
  calcularCargaTrabajo,
  generarAlertasCarga,
  sugerirRedistribucion,
  optimizarSecuenciaViajes,
  calcularRutaCritica,
} from '../../services/workload.service';
import type { Viaje, EquipoCargaViaje } from '../../types/trip.types';
import type { CargaUnidad, AlertaCarga, SugerenciaRedistribucion, ViajeParaCarga } from '../../types/workload.types';
import { ORIGEN_BASE_RMB } from '../../types/workload.types';
import WorkloadPanel from '../../components/planificador/WorkloadPanel';
import toast from 'react-hot-toast';

interface TractocamionColumna {
  id: string;
  label: string;
  marca: string;
  tipoUnidad: string;
  operadorId?: string;
  operadorNombre?: string;
  // Capacidades de carga (para rolloff-plataforma)
  plataformaCarga?: {
    largo: number;
    ancho: number;
    capacidadToneladas: number;
  };
}

interface ViajeCard {
  id: string;
  folio: string;
  clienteNombre: string;
  destino: string;
  distanciaKm: number;
  tipoServicio: string;
  tractoId: string;
  operadorId: string;
  equipos: string[]; // IDs de aditamentos asignados
  equiposCarga: EquipoCargaViaje[]; // Maquinaria a transportar
  status: string;
  fecha: Date;
  ventanaInicio?: string;
  ventanaFin?: string;
}

interface AditamentoSelect {
  id: string;
  label: string;
  tipo: string;
  // Capacidades de carga
  capacidadCarga?: number;  // Toneladas
  largo?: number;           // metros
  ancho?: number;           // metros
}

// Estado para el modal de selección de aditamento
interface PendingDropState {
  viaje: ViajeCard;
  tractoId: string;
  tractoLabel: string;
  operadorId?: string;
}

// Estado para el modal de selección de operador
interface PendingOperadorState {
  viaje: ViajeCard;
  tractoId: string;
  tractoLabel: string;
  operadoresDisponibles: { id: string; nombre: string }[];
  equipos: string[];
}

export default function Planificador() {
  const [loading, setLoading] = useState(true);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [tractocamiones, setTractocamiones] = useState<TractocamionColumna[]>([]);
  const [operadores, setOperadores] = useState<{ id: string; nombre: string; tractosAutorizados: string[] }[]>([]);
  const [viajes, setViajes] = useState<ViajeCard[]>([]);
  const [draggedViaje, setDraggedViaje] = useState<ViajeCard | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'tractocamion' | 'rolloff-plataforma'>('todos');

  // Estados para panel de optimización
  const [showWorkloadPanel, setShowWorkloadPanel] = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Estados para aditamentos y modal de selección
  const [aditamentos, setAditamentos] = useState<AditamentoSelect[]>([]);
  const [pendingDrop, setPendingDrop] = useState<PendingDropState | null>(null);
  const [selectedAditamento, setSelectedAditamento] = useState<string>('');

  // Estados para modal de selección de operador
  const [pendingOperador, setPendingOperador] = useState<PendingOperadorState | null>(null);
  const [selectedOperador, setSelectedOperador] = useState<string>('');

  // Estado para modal de mapa
  const [mapaModalOpen, setMapaModalOpen] = useState(false);
  const [cargaParaMapa, setCargaParaMapa] = useState<CargaUnidad | null>(null);

  useEffect(() => {
    cargarDatos();
  }, [fechaSeleccionada]);

  async function cargarDatos() {
    setLoading(true);
    try {
      // Obtener fecha inicio y fin del día seleccionado
      const fechaInicio = new Date(fechaSeleccionada);
      fechaInicio.setHours(0, 0, 0, 0);
      const fechaFin = new Date(fechaSeleccionada);
      fechaFin.setHours(23, 59, 59, 999);

      const [tractosData, operadoresData, viajesData, aditamentosData] = await Promise.all([
        obtenerTractocamionesSelect(),
        obtenerOperadoresSelect(),
        obtenerViajes({
          fechaCompromisoDesde: fechaInicio,
          fechaCompromisoHasta: fechaFin,
        }),
        obtenerAditamentosSelect(),
      ]);

      // Mapear operadores y aditamentos
      setOperadores(operadoresData);
      setAditamentos(aditamentosData);

      // Crear columnas de tractocamiones con operador asignado
      const tractosConOperador: TractocamionColumna[] = tractosData.map(t => {
        // Buscar si hay un operador principalmente asignado a este tracto
        const operadorAsignado = operadoresData.find(o =>
          o.tractosAutorizados?.length === 1 && o.tractosAutorizados[0] === t.id
        );
        return {
          ...t,
          operadorId: operadorAsignado?.id,
          operadorNombre: operadorAsignado?.nombre,
          plataformaCarga: t.plataformaCarga, // Capacidades de carga
        };
      });

      setTractocamiones(tractosConOperador);

      // Mapear viajes a cards
      const viajesCards: ViajeCard[] = viajesData
        .filter(v => v.status === 'sin_asignar' || v.status === 'programado' || v.status === 'en_curso' || v.status === 'en_destino')
        .map(v => ({
          id: v.id,
          folio: v.folio,
          clienteNombre: v.clienteNombre,
          destino: v.destino?.nombre || v.destino?.direccion || 'Sin destino',
          distanciaKm: v.distanciaKm,
          tipoServicio: v.tipoServicio,
          tractoId: v.tractoId || '',
          operadorId: v.operadorId || '',
          equipos: v.equipos || [],
          equiposCarga: v.equiposCarga || [],
          status: v.status,
          fecha: v.fecha,
          ventanaInicio: v.destino?.ventanaInicio,
          ventanaFin: v.destino?.ventanaFin,
        }));

      setViajes(viajesCards);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos del planificador');
    } finally {
      setLoading(false);
    }
  }

  // Viajes sin asignar (sin tractoId)
  const viajesSinAsignar = viajes.filter(v => !v.tractoId);

  // Estado para cargas calculadas
  const [cargas, setCargas] = useState<CargaUnidad[]>([]);

  // Calcular cargas de trabajo cuando cambian los datos
  useEffect(() => {
    async function calcular() {
      if (tractocamiones.length === 0) {
        setCargas([]);
        return;
      }

      try {
        const resultado = await calcularCargaTrabajo(
          tractocamiones.map(t => ({
            id: t.id,
            label: t.label,
            marca: t.marca,
            tipoUnidad: t.tipoUnidad,
            operadorNombre: t.operadorNombre,
          })),
          viajes.map(v => ({
            id: v.id,
            folio: v.folio,
            clienteNombre: v.clienteNombre,
            destino: v.destino,
            distanciaKm: v.distanciaKm,
            tipoServicio: v.tipoServicio,
            tractoId: v.tractoId,
            operadorId: v.operadorId,
            status: v.status,
            fecha: v.fecha,
            ventanaInicio: v.ventanaInicio,
            ventanaFin: v.ventanaFin,
          }))
        );
        setCargas(resultado);
      } catch (error) {
        console.error('Error al calcular cargas:', error);
        setCargas([]);
      }
    }

    calcular();
  }, [tractocamiones, viajes]);

  // Generar alertas
  const alertas = useMemo<AlertaCarga[]>(() => {
    return generarAlertasCarga(cargas);
  }, [cargas]);

  // Generar sugerencias de redistribución
  const sugerencias = useMemo<SugerenciaRedistribucion[]>(() => {
    return sugerirRedistribucion(cargas);
  }, [cargas]);

  // Handler para optimizar ruta de una unidad
  async function handleOptimizarUnidad(unitId: string) {
    const carga = cargas.find(c => c.unitId === unitId);
    if (!carga || carga.viajes.length < 2) {
      toast.error('Se necesitan al menos 2 viajes para optimizar');
      return;
    }

    setIsOptimizing(true);
    try {
      // Optimizar secuencia
      const resultado = await optimizarSecuenciaViajes(carga.viajes, ORIGEN_BASE_RMB);

      if (resultado.kmAhorrados > 0) {
        toast.success(
          `Ruta optimizada: ${resultado.kmAhorrados} km menos`,
          { duration: 4000 }
        );
      } else {
        toast.success('La secuencia actual ya es óptima');
      }

      // Recalcular la ruta crítica con la nueva secuencia
      // En una implementación completa, aquí actualizaríamos el orden de los viajes en Firebase
    } catch (error) {
      console.error('Error al optimizar:', error);
      toast.error('Error al optimizar la ruta');
    } finally {
      setIsOptimizing(false);
    }
  }

  // Handler para ver mapa de una unidad
  function handleVerMapa(unitId: string) {
    const carga = cargas.find(c => c.unitId === unitId);
    if (!carga || !carga.rutaCritica || carga.rutaCritica.secuencia.length === 0) {
      toast.error('No hay viajes para mostrar en el mapa');
      return;
    }
    setCargaParaMapa(carga);
    setMapaModalOpen(true);
  }

  // Handler para aplicar sugerencia de redistribución
  async function handleAplicarSugerencia(sugerencia: SugerenciaRedistribucion) {
    try {
      // Buscar operador autorizado para el tracto destino
      const operadorAutorizado = operadores.find(o =>
        o.tractosAutorizados?.includes(sugerencia.haciaUnitId)
      );

      await actualizarViaje(sugerencia.viajeId, {
        tractoId: sugerencia.haciaUnitId,
        operadorId: operadorAutorizado?.id || undefined,
      });

      // Actualizar estado local
      setViajes(prev => prev.map(v => {
        if (v.id === sugerencia.viajeId) {
          return {
            ...v,
            tractoId: sugerencia.haciaUnitId,
            operadorId: operadorAutorizado?.id || v.operadorId,
          };
        }
        return v;
      }));

      toast.success(
        `Viaje ${sugerencia.viajeFolio} movido a ${sugerencia.haciaUnitLabel}`,
        { duration: 3000 }
      );
    } catch (error) {
      console.error('Error al aplicar sugerencia:', error);
      toast.error('Error al mover el viaje');
    }
  }

  // Viajes por tracto
  function getViajesPorTracto(tractoId: string): ViajeCard[] {
    return viajes.filter(v => v.tractoId === tractoId);
  }

  // Tractocamiones filtrados
  const tractosFiltrados = tractocamiones.filter(t => {
    if (filtroTipo === 'todos') return true;
    return t.tipoUnidad === filtroTipo;
  });

  // Verificar si un viaje está en curso (no se puede mover)
  function viajeEnCurso(viaje: ViajeCard): boolean {
    return viaje.status === 'en_curso' || viaje.status === 'en_destino';
  }

  // Drag handlers
  function handleDragStart(e: DragEvent<HTMLDivElement>, viaje: ViajeCard) {
    // Bloquear arrastre si el viaje está en curso
    if (viajeEnCurso(viaje)) {
      e.preventDefault();
      toast.error('No se puede mover un viaje en curso');
      return;
    }

    setDraggedViaje(viaje);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', viaje.id);
  }

  function handleDragEnd() {
    setDraggedViaje(null);
    setDropTarget(null);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, tractoId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(tractoId);
  }

  function handleDragLeave() {
    setDropTarget(null);
  }

  /**
   * Valida si los equipos de carga caben en la capacidad de transporte
   * Retorna mensaje de error si no cabe, null si está OK
   */
  function validarCapacidadParaDrop(
    viaje: ViajeCard,
    tractoDestino: TractocamionColumna | undefined,
    equiposSeleccionados: string[]
  ): { valido: boolean; mensaje?: string } {
    // Si no hay equipos de carga, no hay nada que validar
    if (!viaje.equiposCarga || viaje.equiposCarga.length === 0) {
      return { valido: true };
    }

    // Calcular totales de la carga
    const pesoTotalKg = viaje.equiposCarga.reduce((sum, e) => sum + e.peso, 0);
    const pesoTotalTon = pesoTotalKg / 1000;
    const largoTotalEquipos = viaje.equiposCarga.reduce((sum, e) => sum + e.dimensiones.largo, 0);
    const anchoMaxEquipo = Math.max(...viaje.equiposCarga.map(e => e.dimensiones.ancho));

    // Determinar capacidades disponibles
    let capacidadToneladas = 0;
    let largoDisponible = 0;
    let anchoDisponible = 0;

    if (tractoDestino?.tipoUnidad === 'rolloff-plataforma' && tractoDestino.plataformaCarga) {
      // Roll-off con plataforma integrada
      capacidadToneladas = tractoDestino.plataformaCarga.capacidadToneladas;
      largoDisponible = tractoDestino.plataformaCarga.largo;
      anchoDisponible = tractoDestino.plataformaCarga.ancho;
    } else if (tractoDestino?.tipoUnidad === 'tractocamion' && equiposSeleccionados.length > 0) {
      // Tractocamión con aditamento
      const aditamento = aditamentos.find(a => equiposSeleccionados.includes(a.id));
      if (aditamento) {
        capacidadToneladas = aditamento.capacidadCarga || 0;
        largoDisponible = aditamento.largo || 0;
        anchoDisponible = aditamento.ancho || 0;
      }
    }

    // Si no hay capacidades definidas, permitir el drop pero no validar
    if (capacidadToneladas === 0 && largoDisponible === 0 && anchoDisponible === 0) {
      return { valido: true };
    }

    // Validar peso
    if (capacidadToneladas > 0 && pesoTotalTon > capacidadToneladas) {
      return {
        valido: false,
        mensaje: `Peso excedido: ${pesoTotalTon.toFixed(1)} ton > ${capacidadToneladas} ton de capacidad`
      };
    }

    // Validar largo
    if (largoDisponible > 0 && largoTotalEquipos > largoDisponible) {
      return {
        valido: false,
        mensaje: `Largo excedido: ${largoTotalEquipos.toFixed(2)}m > ${largoDisponible}m disponibles`
      };
    }

    // Validar ancho
    if (anchoDisponible > 0 && anchoMaxEquipo > anchoDisponible) {
      return {
        valido: false,
        mensaje: `Ancho excedido: ${anchoMaxEquipo.toFixed(2)}m > ${anchoDisponible}m disponibles`
      };
    }

    return { valido: true };
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>, tractoId: string) {
    e.preventDefault();
    setDropTarget(null);

    if (!draggedViaje) return;

    // Si es la misma columna, no hacer nada
    if (draggedViaje.tractoId === tractoId) return;

    // Obtener información del tracto destino
    const tractoDestino = tractocamiones.find(t => t.id === tractoId);

    // Si mueve a "Sin Asignar" (tractoId vacío) → limpiar todo
    if (!tractoId) {
      await ejecutarDropSinAsignar(draggedViaje);
      return;
    }

    // Validar capacidad de carga para la nueva unidad
    if (draggedViaje.equiposCarga && draggedViaje.equiposCarga.length > 0) {
      const equiposParaValidar = tractoDestino?.tipoUnidad === 'rolloff-plataforma'
        ? [] // Roll-off no usa aditamentos
        : draggedViaje.equipos; // Mantener aditamentos actuales para tractocamión

      const validacion = validarCapacidadParaDrop(draggedViaje, tractoDestino, equiposParaValidar);
      if (!validacion.valido) {
        toast.error(`No se puede mover: ${validacion.mensaje}`);
        setDraggedViaje(null);
        return;
      }
    }

    // Buscar TODOS los operadores autorizados para este tracto
    const operadoresAutorizados = operadores.filter(o => {
      if (!o.tractosAutorizados || o.tractosAutorizados.length === 0) return false;
      return o.tractosAutorizados.includes(tractoId);
    });

    // REGLA: Si destino es ROLLOFF → eliminar aditamentos
    if (tractoDestino?.tipoUnidad === 'rolloff-plataforma') {
      if (draggedViaje.equipos.length > 0) {
        // Tiene aditamentos, se eliminarán automáticamente
        toast('Aditamentos removidos (rolloff no usa aditamentos)', { icon: '⚠️' });
      }

      // Si hay múltiples operadores → mostrar modal
      if (operadoresAutorizados.length > 1) {
        setPendingOperador({
          viaje: draggedViaje,
          tractoId: tractoId,
          tractoLabel: tractoDestino?.label || tractoId,
          operadoresDisponibles: operadoresAutorizados.map(o => ({ id: o.id, nombre: o.nombre })),
          equipos: [],
        });
        setSelectedOperador('');
        setDraggedViaje(null);
        return;
      }

      await ejecutarDrop(draggedViaje, tractoId, operadoresAutorizados[0]?.id, []);
      return;
    }

    // REGLA: Si destino es TRACTOCAMION y NO tiene aditamento → mostrar modal de aditamento
    if (tractoDestino?.tipoUnidad === 'tractocamion' && draggedViaje.equipos.length === 0) {
      // Mostrar modal para seleccionar aditamento
      setPendingDrop({
        viaje: draggedViaje,
        tractoId: tractoId,
        tractoLabel: tractoDestino.label,
        operadorId: operadoresAutorizados.length === 1 ? operadoresAutorizados[0]?.id : undefined,
      });
      setSelectedAditamento('');
      // Si hay múltiples operadores, guardarlos para después
      if (operadoresAutorizados.length > 1) {
        // Guardar para mostrar después del modal de aditamento
        (window as any).__pendingOperadores = operadoresAutorizados;
      }
      setDraggedViaje(null);
      return;
    }

    // Si ya tiene aditamento y hay múltiples operadores → mostrar modal
    if (operadoresAutorizados.length > 1) {
      setPendingOperador({
        viaje: draggedViaje,
        tractoId: tractoId,
        tractoLabel: tractoDestino?.label || tractoId,
        operadoresDisponibles: operadoresAutorizados.map(o => ({ id: o.id, nombre: o.nombre })),
        equipos: draggedViaje.equipos,
      });
      setSelectedOperador('');
      setDraggedViaje(null);
      return;
    }

    // Solo hay un operador autorizado o ninguno
    await ejecutarDrop(draggedViaje, tractoId, operadoresAutorizados[0]?.id, draggedViaje.equipos);
  }

  // Ejecutar drop a "Sin Asignar" - limpia tracto, operador y equipos
  async function ejecutarDropSinAsignar(viaje: ViajeCard) {
    try {
      await actualizarViaje(viaje.id, {
        tractoId: '',
        operadorId: '',
        equipos: [],
        status: 'sin_asignar',
      });

      // Actualizar estado local
      setViajes(prev => prev.map(v => {
        if (v.id === viaje.id) {
          return {
            ...v,
            tractoId: '',
            operadorId: '',
            equipos: [],
            status: 'sin_asignar',
          };
        }
        return v;
      }));

      toast.success(`OS ${viaje.folio} movida a Sin Asignar`);
    } catch (error: any) {
      console.error('Error al desasignar viaje:', error);
      toast.error(error?.message || 'Error al desasignar viaje');
    }

    setDraggedViaje(null);
  }

  // Ejecutar el drop después de validaciones
  async function ejecutarDrop(
    viaje: ViajeCard,
    tractoId: string,
    operadorId: string | undefined,
    equipos: string[]
  ) {
    try {
      const updateData: any = {
        tractoId: tractoId || null,
        equipos: equipos,
        status: 'programado', // Al asignar unidad, pasa a programado
      };

      if (operadorId && tractoId) {
        updateData.operadorId = operadorId;
      }

      await actualizarViaje(viaje.id, updateData);

      // Actualizar estado local
      setViajes(prev => prev.map(v => {
        if (v.id === viaje.id) {
          return {
            ...v,
            tractoId: tractoId,
            operadorId: operadorId || v.operadorId,
            equipos: equipos,
          };
        }
        return v;
      }));

      const tractoLabel = tractocamiones.find(t => t.id === tractoId)?.label;
      toast.success(
        tractoId
          ? `OS ${viaje.folio} asignada a ${tractoLabel}`
          : `OS ${viaje.folio} desasignada`
      );
    } catch (error: any) {
      console.error('Error al asignar viaje:', error);
      toast.error(error?.message || 'Error al asignar viaje');
    }

    setDraggedViaje(null);
  }

  // Confirmar selección de aditamento desde el modal
  async function handleConfirmAditamento() {
    if (!pendingDrop) return;

    const equipos = selectedAditamento ? [selectedAditamento] : [];

    if (!selectedAditamento) {
      toast.error('Selecciona un aditamento para tractocamión');
      return;
    }

    // Verificar si hay múltiples operadores pendientes
    const pendingOps = (window as any).__pendingOperadores;
    if (pendingOps && pendingOps.length > 1) {
      // Mostrar modal de operador
      setPendingOperador({
        viaje: pendingDrop.viaje,
        tractoId: pendingDrop.tractoId,
        tractoLabel: pendingDrop.tractoLabel,
        operadoresDisponibles: pendingOps.map((o: any) => ({ id: o.id, nombre: o.nombre })),
        equipos: equipos,
      });
      setSelectedOperador('');
      setPendingDrop(null);
      setSelectedAditamento('');
      (window as any).__pendingOperadores = null;
      return;
    }

    await ejecutarDrop(
      pendingDrop.viaje,
      pendingDrop.tractoId,
      pendingDrop.operadorId,
      equipos
    );

    setPendingDrop(null);
    setSelectedAditamento('');
    (window as any).__pendingOperadores = null;
  }

  // Cancelar el drop pendiente
  function handleCancelDrop() {
    setPendingDrop(null);
    setSelectedAditamento('');
    (window as any).__pendingOperadores = null;
  }

  // Confirmar selección de operador desde el modal
  async function handleConfirmOperador() {
    if (!pendingOperador) return;

    if (!selectedOperador) {
      toast.error('Selecciona un operador');
      return;
    }

    await ejecutarDrop(
      pendingOperador.viaje,
      pendingOperador.tractoId,
      selectedOperador,
      pendingOperador.equipos
    );

    setPendingOperador(null);
    setSelectedOperador('');
  }

  // Cancelar selección de operador
  function handleCancelOperador() {
    setPendingOperador(null);
    setSelectedOperador('');
  }

  // Navegación de fechas
  function cambiarFecha(dias: number) {
    const nuevaFecha = new Date(fechaSeleccionada);
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);
    setFechaSeleccionada(nuevaFecha);
  }

  function irAHoy() {
    setFechaSeleccionada(new Date());
  }

  const esHoy = fechaSeleccionada.toDateString() === new Date().toDateString();

  // Componente de tarjeta de viaje
  function ViajeCardComponent({ viaje }: { viaje: ViajeCard }) {
    const enCurso = viajeEnCurso(viaje);

    const statusColors: Record<string, string> = {
      sin_asignar: 'border-l-gray-400 bg-gray-50',
      programado: 'border-l-blue-500 bg-blue-50',
      en_curso: 'border-l-amber-500 bg-amber-50',
      en_destino: 'border-l-purple-500 bg-purple-50',
    };

    const statusLabels: Record<string, string> = {
      en_curso: 'En curso',
      en_destino: 'En destino',
    };

    return (
      <div
        draggable={!enCurso}
        onDragStart={(e) => handleDragStart(e, viaje)}
        onDragEnd={handleDragEnd}
        className={`
          p-3 rounded-lg border-l-4 shadow-sm transition-all
          ${statusColors[viaje.status] || 'border-l-gray-300 bg-white'}
          ${draggedViaje?.id === viaje.id ? 'opacity-50 scale-95' : ''}
          ${enCurso
            ? 'cursor-not-allowed opacity-75'
            : 'cursor-grab active:cursor-grabbing hover:shadow-md'}
        `}
        title={enCurso ? 'No se puede mover: viaje en curso' : ''}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">{viaje.folio}</span>
            {enCurso && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                {statusLabels[viaje.status] || 'En proceso'}
              </span>
            )}
          </div>
          <GripVertical className={`w-4 h-4 ${enCurso ? 'text-gray-300' : 'text-gray-400'}`} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm font-medium truncate">{viaje.clienteNombre}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-600 truncate">{viaje.destino}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              {/* Icono según tipo de servicio */}
              {viaje.tipoServicio === 'Entrega' && (
                <ArrowDown className="w-3.5 h-3.5 text-green-600" />
              )}
              {viaje.tipoServicio === 'Recolección' && (
                <ArrowUp className="w-3.5 h-3.5 text-red-600" />
              )}
              {viaje.tipoServicio === 'Cambio' && (
                <RefreshCcw className="w-3.5 h-3.5 text-blue-600" />
              )}
              {viaje.tipoServicio === 'Entrega / Recoleccion' && (
                <span className="flex">
                  <ArrowDown className="w-3 h-3 text-green-600" />
                  <ArrowUp className="w-3 h-3 text-red-600 -ml-1" />
                </span>
              )}
              {viaje.tipoServicio === 'Flete en falso' && (
                <XCircle className="w-3.5 h-3.5 text-red-500" />
              )}
              {viaje.tipoServicio}
            </span>
            <span>{viaje.distanciaKm} km</span>
          </div>

          {/* Equipos de carga */}
          {viaje.equiposCarga && viaje.equiposCarga.length > 0 && (
            <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
              <Package className="w-3 h-3" />
              <span className="truncate">
                {viaje.equiposCarga.length === 1
                  ? `${viaje.equiposCarga[0].marca} ${viaje.equiposCarga[0].modelo}`
                  : `${viaje.equiposCarga.length} equipos`}
              </span>
            </div>
          )}

          {(viaje.ventanaInicio || viaje.ventanaFin) && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Clock className="w-3 h-3" />
              <span>
                {viaje.ventanaInicio || '--:--'} - {viaje.ventanaFin || '--:--'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planificador</h1>
          <p className="text-gray-600">Arrastra viajes para asignarlos a unidades</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Filtro por tipo */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="text-sm border-gray-300 rounded-lg"
            >
              <option value="todos">Todas las unidades</option>
              <option value="tractocamion">Solo Tractocamiones</option>
              <option value="rolloff-plataforma">Solo Roll-Off</option>
            </select>
          </div>

          {/* Navegación de fecha */}
          <div className="flex items-center gap-2 bg-white rounded-lg border px-2 py-1">
            <button
              onClick={() => cambiarFecha(-1)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={irAHoy}
              className={`px-3 py-1 rounded text-sm font-medium ${
                esHoy ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
              }`}
            >
              {esHoy ? 'Hoy' : fechaSeleccionada.toLocaleDateString('es-MX', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </button>

            <input
              type="date"
              value={fechaSeleccionada.toISOString().split('T')[0]}
              onChange={(e) => setFechaSeleccionada(new Date(e.target.value))}
              className="border-0 text-sm bg-transparent cursor-pointer"
            />

            <button
              onClick={() => cambiarFecha(1)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={cargarDatos}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Recargar"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>

          {/* Toggle panel de optimización */}
          <button
            onClick={() => setShowWorkloadPanel(!showWorkloadPanel)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
              ${showWorkloadPanel
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
            title="Panel de optimización"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm font-medium">Optimizar</span>
            {alertas.length > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {alertas.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Contenido principal con panel lateral */}
      <div className="flex-1 flex overflow-hidden">
        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 h-full min-w-max pb-4 pr-4">
          {/* Columna: Sin Asignar */}
          <div
            className={`
              w-72 flex-shrink-0 bg-gray-100 rounded-xl p-3 flex flex-col
              ${dropTarget === '' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
            `}
            onDragOver={(e) => handleDragOver(e, '')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, '')}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-700">Sin Asignar</h3>
              </div>
              <span className="bg-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {viajesSinAsignar.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {viajesSinAsignar.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  No hay viajes sin asignar
                </div>
              ) : (
                viajesSinAsignar.map(viaje => (
                  <ViajeCardComponent key={viaje.id} viaje={viaje} />
                ))
              )}
            </div>
          </div>

          {/* Columnas por Tractocamión */}
          {tractosFiltrados.map(tracto => {
            const viajesTracto = getViajesPorTracto(tracto.id);
            const isDropTarget = dropTarget === tracto.id;

            return (
              <div
                key={tracto.id}
                className={`
                  w-72 flex-shrink-0 bg-white rounded-xl border p-3 flex flex-col
                  transition-all
                  ${isDropTarget ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-300' : 'border-gray-200'}
                `}
                onDragOver={(e) => handleDragOver(e, tracto.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, tracto.id)}
              >
                {/* Header de columna */}
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className={`w-5 h-5 ${
                        tracto.tipoUnidad === 'rolloff-plataforma'
                          ? 'text-amber-600'
                          : 'text-blue-600'
                      }`} />
                      <h3 className="font-semibold text-gray-800">{tracto.label.split(' - ')[0]}</h3>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      viajesTracto.length > 0
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {viajesTracto.length}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    {tracto.marca} · {tracto.tipoUnidad === 'rolloff-plataforma' ? 'Roll-Off' : 'Tractocamión'}
                  </p>

                  {tracto.operadorNombre && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-green-600">
                      <User className="w-3 h-3" />
                      <span>{tracto.operadorNombre}</span>
                    </div>
                  )}
                </div>

                {/* Lista de viajes */}
                <div className="flex-1 overflow-y-auto space-y-2">
                  {viajesTracto.length === 0 ? (
                    <div className={`
                      text-center text-sm py-8 rounded-lg border-2 border-dashed
                      ${isDropTarget
                        ? 'border-blue-400 text-blue-500'
                        : 'border-gray-200 text-gray-400'
                      }
                    `}>
                      {isDropTarget ? 'Soltar aquí' : 'Sin viajes asignados'}
                    </div>
                  ) : (
                    viajesTracto.map(viaje => (
                      <ViajeCardComponent key={viaje.id} viaje={viaje} />
                    ))
                  )}
                </div>

                {/* Footer con resumen */}
                {viajesTracto.length > 0 && (
                  <div className="mt-3 pt-3 border-t text-xs text-gray-500 flex justify-between">
                    <span>{viajesTracto.reduce((sum, v) => sum + v.distanciaKm, 0)} km total</span>
                    <span>{viajesTracto.length} viaje{viajesTracto.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>

        {/* Panel de Optimización de Carga */}
        {showWorkloadPanel && (
          <WorkloadPanel
            cargas={cargas}
            alertas={alertas}
            sugerencias={sugerencias}
            selectedUnitId={selectedUnitId}
            onSelectUnit={setSelectedUnitId}
            onOptimizar={handleOptimizarUnidad}
            onVerMapa={handleVerMapa}
            onAplicarSugerencia={handleAplicarSugerencia}
            isOptimizing={isOptimizing}
            isCollapsed={false}
            onToggleCollapse={() => setShowWorkloadPanel(false)}
          />
        )}
      </div>

      {/* Indicador de drag */}
      {draggedViaje && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm">
          Arrastrando: {draggedViaje.folio}
        </div>
      )}

      {/* Modal de selección de aditamento */}
      {pendingDrop && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={handleCancelDrop}
            />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Container size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Seleccionar Aditamento
                    </h2>
                    <p className="text-sm text-gray-500">
                      OS {pendingDrop.viaje.folio} → {pendingDrop.tractoLabel}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelDrop}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    Los tractocamiones requieren un aditamento (lowboy, cama baja, etc.) para transportar carga.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aditamento *
                  </label>
                  <select
                    value={selectedAditamento}
                    onChange={(e) => setSelectedAditamento(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar aditamento...</option>
                    {aditamentos.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCancelDrop}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmAditamento}
                    disabled={!selectedAditamento}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Asignar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de selección de operador */}
      {pendingOperador && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={handleCancelOperador}
            />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <User size={24} className="text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Seleccionar Operador
                    </h2>
                    <p className="text-sm text-gray-500">
                      OS {pendingOperador.viaje.folio} → {pendingOperador.tractoLabel}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelOperador}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Esta unidad tiene múltiples operadores autorizados. Selecciona quién realizará el viaje.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operador *
                  </label>
                  <select
                    value={selectedOperador}
                    onChange={(e) => setSelectedOperador(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar operador...</option>
                    {pendingOperador.operadoresDisponibles.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCancelOperador}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmOperador}
                    disabled={!selectedOperador}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Asignar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Mapa de Ruta */}
      {mapaModalOpen && cargaParaMapa && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setMapaModalOpen(false)}
            />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MapPin size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Ruta de {cargaParaMapa.unitLabel}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {cargaParaMapa.rutaCritica?.secuencia.length} paradas - {cargaParaMapa.rutaCritica?.kmTotales} km
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMapaModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Contenido del mapa */}
              <div className="p-4">
                {/* Lista de paradas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Timeline de paradas */}
                  <div className="bg-gray-50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                    <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Secuencia de Entregas
                    </h3>
                    <div className="relative pl-6 space-y-3">
                      <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-blue-200" />

                      {/* Origen */}
                      <div className="relative flex items-start gap-3">
                        <div className="absolute -left-4 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                          O
                        </div>
                        <div>
                          <p className="text-sm font-medium">Base RMB - Tecámac</p>
                          <p className="text-xs text-gray-500">Salida: {cargaParaMapa.rutaCritica?.horaInicio}</p>
                        </div>
                      </div>

                      {/* Paradas */}
                      {cargaParaMapa.rutaCritica?.secuencia.map((viaje, idx) => (
                        <div key={viaje.id} className="relative flex items-start gap-3">
                          <div className={`absolute -left-4 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                            cargaParaMapa.rutaCritica?.cumpleVentanas[idx] ? 'bg-blue-500' : 'bg-red-500'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{viaje.clienteNombre}</p>
                            <p className="text-xs text-gray-600">{viaje.destino}</p>
                            {/* Equipos de carga */}
                            {viaje.equiposCarga && viaje.equiposCarga.length > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <Package className="w-3 h-3 text-blue-500" />
                                <span className="text-xs text-blue-600 font-medium">
                                  {viaje.equiposCarga.map(e => `${e.marca} ${e.modelo}`).join(', ')}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                cargaParaMapa.rutaCritica?.cumpleVentanas[idx]
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                ETA: {cargaParaMapa.rutaCritica?.horasLlegada[idx]}
                              </span>
                              <span className="text-xs text-gray-400">
                                {viaje.distanciaKm} km
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Regreso */}
                      <div className="relative flex items-start gap-3">
                        <div className="absolute -left-4 w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
                          R
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Regreso a Base</p>
                          <p className="text-xs text-gray-400">
                            Llegada: {cargaParaMapa.rutaCritica?.horaFin} - {cargaParaMapa.rutaCritica?.kmMuertos} km
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Información de la ruta */}
                  <div className="space-y-4">
                    {/* Métricas */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-medium text-blue-800 mb-3">Resumen de Ruta</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Km Totales:</span>
                          <span className="font-semibold ml-2">{cargaParaMapa.rutaCritica?.kmTotales} km</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Km Muertos:</span>
                          <span className={`font-semibold ml-2 ${
                            (cargaParaMapa.rutaCritica?.kmMuertos || 0) > 50 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {cargaParaMapa.rutaCritica?.kmMuertos} km
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Tiempo Total:</span>
                          <span className="font-semibold ml-2">
                            {Math.floor((cargaParaMapa.rutaCritica?.tiempoTotalMin || 0) / 60)}h {(cargaParaMapa.rutaCritica?.tiempoTotalMin || 0) % 60}m
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Paradas:</span>
                          <span className="font-semibold ml-2">{cargaParaMapa.rutaCritica?.secuencia.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Costos estimados */}
                    <div className="bg-amber-50 rounded-lg p-4">
                      <h3 className="font-medium text-amber-800 mb-3">Costos Estimados</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Combustible:</span>
                          <span className="font-semibold ml-2">${cargaParaMapa.costosCombustible.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Casetas:</span>
                          <span className="font-semibold ml-2">${cargaParaMapa.costosCasetas.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Nota sobre coordenadas */}
                    <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-600">
                      <p className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 text-gray-400" />
                        Para ver el mapa interactivo, las obras deben tener coordenadas geocodificadas.
                        La vista del mapa estará disponible próximamente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t flex justify-end">
                <button
                  onClick={() => setMapaModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
