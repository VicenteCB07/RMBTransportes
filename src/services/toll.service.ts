/**
 * Servicio para gestión de Casetas/Peajes
 * Incluye importación desde sistemas TAG (IAVE, Televia, Viapass)
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Caseta,
  CasetaFormInput,
  FiltrosCaseta,
  ImportacionTAG,
  RegistroIAVE,
  RegistroTelevia,
  RegistroViapass,
  FuenteDatosCaseta,
  MetodoPagoCaseta,
  EstadisticasCasetas,
} from '../types/toll.types';
import { obtenerViajesActivos } from './trip.service';

const COLLECTION = 'casetas';
const IMPORTACIONES_COLLECTION = 'importacionesCasetas';

// Obtener casetas con filtros
export async function obtenerCasetas(filtros?: FiltrosCaseta): Promise<Caseta[]> {
  try {
    let q = query(collection(db, COLLECTION), orderBy('timestamp', 'desc'));

    if (filtros?.vehiculoId) {
      q = query(q, where('vehiculoId', '==', filtros.vehiculoId));
    }

    if (filtros?.correlacionado !== undefined) {
      q = query(q, where('correlacionado', '==', filtros.correlacionado));
    }

    const snapshot = await getDocs(q);
    let casetas = snapshot.docs.map(doc => convertirDocACaseta(doc));

    // Filtros en memoria
    if (filtros?.fechaDesde) {
      casetas = casetas.filter(c => c.fecha >= filtros.fechaDesde!);
    }
    if (filtros?.fechaHasta) {
      casetas = casetas.filter(c => c.fecha <= filtros.fechaHasta!);
    }
    if (filtros?.nombreCaseta) {
      casetas = casetas.filter(c =>
        c.nombreCaseta.toLowerCase().includes(filtros.nombreCaseta!.toLowerCase())
      );
    }

    return casetas;
  } catch (error) {
    console.error('Error al obtener casetas:', error);
    throw error;
  }
}

// Registrar caseta manualmente
export async function registrarCaseta(input: CasetaFormInput): Promise<Caseta> {
  try {
    const ahora = Timestamp.now();

    // Combinar fecha y hora
    const [horas, minutos] = input.hora.split(':').map(Number);
    const timestamp = new Date(input.fecha);
    timestamp.setHours(horas, minutos, 0, 0);

    const casetaData = {
      vehiculoId: input.vehiculoId,
      numeroEconomico: '', // Se llenará después
      fecha: Timestamp.fromDate(input.fecha),
      hora: input.hora,
      timestamp: Timestamp.fromDate(timestamp),
      nombreCaseta: input.nombreCaseta,
      operador: null,
      plaza: null,
      carretera: null,
      importe: input.importe,
      tipoTarifa: null,
      ejes: 0,
      metodoPago: input.metodoPago,
      numeroTag: null,
      referenciaPago: null,
      viajeId: input.viajeId || null,
      correlacionado: !!input.viajeId,
      correlacionManual: !!input.viajeId,
      fuenteDatos: 'MANUAL' as FuenteDatosCaseta,
      importacionId: null,
      createdAt: ahora,
      updatedAt: ahora,
    };

    const docRef = await addDoc(collection(db, COLLECTION), casetaData);

    return {
      id: docRef.id,
      ...casetaData,
      fecha: input.fecha,
      timestamp,
      createdAt: ahora.toDate(),
      updatedAt: ahora.toDate(),
    } as unknown as Caseta;
  } catch (error) {
    console.error('Error al registrar caseta:', error);
    throw error;
  }
}

// Importar desde archivo IAVE
export async function importarDesdeIAVE(
  registros: RegistroIAVE[],
  mapeoVehiculos: Record<string, string>, // tag -> vehiculoId
  userId: string
): Promise<ImportacionTAG> {
  const importacion = await crearRegistroImportacion('IMPORTACION_IAVE', registros.length, userId);

  try {
    const batch = writeBatch(db);
    let importados = 0;
    let duplicados = 0;
    const errores: string[] = [];

    for (const registro of registros) {
      try {
        const vehiculoId = mapeoVehiculos[registro.tag];
        if (!vehiculoId) {
          errores.push(`TAG ${registro.tag} no mapeado`);
          continue;
        }

        // Parsear fecha y hora
        const [dia, mes, anio] = registro.fecha.split('/').map(Number);
        const fecha = new Date(anio, mes - 1, dia);
        const [horas, minutos] = registro.hora.split(':').map(Number);
        const timestamp = new Date(fecha);
        timestamp.setHours(horas, minutos, 0, 0);

        // Verificar duplicado
        const duplicado = await verificarDuplicado(vehiculoId, timestamp, registro.importe);
        if (duplicado) {
          duplicados++;
          continue;
        }

        const casetaRef = doc(collection(db, COLLECTION));
        batch.set(casetaRef, {
          vehiculoId,
          numeroEconomico: '',
          fecha: Timestamp.fromDate(fecha),
          hora: registro.hora.substring(0, 5),
          timestamp: Timestamp.fromDate(timestamp),
          nombreCaseta: registro.plaza,
          importe: registro.importe,
          metodoPago: 'TAG_IAVE' as MetodoPagoCaseta,
          numeroTag: registro.tag,
          viajeId: null,
          correlacionado: false,
          correlacionManual: false,
          fuenteDatos: 'IMPORTACION_IAVE' as FuenteDatosCaseta,
          importacionId: importacion.id,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        importados++;
      } catch (err) {
        errores.push(`Error en registro: ${err}`);
      }
    }

    await batch.commit();

    // Actualizar registro de importación
    await actualizarImportacion(importacion.id, {
      registrosImportados: importados,
      registrosDuplicados: duplicados,
      registrosError: errores.length,
      errores,
      status: 'completado',
      montoTotal: registros.reduce((sum, r) => sum + r.importe, 0),
    });

    // Auto-correlacionar con viajes
    await correlacionarCasetasAutomaticamente();

    return {
      ...importacion,
      registrosImportados: importados,
      registrosDuplicados: duplicados,
      registrosError: errores.length,
      errores,
      status: 'completado',
    };
  } catch (error) {
    await actualizarImportacion(importacion.id, {
      status: 'error',
      errores: [String(error)],
    });
    throw error;
  }
}

// Importar desde archivo Televia
export async function importarDesdeTelevia(
  registros: RegistroTelevia[],
  mapeoVehiculos: Record<string, string>,
  userId: string
): Promise<ImportacionTAG> {
  const importacion = await crearRegistroImportacion('IMPORTACION_TELEVIA', registros.length, userId);

  try {
    const batch = writeBatch(db);
    let importados = 0;
    let duplicados = 0;
    const errores: string[] = [];

    for (const registro of registros) {
      try {
        const vehiculoId = mapeoVehiculos[registro.numeroTag];
        if (!vehiculoId) {
          errores.push(`TAG ${registro.numeroTag} no mapeado`);
          continue;
        }

        const timestamp = new Date(registro.fechaHora);
        const fecha = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
        const hora = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}`;

        const duplicado = await verificarDuplicado(vehiculoId, timestamp, registro.monto);
        if (duplicado) {
          duplicados++;
          continue;
        }

        const casetaRef = doc(collection(db, COLLECTION));
        batch.set(casetaRef, {
          vehiculoId,
          numeroEconomico: '',
          fecha: Timestamp.fromDate(fecha),
          hora,
          timestamp: Timestamp.fromDate(timestamp),
          nombreCaseta: registro.plaza,
          importe: registro.monto,
          metodoPago: 'TAG_TELEVIA' as MetodoPagoCaseta,
          numeroTag: registro.numeroTag,
          viajeId: null,
          correlacionado: false,
          correlacionManual: false,
          fuenteDatos: 'IMPORTACION_TELEVIA' as FuenteDatosCaseta,
          importacionId: importacion.id,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        importados++;
      } catch (err) {
        errores.push(`Error en registro: ${err}`);
      }
    }

    await batch.commit();

    await actualizarImportacion(importacion.id, {
      registrosImportados: importados,
      registrosDuplicados: duplicados,
      registrosError: errores.length,
      errores,
      status: 'completado',
      montoTotal: registros.reduce((sum, r) => sum + r.monto, 0),
    });

    await correlacionarCasetasAutomaticamente();

    return {
      ...importacion,
      registrosImportados: importados,
      registrosDuplicados: duplicados,
      registrosError: errores.length,
      errores,
      status: 'completado',
    };
  } catch (error) {
    await actualizarImportacion(importacion.id, {
      status: 'error',
      errores: [String(error)],
    });
    throw error;
  }
}

// Importar desde archivo VIAPASS
export async function importarDesdeViapass(
  registros: RegistroViapass[],
  mapeoVehiculos: Record<string, string>,
  userId: string
): Promise<ImportacionTAG> {
  const importacion = await crearRegistroImportacion('IMPORTACION_VIAPASS', registros.length, userId);

  try {
    const batch = writeBatch(db);
    let importados = 0;
    let duplicados = 0;
    const errores: string[] = [];

    for (const registro of registros) {
      try {
        const vehiculoId = mapeoVehiculos[registro.TAG];
        if (!vehiculoId) {
          errores.push(`TAG ${registro.TAG} no mapeado`);
          continue;
        }

        const fecha = new Date(registro.Date);
        const [horas, minutos] = registro.Time.split(':').map(Number);
        const timestamp = new Date(fecha);
        timestamp.setHours(horas, minutos, 0, 0);

        const duplicado = await verificarDuplicado(vehiculoId, timestamp, registro.Amount);
        if (duplicado) {
          duplicados++;
          continue;
        }

        const casetaRef = doc(collection(db, COLLECTION));
        batch.set(casetaRef, {
          vehiculoId,
          numeroEconomico: '',
          fecha: Timestamp.fromDate(fecha),
          hora: registro.Time.substring(0, 5),
          timestamp: Timestamp.fromDate(timestamp),
          nombreCaseta: registro.Toll,
          importe: registro.Amount,
          metodoPago: 'TAG_VIAPASS' as MetodoPagoCaseta,
          numeroTag: registro.TAG,
          viajeId: null,
          correlacionado: false,
          correlacionManual: false,
          fuenteDatos: 'IMPORTACION_VIAPASS' as FuenteDatosCaseta,
          importacionId: importacion.id,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        importados++;
      } catch (err) {
        errores.push(`Error en registro: ${err}`);
      }
    }

    await batch.commit();

    await actualizarImportacion(importacion.id, {
      registrosImportados: importados,
      registrosDuplicados: duplicados,
      registrosError: errores.length,
      errores,
      status: 'completado',
      montoTotal: registros.reduce((sum, r) => sum + r.Amount, 0),
    });

    await correlacionarCasetasAutomaticamente();

    return {
      ...importacion,
      registrosImportados: importados,
      registrosDuplicados: duplicados,
      registrosError: errores.length,
      errores,
      status: 'completado',
    };
  } catch (error) {
    await actualizarImportacion(importacion.id, {
      status: 'error',
      errores: [String(error)],
    });
    throw error;
  }
}

// Correlacionar casetas con viajes automáticamente
export async function correlacionarCasetasAutomaticamente(): Promise<{
  correlacionadas: number;
  sinCorrelacionar: number;
}> {
  try {
    // Obtener casetas sin correlacionar
    const casetasSinCorrelacionar = await obtenerCasetas({ correlacionado: false });

    // Obtener viajes activos y recientes
    const viajes = await obtenerViajesActivos();

    let correlacionadas = 0;

    for (const caseta of casetasSinCorrelacionar) {
      // Buscar viaje que coincida en vehículo y tiempo
      const viajeCoincidente = viajes.find(v => {
        if (v.tractoId !== caseta.vehiculoId) return false;

        // Verificar que la caseta esté dentro del rango de tiempo del viaje
        const tiempoInicio = v.tiempos.inicio?.getTime() || v.fecha.getTime();
        const tiempoFin = v.tiempos.fin?.getTime() || Date.now();
        const tiempoCaseta = caseta.timestamp.getTime();

        return tiempoCaseta >= tiempoInicio && tiempoCaseta <= tiempoFin;
      });

      if (viajeCoincidente) {
        await updateDoc(doc(db, COLLECTION, caseta.id), {
          viajeId: viajeCoincidente.id,
          correlacionado: true,
          correlacionManual: false,
          updatedAt: Timestamp.now(),
        });
        correlacionadas++;
      }
    }

    return {
      correlacionadas,
      sinCorrelacionar: casetasSinCorrelacionar.length - correlacionadas,
    };
  } catch (error) {
    console.error('Error en correlación automática:', error);
    throw error;
  }
}

// Correlacionar caseta manualmente
export async function correlacionarCasetaManualmente(
  casetaId: string,
  viajeId: string
): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, casetaId), {
      viajeId,
      correlacionado: true,
      correlacionManual: true,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error en correlación manual:', error);
    throw error;
  }
}

// Obtener estadísticas de casetas
export async function obtenerEstadisticasCasetas(
  fechaDesde?: Date,
  fechaHasta?: Date
): Promise<EstadisticasCasetas> {
  try {
    const casetas = await obtenerCasetas({
      fechaDesde,
      fechaHasta,
    });

    // Calcular estadísticas
    const totalCruces = casetas.length;
    const gastoTotal = casetas.reduce((sum, c) => sum + c.importe, 0);

    // Días únicos
    const diasUnicos = new Set(
      casetas.map(c => c.fecha.toISOString().split('T')[0])
    ).size;
    const gastoPromedioDiario = diasUnicos > 0 ? gastoTotal / diasUnicos : 0;

    // Caseta más frecuente
    const frecuenciaCasetas: Record<string, number> = {};
    casetas.forEach(c => {
      frecuenciaCasetas[c.nombreCaseta] = (frecuenciaCasetas[c.nombreCaseta] || 0) + 1;
    });
    const casetaMasFrecuente = Object.entries(frecuenciaCasetas)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    // Vehículo con mayor gasto
    const gastoPorVehiculo: Record<string, number> = {};
    casetas.forEach(c => {
      gastoPorVehiculo[c.vehiculoId] = (gastoPorVehiculo[c.vehiculoId] || 0) + c.importe;
    });
    const vehiculoMayorGasto = Object.entries(gastoPorVehiculo)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    // Porcentaje correlacionado
    const correlacionadas = casetas.filter(c => c.correlacionado).length;
    const porcentajeCorrelacionado = totalCruces > 0
      ? (correlacionadas / totalCruces) * 100
      : 0;

    return {
      totalCruces,
      gastoTotal,
      gastoPromedioDiario,
      casetaMasFrecuente,
      vehiculoMayorGasto,
      porcentajeCorrelacionado,
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    throw error;
  }
}

// Obtener casetas por viaje
export async function obtenerCasetasPorViaje(viajeId: string): Promise<Caseta[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('viajeId', '==', viajeId),
      orderBy('timestamp', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertirDocACaseta(doc));
  } catch (error) {
    console.error('Error al obtener casetas del viaje:', error);
    throw error;
  }
}

// Helpers
async function crearRegistroImportacion(
  fuente: FuenteDatosCaseta,
  totalRegistros: number,
  userId: string
): Promise<ImportacionTAG> {
  const ahora = new Date();
  const importacionData = {
    fuente,
    fechaImportacion: Timestamp.fromDate(ahora),
    periodoDesde: Timestamp.fromDate(ahora),
    periodoHasta: Timestamp.fromDate(ahora),
    totalRegistros,
    registrosImportados: 0,
    registrosDuplicados: 0,
    registrosError: 0,
    montoTotal: 0,
    status: 'procesando' as const,
    errores: [],
    createdBy: userId,
  };

  const docRef = await addDoc(collection(db, IMPORTACIONES_COLLECTION), importacionData);

  return {
    id: docRef.id,
    ...importacionData,
    fechaImportacion: ahora,
    periodoDesde: ahora,
    periodoHasta: ahora,
  };
}

async function actualizarImportacion(
  id: string,
  data: Partial<ImportacionTAG>
): Promise<void> {
  await updateDoc(doc(db, IMPORTACIONES_COLLECTION, id), data);
}

async function verificarDuplicado(
  vehiculoId: string,
  timestamp: Date,
  importe: number
): Promise<boolean> {
  const margenTiempo = 5 * 60 * 1000; // 5 minutos
  const q = query(
    collection(db, COLLECTION),
    where('vehiculoId', '==', vehiculoId),
    where('importe', '==', importe)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.some(doc => {
    const casetaTimestamp = doc.data().timestamp?.toDate()?.getTime();
    return Math.abs(casetaTimestamp - timestamp.getTime()) < margenTiempo;
  });
}

function convertirDocACaseta(docSnap: any): Caseta {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    vehiculoId: data.vehiculoId,
    numeroEconomico: data.numeroEconomico,
    fecha: data.fecha?.toDate(),
    hora: data.hora,
    timestamp: data.timestamp?.toDate(),
    nombreCaseta: data.nombreCaseta,
    operador: data.operador,
    plaza: data.plaza,
    carretera: data.carretera,
    importe: data.importe,
    tipoTarifa: data.tipoTarifa,
    ejes: data.ejes,
    metodoPago: data.metodoPago,
    numeroTag: data.numeroTag,
    referenciaPago: data.referenciaPago,
    viajeId: data.viajeId,
    correlacionado: data.correlacionado,
    correlacionManual: data.correlacionManual,
    fuenteDatos: data.fuenteDatos,
    importacionId: data.importacionId,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  };
}

// Obtener historial de importaciones
export async function obtenerHistorialImportaciones(): Promise<ImportacionTAG[]> {
  try {
    const q = query(
      collection(db, IMPORTACIONES_COLLECTION),
      orderBy('fechaImportacion', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fechaImportacion: doc.data().fechaImportacion?.toDate(),
      periodoDesde: doc.data().periodoDesde?.toDate(),
      periodoHasta: doc.data().periodoHasta?.toDate(),
    })) as ImportacionTAG[];
  } catch (error) {
    console.error('Error al obtener historial:', error);
    throw error;
  }
}
