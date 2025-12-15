/**
 * Tipos para el módulo de Combustible
 * Registro de cargas, cálculo de rendimiento y KPIs
 */

// ============================================
// CARGAS DE COMBUSTIBLE
// ============================================

export type TipoCombustible = 'diesel' | 'magna' | 'premium'

export interface CargaCombustible {
  id: string

  // Vehículo
  vehiculoId: string
  vehiculoPlaca: string
  vehiculoModelo?: string

  // Conductor
  conductorId?: string
  conductorNombre?: string

  // Datos de la carga
  fecha: Date
  tipoCombustible: TipoCombustible
  litros: number
  precioPorLitro: number
  costoTotal: number

  // Odómetro (clave para calcular rendimiento)
  odometro: number           // Lectura actual del odómetro en km
  odometroAnterior?: number  // Lectura de la carga anterior (calculado)
  kmRecorridos?: number      // Diferencia (calculado)

  // Rendimiento calculado
  rendimientoKmL?: number    // km/L de esta carga

  // Ubicación
  estacion?: string          // Nombre de la gasolinera
  ubicacion?: string         // Dirección o ciudad

  // Viaje asociado (opcional)
  viajeId?: string
  rutaCodigo?: string

  // Comprobante
  numeroFactura?: string
  fotoTicket?: string        // URL de la foto

  // Metadata
  notas?: string
  tanqueLleno: boolean       // Si se llenó el tanque (importante para cálculo)
  creadoPor: string
  fechaCreacion: Date
}

export interface CargaCombustibleInput {
  vehiculoId: string
  vehiculoPlaca: string
  vehiculoModelo?: string
  conductorId?: string
  conductorNombre?: string
  fecha: Date
  tipoCombustible: TipoCombustible
  litros: number
  precioPorLitro: number
  odometro: number
  estacion?: string
  ubicacion?: string
  viajeId?: string
  rutaCodigo?: string
  numeroFactura?: string
  fotoTicket?: string
  notas?: string
  tanqueLleno: boolean
}

// ============================================
// RENDIMIENTO
// ============================================

export interface RendimientoVehiculo {
  vehiculoId: string
  vehiculoPlaca: string
  vehiculoModelo?: string
  tipoVehiculo?: string

  // Promedios
  rendimientoPromedio: number     // km/L promedio histórico
  rendimientoUltimaCarga: number  // km/L de la última carga
  rendimientoMejor: number        // Mejor rendimiento registrado
  rendimientoPeor: number         // Peor rendimiento registrado

  // Totales
  totalKmRecorridos: number
  totalLitrosCargados: number
  totalGastado: number

  // Estadísticas
  numeroCargas: number
  promedioLitrosPorCarga: number
  promedioCostoPorCarga: number
  costoPorKm: number              // $/km

  // Tendencia
  tendencia: 'mejorando' | 'estable' | 'empeorando'
  variacionPorcentaje: number     // vs promedio histórico

  // Fechas
  primeraCargar: Date
  ultimaCarga: Date
}

export interface RendimientoPeriodo {
  periodo: string              // "2024-01", "2024-Q1", etc.
  rendimientoPromedio: number
  totalKm: number
  totalLitros: number
  totalCosto: number
  numeroCargas: number
}

// ============================================
// KPIs Y ALERTAS
// ============================================

export interface KPICombustible {
  // Flota completa
  rendimientoPromedioFlota: number
  costoPromedioLitro: number
  gastoTotalMes: number
  gastoTotalAnio: number
  litrosTotalMes: number
  kmTotalMes: number

  // Por tipo de vehículo
  rendimientoPorTipo: {
    tipo: string
    rendimiento: number
    vehiculos: number
  }[]

  // Top/Bottom performers
  mejoresVehiculos: {
    placa: string
    rendimiento: number
  }[]
  peoresVehiculos: {
    placa: string
    rendimiento: number
  }[]

  // Comparativo conductores
  rendimientoPorConductor: {
    conductorId: string
    nombre: string
    rendimiento: number
    kmRecorridos: number
  }[]
}

export type TipoAlertaCombustible =
  | 'bajo_rendimiento'      // Rendimiento menor al esperado
  | 'consumo_excesivo'      // Carga muy grande vs promedio
  | 'precio_alto'           // Precio por litro alto
  | 'odometro_irregular'    // Lectura de odómetro sospechosa
  | 'sin_cargas_recientes'  // Vehículo sin cargas en X días

export interface AlertaCombustible {
  id: string
  tipo: TipoAlertaCombustible
  vehiculoId: string
  vehiculoPlaca: string
  mensaje: string
  valor: number           // Valor que disparó la alerta
  valorEsperado: number   // Valor esperado/promedio
  desviacion: number      // % de desviación
  fecha: Date
  cargaId?: string
  revisada: boolean
  notas?: string
}

// ============================================
// FILTROS
// ============================================

export interface FiltrosCombustible {
  vehiculoId?: string
  conductorId?: string
  fechaDesde?: Date
  fechaHasta?: Date
  tipoCombustible?: TipoCombustible
  estacion?: string
  soloTanqueLleno?: boolean
}

// ============================================
// CONSTANTES
// ============================================

export const TIPOS_COMBUSTIBLE: Record<TipoCombustible, { label: string; color: string }> = {
  diesel: { label: 'Diesel', color: 'bg-yellow-500' },
  magna: { label: 'Magna', color: 'bg-green-500' },
  premium: { label: 'Premium', color: 'bg-red-500' },
}

// Rendimientos esperados por tipo de vehículo (km/L)
export const RENDIMIENTO_ESPERADO: Record<string, { min: number; max: number; promedio: number }> = {
  camioneta: { min: 8, max: 12, promedio: 10 },
  torton: { min: 3.5, max: 5, promedio: 4.2 },
  rabon: { min: 4, max: 6, promedio: 5 },
  trailer: { min: 2.5, max: 3.5, promedio: 3 },
  tractocamion: { min: 2, max: 3, promedio: 2.5 },
  camion_3ejes: { min: 3, max: 4.5, promedio: 3.8 },
  camion_volteo: { min: 3, max: 5, promedio: 4 },
}

// Umbrales para alertas
export const UMBRALES_ALERTA = {
  desviacionRendimiento: 20,    // % de desviación del promedio
  desviacionConsumo: 30,        // % de consumo mayor al promedio
  desviacionPrecio: 10,         // % sobre precio promedio
  diasSinCarga: 15,             // Días sin registrar carga
  odometroMinimo: 50,           // Km mínimos entre cargas
}

// Precio de referencia del diesel (actualizar según mercado)
export const PRECIO_DIESEL_REFERENCIA = 24.50  // MXN por litro
