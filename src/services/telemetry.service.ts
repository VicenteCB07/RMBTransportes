/**
 * Servicio para gestión de Telemetría GPS
 * Integración con plataforma Mastrack
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
  limit,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  EventoTelemetria,
  FiltrosTelemetria,
  UbicacionGPS,
  TipoEventoGPS,
  ConfiguracionMastrack,
  RegistroMastrack,
  ImportacionTelemetria,
  AnalisisConduccion,
  Geocerca,
  DashboardTelemetria,
  FuenteDatosTelemetria,
} from '../types/telemetry.types';
import { categorizarEvento } from '../types/telemetry.types';

const COLLECTION = 'telemetria';
const IMPORTACIONES_COLLECTION = 'importacionesTelemetria';
const GEOCERCAS_COLLECTION = 'geocercas';
const CONFIG_COLLECTION = 'configuraciones';

// Obtener eventos de telemetría con filtros
export async function obtenerEventosTelemetria(
  filtros?: FiltrosTelemetria,
  limite: number = 1000
): Promise<EventoTelemetria[]> {
  try {
    let q = query(
      collection(db, COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(limite)
    );

    if (filtros?.vehiculoId) {
      q = query(q, where('vehiculoId', '==', filtros.vehiculoId));
    }

    if (filtros?.tipoEvento) {
      q = query(q, where('tipoEvento', '==', filtros.tipoEvento));
    }

    const snapshot = await getDocs(q);
    let eventos = snapshot.docs.map(doc => convertirDocAEvento(doc));

    // Filtros en memoria
    if (filtros?.fechaDesde) {
      eventos = eventos.filter(e => e.timestamp >= filtros.fechaDesde!);
    }
    if (filtros?.fechaHasta) {
      eventos = eventos.filter(e => e.timestamp <= filtros.fechaHasta!);
    }
    if (filtros?.categoria) {
      eventos = eventos.filter(e => e.categoriaEvento === filtros.categoria);
    }

    return eventos;
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    throw error;
  }
}

// Obtener última ubicación de cada vehículo
export async function obtenerUbicacionFlota(): Promise<DashboardTelemetria['ubicacionFlota']> {
  try {
    // Obtener lista de vehículos únicos
    const q = query(collection(db, COLLECTION), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    const ubicacionesPorVehiculo = new Map<string, EventoTelemetria>();

    snapshot.docs.forEach(doc => {
      const evento = convertirDocAEvento(doc);
      if (!ubicacionesPorVehiculo.has(evento.vehiculoId)) {
        ubicacionesPorVehiculo.set(evento.vehiculoId, evento);
      }
    });

    return Array.from(ubicacionesPorVehiculo.values()).map(evento => ({
      vehiculoId: evento.vehiculoId,
      alias: evento.alias,
      ultimaUbicacion: evento.ubicacion,
      ultimaActualizacion: evento.timestamp,
      motorEncendido: evento.tipoEvento.toLowerCase().includes('encendido') ||
        evento.tipoEvento.includes('ON'),
      enMovimiento: evento.ubicacion.velocidad ? evento.ubicacion.velocidad > 5 : false,
      viajeActual: evento.viajeId,
    }));
  } catch (error) {
    console.error('Error al obtener ubicación flota:', error);
    throw error;
  }
}

// Importar desde Mastrack API
export async function importarDesdeMastrack(
  registros: RegistroMastrack[],
  mapeoVehiculos: Record<string, string>, // mastrackId -> vehiculoId
  userId: string
): Promise<ImportacionTelemetria> {
  const importacion = await crearRegistroImportacion(
    'API_MASTRACK',
    registros.length,
    userId
  );

  try {
    const batch = writeBatch(db);
    let importados = 0;
    let duplicados = 0;
    const errores: string[] = [];

    for (const registro of registros) {
      try {
        const vehiculoId = mapeoVehiculos[registro.deviceId] || mapeoVehiculos[registro.alias];
        if (!vehiculoId) {
          errores.push(`Dispositivo ${registro.deviceId} no mapeado`);
          continue;
        }

        const timestamp = new Date(registro.timestamp);

        // Verificar duplicado
        const duplicado = await verificarDuplicado(vehiculoId, timestamp, registro.eventType);
        if (duplicado) {
          duplicados++;
          continue;
        }

        // Mapear tipo de evento
        const tipoEvento = mapearEventoMastrack(registro.eventType);

        const eventoRef = doc(collection(db, COLLECTION));
        batch.set(eventoRef, {
          vehiculoId,
          alias: registro.alias,
          fecha: Timestamp.fromDate(new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate())),
          hora: `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}`,
          timestamp: Timestamp.fromDate(timestamp),
          ubicacion: {
            lat: registro.latitude,
            lng: registro.longitude,
            altitud: registro.altitude,
            velocidad: registro.speed,
            rumbo: registro.heading,
          },
          odometro: registro.odometer || 0,
          tipoEvento,
          categoriaEvento: categorizarEvento(tipoEvento),
          datosEvento: {
            descripcion: registro.eventDescription,
          },
          viajeId: null,
          fuenteDatos: 'API_MASTRACK' as FuenteDatosTelemetria,
          importacionId: importacion.id,
          createdAt: Timestamp.now(),
        });

        importados++;
      } catch (err) {
        errores.push(`Error: ${err}`);
      }
    }

    await batch.commit();

    await actualizarImportacion(importacion.id, {
      registrosImportados: importados,
      registrosDuplicados: duplicados,
      registrosError: errores.length,
      errores,
      status: 'completado',
    });

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

// Importar desde archivo Excel (formato del Excel actual)
export async function importarDesdeExcel(
  registros: Array<{
    fecha: Date;
    hora: string;
    alias: string;
    odometro: number;
    evento: string;
  }>,
  mapeoVehiculos: Record<string, string>,
  userId: string
): Promise<ImportacionTelemetria> {
  const importacion = await crearRegistroImportacion(
    'IMPORTACION_EXCEL',
    registros.length,
    userId
  );

  try {
    const batch = writeBatch(db);
    let importados = 0;
    let duplicados = 0;
    const errores: string[] = [];

    for (const registro of registros) {
      try {
        const vehiculoId = mapeoVehiculos[registro.alias];
        if (!vehiculoId) {
          errores.push(`Alias ${registro.alias} no mapeado`);
          continue;
        }

        const [horas, minutos] = registro.hora.split(':').map(Number);
        const timestamp = new Date(registro.fecha);
        timestamp.setHours(horas, minutos, 0, 0);

        const tipoEvento = registro.evento as TipoEventoGPS;

        const eventoRef = doc(collection(db, COLLECTION));
        batch.set(eventoRef, {
          vehiculoId,
          alias: registro.alias,
          fecha: Timestamp.fromDate(registro.fecha),
          hora: registro.hora,
          timestamp: Timestamp.fromDate(timestamp),
          ubicacion: {
            lat: 0,
            lng: 0,
          },
          odometro: registro.odometro,
          tipoEvento,
          categoriaEvento: categorizarEvento(tipoEvento),
          viajeId: null,
          fuenteDatos: 'IMPORTACION_EXCEL' as FuenteDatosTelemetria,
          importacionId: importacion.id,
          createdAt: Timestamp.now(),
        });

        importados++;
      } catch (err) {
        errores.push(`Error: ${err}`);
      }
    }

    await batch.commit();

    await actualizarImportacion(importacion.id, {
      registrosImportados: importados,
      registrosDuplicados: duplicados,
      registrosError: errores.length,
      errores,
      status: 'completado',
    });

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

// Calcular análisis de conducción
export async function calcularAnalisisConduccion(
  vehiculoId: string,
  fechaDesde: Date,
  fechaHasta: Date
): Promise<AnalisisConduccion> {
  try {
    const eventos = await obtenerEventosTelemetria({
      vehiculoId,
      fechaDesde,
      fechaHasta,
    });

    // Métricas básicas
    const odometros = eventos
      .filter(e => e.odometro > 0)
      .map(e => e.odometro)
      .sort((a, b) => a - b);

    const kmRecorridos = odometros.length > 1
      ? odometros[odometros.length - 1] - odometros[0]
      : 0;

    // Eventos de motor
    const eventosMotor = eventos.filter(e =>
      e.tipoEvento.toLowerCase().includes('motor') ||
      e.tipoEvento.includes('ON') ||
      e.tipoEvento.includes('OFF')
    );

    // Calcular horas de motor encendido
    let horasMotorEncendido = 0;
    let ultimoEncendido: Date | null = null;

    for (const evento of eventosMotor) {
      if (evento.tipoEvento.toLowerCase().includes('encendido') ||
        evento.tipoEvento.includes(' ON')) {
        ultimoEncendido = evento.timestamp;
      } else if (ultimoEncendido &&
        (evento.tipoEvento.toLowerCase().includes('off') ||
          evento.tipoEvento.includes(' OFF'))) {
        horasMotorEncendido += (evento.timestamp.getTime() - ultimoEncendido.getTime()) / 3600000;
        ultimoEncendido = null;
      }
    }

    // Eventos de conducción agresiva
    const eventosConduccion = {
      girosBruscos: eventos.filter(e => e.tipoEvento.includes('Giro')).length,
      frenadosBruscos: eventos.filter(e => e.tipoEvento.includes('Frenado')).length,
      aceleracionesBruscas: eventos.filter(e => e.tipoEvento.includes('Aceleracion')).length,
      excesosVelocidad: eventos.filter(e => e.tipoEvento.includes('velocidad')).length,
    };

    // Velocidades
    const velocidades = eventos
      .filter(e => e.ubicacion.velocidad && e.ubicacion.velocidad > 0)
      .map(e => e.ubicacion.velocidad!);

    const velocidadPromedio = velocidades.length > 0
      ? velocidades.reduce((a, b) => a + b, 0) / velocidades.length
      : 0;

    const velocidadMaxima = velocidades.length > 0
      ? Math.max(...velocidades)
      : 0;

    // Calcular scores (0-100)
    const totalEventosAgresivos =
      eventosConduccion.girosBruscos +
      eventosConduccion.frenadosBruscos +
      eventosConduccion.aceleracionesBruscas +
      eventosConduccion.excesosVelocidad;

    // Score de conducción: menos eventos agresivos = mejor score
    const scoreConduccion = Math.max(0, 100 - (totalEventosAgresivos * 2));

    // Score de seguridad
    const scoreSeguridad = Math.max(0, 100 - (eventosConduccion.excesosVelocidad * 5));

    // Score de eficiencia (basado en ralentí)
    const eventosRalenti = eventos.filter(e => e.tipoEvento.includes('inactividad')).length;
    const scoreEficiencia = Math.max(0, 100 - (eventosRalenti * 1));

    return {
      vehiculoId,
      periodo: { desde: fechaDesde, hasta: fechaHasta },
      kmRecorridos,
      horasMotorEncendido,
      horasConduccion: horasMotorEncendido * 0.8, // Estimación
      horasRalenti: horasMotorEncendido * 0.2,
      velocidadPromedio,
      velocidadMaxima,
      eventosConduccion,
      scoreConduccion,
      scoreSeguridad,
      scoreEficiencia,
      comparativoFlota: scoreConduccion > 80 ? 'mejor' : scoreConduccion > 50 ? 'promedio' : 'peor',
    };
  } catch (error) {
    console.error('Error al calcular análisis:', error);
    throw error;
  }
}

// Gestión de Geocercas
export async function crearGeocerca(geocerca: Omit<Geocerca, 'id' | 'createdAt' | 'updatedAt'>): Promise<Geocerca> {
  try {
    const ahora = Timestamp.now();
    const docRef = await addDoc(collection(db, GEOCERCAS_COLLECTION), {
      ...geocerca,
      createdAt: ahora,
      updatedAt: ahora,
    });

    return {
      id: docRef.id,
      ...geocerca,
      createdAt: ahora.toDate(),
      updatedAt: ahora.toDate(),
    };
  } catch (error) {
    console.error('Error al crear geocerca:', error);
    throw error;
  }
}

export async function obtenerGeocercas(): Promise<Geocerca[]> {
  try {
    const q = query(collection(db, GEOCERCAS_COLLECTION), where('activo', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Geocerca[];
  } catch (error) {
    console.error('Error al obtener geocercas:', error);
    throw error;
  }
}

// Verificar si un punto está dentro de una geocerca
export function verificarPuntoEnGeocerca(
  punto: { lat: number; lng: number },
  geocerca: Geocerca
): boolean {
  if (geocerca.forma === 'circulo' && geocerca.centro && geocerca.radio) {
    // Fórmula de Haversine simplificada
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (punto.lat - geocerca.centro.lat) * Math.PI / 180;
    const dLon = (punto.lng - geocerca.centro.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(geocerca.centro.lat * Math.PI / 180) *
      Math.cos(punto.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distancia = R * c;

    return distancia <= geocerca.radio;
  }

  if (geocerca.forma === 'poligono' && geocerca.vertices && geocerca.vertices.length >= 3) {
    // Algoritmo de Ray Casting
    let dentro = false;
    const vertices = geocerca.vertices;

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      if (
        vertices[i].lng > punto.lng !== vertices[j].lng > punto.lng &&
        punto.lat <
        ((vertices[j].lat - vertices[i].lat) * (punto.lng - vertices[i].lng)) /
        (vertices[j].lng - vertices[i].lng) +
        vertices[i].lat
      ) {
        dentro = !dentro;
      }
    }

    return dentro;
  }

  return false;
}

// Configuración de Mastrack
export async function guardarConfiguracionMastrack(
  config: Omit<ConfiguracionMastrack, 'ultimaSincronizacion'>
): Promise<void> {
  try {
    await updateDoc(doc(db, CONFIG_COLLECTION, 'mastrack'), config);
  } catch (error) {
    // Si no existe, crear
    await addDoc(collection(db, CONFIG_COLLECTION), {
      id: 'mastrack',
      ...config,
    });
  }
}

export async function obtenerConfiguracionMastrack(): Promise<ConfiguracionMastrack | null> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, 'mastrack');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return {
      ...docSnap.data(),
      ultimaSincronizacion: docSnap.data().ultimaSincronizacion?.toDate(),
    } as ConfiguracionMastrack;
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return null;
  }
}

// Dashboard de telemetría
export async function obtenerDashboardTelemetria(): Promise<DashboardTelemetria> {
  try {
    const ubicacionFlota = await obtenerUbicacionFlota();

    // Alertas activas (últimas 24 horas)
    const hace24Horas = new Date();
    hace24Horas.setHours(hace24Horas.getHours() - 24);

    const eventosRecientes = await obtenerEventosTelemetria({
      fechaDesde: hace24Horas,
      categoria: 'alerta',
    }, 100);

    const alertasActivas = eventosRecientes.map(e => ({
      vehiculoId: e.vehiculoId,
      alias: e.alias,
      tipoAlerta: e.tipoEvento,
      timestamp: e.timestamp,
      ubicacion: e.ubicacion,
      atendida: false,
    }));

    // Estadísticas del día
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const eventosHoy = await obtenerEventosTelemetria({
      fechaDesde: hoy,
    }, 10000);

    const vehiculosUnicos = new Set(eventosHoy.map(e => e.vehiculoId));
    const eventosConduccion = eventosHoy.filter(e => e.categoriaEvento === 'conduccion');
    const alertasCriticas = eventosHoy.filter(e =>
      e.tipoEvento.includes('Panico') ||
      e.tipoEvento.includes('velocidad')
    );

    return {
      ubicacionFlota,
      alertasActivas,
      estadisticasHoy: {
        vehiculosActivos: vehiculosUnicos.size,
        kmTotales: 0, // Calcular si hay odómetros disponibles
        eventosConduccion: eventosConduccion.length,
        alertasCriticas: alertasCriticas.length,
      },
    };
  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    throw error;
  }
}

// Helpers
async function crearRegistroImportacion(
  fuente: FuenteDatosTelemetria,
  totalRegistros: number,
  userId: string
): Promise<ImportacionTelemetria> {
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
  data: Partial<ImportacionTelemetria>
): Promise<void> {
  await updateDoc(doc(db, IMPORTACIONES_COLLECTION, id), data);
}

async function verificarDuplicado(
  vehiculoId: string,
  timestamp: Date,
  tipoEvento: string
): Promise<boolean> {
  const margenTiempo = 60 * 1000; // 1 minuto
  const q = query(
    collection(db, COLLECTION),
    where('vehiculoId', '==', vehiculoId),
    where('tipoEvento', '==', tipoEvento)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.some(doc => {
    const eventoTimestamp = doc.data().timestamp?.toDate()?.getTime();
    return Math.abs(eventoTimestamp - timestamp.getTime()) < margenTiempo;
  });
}

function mapearEventoMastrack(eventoMastrack: string): TipoEventoGPS {
  const mapeo: Record<string, TipoEventoGPS> = {
    'ignition_on': 'Motor encendido',
    'ignition_off': 'Auto reporte OFF',
    'heartbeat': 'Heartbeat',
    'harsh_acceleration': 'Aceleracion brusca',
    'harsh_braking': 'Frenado brusco',
    'harsh_cornering': 'Giro agresivo',
    'overspeed': 'Exceso de velocidad',
    'geofence_enter': 'Geocerca entrada',
    'geofence_exit': 'Geocerca salida',
    'panic': 'Panico',
    'low_battery': 'Bateria baja',
    'gps_lost': 'GPS perdido',
    'idle_start': 'Inicio de inactividad ON',
    'idle_end': 'Fin de inactividad ON',
  };

  return mapeo[eventoMastrack.toLowerCase()] || 'Otro';
}

function convertirDocAEvento(docSnap: any): EventoTelemetria {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    vehiculoId: data.vehiculoId,
    alias: data.alias,
    fecha: data.fecha?.toDate(),
    hora: data.hora,
    timestamp: data.timestamp?.toDate(),
    ubicacion: data.ubicacion || { lat: 0, lng: 0 },
    odometro: data.odometro || 0,
    tipoEvento: data.tipoEvento,
    categoriaEvento: data.categoriaEvento,
    datosEvento: data.datosEvento,
    viajeId: data.viajeId,
    fuenteDatos: data.fuenteDatos,
    importacionId: data.importacionId,
    createdAt: data.createdAt?.toDate(),
  };
}
