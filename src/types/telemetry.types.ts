/**
 * Tipos para el módulo de Telemetría GPS
 * Basado en la hoja Recorridos del Excel (+1M registros)
 * Integración con plataforma Mastrack
 */

export interface EventoTelemetria {
  id: string;

  // Vehículo
  vehiculoId: string;
  alias: string; // TRC08, TRC11, etc.

  // Fecha y hora
  fecha: Date;
  hora: string;
  timestamp: Date;

  // Ubicación
  ubicacion: UbicacionGPS;

  // Odómetro
  odometro: number;

  // Tipo de evento
  tipoEvento: TipoEventoGPS;
  categoriaEvento: CategoriaEventoGPS;

  // Datos adicionales del evento
  datosEvento?: DatosEvento;

  // Correlación con viaje
  viajeId?: string;

  // Fuente de datos
  fuenteDatos: FuenteDatosTelemetria;
  importacionId?: string;

  // Metadata
  createdAt: Date;
}

export interface UbicacionGPS {
  lat: number;
  lng: number;
  altitud?: number;
  velocidad?: number; // km/h
  rumbo?: number; // 0-360 grados
  precision?: number; // metros
  direccion?: string; // Geocodificación inversa
}

// Eventos identificados en el Excel
export type TipoEventoGPS =
  | 'Autoreporte OFF'
  | 'Auto reporte OFF'
  | 'Heartbeat'
  | 'Entrada Digital 3 Desactivada'
  | 'Entrada Digital 3 Activada'
  | 'Motor encendido'
  | 'Motor Encendido'
  | 'Auto reporte ON'
  | 'Auto reporte ON GIRO'
  | 'Inicio de inactividad ON'
  | 'Fin de inactividad ON'
  | 'Giro agresivo'
  | 'Frenado brusco'
  | 'Aceleracion brusca'
  | 'Exceso de velocidad'
  | 'Zona de riesgo'
  | 'Geocerca entrada'
  | 'Geocerca salida'
  | 'Panico'
  | 'Bateria baja'
  | 'GPS perdido'
  | 'Otro';

export type CategoriaEventoGPS =
  | 'ubicacion'
  | 'motor'
  | 'conduccion'
  | 'seguridad'
  | 'geocerca'
  | 'alerta'
  | 'sistema';

export interface DatosEvento {
  // Exceso de velocidad
  velocidadRegistrada?: number;
  velocidadLimite?: number;

  // Geocerca
  geocercaNombre?: string;
  geocercaTipo?: 'entrada' | 'salida';

  // Conducción agresiva
  intensidad?: 'leve' | 'moderada' | 'severa';
  gFuerza?: number;

  // Otros
  descripcion?: string;
}

export type FuenteDatosTelemetria =
  | 'MANUAL'
  | 'IMPORTACION_EXCEL'
  | 'API_MASTRACK'
  | 'API_OTRO';

// Integración con Mastrack
export interface ConfiguracionMastrack {
  apiUrl: string;
  apiKey: string;
  username?: string;
  password?: string;
  vehiculosRegistrados: MastrackVehiculo[];
  ultimaSincronizacion?: Date;
  intervaloSincronizacion: number; // minutos
  activo: boolean;
}

export interface MastrackVehiculo {
  mastrackId: string;
  alias: string;
  vehiculoIdInterno: string; // ID en nuestra plataforma
  imei?: string;
  simCard?: string;
}

// Formato de datos de Mastrack
export interface RegistroMastrack {
  deviceId: string;
  alias: string;
  timestamp: string; // ISO 8601
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  odometer?: number;
  eventType: string;
  eventDescription?: string;
  ignition?: boolean;
  movement?: boolean;
  inputs?: Record<string, boolean>;
  outputs?: Record<string, boolean>;
}

// Importación de datos
export interface ImportacionTelemetria {
  id: string;
  fuente: FuenteDatosTelemetria;
  archivo?: string;
  fechaImportacion: Date;
  periodoDesde: Date;
  periodoHasta: Date;
  totalRegistros: number;
  registrosImportados: number;
  registrosDuplicados: number;
  registrosError: number;
  status: 'procesando' | 'completado' | 'error';
  errores?: string[];
  createdBy: string;
}

