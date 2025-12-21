/**
 * Servicio para preparar datos del Plan de Trabajo diario
 */

import type { Viaje } from '../types/trip.types';
import type { RutaCriticaInfo } from '../types/workload.types';

export interface ParadaPlanTrabajo {
  orden: number;
  folio: string;
  horaEstimadaLlegada: string;
  cliente: string;
  direccion: string;
  municipio?: string;
  estado?: string;
  coordenadas?: { lat: number; lng: number };
  contactoNombre?: string;
  contactoTelefono?: string;
  ventanaRecepcion?: string;
  tipoServicio: string;
  distanciaKm: number;
  notasAcceso?: string;
  documentosUrl?: string[];
  regresaABase?: boolean;
  cumpleVentana?: boolean;
  costos?: {
    sueldo: number;
    combustible: number;
    casetas: number;
    otros: number;
    total: number;
  };
  ingresos?: {
    flete: number;
    recargos: number;
    total: number;
  };
  utilidad?: number;
}

export interface PlanTrabajoData {
  fecha: Date;
  unidad: {
    numeroEconomico: string;
    marca: string;
    tipoUnidad: string;
    placas?: string;
  };
  operador: {
    nombre: string;
    telefono?: string;
    licencia?: string;
  };
  horaInicio: string;
  horaFin: string;
  kmTotales: number;
  paradas: ParadaPlanTrabajo[];
  resumenFinanciero?: {
    ingresoTotal: number;
    costoTotal: number;
    utilidadTotal: number;
    margenPromedio: number;
  };
}

export interface UnidadItinerarioInput {
  id: string;
  numeroEconomico: string;
  marca: string;
  tipoUnidad: string;
  operadorNombre: string;
  viajes: Viaje[];
  kmTotales: number;
  rutaCritica: RutaCriticaInfo | null;
}

export function prepararDatosPlanTrabajo(
  unidad: UnidadItinerarioInput,
  fecha: Date,
  incluirCostos: boolean = false
): PlanTrabajoData {
  const { rutaCritica, viajes } = unidad;
  const viajesOrdenados = rutaCritica
    ? rutaCritica.secuencia.map(vc => viajes.find(v => v.id === vc.id)!).filter(Boolean)
    : [...viajes].sort((a, b) => {
        const horaA = a.tiempos?.inicio?.getTime() || 0;
        const horaB = b.tiempos?.inicio?.getTime() || 0;
        return horaA - horaB;
      });
  const paradas: ParadaPlanTrabajo[] = viajesOrdenados.map((viaje, index) => {
    const horaLlegada = rutaCritica?.horasLlegada?.[index] || '--:--';
    const cumpleVentana = rutaCritica?.cumpleVentanas?.[index] ?? true;
    let ventanaRecepcion: string | undefined;
    if (viaje.destino.ventanaInicio && viaje.destino.ventanaFin) {
      ventanaRecepcion = viaje.destino.ventanaInicio + ' - ' + viaje.destino.ventanaFin;
    }
    const documentosUrl: string[] = [];
    if (viaje.condicionesSeguridad?.documentosAdjuntos) {
      viaje.condicionesSeguridad.documentosAdjuntos.forEach(doc => {
        if (doc.url) documentosUrl.push(doc.url);
      });
    }
    const parada: ParadaPlanTrabajo = {
      orden: index + 1,
      folio: viaje.folio,
      horaEstimadaLlegada: horaLlegada,
      cliente: viaje.clienteNombre,
      direccion: viaje.destino.direccion || viaje.destino.nombre,
      municipio: viaje.destino.municipio,
      estado: viaje.destino.estado,
      coordenadas: viaje.destino.coordenadas,
      contactoNombre: viaje.destino.contactoNombre,
      contactoTelefono: viaje.destino.contactoTelefono,
      ventanaRecepcion,
      tipoServicio: viaje.tipoServicio,
      distanciaKm: viaje.distanciaKm || 0,
      notasAcceso: viaje.condicionesSeguridad?.notasAcceso,
      documentosUrl: documentosUrl.length > 0 ? documentosUrl : undefined,
      regresaABase: viaje.regresaABase,
      cumpleVentana,
    };
    if (incluirCostos) {
      parada.costos = {
        sueldo: viaje.costos?.sueldos || 0,
        combustible: viaje.costos?.combustible || 0,
        casetas: viaje.costos?.casetas || 0,
        otros: (viaje.costos?.comidas || 0) + (viaje.costos?.transporte || 0) + (viaje.costos?.otros || 0),
        total: viaje.costos?.total || 0,
      };
      parada.ingresos = {
        flete: viaje.ingresos?.flete || 0,
        recargos: viaje.ingresos?.recargos || 0,
        total: viaje.ingresos?.total || 0,
      };
      parada.utilidad = viaje.utilidad || 0;
    }
    return parada;
  });
  let resumenFinanciero: PlanTrabajoData['resumenFinanciero'];
  if (incluirCostos) {
    const ingresoTotal = paradas.reduce((sum, p) => sum + (p.ingresos?.total || 0), 0);
    const costoTotal = paradas.reduce((sum, p) => sum + (p.costos?.total || 0), 0);
    const utilidadTotal = ingresoTotal - costoTotal;
    const margenPromedio = ingresoTotal > 0 ? (utilidadTotal / ingresoTotal) * 100 : 0;
    resumenFinanciero = { ingresoTotal, costoTotal, utilidadTotal, margenPromedio: Math.round(margenPromedio * 10) / 10 };
  }
  return {
    fecha,
    unidad: { numeroEconomico: unidad.numeroEconomico, marca: unidad.marca, tipoUnidad: unidad.tipoUnidad },
    operador: { nombre: unidad.operadorNombre },
    horaInicio: rutaCritica?.horaInicio || '06:00',
    horaFin: rutaCritica?.horaFin || '--:--',
    kmTotales: unidad.kmTotales || rutaCritica?.kmTotales || 0,
    paradas,
    resumenFinanciero,
  };
}

export function formatearFechaPDF(date: Date): string {
  return new Date(date).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatearMonedaPDF(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}
