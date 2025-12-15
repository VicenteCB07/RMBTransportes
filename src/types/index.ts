// ============================================
// TIPOS DE USUARIO Y ROLES
// ============================================

export type RolUsuario =
  | 'super_admin'
  | 'gerente_general'
  | 'gerente_operaciones'
  | 'dispatcher'
  | 'conductor'
  | 'jefe_mantenimiento'
  | 'tecnico'
  | 'almacenista'
  | 'gerente_finanzas'
  | 'tesorero'
  | 'contable'
  | 'inspector'

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
}

// ============================================
// TIPOS DE FLOTA Y VEHÍCULOS
// ============================================

export type TipoVehiculo =
  | 'tractocamion'
  | 'lowboy'
  | 'plataforma'
  | 'gondola'
  | 'remolque'

export type EstadoVehiculo =
  | 'disponible'
  | 'en_ruta'
  | 'mantenimiento'
  | 'fuera_servicio'

export interface Vehiculo {
  id: string
  numeroInterno: string
  placa: string
  vin: string
  tipo: TipoVehiculo
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
  fechaRegistro: Date
  ultimoMantenimiento?: Date
  proximoMantenimiento?: Date
  documentos: DocumentoVehiculo[]
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
