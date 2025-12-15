/**
 * Servicio de Combustible
 * Cálculo de rendimiento, KPIs y alertas
 */

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  limit,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  CargaCombustible,
  CargaCombustibleInput,
  RendimientoVehiculo,
  RendimientoPeriodo,
  KPICombustible,
  AlertaCombustible,
  FiltrosCombustible,
  TipoAlertaCombustible,
} from '../types/fuel.types'
import {
  RENDIMIENTO_ESPERADO,
  UMBRALES_ALERTA,
  PRECIO_DIESEL_REFERENCIA,
} from '../types/fuel.types'

// ============================================
// CARGAS DE COMBUSTIBLE
// ============================================

/**
 * Registra una nueva carga de combustible
 * Calcula automáticamente el rendimiento si hay carga anterior
 */
export async function registrarCarga(
  input: CargaCombustibleInput,
  userId: string
): Promise<{ carga: CargaCombustible; alerta?: AlertaCombustible }> {
  // Calcular costo total
  const costoTotal = input.litros * input.precioPorLitro

  // Obtener última carga del vehículo para calcular rendimiento
  const ultimaCarga = await obtenerUltimaCarga(input.vehiculoId)

  let odometroAnterior: number | undefined
  let kmRecorridos: number | undefined
  let rendimientoKmL: number | undefined

  if (ultimaCarga && input.tanqueLleno) {
    odometroAnterior = ultimaCarga.odometro
    kmRecorridos = input.odometro - odometroAnterior

    // Solo calcular rendimiento si:
    // 1. Los km recorridos son razonables (> 50 km)
    // 2. La carga anterior también fue tanque lleno
    if (kmRecorridos > UMBRALES_ALERTA.odometroMinimo && ultimaCarga.tanqueLleno) {
      rendimientoKmL = Math.round((kmRecorridos / input.litros) * 100) / 100
    }
  }

  // Crear documento de carga
  const nuevaCarga: Omit<CargaCombustible, 'id'> = {
    ...input,
    costoTotal,
    odometroAnterior,
    kmRecorridos,
    rendimientoKmL,
    creadoPor: userId,
    fechaCreacion: new Date(),
  }

  const docRef = await addDoc(collection(db, 'cargasCombustible'), {
    ...nuevaCarga,
    fecha: Timestamp.fromDate(input.fecha),
    fechaCreacion: Timestamp.now(),
  })

  const cargaGuardada: CargaCombustible = {
    id: docRef.id,
    ...nuevaCarga,
  }

  // Verificar si hay alertas
  let alerta: AlertaCombustible | undefined

  if (rendimientoKmL) {
    alerta = await verificarAlertasRendimiento(cargaGuardada)
  }

  // Actualizar rendimiento promedio del vehículo
  await actualizarRendimientoVehiculo(input.vehiculoId)

  return { carga: cargaGuardada, alerta }
}

/**
 * Obtiene la última carga de un vehículo
 */
export async function obtenerUltimaCarga(
  vehiculoId: string
): Promise<CargaCombustible | null> {
  const q = query(
    collection(db, 'cargasCombustible'),
    where('vehiculoId', '==', vehiculoId),
    orderBy('odometro', 'desc'),
    limit(1)
  )

  const snapshot = await getDocs(q)

  if (snapshot.empty) return null

  const doc = snapshot.docs[0]
  return {
    id: doc.id,
    ...doc.data(),
    fecha: doc.data().fecha?.toDate() || new Date(),
    fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date(),
  } as CargaCombustible
}

/**
 * Obtiene el historial de cargas con filtros
 */
export async function obtenerHistorialCargas(
  filtros: FiltrosCombustible = {}
): Promise<CargaCombustible[]> {
  let q = query(
    collection(db, 'cargasCombustible'),
    orderBy('fecha', 'desc')
  )

  // Aplicar filtros
  if (filtros.vehiculoId) {
    q = query(q, where('vehiculoId', '==', filtros.vehiculoId))
  }

  if (filtros.conductorId) {
    q = query(q, where('conductorId', '==', filtros.conductorId))
  }

  if (filtros.tipoCombustible) {
    q = query(q, where('tipoCombustible', '==', filtros.tipoCombustible))
  }

  const snapshot = await getDocs(q)

  let cargas = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    fecha: doc.data().fecha?.toDate() || new Date(),
    fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date(),
  })) as CargaCombustible[]

  // Filtros de fecha (post-query porque Firestore no permite múltiples orderBy con where)
  if (filtros.fechaDesde) {
    cargas = cargas.filter((c) => c.fecha >= filtros.fechaDesde!)
  }
  if (filtros.fechaHasta) {
    cargas = cargas.filter((c) => c.fecha <= filtros.fechaHasta!)
  }
  if (filtros.soloTanqueLleno) {
    cargas = cargas.filter((c) => c.tanqueLleno)
  }

  return cargas
}

