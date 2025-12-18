/**
 * Tipos para el módulo de Viajes
 * Basado en la estructura de Bitácora del Excel (645 viajes)
 */

import type { MarcaEquipo, CategoriaEquipo } from './equipment.types';

/**
 * Equipo de carga (maquinaria) que se transporta en un viaje
 */
export interface EquipoCargaViaje {
  id: string;                    // ID único para esta instancia
  modelo: string;                // Modelo del catálogo (ej: "GS-2632")
  marca: MarcaEquipo;            // Marca del equipo
  categoria: CategoriaEquipo;    // Tipo de equipo
  // Dimensiones y peso (copiados del catálogo)
  dimensiones: {
    largo: number;
    ancho: number;
    alto: number;
  };
  peso: number;
  // Identificación específica de la unidad (opcional)
  numeroSerie?: string;          // Número de serie del equipo
  numeroEconomico?: string;      // Número económico del cliente
  // Notas
  notas?: string;
}

export interface Viaje {
  id: string;
  folio: string; // Formato: DDMMYY-TIPO-UNIDAD-# (ej: 010825-EN-T08-1)

  // Fechas y tiempos
  fecha: Date;
  fechaCompromiso?: Date; // Fecha compromiso de entrega
  tiempos: TiemposViaje;

  // Asignaciones
  tractoId: string;
  operadorId: string;
  maniobristaId?: string;
  asesorId?: string;

  // Equipos (remolques/cajas) - aditamentos como lowboys, plataformas
  equipos: string[]; // Eco (1), Eco (2), Eco (3), Eco (4)

  // Equipos de carga - maquinaria que se transporta
  equiposCarga: EquipoCargaViaje[];

  // Cliente y destino
  clienteId: string;
  clienteNombre: string; // Denormalizado para búsquedas
  destino: DestinoViaje;

  // Condiciones de seguridad requeridas
  condicionesSeguridad?: CondicionesSeguridad;

  // Tipo de servicio
  tipoServicio: TipoServicioViaje;

  // Distancia y ruta
  distanciaKm: number;
  rutaId?: string;
  coordenadasRuta?: Array<{ lat: number; lng: number }>;

  // Costos (calculados automáticamente)
  costos: CostosViaje;

  // Ingresos
  ingresos: IngresosViaje;

  // Resultado
  utilidad: number;
  margenUtilidad: number; // Porcentaje

  // Status
  status: StatusViaje;

  // Casetas asociadas
  casetasIds: string[];
  totalCasetas: number;

  // Telemetría
  telemetriaIds: string[];
  odometroInicio?: number;
  odometroFin?: number;

