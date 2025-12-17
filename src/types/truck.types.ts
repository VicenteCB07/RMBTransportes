/**
 * Tipos para el módulo de Tractocamiones
 * Vehículos tractores (sin remolque)
 */

// Tipos de unidad disponibles
export type TipoUnidad = 'tractocamion' | 'rolloff-plataforma';

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

  // Integraciones
  gpsId?: string; // ID de Mastrack
  tagId?: string; // Número de TAG para casetas

  // Fechas
  fechaAdquisicion?: Date;

  // Estado
  activo: boolean;
  foto?: string; // URL de imagen
  notas?: string;

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
  gpsId?: string;
  tagId?: string;
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