// ============================================
// RENDIMIENTO
// ============================================

/**
 * Calcula y actualiza el rendimiento promedio de un vehículo
 */
export async function actualizarRendimientoVehiculo(
  vehiculoId: string
): Promise<RendimientoVehiculo | null> {
  // Obtener todas las cargas del vehículo con rendimiento calculado
  const cargas = await obtenerHistorialCargas({
    vehiculoId,
    soloTanqueLleno: true,
  })

  const cargasConRendimiento = cargas.filter((c) => c.rendimientoKmL && c.rendimientoKmL > 0)

  if (cargasConRendimiento.length === 0) return null

  // Calcular estadísticas
  const rendimientos = cargasConRendimiento.map((c) => c.rendimientoKmL!)
  const totalKm = cargasConRendimiento.reduce((sum, c) => sum + (c.kmRecorridos || 0), 0)
  const totalLitros = cargas.reduce((sum, c) => sum + c.litros, 0)
  const totalGastado = cargas.reduce((sum, c) => sum + c.costoTotal, 0)

  const rendimientoPromedio = rendimientos.reduce((a, b) => a + b, 0) / rendimientos.length
  const rendimientoMejor = Math.max(...rendimientos)
  const rendimientoPeor = Math.min(...rendimientos)

  // Calcular tendencia (últimas 5 cargas vs promedio histórico)
  const ultimasCargas = cargasConRendimiento.slice(0, 5)
  const rendimientoReciente =
    ultimasCargas.reduce((sum, c) => sum + c.rendimientoKmL!, 0) / ultimasCargas.length
  const variacion = ((rendimientoReciente - rendimientoPromedio) / rendimientoPromedio) * 100

  let tendencia: 'mejorando' | 'estable' | 'empeorando' = 'estable'
  if (variacion > 5) tendencia = 'mejorando'
  else if (variacion < -5) tendencia = 'empeorando'

  const rendimiento: RendimientoVehiculo = {
    vehiculoId,
    vehiculoPlaca: cargas[0].vehiculoPlaca,
    vehiculoModelo: cargas[0].vehiculoModelo,
    rendimientoPromedio: Math.round(rendimientoPromedio * 100) / 100,
    rendimientoUltimaCarga: cargasConRendimiento[0]?.rendimientoKmL || 0,
    rendimientoMejor: Math.round(rendimientoMejor * 100) / 100,
    rendimientoPeor: Math.round(rendimientoPeor * 100) / 100,
    totalKmRecorridos: totalKm,
    totalLitrosCargados: totalLitros,
    totalGastado,
    numeroCargas: cargas.length,
    promedioLitrosPorCarga: Math.round((totalLitros / cargas.length) * 100) / 100,
    promedioCostoPorCarga: Math.round((totalGastado / cargas.length) * 100) / 100,
    costoPorKm: totalKm > 0 ? Math.round((totalGastado / totalKm) * 100) / 100 : 0,
    tendencia,
    variacionPorcentaje: Math.round(variacion * 100) / 100,
    primeraCargar: cargas[cargas.length - 1].fecha,
    ultimaCarga: cargas[0].fecha,
  }

  // Guardar/actualizar en Firestore
  const rendimientoRef = doc(db, 'rendimientoVehiculos', vehiculoId)
  await updateDoc(rendimientoRef, rendimiento).catch(async () => {
    // Si no existe, crear
    await addDoc(collection(db, 'rendimientoVehiculos'), {
      ...rendimiento,
      id: vehiculoId,
    })
  })

  return rendimiento
}

/**
 * Obtiene el rendimiento de un vehículo
 */
export async function obtenerRendimientoVehiculo(
  vehiculoId: string
): Promise<RendimientoVehiculo | null> {
  // Calcular en tiempo real
  return actualizarRendimientoVehiculo(vehiculoId)
}

/**
 * Obtiene el rendimiento promedio de un vehículo para usar en estimaciones
 * Si no hay datos, retorna el estimado por tipo
 */
export async function obtenerRendimientoParaEstimacion(
  vehiculoId: string,
  tipoVehiculo?: string
): Promise<number> {
  const rendimiento = await obtenerRendimientoVehiculo(vehiculoId)

  if (rendimiento && rendimiento.numeroCargas >= 3) {
    // Usar promedio real si hay suficientes datos
    return rendimiento.rendimientoPromedio
  }

  // Usar estimado por tipo
  const tipo = tipoVehiculo?.toLowerCase() || 'torton'
  return RENDIMIENTO_ESPERADO[tipo]?.promedio || 4.0
}

/**
 * Calcula rendimiento por período (mensual, trimestral)
 */
