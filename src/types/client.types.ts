/**
 * Tipos para el módulo de Clientes
 * Basado en el catálogo de 297 clientes del Excel
 * Soporta múltiples obras/sucursales por cliente
 */

export interface Cliente {
  id: string;
  nombre: string; // Razón Social
  nombreComercial?: string;
  rfc?: string;

  // Contactos corporativos (nivel empresa)
  contactoPrincipal?: string;
  telefono?: string;
  email?: string;

  // Dirección fiscal (oficinas centrales)
  direccion: DireccionCliente;

  // Obras/Sucursales (múltiples ubicaciones)
  obras: ObraCliente[];

  // Configuración de servicio
  tipoServicioFrecuente?: TipoServicio[];
  requiereFactura: boolean;
  diasCredito: number;
  limiteCredito?: number;

  // Tarifas preferenciales
  tarifasEspeciales?: TarifaCliente[];

  // Estadísticas
  estadisticas: EstadisticasCliente;

  // Metadata
  activo: boolean;
  notas?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Obra o Sucursal de un cliente
 * Cada obra tiene su propia dirección y contactos
 */
export interface ObraCliente {
  id: string;
  nombre: string; // Ej: "Planta Monterrey", "CEDIS Guadalajara", "Obra Torres Chapultepec"
  alias?: string; // Nombre corto para búsquedas rápidas
  tipo: TipoObra;

  // Dirección de la obra
  direccion: DireccionCliente;

  // Contactos en sitio (puede haber varios)
  contactos: ContactoObra[];

  // Condiciones de acceso específicas de esta obra
  condicionesAcceso?: CondicionesAccesoObra;

  // Estado
  activa: boolean;
  notas?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TipoObra =
  | 'planta'
  | 'cedis'
  | 'bodega'
  | 'obra'
  | 'oficina'
  | 'sucursal'
  | 'otro';

/**
 * Contacto en sitio de una obra
 */
export interface ContactoObra {
  id: string;
  nombre: string;
  puesto?: string; // Ej: "Jefe de Almacén", "Vigilancia", "Recepción"
  telefono?: string;
  celular?: string;
  email?: string;
  horarioDisponible?: string; // Ej: "Lun-Vie 8:00-18:00"
  esPrincipal: boolean; // Contacto principal de la obra
  notas?: string;
}

/**
 * Condiciones de acceso específicas de una obra
 */
export interface CondicionesAccesoObra {
  // Documentación requerida para el operador
  requiereINE: boolean;
  requiereLicencia: boolean;
  requiereCertificadoMedico: boolean;
  requiereSeguroSocial: boolean;

  // EPP requerido
  requiereCasco: boolean;
  requiereChaleco: boolean;
  requiereBotas: boolean;
  requiereGuantes: boolean;
  requiereLentes: boolean;
  requiereTaponesAuditivos: boolean;

  // Cursos/certificaciones
  cursosRequeridos: string[];

  // Horarios
  horarioRecepcion?: {
    inicio: string;
    fin: string;
  };
  diasOperacion?: string[]; // ['Lunes', 'Martes', ...]

  // Restricciones
  restricciones: string[];
  instruccionesEspeciales?: string;
}

export interface DireccionCliente {
  calle: string;
  numeroExterior?: string;
  numeroInterior?: string;
  colonia: string;
  municipio: string;
  estado: string;
  codigoPostal: string;
  pais: string;

  // Geocodificación
  coordenadas?: {
    lat: number;
    lng: number;
  };

  // Instrucciones de acceso
  instruccionesAcceso?: string;
  horarioRecepcion?: {
    inicio: string; // "08:00"
    fin: string;    // "18:00"
  };
  restriccionesAcceso?: string[];
}

export interface TarifaCliente {
  id: string;
  destino: string;
  tipoServicio: TipoServicio;
  tipoUnidad: string;
  precioBase: number;
  precioKmAdicional?: number;
  incluyeCasetas: boolean;
  vigenciaDesde: Date;
  vigenciaHasta?: Date;
}

export interface EstadisticasCliente {
  totalViajes: number;
  viajesUltimoMes: number;
  ingresoTotal: number;
  ingresoUltimoMes: number;
  promedioViajeMensual: number;
  ultimoServicio?: Date;
  destinosFrecuentes: string[];
  calificacionPago: 'excelente' | 'bueno' | 'regular' | 'malo';
}

export type TipoServicio =
  | 'Entrega'
  | 'Recolección'
  | 'Cambio'
  | 'Flete en falso'
  | 'Movimiento'
  | 'Regreso'
  | 'Entrega / Recoleccion';

export interface ClienteFormInput {
  nombre: string;
  nombreComercial?: string;
  rfc?: string;
  contactoPrincipal?: string;
  telefono?: string;
  email?: string;
  direccion: Partial<DireccionCliente>;
  obras?: ObraFormInput[];
  requiereFactura: boolean;
  diasCredito: number;
  limiteCredito?: number;
  notas?: string;
}

/**
 * Input para crear/editar una obra
 */
export interface ObraFormInput {
  id?: string;
  nombre: string;
  alias?: string;
  tipo: TipoObra;
  direccion: Partial<DireccionCliente>;
  contactos: ContactoObraInput[];
  condicionesAcceso?: Partial<CondicionesAccesoObra>;
  notas?: string;
}

export interface ContactoObraInput {
  id?: string;
  nombre: string;
  puesto?: string;
  telefono?: string;
  celular?: string;
  email?: string;
  horarioDisponible?: string;
  esPrincipal: boolean;
}

// Filtros para búsqueda
export interface FiltrosCliente {
  busqueda?: string;
  activo?: boolean;
  estado?: string;
  conViajesRecientes?: boolean;
}

// Constantes para tipos de obra
export const TIPOS_OBRA: { value: TipoObra; label: string }[] = [
  { value: 'planta', label: 'Planta' },
  { value: 'cedis', label: 'CEDIS' },
  { value: 'bodega', label: 'Bodega' },
  { value: 'obra', label: 'Obra' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'sucursal', label: 'Sucursal' },
  { value: 'otro', label: 'Otro' },
];
