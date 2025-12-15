/**
 * Tipos para el módulo de Rutas
 * Incluye puntos de entrega, restricciones, horarios y seguridad
 */

// ============================================
// COORDENADAS Y UBICACIÓN
// ============================================

export interface Coordenadas {
  lat: number
  lng: number
}

export interface Direccion {
  calle: string
  numeroExterior: string
  numeroInterior?: string
  colonia: string
  ciudad: string
  estado: string
  codigoPostal: string
  pais: string
  referencias?: string
}

// ============================================
// RESTRICCIONES DE ACCESO
// ============================================

export type TipoRestriccion =
  | 'altura_maxima'      // Puentes, túneles
  | 'peso_maximo'        // Puentes, calles
  | 'ancho_maximo'       // Calles angostas
  | 'longitud_maxima'    // Curvas cerradas
  | 'tipo_vehiculo'      // Solo ciertos vehículos
  | 'horario'            // Restricción por hora
  | 'dia_semana'         // Restricción por día
  | 'hoy_no_circula'     // Por placa
  | 'zona_restringida'   // Centro histórico, etc.
  | 'permiso_especial'   // Requiere permiso

export interface RestriccionAcceso {
  tipo: TipoRestriccion
  descripcion: string
  valor?: number          // Para altura, peso, etc. (en metros o toneladas)
  unidad?: string         // 'm', 'ton', 'km/h'
  diasAplica?: number[]   // 0=Dom, 1=Lun, ..., 6=Sab
  horasAplica?: {
    inicio: string        // "06:00"
    fin: string           // "22:00"
  }
  placasAplica?: string[] // Para hoy no circula
  activa: boolean
}

// ============================================
// VENTANAS DE TIEMPO / HORARIOS
// ============================================

export interface VentanaHorario {
  id: string
  nombre: string          // "Mañana", "Tarde", "Nocturno"
  horaInicio: string      // "06:00"
  horaFin: string         // "14:00"
  diasDisponibles: number[] // [1, 2, 3, 4, 5] = Lun-Vie
  prioridad: number       // 1 = alta, 2 = media, 3 = baja
  notas?: string
}

export interface HorarioAcceso {
  ventanasEntrega: VentanaHorario[]
  tiempoDescargaEstimado: number  // minutos
  requiereCita: boolean
  anticipacionCita?: number       // horas de anticipación
  contactoCitas?: {
    nombre: string
    telefono: string
    email?: string
  }
}

// ============================================
// CONDICIONES DE SEGURIDAD
// ============================================

export type NivelRiesgo = 'bajo' | 'medio' | 'alto' | 'critico'

export type TipoZona =
  | 'industrial'
  | 'comercial'
  | 'residencial'
  | 'centro_historico'
  | 'zona_portuaria'
  | 'zona_fronteriza'
  | 'carretera'
  | 'autopista'

export interface CondicionesSeguridad {
  nivelRiesgo: NivelRiesgo
  tipoZona: TipoZona
  requiereEscolta: boolean
  requiereCustodiaArmada: boolean
  requiereGPS: boolean
  requiereSelloElectronico: boolean
  zonasPeligrosas?: string[]      // Colonias/zonas a evitar
  rutasAlternas?: string[]        // Descripciones de rutas seguras
  puntosRevision?: string[]       // Casetas, retenes
  estacionamientosSeguro?: {
    nombre: string
    direccion: string
    coordenadas: Coordenadas
    servicios: string[]           // "vigilancia", "sanitarios", "comida"
  }[]
  recomendaciones?: string[]
  incidentesReportados?: number   // En los últimos 12 meses
  ultimaActualizacion: Date
}

// ============================================
// PUNTOS DE ENTREGA
// ============================================

export type TipoPunto =
  | 'origen'
  | 'destino'
  | 'parada_intermedia'
  | 'punto_combustible'
  | 'punto_descanso'
  | 'caseta'
  | 'aduana'

export type EstadoPunto =
  | 'activo'
  | 'inactivo'
  | 'temporal'

export interface PuntoEntrega {
  id: string
  nombre: string
  alias?: string                  // Nombre corto o código
  tipo: TipoPunto
  estado: EstadoPunto

  // Ubicación
  direccion: Direccion
  coordenadas: Coordenadas

  // Restricciones
  restricciones: RestriccionAcceso[]

  // Horarios
  horarioAcceso: HorarioAcceso

  // Seguridad
  seguridad: CondicionesSeguridad

  // Infraestructura
  infraestructura: {
    tieneAnden: boolean
    tieneRampa: boolean
    tieneMontacargas: boolean
    tieneBascula: boolean
    espacioManiobra: 'amplio' | 'limitado' | 'muy_limitado'
    tipoAcceso: 'frontal' | 'lateral' | 'trasero' | 'multiple'
    alturaTecho?: number          // metros (para bodegas)
  }

  // Contactos
  contactos: {
    nombre: string
    puesto: string
    telefono: string
    email?: string
    esContactoPrincipal: boolean
  }[]

  // Cliente asociado
  clienteId?: string
  clienteNombre?: string

  // Metadata
  notas?: string
  imagenes?: string[]             // URLs de fotos del lugar
  documentos?: string[]           // URLs de docs (mapas, instrucciones)
  creadoPor: string
  fechaCreacion: Date
  ultimaModificacion: Date
}

// ============================================
// RUTAS
// ============================================

export type EstadoRuta =
  | 'borrador'
  | 'planificada'
  | 'en_progreso'
  | 'completada'
  | 'cancelada'

export type TipoRuta =
  | 'local'           // Dentro de una ciudad
  | 'foranea'         // Entre ciudades del mismo estado
  | 'nacional'        // Entre estados
  | 'internacional'   // Cruza fronteras

