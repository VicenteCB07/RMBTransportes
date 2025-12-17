/**
 * Tipos para el módulo de Casetas/Peajes
 * Basado en la hoja Casetas del Excel (10,632 registros)
 * Incluye integración con sistemas TAG (IAVE, Televia, etc.)
 */

export interface Caseta {
  id: string;

  // Identificación
  vehiculoId: string;
  numeroEconomico: string; // TRC08, TRC11, etc.

  // Fecha y hora del cruce
  fecha: Date;
  hora: string; // "07:21"
  timestamp: Date; // Combinación de fecha + hora

  // Caseta
  nombreCaseta: string;
  operador?: OperadorCaseta;
  plaza?: string;
  carretera?: string;

  // Costo
  importe: number;
  tipoTarifa: TipoTarifa;
  ejes: number;

  // Método de pago
  metodoPago: MetodoPagoCaseta;
  numeroTag?: string;
  referenciaPago?: string;

  // Correlación con viaje
  viajeId?: string;
  correlacionado: boolean;
  correlacionManual: boolean;

  // Fuente de datos
  fuenteDatos: FuenteDatosCaseta;
  importacionId?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export type OperadorCaseta =
  | 'CAPUFE'
  | 'OHL'
  | 'FARAC'
  | 'RCO'
  | 'PINFRA'
  | 'ICA'
  | 'Otro';

export type TipoTarifa =
  | 'A' // Automóviles
  | 'B' // Autobuses
  | 'C2' // Camiones 2 ejes
  | 'C3' // Camiones 3 ejes
  | 'C4' // Camiones 4 ejes
  | 'C5' // Camiones 5 ejes
  | 'C6' // Camiones 6 ejes
  | 'C7' // Camiones 7 ejes
  | 'C8' // Camiones 8 ejes
  | 'C9'; // Camiones 9+ ejes

export type MetodoPagoCaseta =
  | 'TAG_IAVE'
  | 'TAG_TELEVIA'
  | 'TAG_VIAPASS'
  | 'TAG_PASE'
  | 'EFECTIVO'
  | 'TARJETA';

export type FuenteDatosCaseta =
  | 'MANUAL'
  | 'IMPORTACION_EXCEL'
  | 'IMPORTACION_IAVE'
  | 'IMPORTACION_TELEVIA'
  | 'IMPORTACION_VIAPASS'
  | 'API_TAG';

// Catálogo de casetas frecuentes (basado en el Excel)
export const CASETAS_FRECUENTES: CasetaCatalogo[] = [
  { nombre: 'CTO. EXT. MEXIQUENSE', operador: 'OHL', carretera: 'Circuito Exterior Mexiquense' },
  { nombre: 'LA VENTA', operador: 'CAPUFE', carretera: 'México-Toluca' },
  { nombre: 'MARQUESA VIAPASS', operador: 'OHL', carretera: 'México-Toluca' },
  { nombre: 'SAN MIGUEL', operador: 'CAPUFE', carretera: 'México-Querétaro' },
  { nombre: 'TIZAYUCA EASYTRIP', operador: 'OHL', carretera: 'Arco Norte' },
  { nombre: 'ANE EASYTRIP', operador: 'OHL', carretera: 'Arco Norte' },
  { nombre: 'TEXCOCO', operador: 'CAPUFE', carretera: 'Peñón-Texcoco' },
  { nombre: 'PEÑON', operador: 'CAPUFE', carretera: 'Peñón-Texcoco' },
  { nombre: 'TEZOYUCA SICE', operador: 'OHL', carretera: 'Arco Norte' },
  { nombre: 'LAGO DE GUADALUPE', operador: 'OHL', carretera: 'Circuito Exterior Mexiquense' },
  { nombre: 'CUAUTITLAN', operador: 'CAPUFE', carretera: 'México-Querétaro' },
  { nombre: 'CHAMAPA AUTOVAN', operador: 'OHL', carretera: 'Chamapa-Lechería' },
  { nombre: 'SAN MARTIN TEXMELUCAN', operador: 'CAPUFE', carretera: 'México-Puebla' },
  { nombre: 'LIB. PUEBLA', operador: 'CAPUFE', carretera: 'Libramiento Puebla' },
];

export interface CasetaCatalogo {
  nombre: string;
  operador: OperadorCaseta;
  carretera: string;
  tarifas?: Record<TipoTarifa, number>;
}

// Importación de datos TAG
export interface ImportacionTAG {
  id: string;
  fuente: FuenteDatosCaseta;
  archivo?: string;
  fechaImportacion: Date;
  periodoDesde: Date;
  periodoHasta: Date;
  totalRegistros: number;
  registrosImportados: number;
  registrosDuplicados: number;
  registrosError: number;
  montoTotal: number;
  status: 'procesando' | 'completado' | 'error';
  errores?: string[];
  createdBy: string;
}

// Formato de archivo IAVE
export interface RegistroIAVE {
  fecha: string;        // "01/08/2025"
  hora: string;         // "07:21:35"
  tag: string;          // Número de TAG
  plaza: string;        // Nombre de la caseta
  carril: string;
  importe: number;
  saldo?: number;
}

// Formato de archivo Televia
export interface RegistroTelevia {
  fechaHora: string;    // "2025-08-01 07:21:35"
  numeroTag: string;
  plaza: string;
  tarifa: string;
  monto: number;
  estatus: string;
}

// Formato de archivo VIAPASS
export interface RegistroViapass {
  Date: string;
  Time: string;
  TAG: string;
  Toll: string;
  Amount: number;
  Balance: number;
}

// Input para registro manual
export interface CasetaFormInput {
  vehiculoId: string;
  fecha: Date;
  hora: string;
  nombreCaseta: string;
  importe: number;
  metodoPago: MetodoPagoCaseta;
  viajeId?: string;
  notas?: string;
}

// Filtros
export interface FiltrosCaseta {
  fechaDesde?: Date;
  fechaHasta?: Date;
  vehiculoId?: string;
  nombreCaseta?: string;
  correlacionado?: boolean;
  fuenteDatos?: FuenteDatosCaseta;
}

// Estadísticas
export interface EstadisticasCasetas {
  totalCruces: number;
  gastoTotal: number;
  gastoPromedioDiario: number;
  casetaMasFrecuente: string;
  vehiculoMayorGasto: string;
  porcentajeCorrelacionado: number;
}