export async function calcularRendimientoPorPeriodo(
  vehiculoId: string,
  tipo: 'mensual' | 'trimestral' = 'mensual'
): Promise<RendimientoPeriodo[]> {
  const cargas = await obtenerHistorialCargas({
    vehiculoId,
    soloTanqueLleno: true,
  })

  const periodos: Map<string, CargaCombustible[]> = new Map()

  cargas.forEach((carga) => {
    const fecha = carga.fecha
    let periodo: string

    if (tipo === 'mensual') {
      periodo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
    } else {
      const trimestre = Math.ceil((fecha.getMonth() + 1) / 3)
      periodo = `${fecha.getFullYear()}-Q${trimestre}`
    }

    if (!periodos.has(periodo)) {
      periodos.set(periodo, [])
    }
    periodos.get(periodo)!.push(carga)
  })

  const resultado: RendimientoPeriodo[] = []

  periodos.forEach((cargasPeriodo, periodo) => {
    const cargasConRendimiento = cargasPeriodo.filter((c) => c.rendimientoKmL)
    const rendimientoPromedio =
      cargasConRendimiento.length > 0
        ? cargasConRendimiento.reduce((sum, c) => sum + c.rendimientoKmL!, 0) /
          cargasConRendimiento.length
        : 0

    resultado.push({
      periodo,
      rendimientoPromedio: Math.round(rendimientoPromedio * 100) / 100,
      totalKm: cargasPeriodo.reduce((sum, c) => sum + (c.kmRecorridos || 0), 0),
      totalLitros: cargasPeriodo.reduce((sum, c) => sum + c.litros, 0),
      totalCosto: cargasPeriodo.reduce((sum, c) => sum + c.costoTotal, 0),
      numeroCargas: cargasPeriodo.length,
    })
  })

  return resultado.sort((a, b) => b.periodo.localeCompare(a.periodo))
}

// ============================================
// KPIs
// ============================================

/**
 * Calcula KPIs generales de combustible de la flota
 */
export async function calcularKPIs(
  fechaDesde?: Date,
  fechaHasta?: Date
): Promise<KPICombustible> {
  const cargas = await obtenerHistorialCargas({ fechaDesde, fechaHasta })

  // Agrupar por vehículo
  const porVehiculo: Map<string, CargaCombustible[]> = new Map()
  cargas.forEach((c) => {
    if (!porVehiculo.has(c.vehiculoId)) {
      porVehiculo.set(c.vehiculoId, [])
    }
    porVehiculo.get(c.vehiculoId)!.push(c)
  })

  // Calcular rendimiento por vehículo
  const rendimientosPorVehiculo: { placa: string; rendimiento: number }[] = []

  porVehiculo.forEach((cargasVehiculo, _vehiculoId) => {
    const cargasConRendimiento = cargasVehiculo.filter((c) => c.rendimientoKmL)
    if (cargasConRendimiento.length > 0) {
      const promedio =
        cargasConRendimiento.reduce((sum, c) => sum + c.rendimientoKmL!, 0) /
        cargasConRendimiento.length
      rendimientosPorVehiculo.push({
        placa: cargasVehiculo[0].vehiculoPlaca,
        rendimiento: Math.round(promedio * 100) / 100,
      })
    }
  })

  // Ordenar para top/bottom
  const ordenados = [...rendimientosPorVehiculo].sort((a, b) => b.rendimiento - a.rendimiento)

  // Totales
  const totalLitros = cargas.reduce((sum, c) => sum + c.litros, 0)
  const totalCosto = cargas.reduce((sum, c) => sum + c.costoTotal, 0)
  const totalKm = cargas.reduce((sum, c) => sum + (c.kmRecorridos || 0), 0)
  const cargasConRendimiento = cargas.filter((c) => c.rendimientoKmL)
  const rendimientoPromedio =
    cargasConRendimiento.length > 0
      ? cargasConRendimiento.reduce((sum, c) => sum + c.rendimientoKmL!, 0) /
        cargasConRendimiento.length
      : 0

  // Por conductor
  const porConductor: Map<string, { nombre: string; km: number; litros: number }> = new Map()
  cargas.forEach((c) => {
    if (c.conductorId && c.conductorNombre) {
      if (!porConductor.has(c.conductorId)) {
        porConductor.set(c.conductorId, { nombre: c.conductorNombre, km: 0, litros: 0 })
      }
      const data = porConductor.get(c.conductorId)!
      data.km += c.kmRecorridos || 0
      data.litros += c.litros
    }
  })

  const rendimientoPorConductor = Array.from(porConductor.entries())
    .map(([conductorId, data]) => ({
      conductorId,
      nombre: data.nombre,
      rendimiento: data.litros > 0 ? Math.round((data.km / data.litros) * 100) / 100 : 0,
      kmRecorridos: data.km,
    }))
    .sort((a, b) => b.rendimiento - a.rendimiento)

  return {
    rendimientoPromedioFlota: Math.round(rendimientoPromedio * 100) / 100,
    costoPromedioLitro:
      totalLitros > 0 ? Math.round((totalCosto / totalLitros) * 100) / 100 : PRECIO_DIESEL_REFERENCIA,
    gastoTotalMes: totalCosto,
    gastoTotalAnio: totalCosto, // TODO: Ajustar según período
    litrosTotalMes: totalLitros,
    kmTotalMes: totalKm,
    rendimientoPorTipo: [], // TODO: Implementar por tipo de vehículo
    mejoresVehiculos: ordenados.slice(0, 5),
    peoresVehiculos: ordenados.slice(-5).reverse(),
    rendimientoPorConductor,
  }
}