// Análisis de conducción
export interface AnalisisConduccion {
  vehiculoId: string;
  operadorId?: string;
  periodo: {
    desde: Date;
    hasta: Date;
  };

  // Métricas generales
  kmRecorridos: number;
  horasMotorEncendido: number;
  horasConduccion: number;
  horasRalenti: number;
  velocidadPromedio: number;
  velocidadMaxima: number;

  // Eventos de conducción
  eventosConduccion: {
    girosBruscos: number;
    frenadosBruscos: number;
    aceleracionesBruscas: number;
    excesosVelocidad: number;
  };

  // Puntuación de conducción (0-100)
  scoreConduccion: number;
  scoreSeguridad: number;
  scoreEficiencia: number;

  // Comparativo
  comparativoFlota: 'mejor' | 'promedio' | 'peor';
}

// Geocercas
export interface Geocerca {
  id: string;
  nombre: string;
  tipo: 'cliente' | 'base' | 'zona_riesgo' | 'zona_carga' | 'otra';
  forma: 'circulo' | 'poligono';

  // Círculo
  centro?: { lat: number; lng: number };
  radio?: number; // metros

  // Polígono
  vertices?: Array<{ lat: number; lng: number }>;

  // Configuración
  alertaEntrada: boolean;
  alertaSalida: boolean;
  tiempoMinimoEstancia?: number; // minutos
  horariosActivos?: {
    dias: number[]; // 0-6
    horaInicio: string;
    horaFin: string;
  };

  // Metadata
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Dashboard de telemetría
export interface DashboardTelemetria {
  // Ubicación actual de flota
  ubicacionFlota: Array<{
    vehiculoId: string;
    alias: string;
    ultimaUbicacion: UbicacionGPS;
    ultimaActualizacion: Date;
    motorEncendido: boolean;
    enMovimiento: boolean;
    viajeActual?: string;
  }>;

  // Alertas activas
  alertasActivas: Array<{
    vehiculoId: string;
    alias: string;
    tipoAlerta: TipoEventoGPS;
    timestamp: Date;
    ubicacion: UbicacionGPS;
    atendida: boolean;
  }>;

  // Estadísticas del día
  estadisticasHoy: {
    vehiculosActivos: number;
    kmTotales: number;
    eventosConduccion: number;
    alertasCriticas: number;
  };
}

// Filtros
export interface FiltrosTelemetria {
  fechaDesde?: Date;
  fechaHasta?: Date;
  vehiculoId?: string;
  tipoEvento?: TipoEventoGPS;
  categoria?: CategoriaEventoGPS;
  viajeId?: string;
}

// Helper para categorizar eventos
export function categorizarEvento(tipo: TipoEventoGPS): CategoriaEventoGPS {
  const categorias: Record<TipoEventoGPS, CategoriaEventoGPS> = {
    'Autoreporte OFF': 'ubicacion',
    'Auto reporte OFF': 'ubicacion',
    'Heartbeat': 'sistema',
    'Entrada Digital 3 Desactivada': 'sistema',
    'Entrada Digital 3 Activada': 'sistema',
    'Motor encendido': 'motor',
    'Motor Encendido': 'motor',
    'Auto reporte ON': 'ubicacion',
    'Auto reporte ON GIRO': 'ubicacion',
    'Inicio de inactividad ON': 'motor',
    'Fin de inactividad ON': 'motor',
    'Giro agresivo': 'conduccion',
    'Frenado brusco': 'conduccion',
    'Aceleracion brusca': 'conduccion',
    'Exceso de velocidad': 'conduccion',
    'Zona de riesgo': 'seguridad',
    'Geocerca entrada': 'geocerca',
    'Geocerca salida': 'geocerca',
    'Panico': 'alerta',
    'Bateria baja': 'alerta',
    'GPS perdido': 'alerta',
    'Otro': 'sistema',
  };
  return categorias[tipo] || 'sistema';
}
