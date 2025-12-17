/**
 * Tipos para el módulo de Operadores
 * Conductores de tractocamiones y plataformas roll-off
 */

export type TipoLicencia = 'federal' | 'estatal';

export interface LicenciaOperador {
  numero: string;
  tipo: TipoLicencia;
  vigencia: Date;
}

export interface Operador {
  id: string;
  nombre: string;
  telefono: string;
  telefonoEmergencia?: string;
  foto?: string; // URL de imagen

  // Licencia
  licencia: LicenciaOperador;

  // Económico
  sueldoDiario: number;

  // Asignación de unidades
  tractosAutorizados: string[]; // IDs de tractocamiones que puede operar

  // Fechas
  fechaIngreso: Date;

  // Estado
  activo: boolean;
  notas?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface OperadorFormInput {
  nombre: string;
  telefono: string;
  telefonoEmergencia?: string;
  foto?: string;
  licencia: {
    numero: string;
    tipo: TipoLicencia;
    vigencia: Date | string;
  };
  sueldoDiario: number;
  tractosAutorizados: string[];
  fechaIngreso: Date | string;
  notas?: string;
}

export interface FiltrosOperador {
  busqueda?: string;
  activo?: boolean;
  tipoLicencia?: TipoLicencia;
  tractoAutorizado?: string;
}

// Constantes
export const TIPOS_LICENCIA: { value: TipoLicencia; label: string }[] = [
  { value: 'federal', label: 'Federal' },
  { value: 'estatal', label: 'Estatal' },
];