// ============================================
// ALERTAS
// ============================================

/**
 * Verifica si una carga genera alertas de rendimiento
 */
async function verificarAlertasRendimiento(
  carga: CargaCombustible
): Promise<AlertaCombustible | undefined> {
  if (!carga.rendimientoKmL) return undefined

  // Obtener rendimiento promedio del vehículo
  const rendimientoVehiculo = await obtenerRendimientoVehiculo(carga.vehiculoId)
  const rendimientoEsperado =
    rendimientoVehiculo?.rendimientoPromedio ||
    RENDIMIENTO_ESPERADO['torton']?.promedio ||
    4.0

  // Calcular desviación
  const desviacion =
    ((carga.rendimientoKmL - rendimientoEsperado) / rendimientoEsperado) * 100

  // Verificar si está por debajo del umbral
  if (desviacion < -UMBRALES_ALERTA.desviacionRendimiento) {
    const alerta: AlertaCombustible = {
      id: '', // Se asignará al guardar
      tipo: 'bajo_rendimiento',
      vehiculoId: carga.vehiculoId,
      vehiculoPlaca: carga.vehiculoPlaca,
      mensaje: `Rendimiento bajo: ${carga.rendimientoKmL} km/L (esperado: ${rendimientoEsperado.toFixed(1)} km/L)`,
      valor: carga.rendimientoKmL,
      valorEsperado: rendimientoEsperado,
      desviacion: Math.round(desviacion * 100) / 100,
      fecha: new Date(),
      cargaId: carga.id,
      revisada: false,
    }

    // Guardar alerta
    const docRef = await addDoc(collection(db, 'alertasCombustible'), {
      ...alerta,
      fecha: Timestamp.now(),
    })

    return { ...alerta, id: docRef.id }
  }

  return undefined
}

/**
 * Obtiene alertas pendientes de revisión
 */
export async function obtenerAlertasPendientes(): Promise<AlertaCombustible[]> {
  const q = query(
    collection(db, 'alertasCombustible'),
    where('revisada', '==', false),
    orderBy('fecha', 'desc')
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    fecha: doc.data().fecha?.toDate() || new Date(),
  })) as AlertaCombustible[]
}

/**
 * Marca una alerta como revisada
 */
export async function marcarAlertaRevisada(
  alertaId: string,
  notas?: string
): Promise<void> {
  await updateDoc(doc(db, 'alertasCombustible', alertaId), {
    revisada: true,
    notas,
  })
}

// ============================================
// ESTIMACIONES PARA RUTAS
// ============================================

/**
 * Estima el costo de combustible para una ruta
 * Usa el rendimiento real del vehículo si está disponible
 */
export async function estimarCostoCombustibleRuta(
  distanciaKm: number,
  vehiculoId?: string,
  tipoVehiculo?: string,
  precioCombustible: number = PRECIO_DIESEL_REFERENCIA
): Promise<{
  litrosEstimados: number
  costoEstimado: number
  rendimientoUsado: number
  esRendimientoReal: boolean
}> {
  let rendimiento: number
  let esRendimientoReal = false

  if (vehiculoId) {
    const rendimientoVehiculo = await obtenerRendimientoVehiculo(vehiculoId)
    if (rendimientoVehiculo && rendimientoVehiculo.numeroCargas >= 3) {
      rendimiento = rendimientoVehiculo.rendimientoPromedio
      esRendimientoReal = true
    } else {
      rendimiento = await obtenerRendimientoParaEstimacion(vehiculoId, tipoVehiculo)
    }
  } else {
    const tipo = tipoVehiculo?.toLowerCase() || 'torton'
    rendimiento = RENDIMIENTO_ESPERADO[tipo]?.promedio || 4.0
  }

  const litrosEstimados = Math.round((distanciaKm / rendimiento) * 100) / 100
  const costoEstimado = Math.round(litrosEstimados * precioCombustible * 100) / 100

  return {
    litrosEstimados,
    costoEstimado,
    rendimientoUsado: rendimiento,
    esRendimientoReal,
  }
}
