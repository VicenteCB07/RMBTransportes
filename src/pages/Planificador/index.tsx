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
} from 'lucide-react';
import { obtenerViajes, actualizarViaje } from '../../services/trip.service';
import { obtenerTractocamionesSelect } from '../../services/truck.service';
import { obtenerOperadoresSelect } from '../../services/operator.service';
import {
  calcularCargaTrabajo,
  generarAlertasCarga,
  sugerirRedistribucion,
  optimizarSecuenciaViajes,
  calcularRutaCritica,
} from '../../services/workload.service';
import type { Viaje } from '../../types/trip.types';
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
  status: string;
  fecha: Date;
  ventanaInicio?: string;
  ventanaFin?: string;
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

      const [tractosData, operadoresData, viajesData] = await Promise.all([
        obtenerTractocamionesSelect(),
        obtenerOperadoresSelect(),
        obtenerViajes({
          fechaDesde: fechaInicio,
          fechaHasta: fechaFin,
        }),
      ]);

      // Mapear operadores
      setOperadores(operadoresData);

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
        };
      });

      setTractocamiones(tractosConOperador);

      // Mapear viajes a cards
      const viajesCards: ViajeCard[] = viajesData
        .filter(v => v.status === 'programado' || v.status === 'en_curso' || v.status === 'en_destino')
        .map(v => ({
          id: v.id,
          folio: v.folio,
          clienteNombre: v.clienteNombre,
          destino: v.destino?.nombre || v.destino?.direccion || 'Sin destino',
          distanciaKm: v.distanciaKm,
          tipoServicio: v.tipoServicio,
          tractoId: v.tractoId || '',
          operadorId: v.operadorId || '',
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
    // TODO: Abrir modal con mapa de la ruta
    toast('Próximamente: visualización en mapa', { icon: '🗺️' });
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

  // Drag handlers
  function handleDragStart(e: DragEvent<HTMLDivElement>, viaje: ViajeCard) {
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

  async function handleDrop(e: DragEvent<HTMLDivElement>, tractoId: string) {
    e.preventDefault();
    setDropTarget(null);

    if (!draggedViaje) return;

    // Si es la misma columna, no hacer nada
    if (draggedViaje.tractoId === tractoId) return;

    // Buscar operador autorizado para este tracto
    const operadorAutorizado = operadores.find(o => {
      if (!o.tractosAutorizados || o.tractosAutorizados.length === 0) return false;
      return o.tractosAutorizados.includes(tractoId);
    });

    try {
      // Actualizar viaje con nuevo tracto
      const updateData: any = {
        tractoId: tractoId || null,
      };

      // Si encontramos operador autorizado, asignarlo automáticamente
      if (operadorAutorizado && tractoId) {
        updateData.operadorId = operadorAutorizado.id;
      }

      // Llamar al servicio para actualizar
      await actualizarViaje(draggedViaje.id, updateData);

      // Actualizar estado local
      setViajes(prev => prev.map(v => {
        if (v.id === draggedViaje.id) {
          return {
            ...v,
            tractoId: tractoId,
            operadorId: operadorAutorizado?.id || v.operadorId,
          };
        }
        return v;
      }));

      toast.success(
        tractoId
          ? `Viaje ${draggedViaje.folio} asignado a ${tractocamiones.find(t => t.id === tractoId)?.label}`
          : `Viaje ${draggedViaje.folio} desasignado`
      );
    } catch (error: any) {
      console.error('Error al asignar viaje:', error);
      toast.error(error?.message || 'Error al asignar viaje');
    }

    setDraggedViaje(null);
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
    const statusColors: Record<string, string> = {
      programado: 'border-l-blue-500 bg-blue-50',
      en_curso: 'border-l-amber-500 bg-amber-50',
      en_destino: 'border-l-purple-500 bg-purple-50',
    };

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, viaje)}
        onDragEnd={handleDragEnd}
        className={`
          p-3 rounded-lg border-l-4 shadow-sm cursor-grab active:cursor-grabbing
          transition-all hover:shadow-md
          ${statusColors[viaje.status] || 'border-l-gray-300 bg-white'}
          ${draggedViaje?.id === viaje.id ? 'opacity-50 scale-95' : ''}
        `}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs font-mono text-gray-500">{viaje.folio}</span>
          <GripVertical className="w-4 h-4 text-gray-400" />
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
              <Package className="w-3 h-3" />
              {viaje.tipoServicio}
            </span>
            <span>{viaje.distanciaKm} km</span>
          </div>

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
    </div>
  );
}
