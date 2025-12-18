/**
 * Tipos para el módulo de Optimización de Carga de Trabajo
 * Integración Rutas-Planificador
 */

import type { Coordenadas } from './route.types';
import type { EquipoCargaViaje } from './trip.types';

/**
 * Configuración de carga de trabajo
 */
export const WORKLOAD_CONFIG = {
  TARGET_KM_PER_DAY: 600,      // km objetivo por unidad/día
  OVERLOAD_THRESHOLD: 100,     // % para considerar sobrecargado
  UNDERLOAD_THRESHOLD: 50,     // % para considerar subutilizado
  AVG_SPEED_KMH: 60,           // velocidad promedio
  HOURS_PER_DAY: 10,           // horas laborales
  SERVICE_TIME_MIN: 30,        // tiempo promedio en destino (minutos)
};

/**
 * Origen base de RMB Transportes (Tecámac)
 */
export const ORIGEN_BASE_RMB: Coordenadas = {
  lat: 19.7129,
  lng: -98.9688,
};

/**
 * Viaje simplificado para cálculos de carga
 */
export interface ViajeParaCarga {
  id: string;
  folio: string;
  clienteNombre: string;
  destino: string;
  destinoCoordenadas?: Coordenadas;
  distanciaKm: number;
  tipoServicio: string;
  tractoId: string;
  operadorId: string;
  status: string;
  fecha: Date;
  ventanaInicio?: string;
  ventanaFin?: string;
  equiposCarga?: EquipoCargaViaje[];
}

/**
 * Información de ruta crítica calculada
 */
export interface RutaCriticaInfo {
  secuencia: ViajeParaCarga[];
  kmTotales: number;
  kmMuertos: number;           // km de regreso vacío a la base
  tiempoTotalMin: number;
  horaInicio: string;
  horaFin: string;
  horasLlegada: string[];      // ETA a cada parada
  cumpleVentanas: boolean[];   // Si cumple ventana en cada parada
  geometry?: string;           // Polyline para visualizar en mapa
}

/**
 * Carga de trabajo por unidad
 */
export interface CargaUnidad {
  unitId: string;
  unitLabel: string;
  marca: string;
  tipoUnidad: string;
  operadorNombre?: string;

  // Métricas de carga
  kmTotales: number;
  horasEstimadas: number;
  costosCombustible: number;
  costosCasetas: number;
  numViajes: number;

  // Porcentaje vs objetivo (600km/día)
  porcentajeCarga: number;

  // Estado de carga
  estado: 'subutilizado' | 'normal' | 'sobrecargado';

  // Viajes asignados
  viajes: ViajeParaCarga[];

  // Ruta crítica calculada (si hay viajes)
  rutaCritica: RutaCriticaInfo | null;
}

/**
 * Alerta de carga de trabajo
 */
export interface AlertaCarga {
  tipo: 'sobrecarga' | 'subutilizacion' | 'conflicto_ventana';
  unitId: string;
  unitLabel: string;
  mensaje: string;
  severidad: 'warning' | 'error';
  detalles?: {
    kmActuales?: number;
    kmObjetivo?: number;
    viajesConflicto?: string[];
  };
}

/**
 * Sugerencia de redistribución
 */
export interface SugerenciaRedistribucion {
  viajeId: string;
  viajeFolio: string;
  desdeUnitId: string;
  desdeUnitLabel: string;
  haciaUnitId: string;
  haciaUnitLabel: string;
  kmAhorrados: number;
  razon: string;
}

/**
 * Resultado de optimización de secuencia
 */
export interface ResultadoOptimizacion {
  secuenciaOptima: number[];   // Índices de viajes en orden óptimo
  kmOriginales: number;
  kmOptimizados: number;
  kmAhorrados: number;
  tiempoAhorradoMin: number;
  cumpleTodasVentanas: boolean;
}

/**
 * Props para el componente WorkloadPanel
 */
export interface WorkloadPanelProps {
  cargas: CargaUnidad[];
  alertas: AlertaCarga[];
  selectedUnitId: string | null;
  onSelectUnit: (unitId: string | null) => void;
  onOptimizar: (unitId: string) => Promise<void>;
  isOptimizing: boolean;
}

/**
 * Props para el componente WorkloadBar
 */
export interface WorkloadBarProps {
  carga: CargaUnidad;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Props para el componente CriticalPathView
 */
export interface CriticalPathViewProps {
  carga: CargaUnidad;
  onOptimizar: () => Promise<void>;
  onVerMapa: () => void;
  isOptimizing: boolean;
}
