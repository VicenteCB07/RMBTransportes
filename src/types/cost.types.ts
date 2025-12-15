/**
 * Tipos para el sistema de costos y gastos
 */

import type { Currency } from '../services/currency.service'

// Categorías de gastos para transporte de carga
export type CategoriaGasto =
  | 'combustible'        // Diésel, gasolina
  | 'peajes'             // Casetas de cobro
  | 'viaticos'           // Comidas, hospedaje de operadores
  | 'mantenimiento'      // Reparaciones, servicio
  | 'refacciones'        // Partes y piezas
  | 'llantas'            // Neumáticos
  | 'seguros'            // Pólizas de seguro
  | 'permisos'           // SCT, verificaciones
  | 'multas'             // Infracciones
  | 'nomina'             // Sueldos operadores
  | 'comisiones'         // Comisiones por viaje
  | 'arrendamiento'      // Renta de unidades
  | 'financiamiento'     // Pagos de crédito
  | 'administrativo'     // Gastos de oficina
  | 'legal'              // Honorarios, trámites
  | 'otro'               // Otros gastos

export const CATEGORIAS_GASTO: Record<CategoriaGasto, { label: string; color: string }> = {
  combustible: { label: 'Combustible', color: 'bg-amber-100 text-amber-700' },
  peajes: { label: 'Peajes', color: 'bg-blue-100 text-blue-700' },
  viaticos: { label: 'Viáticos', color: 'bg-green-100 text-green-700' },
  mantenimiento: { label: 'Mantenimiento', color: 'bg-orange-100 text-orange-700' },
  refacciones: { label: 'Refacciones', color: 'bg-purple-100 text-purple-700' },
  llantas: { label: 'Llantas', color: 'bg-gray-100 text-gray-700' },
  seguros: { label: 'Seguros', color: 'bg-indigo-100 text-indigo-700' },
  permisos: { label: 'Permisos/Verificaciones', color: 'bg-cyan-100 text-cyan-700' },
  multas: { label: 'Multas', color: 'bg-red-100 text-red-700' },
  nomina: { label: 'Nómina', color: 'bg-emerald-100 text-emerald-700' },
  comisiones: { label: 'Comisiones', color: 'bg-teal-100 text-teal-700' },
  arrendamiento: { label: 'Arrendamiento', color: 'bg-violet-100 text-violet-700' },
  financiamiento: { label: 'Financiamiento', color: 'bg-rose-100 text-rose-700' },
  administrativo: { label: 'Administrativo', color: 'bg-slate-100 text-slate-700' },
  legal: { label: 'Legal', color: 'bg-fuchsia-100 text-fuchsia-700' },
  otro: { label: 'Otro', color: 'bg-zinc-100 text-zinc-700' },
}

// Estados de un gasto
export type EstadoGasto = 'pendiente' | 'pagado' | 'cancelado'

export const ESTADOS_GASTO: Record<EstadoGasto, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  pagado: { label: 'Pagado', color: 'bg-green-100 text-green-700' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
}

// Métodos de pago
export type MetodoPago =
  | 'efectivo'
  | 'transferencia'
  | 'tarjeta_debito'
  | 'tarjeta_credito'
  | 'cheque'
  | 'credito_proveedor'

export const METODOS_PAGO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia Bancaria',
  tarjeta_debito: 'Tarjeta de Débito',
  tarjeta_credito: 'Tarjeta de Crédito',
  cheque: 'Cheque',
  credito_proveedor: 'Crédito Proveedor',
}

// Interface principal de Gasto/Costo
export interface Costo {
  id: string
  fecha: Date
  categoria: CategoriaGasto
  descripcion: string

  // Montos
  monto: number
  moneda: Currency
  montoMXN: number // Siempre guardamos el equivalente en MXN
  tipoCambio?: number // Solo si es USD

  // Estado y pago
  estado: EstadoGasto
  metodoPago?: MetodoPago
  fechaPago?: Date

  // Relaciones
  vehiculoId?: string
  viajeId?: string
  ordenMantenimientoId?: string

  // Proveedor
  proveedorNombre?: string
  proveedorRFC?: string

  // Comprobantes
  numeroFactura?: string
  comprobantes: Comprobante[]

  // Auditoría
  registradoPor: string
  aprobadoPor?: string
  fechaRegistro: Date
  fechaActualizacion?: Date
  notas?: string
}

// Comprobante/Factura adjunta
export interface Comprobante {
  id: string
  nombre: string
  url: string
  path: string
  tipo: 'factura' | 'ticket' | 'nota' | 'otro'
  fechaSubida: Date
}

// Para crear un nuevo costo
export interface CostoInput {
  fecha: Date
  categoria: CategoriaGasto
  descripcion: string
  monto: number
  moneda: Currency
  estado: EstadoGasto
  metodoPago?: MetodoPago
  vehiculoId?: string
  viajeId?: string
  proveedorNombre?: string
  proveedorRFC?: string
  numeroFactura?: string
  notas?: string
}

// Resumen de costos por categoría
export interface ResumenCostos {
  categoria: CategoriaGasto
  totalMXN: number
  cantidad: number
  porcentaje: number
}

// Filtros para consultar costos
export interface FiltrosCostos {
  fechaInicio?: Date
  fechaFin?: Date
  categoria?: CategoriaGasto
  estado?: EstadoGasto
  vehiculoId?: string
  viajeId?: string
}
