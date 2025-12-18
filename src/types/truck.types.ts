/**
 * Tipos para el módulo de Tractocamiones
 * Vehículos tractores (sin remolque)
 */

// Tipos de unidad disponibles
export type TipoUnidad = 'tractocamion' | 'rolloff-plataforma';

// Documento del expediente
export interface DocumentoExpediente {
  id: string;
  nombre: string;           // Nombre original del archivo
  tipo: string;             // MIME type
  url: string;              // URL de descarga
  path: string;             // Path en Storage
  tamaño: number;           // Bytes
  categoria: TipoDocumento; // Categoría del documento
  fechaSubida: Date;
  notas?: string;
}

// Categorías de documentos
export type TipoDocumento =
  | 'tarjeta_circulacion'
  | 'factura'
  | 'poliza_seguro'
  | 'verificacion'
  | 'permiso_sct'
  | 'otro';

export const TIPOS_DOCUMENTO: { value: TipoDocumento; label: string }[] = [
  { value: 'tarjeta_circulacion', label: 'Tarjeta de Circulación' },
  { value: 'factura', label: 'Factura' },
  { value: 'poliza_seguro', label: 'Póliza de Seguro' },
  { value: 'verificacion', label: 'Verificación' },
  { value: 'permiso_sct', label: 'Permiso SCT' },
  { value: 'otro', label: 'Otro' },
];

export const TIPOS_UNIDAD: { value: TipoUnidad; label: string }[] = [
  { value: 'tractocamion', label: 'Tractocamión' },
  { value: 'rolloff-plataforma', label: 'Roll-Off c/ Plataforma' },
];

export interface Tractocamion {
  id: string;
  tipoUnidad: TipoUnidad; // Tipo de unidad
  numeroEconomico: string; // Identificador interno
  marca: string;
  modelo: string;
  año: number;
  placas: string;
  numSerie: string; // VIN
  color?: string;

  // Combustible
  capacidadCombustible?: number; // Litros
  rendimientoPromedio?: number; // Km/litro

  // Odómetro
  odometroActual?: number; // Kilómetros

  // Capacidad de carga (para Roll-Off con plataforma integrada)
  // Para tractocamiones, estas specs están en el aditamento (lowboy)
  plataformaCarga?: {
    largo: number;           // Largo útil de carga (metros)
    ancho: number;           // Ancho útil de carga (metros)
    capacidadToneladas: number; // Capacidad máxima de carga (toneladas)
  };

  // Integraciones
  gpsId?: string; // ID de Mastrack
  tagId?: string; // Número de TAG para casetas

  // Seguro
  seguro?: {
    poliza: string;           // Número de póliza
    aseguradora?: string;     // Nombre de la aseguradora
    costoAnual: number;       // Costo anual en MXN
    vigenciaInicio?: Date;    // Fecha de inicio de vigencia
    vigenciaFin?: Date;       // Fecha de fin de vigencia
  };

  // Fechas
  fechaAdquisicion?: Date;

  // Estado
  activo: boolean;
  foto?: string; // URL de imagen
  notas?: string;

  // Expediente de documentos
  documentos?: DocumentoExpediente[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface TractocamionFormInput {
  tipoUnidad: TipoUnidad;
  numeroEconomico: string;
  marca: string;
  modelo: string;
  año: number;
  placas: string;
  numSerie: string;
  color?: string;
  capacidadCombustible?: number;
  rendimientoPromedio?: number;
  odometroActual?: number;
  // Capacidad de carga (principalmente para Roll-Off)
  plataformaCarga?: {
    largo: number;
    ancho: number;
    capacidadToneladas: number;
  };
  gpsId?: string;
  tagId?: string;
  // Seguro
  seguro?: {
    poliza: string;
    aseguradora?: string;
    costoAnual: number;
    vigenciaInicio?: Date | string;
    vigenciaFin?: Date | string;
  };
  fechaAdquisicion?: Date | string;
  foto?: string;
  notas?: string;
}

export interface FiltrosTractocamion {
  busqueda?: string;
  activo?: boolean;
  marca?: string;
  tipoUnidad?: TipoUnidad;
}

// Constantes de marcas comunes
export const MARCAS_TRACTOCAMION: string[] = [
  'Kenworth',
  'Freightliner',
  'International',
  'Volvo',
  'Mack',
  'Peterbilt',
  'Western Star',
  'Mercedes-Benz',
  'Scania',
  'DAF',
  'MAN',
  'Otro',
];
