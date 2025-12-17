// ============================================
// TIPOS DE USUARIO Y ROLES
// ============================================

export type RolUsuario =
  | 'admin'       // Acceso total al sistema
  | 'dispatcher'  // Parte operativa - coordina rutas y viajes
  | 'manager'     // Parte administrativa - finanzas, reportes
  | 'operador'    // Conductores de los vehículos
  | 'maniobrista' // Ayudantes de los conductores
  | 'seguridad'   // Seguristas en base - solo lectura de entradas/salidas

export const ROLES_INFO: Record<RolUsuario, { label: string; descripcion: string; color: string }> = {
  admin: {
    label: 'Administrador',
    descripcion: 'Acceso total al sistema',
    color: 'red',
  },
  dispatcher: {
    label: 'Dispatcher',
    descripcion: 'Coordinación operativa de rutas y viajes',
    color: 'blue',
  },
  manager: {
    label: 'Manager',
    descripcion: 'Administración, finanzas y reportes',
    color: 'purple',
  },
  operador: {
    label: 'Operador',
    descripcion: 'Conductor de vehículos',
    color: 'green',
  },
  maniobrista: {
    label: 'Maniobrista',
    descripcion: 'Ayudante de operadores',
    color: 'yellow',
  },
  seguridad: {
    label: 'Seguridad',
    descripcion: 'Vigilancia de entradas y salidas',
    color: 'gray',
  },
}

export interface Usuario {
  id: string
  email: string
  nombre: string
  apellidos: string
  rol: RolUsuario
  telefono?: string
  activo: boolean
  fechaCreacion: Date
  ultimoAcceso?: Date
  avatar?: string
  // Campos adicionales para operadores/maniobristas
  licencia?: string
  licenciaVencimiento?: Date
  nss?: string // Número de seguro social
}

// ============================================
// TIPOS DE FLOTA Y VEHÍCULOS
// ============================================

// Categoría principal: Vehículo motorizado vs Accesorio/Remolque
export type CategoriaFlota = 'vehiculo' | 'accesorio'

// Tipos de vehículos motorizados
export type TipoVehiculo =
  | 'tractocamion'
  | 'torton'
  | 'rabon'
  | 'plataforma_rolloff'

// Tipos de accesorios (enganchables a tractocamiones)
export type TipoAccesorio =
  | 'lowboy'
  | 'cama_baja'
  | 'plataforma'
  | 'gondola'
  | 'tolva'
  | 'caja_seca'
  | 'dolly'
  | 'contenedor'

// Estados del vehículo/accesorio - Determinados por Mantenimiento
export type EstadoVehiculo =
  | 'disponible'      // Listo para operar
  | 'servicio_menor'  // Requiere servicio menor pero puede operar
  | 'fuera_servicio'  // No puede operar hasta reparación

// Interfaz unificada para vehículos y accesorios
export interface Vehiculo {
  id: string
  numeroInterno: string
  placa: string
  vin: string
  categoria: CategoriaFlota // 'vehiculo' o 'accesorio'
  tipo: TipoVehiculo | TipoAccesorio
  marca: string
  modelo: string
  anio: number
  estado: EstadoVehiculo
  capacidadCarga: number // toneladas
  kilometraje: number
  ubicacionActual?: {
    lat: number
    lng: number
  }
  conductorAsignado?: string
  // Para accesorios: tracto al que está asignado
  asignadoA?: string // ID del tractocamión
  // Dimensiones (principalmente para accesorios)
  dimensiones?: {
    largo: number // metros
    ancho: number // metros
    alto: number // metros
  }
  fechaRegistro: Date
  ultimoMantenimiento?: Date
  proximoMantenimiento?: Date
  documentos: DocumentoVehiculo[]
}

// Interfaz legacy para accesorios (compatibilidad)
export interface Accesorio {
  id: string
  numeroInterno: string
  tipo: TipoAccesorio
  marca: string
  modelo: string
  anio: number
  capacidadCarga: number // toneladas
  estado: EstadoVehiculo
  asignadoA?: string // ID del tractocamión
  dimensiones?: {
    largo: number // metros
    ancho: number // metros
    alto: number // metros
  }
  activo: boolean
  notas?: string
  fechaRegistro: Date
}

