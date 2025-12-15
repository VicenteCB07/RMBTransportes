/**
 * Servicio de exportación de datos
 * Soporta Excel (XLSX) y preparación para PDF
 */

import * as XLSX from 'xlsx'
import type { Costo, ResumenCostos } from '../types/cost.types'
import { CATEGORIAS_GASTO, ESTADOS_GASTO, METODOS_PAGO } from '../types/cost.types'
import { formatCurrency } from './currency.service'

/**
 * Exporta costos a Excel
 */
export function exportCostosToExcel(
  costos: Costo[],
  resumen: ResumenCostos[],
  fileName: string = 'reporte_costos'
): void {
  // Preparar datos para la hoja de detalle
  const detalleData = costos.map((costo) => ({
    Fecha: formatDate(costo.fecha),
    Categoría: CATEGORIAS_GASTO[costo.categoria].label,
    Descripción: costo.descripcion,
    'Monto Original': costo.monto,
    Moneda: costo.moneda,
    'Monto MXN': costo.montoMXN,
    'Tipo de Cambio': costo.tipoCambio || '-',
    Estado: ESTADOS_GASTO[costo.estado].label,
    'Método de Pago': costo.metodoPago ? METODOS_PAGO[costo.metodoPago] : '-',
    Proveedor: costo.proveedorNombre || '-',
    RFC: costo.proveedorRFC || '-',
    '# Factura': costo.numeroFactura || '-',
    Vehículo: costo.vehiculoId || '-',
    Viaje: costo.viajeId || '-',
    Notas: costo.notas || '-',
    'Fecha Registro': formatDate(costo.fechaRegistro),
  }))

  // Preparar datos para la hoja de resumen
  const resumenData = resumen.map((item) => ({
    Categoría: CATEGORIAS_GASTO[item.categoria].label,
    'Total MXN': item.totalMXN,
    'Cantidad de Registros': item.cantidad,
    'Porcentaje del Total': `${item.porcentaje.toFixed(1)}%`,
  }))

  // Agregar totales
  const totalGeneral = resumen.reduce((acc, r) => acc + r.totalMXN, 0)
  const totalRegistros = resumen.reduce((acc, r) => acc + r.cantidad, 0)
  resumenData.push({
    Categoría: 'TOTAL GENERAL',
    'Total MXN': totalGeneral,
    'Cantidad de Registros': totalRegistros,
    'Porcentaje del Total': '100%',
  })

  // Crear libro de Excel
  const workbook = XLSX.utils.book_new()

  // Hoja de resumen
  const wsResumen = XLSX.utils.json_to_sheet(resumenData)
  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen')

  // Hoja de detalle
  const wsDetalle = XLSX.utils.json_to_sheet(detalleData)
  XLSX.utils.book_append_sheet(workbook, wsDetalle, 'Detalle')

  // Ajustar anchos de columna
  const maxWidthResumen = resumenData.reduce((w, r) => Math.max(w, r.Categoría.length), 10)
  wsResumen['!cols'] = [
    { wch: maxWidthResumen + 2 },
    { wch: 15 },
    { wch: 20 },
    { wch: 18 },
  ]

  wsDetalle['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 18 }, // Categoría
    { wch: 40 }, // Descripción
    { wch: 12 }, // Monto Original
    { wch: 8 },  // Moneda
    { wch: 12 }, // Monto MXN
    { wch: 12 }, // Tipo de Cambio
    { wch: 12 }, // Estado
    { wch: 20 }, // Método de Pago
    { wch: 25 }, // Proveedor
    { wch: 15 }, // RFC
    { wch: 15 }, // # Factura
    { wch: 12 }, // Vehículo
    { wch: 12 }, // Viaje
    { wch: 30 }, // Notas
    { wch: 15 }, // Fecha Registro
  ]

  // Descargar archivo
  const timestamp = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`)
}

/**
 * Exporta vehículos a Excel
 */
export function exportVehiculosToExcel(
  vehiculos: Array<{
    numeroInterno: string
    placa: string
    tipo: string
    marca: string
    modelo: string
    anio: number
    estado: string
    kilometraje: number
    capacidadCarga: number
  }>,
  fileName: string = 'flota_vehiculos'
): void {
  const data = vehiculos.map((v) => ({
    '# Interno': v.numeroInterno,
    Placa: v.placa,
    Tipo: v.tipo,
    Marca: v.marca,
    Modelo: v.modelo,
    Año: v.anio,
    Estado: v.estado,
    'Kilometraje (km)': v.kilometraje,
    'Capacidad (ton)': v.capacidadCarga,
  }))

  const workbook = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  ws['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 8 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ]

  XLSX.utils.book_append_sheet(workbook, ws, 'Vehículos')

  const timestamp = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`)
}

/**
 * Exporta viajes a Excel
 */
export function exportViajesToExcel(
  viajes: Array<{
    id: string
    origen: string
    destino: string
    fechaProgramada: Date
    estado: string
    vehiculo: string
    conductor: string
    cliente: string
    distanciaKm: number
    costoTotal: number
  }>,
  fileName: string = 'reporte_viajes'
): void {
  const data = viajes.map((v) => ({
    ID: v.id,
    'Fecha Programada': formatDate(v.fechaProgramada),
    Origen: v.origen,
    Destino: v.destino,
    'Distancia (km)': v.distanciaKm,
    Estado: v.estado,
    Vehículo: v.vehiculo,
    Conductor: v.conductor,
    Cliente: v.cliente,
    'Costo Total': formatCurrency(v.costoTotal),
  }))

  const workbook = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  XLSX.utils.book_append_sheet(workbook, ws, 'Viajes')

  const timestamp = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`)
}

/**
 * Helper para formatear fechas
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Calcula resumen de costos por categoría
 */
export function calcularResumenCostos(costos: Costo[]): ResumenCostos[] {
  const totalGeneral = costos.reduce((acc, c) => acc + c.montoMXN, 0)

  const porCategoria = costos.reduce(
    (acc, costo) => {
      if (!acc[costo.categoria]) {
        acc[costo.categoria] = { totalMXN: 0, cantidad: 0 }
      }
      acc[costo.categoria].totalMXN += costo.montoMXN
      acc[costo.categoria].cantidad += 1
      return acc
    },
    {} as Record<string, { totalMXN: number; cantidad: number }>
  )

  return Object.entries(porCategoria)
    .map(([categoria, datos]) => ({
      categoria: categoria as Costo['categoria'],
      totalMXN: datos.totalMXN,
      cantidad: datos.cantidad,
      porcentaje: totalGeneral > 0 ? (datos.totalMXN / totalGeneral) * 100 : 0,
    }))
    .sort((a, b) => b.totalMXN - a.totalMXN)
}
