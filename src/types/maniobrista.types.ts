/**
 * Tipos para el módulo de Maniobristas
 * Ayudantes de operadores para carga y descarga
 */

export interface SeguroSocialManiobrista {
  folio: string;           // Número de seguro social (NSS)
  costoMensual: number;    // Costo mensual en MXN
}

export interface Maniobrista {
  id: string;
  nombre: string;
  telefono: string;
  foto?: string; // URL de imagen

  // Seguro Social (IMSS)
  seguroSocial?: SeguroSocialManiobrista;

  // Económico
  sueldoDiario: number;

  // Fechas
  fechaIngreso: Date;

  // Estado
  activo: boolean;
  notas?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ManiobristaFormInput {
  nombre: string;
  telefono: string;
  foto?: string;
  seguroSocial?: {
    folio: string;
    costoMensual: number;
  };
  sueldoDiario: number;
  fechaIngreso: Date | string;
  notas?: string;
}

export interface FiltrosManiobrista {
  busqueda?: string;
  activo?: boolean;
}
