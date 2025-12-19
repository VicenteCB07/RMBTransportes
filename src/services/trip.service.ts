/**
 * Servicio para gestión de Viajes
 * Integra con: Flota, Usuarios, Clientes, Rutas, Combustible, Casetas
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Viaje,
  ViajeFormInput,
  FiltrosViaje,
  TiemposViaje,
  CostosViaje,
  StatusViaje,
  TipoServicioViaje,
} from '../types/trip.types';
import { estimarCostoCombustibleRuta } from './fuel.service';
import { actualizarEstadisticasCliente } from './client.service';

const COLLECTION = 'viajes';

// Obtener todos los viajes con filtros
export async function obtenerViajes(filtros?: FiltrosViaje): Promise<Viaje[]> {
  try {
    let q = query(collection(db, COLLECTION), orderBy('fecha', 'desc'));

    if (filtros?.status) {
      q = query(q, where('status', '==', filtros.status));
    }

    if (filtros?.tractoId) {
      q = query(q, where('tractoId', '==', filtros.tractoId));
    }

    if (filtros?.operadorId) {
      q = query(q, where('operadorId', '==', filtros.operadorId));
    }

    if (filtros?.clienteId) {
      q = query(q, where('clienteId', '==', filtros.clienteId));
    }

    const snapshot = await getDocs(q);
    let viajes = snapshot.docs.map(doc => convertirDocAViaje(doc));

    // Filtros adicionales en memoria
    if (filtros?.fechaDesde) {
      viajes = viajes.filter(v => v.fecha >= filtros.fechaDesde!);
    }

    if (filtros?.fechaHasta) {
      viajes = viajes.filter(v => v.fecha <= filtros.fechaHasta!);
    }

    // Filtros por fecha compromiso
    if (filtros?.fechaCompromisoDesde) {
      viajes = viajes.filter(v => v.fechaCompromiso && v.fechaCompromiso >= filtros.fechaCompromisoDesde!);
    }

    if (filtros?.fechaCompromisoHasta) {
      viajes = viajes.filter(v => v.fechaCompromiso && v.fechaCompromiso <= filtros.fechaCompromisoHasta!);
    }

    if (filtros?.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      viajes = viajes.filter(v =>
        v.folio.toLowerCase().includes(busqueda) ||
        v.clienteNombre.toLowerCase().includes(busqueda) ||
        v.destino.nombre.toLowerCase().includes(busqueda)
      );
    }

    return viajes;
  } catch (error) {
    console.error('Error al obtener viajes:', error);
    throw error;
  }
}

// Obtener viaje por ID
export async function obtenerViaje(id: string): Promise<Viaje | null> {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return convertirDocAViaje(docSnap);
  } catch (error) {
    console.error('Error al obtener viaje:', error);
    throw error;
  }
}

// Crear viaje
export async function crearViaje(
  input: ViajeFormInput,
  userId: string,
  datosAdicionales: {
    tractoNumero: string;
    operadorSueldoDia: number;
    vehiculoSeguroDia: number;
    clienteNombre: string;
  }
): Promise<Viaje> {
  try {
    const ahora = Timestamp.now();

    // Generar folio único
    const secuencia = await obtenerSiguienteSecuencia(input.fecha, input.tipoServicio, datosAdicionales.tractoNumero);
    const folio = generarFolio(input.fecha, input.tipoServicio, datosAdicionales.tractoNumero, secuencia);

    // Calcular costos
    const costos = await calcularCostosViaje({
      distanciaKm: input.distanciaKm,
      tractoId: input.tractoId,
      sueldoDia: datosAdicionales.operadorSueldoDia,
      seguroDia: datosAdicionales.vehiculoSeguroDia,
      comidas: input.comidas || 0,
      transporte: input.transporte || 0,
      otros: input.otros || 0,
    });

    const ingresos = {
      flete: input.precioFlete,
      recargos: input.recargos || 0,
      total: input.precioFlete + (input.recargos || 0),
    };

    const utilidad = ingresos.total - costos.total;
    const margenUtilidad = ingresos.total > 0 ? (utilidad / ingresos.total) * 100 : 0;

    // Determinar status basado en si tiene asignación
    const tieneAsignacion = input.tractoId && input.operadorId;
    const statusInicial = input.status || (tieneAsignacion ? 'programado' : 'sin_asignar');

    const viajeData = {
      folio,
      fecha: Timestamp.fromDate(input.fecha),
      fechaCompromiso: input.fechaCompromiso ? Timestamp.fromDate(input.fechaCompromiso) : null,
      tiempos: {
        inicio: null,
        llegada: null,
        inicioEspera: null,
        tiempoEspera: null,
        partida: null,
        extension: null,
        tiempoMuerto: null,
        fin: null,
        duracionTotal: null,
      },
      tractoId: input.tractoId || null,
      operadorId: input.operadorId || null,
      maniobristaId: input.maniobristaId || null,
      asesorId: input.asesorId || null,
      equipos: input.equipos || [],
      equiposCarga: input.equiposCarga || [],
      clienteId: input.clienteId,
      clienteNombre: datosAdicionales.clienteNombre,
      destino: input.destino,
      tipoServicio: input.tipoServicio,
      distanciaKm: input.distanciaKm,
      rutaId: input.rutaId || null,
      coordenadasRuta: null,
      regresaABase: input.regresaABase || false,
      costos,
      ingresos,
      utilidad,
      margenUtilidad,
      status: statusInicial as StatusViaje,
      casetasIds: [],
      totalCasetas: 0,
      telemetriaIds: [],
      odometroInicio: null,
      odometroFin: null,
      notas: input.notas || null,
      createdBy: userId,
      createdAt: ahora,
      updatedAt: ahora,
    };

    const docRef = await addDoc(collection(db, COLLECTION), viajeData);

    return {
      id: docRef.id,
      ...viajeData,
      fecha: input.fecha,
      tiempos: viajeData.tiempos as unknown as TiemposViaje,
      createdAt: ahora.toDate(),
      updatedAt: ahora.toDate(),
    } as unknown as Viaje;
  } catch (error) {
    console.error('Error al crear viaje:', error);
    throw error;
  }
}

// Actualizar tiempos del viaje
export async function actualizarTiemposViaje(
  id: string,
  tiempos: Partial<TiemposViaje>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    const viaje = await obtenerViaje(id);
    if (!viaje) throw new Error('Viaje no encontrado');

    const tiemposActualizados = { ...viaje.tiempos };

    if (tiempos.inicio) {
      tiemposActualizados.inicio = tiempos.inicio;
    }
    if (tiempos.llegada) {
      tiemposActualizados.llegada = tiempos.llegada;
    }
    if (tiempos.partida) {
      tiemposActualizados.partida = tiempos.partida;
      // Calcular tiempo de espera
      if (tiemposActualizados.llegada) {
        tiemposActualizados.tiempoEspera = Math.round(
          (tiempos.partida.getTime() - tiemposActualizados.llegada.getTime()) / 60000
        );
      }
    }
    if (tiempos.fin) {
      tiemposActualizados.fin = tiempos.fin;
      // Calcular duración total
      if (tiemposActualizados.inicio) {
        tiemposActualizados.duracionTotal = Math.round(
          (tiempos.fin.getTime() - tiemposActualizados.inicio.getTime()) / 60000
        );
      }
    }

    // Actualizar status automáticamente
    let nuevoStatus: StatusViaje = viaje.status;
    if (tiempos.inicio && !tiemposActualizados.llegada) {
      nuevoStatus = 'en_curso';
    } else if (tiemposActualizados.llegada && !tiemposActualizados.partida) {
      nuevoStatus = 'en_destino';
    } else if (tiemposActualizados.fin) {
      nuevoStatus = 'completado';
    }

    await updateDoc(docRef, {
      tiempos: {
        inicio: tiemposActualizados.inicio ? Timestamp.fromDate(tiemposActualizados.inicio) : null,
        llegada: tiemposActualizados.llegada ? Timestamp.fromDate(tiemposActualizados.llegada) : null,
        tiempoEspera: tiemposActualizados.tiempoEspera,
        partida: tiemposActualizados.partida ? Timestamp.fromDate(tiemposActualizados.partida) : null,
        extension: tiemposActualizados.extension,
        tiempoMuerto: tiemposActualizados.tiempoMuerto,
        fin: tiemposActualizados.fin ? Timestamp.fromDate(tiemposActualizados.fin) : null,
        duracionTotal: tiemposActualizados.duracionTotal,
      },
      status: nuevoStatus,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al actualizar tiempos:', error);
    throw error;
  }
}

// Iniciar viaje
export async function iniciarViaje(id: string, odometroInicio?: number): Promise<void> {
  try {
    // Obtener viaje para validar datos
    const viaje = await obtenerViaje(id);
    if (!viaje) throw new Error('Viaje no encontrado');

    // Validar datos requeridos
    if (!viaje.tractoId) {
      throw new Error('El viaje no tiene vehículo asignado');
    }
    if (!viaje.operadorId) {
      throw new Error('El viaje no tiene operador asignado');
    }
    if (!viaje.clienteId) {
      throw new Error('El viaje no tiene cliente asignado');
    }
    if (viaje.status !== 'programado') {
      throw new Error(`No se puede iniciar un viaje con status "${viaje.status}"`);
    }

    await updateDoc(doc(db, COLLECTION, id), {
      'tiempos.inicio': Timestamp.now(),
      status: 'en_curso',
      odometroInicio: odometroInicio || null,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al iniciar viaje:', error);
    throw error;
  }
}

// Registrar llegada
export async function registrarLlegada(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      'tiempos.llegada': Timestamp.now(),
      status: 'en_destino',
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al registrar llegada:', error);
    throw error;
  }
}

// Iniciar tiempo de espera (click 3 - guarda timestamp de inicio)
export async function iniciarEspera(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      'tiempos.inicioEspera': Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al iniciar espera:', error);
    throw error;
  }
}

// Registrar partida del destino (click 4 - calcula tiempo de espera automáticamente)
export async function registrarPartida(id: string): Promise<void> {
  try {
    const viaje = await obtenerViaje(id);
    if (!viaje) throw new Error('Viaje no encontrado');

    const ahora = Timestamp.now();
    const updateData: Record<string, unknown> = {
      'tiempos.partida': ahora,
      updatedAt: ahora,
    };

    // Calcular tiempo de espera si hay inicioEspera
    if (viaje.tiempos.inicioEspera) {
      const tiempoEspera = Math.round(
        (Date.now() - viaje.tiempos.inicioEspera.getTime()) / 60000
      );
      updateData['tiempos.tiempoEspera'] = tiempoEspera;
    }

    await updateDoc(doc(db, COLLECTION, id), updateData);
  } catch (error) {
    console.error('Error al registrar partida:', error);
    throw error;
  }
}

// Actualizar viaje (solo permitido para viajes en status 'programado')
export async function actualizarViaje(
  id: string,
  input: Partial<ViajeFormInput>,
  datosAdicionales?: {
    tractoNumero?: string;
    operadorSueldoDia?: number;
    vehiculoSeguroDia?: number;
    clienteNombre?: string;
  }
): Promise<void> {
  try {
    const viaje = await obtenerViaje(id);
    if (!viaje) throw new Error('Viaje no encontrado');

    // No permitir edición de viajes cancelados
    if (viaje.status === 'cancelado') {
      throw new Error('No se pueden editar viajes cancelados');
    }

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    // Actualizar campos básicos
    if (input.fecha !== undefined) {
      updateData.fecha = input.fecha instanceof Date
        ? Timestamp.fromDate(input.fecha)
        : Timestamp.fromDate(new Date(input.fecha));
    }
    if (input.fechaCompromiso !== undefined) {
      updateData.fechaCompromiso = input.fechaCompromiso
        ? (input.fechaCompromiso instanceof Date
          ? Timestamp.fromDate(input.fechaCompromiso)
          : Timestamp.fromDate(new Date(input.fechaCompromiso)))
        : null;
    }
    if (input.tractoId !== undefined) updateData.tractoId = input.tractoId;
    if (input.operadorId !== undefined) updateData.operadorId = input.operadorId;
    if (input.maniobristaId !== undefined) updateData.maniobristaId = input.maniobristaId || null;
    if (input.clienteId !== undefined) updateData.clienteId = input.clienteId;
    if (input.destino !== undefined) updateData.destino = input.destino;
    if (input.tipoServicio !== undefined) updateData.tipoServicio = input.tipoServicio;
    if (input.distanciaKm !== undefined) updateData.distanciaKm = input.distanciaKm;
    if (input.precioFlete !== undefined) {
      updateData.precioFlete = input.precioFlete;
      // Recalcular ingresos
      updateData['ingresos.flete'] = input.precioFlete;
      updateData['ingresos.total'] = input.precioFlete + (viaje.ingresos?.recargos || 0);
    }
    if (input.equipos !== undefined) updateData.equipos = input.equipos;
    if (input.equiposCarga !== undefined) updateData.equiposCarga = input.equiposCarga;
    if (input.notas !== undefined) updateData.notas = input.notas;
    if (input.condicionesSeguridad !== undefined) updateData.condicionesSeguridad = input.condicionesSeguridad;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.regresaABase !== undefined) updateData.regresaABase = input.regresaABase;

    // Actualizar datos adicionales
    if (datosAdicionales?.tractoNumero !== undefined) {
      updateData.tractoNumero = datosAdicionales.tractoNumero;
    }
    if (datosAdicionales?.clienteNombre !== undefined) {
      updateData.clienteNombre = datosAdicionales.clienteNombre;
    }

    // Recalcular costos si cambiaron los sueldos
    if (datosAdicionales?.operadorSueldoDia !== undefined || datosAdicionales?.vehiculoSeguroDia !== undefined) {
      const nuevosSueldos = datosAdicionales?.operadorSueldoDia ?? viaje.costos.sueldos;
      const nuevosSeguros = datosAdicionales?.vehiculoSeguroDia ?? viaje.costos.seguros;

      const costos = {
        ...viaje.costos,
        sueldos: nuevosSueldos,
        seguros: nuevosSeguros,
      };
      costos.total = costos.sueldos + costos.seguros + costos.casetas +
        costos.combustible + costos.comidas + costos.transporte + costos.otros;

      updateData.costos = costos;

      // Recalcular utilidad
      const ingresoTotal = input.precioFlete !== undefined
        ? input.precioFlete + (viaje.ingresos?.recargos || 0)
        : viaje.ingresos.total;

      updateData.utilidad = ingresoTotal - costos.total;
      updateData.margenUtilidad = ingresoTotal > 0
        ? ((ingresoTotal - costos.total) / ingresoTotal) * 100
        : 0;
    }

    await updateDoc(doc(db, COLLECTION, id), updateData);
  } catch (error) {
    console.error('Error al actualizar viaje:', error);
    throw error;
  }
}

// Completar viaje
export async function completarViaje(
  id: string,
  odometroFin?: number,
  casetas?: number
): Promise<void> {
  try {
    const viaje = await obtenerViaje(id);
    if (!viaje) throw new Error('Viaje no encontrado');

    const updateData: Record<string, unknown> = {
      'tiempos.fin': Timestamp.now(),
      status: 'completado',
      updatedAt: Timestamp.now(),
    };

    if (odometroFin) {
      updateData.odometroFin = odometroFin;
    }

    // Recalcular costos si hay casetas
    if (casetas !== undefined) {
      const costos = { ...viaje.costos };
      costos.casetas = casetas;
      costos.total = costos.sueldos + costos.seguros + costos.casetas +
        costos.combustible + costos.comidas + costos.transporte + costos.otros;

      const utilidad = viaje.ingresos.total - costos.total;
      const margenUtilidad = viaje.ingresos.total > 0 ? (utilidad / viaje.ingresos.total) * 100 : 0;

      updateData.costos = costos;
      updateData.totalCasetas = casetas;
      updateData.utilidad = utilidad;
      updateData.margenUtilidad = margenUtilidad;
    }

    // Calcular duración
    if (viaje.tiempos.inicio) {
      updateData['tiempos.duracionTotal'] = Math.round(
        (Date.now() - viaje.tiempos.inicio.getTime()) / 60000
      );
    }

    await updateDoc(doc(db, COLLECTION, id), updateData);

    // Actualizar estadísticas del cliente
    if (viaje.clienteId) {
      try {
        await actualizarEstadisticasCliente(viaje.clienteId, {
          ingreso: viaje.ingresos.total,
          destino: viaje.destino?.nombre || viaje.destino?.direccion || 'Desconocido',
        });
      } catch (err) {
        // No fallar el completar viaje si las estadísticas fallan
        console.error('Error actualizando estadísticas de cliente:', err);
      }
    }
  } catch (error) {
    console.error('Error al completar viaje:', error);
    throw error;
  }
}

// Cancelar viaje
export async function cancelarViaje(id: string, motivo: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      status: 'cancelado',
      notas: motivo,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al cancelar viaje:', error);
    throw error;
  }
}

// Eliminar viaje permanentemente
export async function eliminarViaje(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error al eliminar viaje:', error);
    throw error;
  }
}

// Asociar casetas a viaje
export async function asociarCasetasAViaje(
  viajeId: string,
  casetasIds: string[],
  totalCasetas: number
): Promise<void> {
  try {
    const viaje = await obtenerViaje(viajeId);
    if (!viaje) throw new Error('Viaje no encontrado');

    const costos = { ...viaje.costos };
    costos.casetas = totalCasetas;
    costos.total = costos.sueldos + costos.seguros + costos.casetas +
      costos.combustible + costos.comidas + costos.transporte + costos.otros;

    const utilidad = viaje.ingresos.total - costos.total;
    const margenUtilidad = viaje.ingresos.total > 0 ? (utilidad / viaje.ingresos.total) * 100 : 0;

    await updateDoc(doc(db, COLLECTION, viajeId), {
      casetasIds,
      totalCasetas,
      costos,
      utilidad,
      margenUtilidad,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al asociar casetas:', error);
    throw error;
  }
}

// Calcular costos del viaje
async function calcularCostosViaje(params: {
  distanciaKm: number;
  tractoId: string;
  sueldoDia: number;
  seguroDia: number;
  comidas: number;
  transporte: number;
  otros: number;
}): Promise<CostosViaje> {
  // Obtener estimación de combustible
  const estimacionCombustible = await estimarCostoCombustibleRuta(
    params.distanciaKm,
    params.tractoId
  );

  const costos: CostosViaje = {
    sueldos: params.sueldoDia,
    seguros: params.seguroDia,
    casetas: 0, // Se actualizará con casetas reales
    combustible: estimacionCombustible.costoEstimado,
    comidas: params.comidas,
    transporte: params.transporte,
    otros: params.otros,
    total: 0,
  };

  costos.total = costos.sueldos + costos.seguros + costos.casetas +
    costos.combustible + costos.comidas + costos.transporte + costos.otros;

  return costos;
}

// Generar folio de Orden de Servicio
// Formato: OS-DDMMYY-TIPO-UNIDAD-#
function generarFolio(
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
    'Entrega / Recoleccion': 'ER',
  };

  return `OS-${dd}${mm}${yy}-${tipoAbrev[tipoServicio]}-${tractoNumero}-${secuencia}`;
}

// Obtener siguiente secuencia para folio
async function obtenerSiguienteSecuencia(
  fecha: Date,
  tipoServicio: TipoServicioViaje,
  tractoNumero: string
): Promise<number> {
  const inicioDia = new Date(fecha);
  inicioDia.setHours(0, 0, 0, 0);
  const finDia = new Date(fecha);
  finDia.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, COLLECTION),
    where('fecha', '>=', Timestamp.fromDate(inicioDia)),
    where('fecha', '<=', Timestamp.fromDate(finDia))
  );

  const snapshot = await getDocs(q);
  const viajesDelDia = snapshot.docs.filter(doc => {
    const folio = doc.data().folio as string;
    return folio.includes(tractoNumero);
  });

  return viajesDelDia.length + 1;
}

// Convertir documento a Viaje
function convertirDocAViaje(docSnap: any): Viaje {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    folio: data.folio,
    fecha: data.fecha?.toDate(),
    fechaCompromiso: data.fechaCompromiso?.toDate() || null,
    tiempos: {
      inicio: data.tiempos?.inicio?.toDate() || null,
      llegada: data.tiempos?.llegada?.toDate() || null,
      inicioEspera: data.tiempos?.inicioEspera?.toDate() || null,
      tiempoEspera: data.tiempos?.tiempoEspera,
      partida: data.tiempos?.partida?.toDate() || null,
      extension: data.tiempos?.extension,
      tiempoMuerto: data.tiempos?.tiempoMuerto,
      fin: data.tiempos?.fin?.toDate() || null,
      duracionTotal: data.tiempos?.duracionTotal,
    },
    tractoId: data.tractoId,
    operadorId: data.operadorId,
    maniobristaId: data.maniobristaId,
    asesorId: data.asesorId,
    equipos: data.equipos || [],
    equiposCarga: data.equiposCarga || [],
    clienteId: data.clienteId,
    clienteNombre: data.clienteNombre,
    destino: data.destino,
    tipoServicio: data.tipoServicio,
    distanciaKm: data.distanciaKm,
    rutaId: data.rutaId,
    coordenadasRuta: data.coordenadasRuta,
    regresaABase: data.regresaABase || false,
    costos: data.costos,
    ingresos: data.ingresos,
    utilidad: data.utilidad,
    margenUtilidad: data.margenUtilidad,
    status: data.status,
    casetasIds: data.casetasIds || [],
    totalCasetas: data.totalCasetas || 0,
    telemetriaIds: data.telemetriaIds || [],
    odometroInicio: data.odometroInicio,
    odometroFin: data.odometroFin,
    notas: data.notas,
    createdBy: data.createdBy,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  };
}

// Estadísticas de viajes
export async function obtenerEstadisticasViajes(
  fechaDesde?: Date,
  fechaHasta?: Date
): Promise<{
  totalViajes: number;
  viajesCompletados: number;
  viajesCancelados: number;
  ingresoTotal: number;
  costoTotal: number;
  utilidadTotal: number;
  margenPromedio: number;
  kmTotales: number;
}> {
  try {
    const filtros: FiltrosViaje = {};
    if (fechaDesde) filtros.fechaDesde = fechaDesde;
    if (fechaHasta) filtros.fechaHasta = fechaHasta;

    const viajes = await obtenerViajes(filtros);

    const stats = {
      totalViajes: viajes.length,
      viajesCompletados: viajes.filter(v => v.status === 'completado').length,
      viajesCancelados: viajes.filter(v => v.status === 'cancelado').length,
      ingresoTotal: 0,
      costoTotal: 0,
      utilidadTotal: 0,
      margenPromedio: 0,
      kmTotales: 0,
    };

    for (const viaje of viajes) {
      stats.ingresoTotal += viaje.ingresos.total;
      stats.costoTotal += viaje.costos.total;
      stats.utilidadTotal += viaje.utilidad;
      stats.kmTotales += viaje.distanciaKm;
    }

    stats.margenPromedio = stats.ingresoTotal > 0
      ? (stats.utilidadTotal / stats.ingresoTotal) * 100
      : 0;

    return stats;
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    throw error;
  }
}

// Obtener viajes por fecha específica
export async function obtenerViajesPorFecha(fecha: Date): Promise<Viaje[]> {
  try {
    const inicioDia = new Date(fecha);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(fecha);
    finDia.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, COLLECTION),
      where('fecha', '>=', Timestamp.fromDate(inicioDia)),
      where('fecha', '<=', Timestamp.fromDate(finDia))
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertirDocAViaje(doc));
  } catch (error) {
    console.error('Error al obtener viajes por fecha:', error);
    throw error;
  }
}

// Obtener viajes activos (para correlación con casetas/telemetría)
export async function obtenerViajesActivos(): Promise<Viaje[]> {
  try {
    // Incluir viajes activos y completados recientes (últimos 7 días)
    const q = query(
      collection(db, COLLECTION),
      where('status', 'in', ['programado', 'en_curso', 'en_destino', 'completado'])
    );
    const snapshot = await getDocs(q);
    const viajes = snapshot.docs.map(doc => convertirDocAViaje(doc));

    // Filtrar completados para solo incluir los de los últimos 7 días
    const sieteDiasAtras = new Date();
    sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);

    return viajes.filter(v => {
      if (v.status !== 'completado') return true;
      // Para completados, verificar que sea reciente
      const fechaViaje = v.tiempos.fin || v.fecha;
      return fechaViaje >= sieteDiasAtras;
    });
  } catch (error) {
    console.error('Error al obtener viajes activos:', error);
    throw error;
  }
}
