/**
 * Tipos para el módulo de Aditamentos
 * Lowboys, plataformas roll-off, camas bajas, etc.
 */

export type TipoAditamento = 'lowboy' | 'plataforma-rolloff' | 'cama-baja' | 'otro';

export interface Aditamento {
  id: string;
  numeroEconomico: string; // Identificador interno
  tipo: TipoAditamento;
  marca?: string;
  modelo?: string;
  año?: number;
  placas?: string;
  numSerie?: string;

  // Capacidades
  capacidadCarga?: number; // Toneladas
  largo?: number; // Metros
  ancho?: number; // Metros

  // Estado
  activo: boolean;
  foto?: string; // URL de imagen
  notas?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface AditamentoFormInput {
  numeroEconomico: string;
  tipo: TipoAditamento;
  marca?: string;
  modelo?: string;
  año?: number;
  placas?: string;
  numSerie?: string;
  capacidadCarga?: number;
  largo?: number;
  ancho?: number;
  foto?: string;
  notas?: string;
}

export interface FiltrosAditamento {
  busqueda?: string;
  activo?: boolean;
  tipo?: TipoAditamento;
}

// Constantes
export const TIPOS_ADITAMENTO: { value: TipoAditamento; label: string; descripcion: string }[] = [
  { value: 'lowboy', label: 'Lowboy', descripcion: 'Plataforma baja para maquinaria pesada' },
  { value: 'plataforma-rolloff', label: 'Plataforma Roll-Off', descripcion: 'Plataforma con sistema de inclinación' },
  { value: 'cama-baja', label: 'Cama Baja', descripcion: 'Remolque de piso bajo' },
  { value: 'otro', label: 'Otro', descripcion: 'Otro tipo de aditamento' },
];