  // Metadata
  notas?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TiemposViaje {
  inicio: Date;        // HR_Inicio
  llegada?: Date;      // HR_Llegada
  inicioEspera?: Date; // Timestamp cuando inicia la espera (click 3)
  tiempoEspera?: number;  // Tiempo espera (minutos) - calculado automáticamente
  partida?: Date;      // HR_Partida
  extension?: number;  // Extensión (minutos)
  tiempoMuerto?: number;  // Tiempo muerto (minutos)
  fin?: Date;          // HR_Final
  duracionTotal?: number; // Total en minutos
}

export interface DestinoViaje {
  nombre: string;
  direccion?: string;
  coordenadas?: {
    lat: number;
    lng: number;
  };
  municipio?: string;
  estado?: string;
  // Contacto en destino
  contactoNombre?: string;
  contactoTelefono?: string;
  // Ventana de tiempo para recepción
  ventanaInicio?: string; // HH:mm
  ventanaFin?: string;    // HH:mm
}

// Condiciones de seguridad requeridas para el viaje
export interface CondicionesSeguridad {
  // Documentación del operador
  licenciaVigente: boolean;
  certificadoMedico: boolean;
  seguroSocial: boolean;
  // Documentación del vehículo
  tarjetaCirculacion: boolean;
  polizaSeguro: boolean;
  verificacionAmbiental: boolean;
  // EPP (Equipo de Protección Personal)
  cascoConBarbiquejo: boolean;
  chaleco: boolean;
  botasConCasquillo: boolean;
  guantes: boolean;
  lentes: boolean;
  taponesAuditivos: boolean;
  // Cursos/Certificaciones especiales
  cursosRequeridos: string[]; // Ej: "Curso de seguridad industrial", "Manejo de materiales peligrosos"
  // Documentos adicionales
  documentosAdicionales: DocumentoRequerido[];
  // Archivos adjuntos
  documentosAdjuntos: ArchivoAdjunto[];
  imagenesAdjuntas: ArchivoAdjunto[];
  // Notas especiales de acceso
  notasAcceso?: string;
}

export interface ArchivoAdjunto {
  id: string;
  nombre: string;
  url: string;
  tipo: string; // MIME type
  tamanio: number; // bytes
  fechaSubida: Date;
}

export interface DocumentoRequerido {
  nombre: string;
  descripcion?: string;
  archivoUrl?: string; // URL del documento subido
  verificado: boolean;
  fechaVerificacion?: Date;
}

export interface CostosViaje {
  sueldos: number;      // Calculado: tarifa operador × días
  seguros: number;      // Calculado: tarifa vehículo × días
  casetas: number;      // Suma de casetas asociadas
  combustible: number;  // Calculado: km × rendimiento × precio/L
  comidas: number;      // Viáticos de comida
  transporte: number;   // Otros transportes
  otros: number;        // Gastos adicionales
  total: number;        // Suma de todos los costos
}

export interface IngresosViaje {
  flete: number;        // Precio del flete
  recargos: number;     // Cargos adicionales
  total: number;
}

export type TipoServicioViaje =
  | 'Entrega'
  | 'Recolección'
  | 'Cambio'
  | 'Flete en falso'
  | 'Movimiento'
  | 'Regreso'
  | 'Entrega / Recoleccion';

export type StatusViaje =
  | 'sin_asignar'
  | 'programado'
  | 'en_curso'
  | 'en_destino'
  | 'completado'
  | 'cancelado';

// Input para crear/editar viajes
export interface ViajeFormInput {
  fecha: Date;
  fechaCompromiso?: Date;
  tractoId: string;
  operadorId: string;
  maniobristaId?: string;
  asesorId?: string;
  equipos: string[];
  equiposCarga: EquipoCargaViaje[];
  clienteId: string;
  destino: DestinoViaje;
  condicionesSeguridad?: CondicionesSeguridad;
  tipoServicio: TipoServicioViaje;
  distanciaKm: number;
  rutaId?: string;
  precioFlete: number;
  recargos?: number;
  comidas?: number;
  transporte?: number;
  otros?: number;
  notas?: string;
  status?: StatusViaje;
}

// Condiciones de seguridad por defecto (todas desactivadas)
export const CONDICIONES_SEGURIDAD_DEFAULT: CondicionesSeguridad = {
  licenciaVigente: false,
  certificadoMedico: false,
  seguroSocial: false,
  tarjetaCirculacion: false,
  polizaSeguro: false,
  verificacionAmbiental: false,
  cascoConBarbiquejo: false,
  chaleco: false,
  botasConCasquillo: false,
  guantes: false,
  lentes: false,
  taponesAuditivos: false,
  cursosRequeridos: [],
  documentosAdicionales: [],
  documentosAdjuntos: [],
  imagenesAdjuntas: [],
};

// Filtros para búsqueda
export interface FiltrosViaje {
  fechaDesde?: Date;
  fechaHasta?: Date;
  fechaCompromisoDesde?: Date;
  fechaCompromisoHasta?: Date;
  tractoId?: string;
  operadorId?: string;
  clienteId?: string;
  tipoServicio?: TipoServicioViaje;
  status?: StatusViaje;
  busqueda?: string;
}

// Generador de folio
export function generarFolioViaje(
  fecha: Date,
  tipoServicio: TipoServicioViaje,
  tractoNumero: string,
  secuencia: number
): string {
  const dd = fecha.getDate().toString().padStart(2, '0');
  const mm = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const yy = fecha.getFullYear().toString().slice(-2);

  const tipoAbrev: Record<TipoServicioViaje, string> = {
    'Entrega': 'EN',
    'Recolección': 'RE',
    'Cambio': 'CA',
    'Flete en falso': 'FF',
    'Movimiento': 'MO',
    'Regreso': 'RG',
    'Entrega / Recoleccion': 'ER'
  };

  return `${dd}${mm}${yy}-${tipoAbrev[tipoServicio]}-${tractoNumero}-${secuencia}`;
}
