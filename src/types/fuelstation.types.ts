/**
 * Tipos para el módulo de Estaciones de Servicio
 * Gasolineras frecuentes para carga de combustible
 */

export type TipoCombustible = 'diesel' | 'magna' | 'premium';

export interface CoordenadaEstacion {
  lat: number;
  lng: number;
}

export interface DireccionEstacion {
  calle: string;
  numero?: string;
  colonia?: string;
  municipio: string;
  estado: string;
  codigoPostal?: string;
}

export interface EstacionServicio {
  id: string;
  nombre: string;
  direccion: DireccionEstacion;
  coordenadas?: CoordenadaEstacion;
  telefono?: string;

  // Combustibles disponibles
  tiposCombustible: TipoCombustible[];

  // Estado
  activo: boolean;
  notas?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface EstacionServicioFormInput {
  nombre: string;
  direccion: Partial<DireccionEstacion>;
  coordenadas?: CoordenadaEstacion;
  telefono?: string;
  tiposCombustible: TipoCombustible[];
  notas?: string;
}

export interface FiltrosEstacionServicio {
  busqueda?: string;
  activo?: boolean;
  tipoCombustible?: TipoCombustible;
  estado?: string;
}

// Constantes
export const TIPOS_COMBUSTIBLE: { value: TipoCombustible; label: string; color: string }[] = [
  { value: 'diesel', label: 'Diesel', color: 'yellow' },
  { value: 'magna', label: 'Magna', color: 'green' },
  { value: 'premium', label: 'Premium', color: 'red' },
];