export interface SegmentoRuta {
  id: string
  orden: number
  puntoOrigenId: string
  puntoDestinoId: string
  distanciaKm: number
  tiempoEstimadoMin: number
  costoEstimadoCasetas: number
  costoEstimadoCombustible: number
  geometria?: string              // GeoJSON de la ruta (polyline)
  alternativas?: {
    nombre: string
    distanciaKm: number
    tiempoEstimadoMin: number
    razon: string                 // "Evita zona peligrosa", "Más rápida"
  }[]
}

export interface Ruta {
  id: string
  nombre: string
  codigo: string                  // Código interno (ej: "MTY-GDL-001")
  descripcion?: string
  tipo: TipoRuta
  estado: EstadoRuta

  // Puntos
  puntoOrigenId: string
  puntoDestinoId: string
  puntosIntermedios: string[]     // IDs de puntos

  // Segmentos calculados
  segmentos: SegmentoRuta[]

  // Totales
  distanciaTotalKm: number
  tiempoEstimadoTotal: number     // minutos
  costoEstimadoTotal: number      // MXN

  // Restricciones consolidadas
  restriccionesRuta: RestriccionAcceso[]
  nivelRiesgoGeneral: NivelRiesgo

  // Vehículos compatibles
  tiposVehiculoPermitidos: string[]
  pesoMaximoPermitido: number     // toneladas

  // Metadata
  frecuenciaUso: 'alta' | 'media' | 'baja' | 'ocasional'
  ultimoUso?: Date
  vecesUsada: number
  calificacionPromedio?: number   // 1-5 estrellas

  creadoPor: string
  fechaCreacion: Date
  ultimaModificacion: Date
  activa: boolean
}

// ============================================
// VIAJE (Instancia de una ruta)
// ============================================

export type EstadoViaje =
  | 'programado'
  | 'en_transito'
  | 'en_punto'        // En un punto de entrega
  | 'completado'
  | 'cancelado'
  | 'incidente'

export interface Viaje {
  id: string
  rutaId: string
  rutaNombre: string

  // Asignaciones
  vehiculoId: string
  vehiculoPlaca: string
  conductorId: string
  conductorNombre: string

  // Programación
  fechaProgramada: Date
  horaInicioProgramada: string
  horaFinEstimada: string

  // Ejecución real
  fechaInicio?: Date
  fechaFin?: Date

  // Estado actual
  estado: EstadoViaje
  puntoActualId?: string
  ubicacionActual?: Coordenadas
  ultimaActualizacion?: Date

  // Progreso
  puntosCompletados: string[]
  kmRecorridos: number
  porcentajeCompletado: number

  // Incidentes
  incidentes?: {
    id: string
    tipo: string
    descripcion: string
    ubicacion: Coordenadas
    fecha: Date
    resuelto: boolean
  }[]

  // Costos reales
  costoCasetas: number
  costoCombustible: number
  costosExtra: number
  costoTotal: number

  // Documentos
  cartaPorte?: string
  evidenciasEntrega?: string[]

  notas?: string
  creadoPor: string
  fechaCreacion: Date
}

// ============================================
// CONSTANTES Y HELPERS
// ============================================

export const NIVELES_RIESGO: Record<NivelRiesgo, { label: string; color: string; bgColor: string }> = {
  bajo: { label: 'Bajo', color: 'text-green-700', bgColor: 'bg-green-100' },
  medio: { label: 'Medio', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  alto: { label: 'Alto', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  critico: { label: 'Crítico', color: 'text-red-700', bgColor: 'bg-red-100' },
}

export const TIPOS_ZONA: Record<TipoZona, string> = {
  industrial: 'Zona Industrial',
  comercial: 'Zona Comercial',
  residencial: 'Zona Residencial',
  centro_historico: 'Centro Histórico',
  zona_portuaria: 'Zona Portuaria',
  zona_fronteriza: 'Zona Fronteriza',
  carretera: 'Carretera',
  autopista: 'Autopista',
}

export const TIPOS_PUNTO: Record<TipoPunto, { label: string; icon: string }> = {
  origen: { label: 'Origen', icon: '🟢' },
  destino: { label: 'Destino', icon: '🔴' },
  parada_intermedia: { label: 'Parada Intermedia', icon: '🟡' },
  punto_combustible: { label: 'Combustible', icon: '⛽' },
  punto_descanso: { label: 'Descanso', icon: '🅿️' },
  caseta: { label: 'Caseta', icon: '🛣️' },
  aduana: { label: 'Aduana', icon: '🛃' },
}

export const ESTADOS_VIAJE: Record<EstadoViaje, { label: string; color: string; bgColor: string }> = {
  programado: { label: 'Programado', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  en_transito: { label: 'En Tránsito', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  en_punto: { label: 'En Punto', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  completado: { label: 'Completado', color: 'text-green-700', bgColor: 'bg-green-100' },
  cancelado: { label: 'Cancelado', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  incidente: { label: 'Incidente', color: 'text-red-700', bgColor: 'bg-red-100' },
}

export const DIAS_SEMANA = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
]

// Restricciones de "Hoy No Circula" para CDMX y área metropolitana
export const HOY_NO_CIRCULA = {
  lunes: ['5', '6'],      // Engomado amarillo
  martes: ['7', '8'],     // Engomado rosa
  miercoles: ['3', '4'],  // Engomado rojo
  jueves: ['1', '2'],     // Engomado verde
  viernes: ['9', '0'],    // Engomado azul
  sabado: [],             // Según contingencia
  domingo: [],            // Libre
}