export interface DocumentoVehiculo {
  id: string
  tipo: 'seguro' | 'permiso_sct' | 'verificacion' | 'placa' | 'otro'
  nombre: string
  urlArchivo: string
  fechaEmision: Date
  fechaVencimiento: Date
  activo: boolean
}

// ============================================
// TIPOS DE MANTENIMIENTO
// ============================================

export type TipoMantenimiento = 'preventivo' | 'correctivo'

export type EstadoMantenimiento =
  | 'programado'
  | 'en_proceso'
  | 'completado'
  | 'cancelado'

export interface OrdenMantenimiento {
  id: string
  vehiculoId: string
  tipo: TipoMantenimiento
  estado: EstadoMantenimiento
  descripcion: string
  fechaProgramada: Date
  fechaInicio?: Date
  fechaFin?: Date
  tecnicoAsignado?: string
  kilometrajeActual: number
  costoManoObra: number
  costoRefacciones: number
  costoTotal: number
  observaciones?: string
  refaccionesUtilizadas: RefaccionUsada[]
}

export interface Refaccion {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  categoria: string
  precioUnitario: number
  stockActual: number
  stockMinimo: number
  stockMaximo: number
  ubicacionAlmacen: string
  proveedor?: string
}

export interface RefaccionUsada {
  refaccionId: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

// ============================================
// TIPOS DE RUTAS Y VIAJES
// ============================================

export type EstadoViaje =
  | 'pendiente'
  | 'asignado'
  | 'en_transito'
  | 'completado'
  | 'cancelado'

export interface Viaje {
  id: string
  clienteId: string
  vehiculoId: string
  conductorId: string
  origen: Direccion
  destino: Direccion
  fechaProgramada: Date
  fechaSalida?: Date
  fechaLlegada?: Date
  estado: EstadoViaje
  cargaDescripcion: string
  pesoToneladas: number
  distanciaKm: number
  tarifaBase: number
  costosPeajes: number
  costosViaticos: number
  costosCombustible: number
  costoTotal: number
  cartaPorte?: string
  evidencias: Evidencia[]
  notas?: string
}

export interface Direccion {
  calle: string
  numero: string
  colonia: string
  ciudad: string
  estado: string
  codigoPostal: string
  lat?: number
  lng?: number
}

export interface Evidencia {
  id: string
  tipo: 'foto_carga' | 'foto_entrega' | 'firma' | 'documento'
  urlArchivo: string
  fechaCaptura: Date
  descripcion?: string
}

// ============================================
// TIPOS DE CLIENTES
// ============================================

export interface Cliente {
  id: string
  razonSocial: string
  rfc: string
  regimenFiscal: string
  direccionFiscal: Direccion
  contactoPrincipal: string
  telefonoPrincipal: string
  email: string
  activo: boolean
  esClientePrincipal: boolean // Para RMB Maquinaria
  descuentoPorcentaje: number
  terminosPago: number // días
  fechaRegistro: Date
}

// ============================================
// TIPOS FINANCIEROS
// ============================================

export type TipoGasto =
  | 'combustible'
  | 'peajes'
  | 'viaticos'
  | 'mantenimiento'
  | 'seguros'
  | 'permisos'
  | 'nomina'
  | 'otro'

export interface Gasto {
  id: string
  tipo: TipoGasto
  descripcion: string
  monto: number
  fecha: Date
  vehiculoId?: string
  viajeId?: string
  comprobante?: string
  aprobadoPor?: string
  registradoPor: string
}

export interface Factura {
  id: string
  clienteId: string
  viajeId?: string
  folio: string
  uuid?: string
  subtotal: number
  iva: number
  total: number
  fechaEmision: Date
  fechaVencimiento: Date
  estado: 'pendiente' | 'pagada' | 'vencida' | 'cancelada'
  metodoPago: string
  urlPdf?: string
  urlXml?: string
}

// ============================================
// TIPOS DE NOTIFICACIONES
// ============================================

export type TipoNotificacion =
  | 'alerta_mantenimiento'
  | 'documento_vencido'
  | 'viaje_asignado'
  | 'viaje_completado'
  | 'pago_recibido'
  | 'sistema'

export interface Notificacion {
  id: string
  usuarioId: string
  tipo: TipoNotificacion
  titulo: string
  mensaje: string
  leida: boolean
  fecha: Date
  enlace?: string
}
