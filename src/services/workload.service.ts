/**
 * Servicio de Optimización de Carga de Trabajo
 * Calcula carga por unidad, ruta crítica y sugerencias de redistribución
 */

import {
  WORKLOAD_CONFIG,
  ORIGEN_BASE_RMB,
  type ViajeParaCarga,
  type CargaUnidad,
  type RutaCriticaInfo,
  type AlertaCarga,
  type SugerenciaRedistribucion,
  type ResultadoOptimizacion,
} from '../types/workload.types';
import type { Coordenadas } from '../types/route.types';
import { calculateDistance, getDirections } from './mapbox.service';
import { estimarCostoCombustibleRuta } from './fuel.service';
import { estimateTollCost } from './mapbox.service';

/**
 * Calcula la carga de trabajo para todas las unidades
 */
export async function calcularCargaTrabajo(
  tractocamiones: Array<{
    id: string;
    label: string;
    marca: string;
    tipoUnidad: string;
    operadorNombre?: string;
  }>,
  viajes: ViajeParaCarga[]
): Promise<CargaUnidad[]> {
  const cargas: CargaUnidad[] = [];

  for (const tracto of tractocamiones) {
    const viajesUnidad = viajes.filter(v => v.tractoId === tracto.id);
    const kmTotales = viajesUnidad.reduce((sum, v) => sum + v.distanciaKm, 0);
    const horasEstimadas = kmTotales / WORKLOAD_CONFIG.AVG_SPEED_KMH +
      (viajesUnidad.length * WORKLOAD_CONFIG.SERVICE_TIME_MIN / 60);
    const porcentajeCarga = Math.round((kmTotales / WORKLOAD_CONFIG.TARGET_KM_PER_DAY) * 100);

    // Calcular costos estimados
    let costosCombustible = 0;
    let costosCasetas = 0;

    if (kmTotales > 0) {
      const estimacionCombustible = await estimarCostoCombustibleRuta(
        kmTotales,
        tracto.id,
        tracto.tipoUnidad
      );
      costosCombustible = estimacionCombustible.costoEstimado;
      costosCasetas = estimateTollCost(kmTotales, 'camion_2ejes');
    }

    // Determinar estado
    let estado: 'subutilizado' | 'normal' | 'sobrecargado' = 'normal';
    if (porcentajeCarga < WORKLOAD_CONFIG.UNDERLOAD_THRESHOLD) {
      estado = 'subutilizado';
    } else if (porcentajeCarga > WORKLOAD_CONFIG.OVERLOAD_THRESHOLD) {
      estado = 'sobrecargado';
    }

    // Calcular ruta crítica si hay viajes
    let rutaCritica: RutaCriticaInfo | null = null;
    if (viajesUnidad.length > 0) {
      rutaCritica = await calcularRutaCritica(viajesUnidad, ORIGEN_BASE_RMB, '06:00');
    }

    cargas.push({
      unitId: tracto.id,
      unitLabel: tracto.label,
      marca: tracto.marca,
      tipoUnidad: tracto.tipoUnidad,
      operadorNombre: tracto.operadorNombre,
      kmTotales,
      horasEstimadas: Math.round(horasEstimadas * 10) / 10,
      costosCombustible,
      costosCasetas,
      numViajes: viajesUnidad.length,
      porcentajeCarga,
      estado,
      viajes: viajesUnidad,
      rutaCritica,
    });
  }

  // Ordenar por porcentaje de carga descendente
  return cargas.sort((a, b) => b.porcentajeCarga - a.porcentajeCarga);
}

/**
 * Calcula la ruta crítica para una unidad (secuencia óptima de viajes)
 */
export async function calcularRutaCritica(
  viajes: ViajeParaCarga[],
  origenBase: Coordenadas,
  horaInicio: string = '06:00'
): Promise<RutaCriticaInfo> {
  if (viajes.length === 0) {
    return {
      secuencia: [],
      kmTotales: 0,
      kmMuertos: 0,
      tiempoTotalMin: 0,
      horaInicio,
      horaFin: horaInicio,
      horasLlegada: [],
      cumpleVentanas: [],
    };
  }

  // Si solo hay un viaje, la ruta es directa
  if (viajes.length === 1) {
    const viaje = viajes[0];
    const distanciaIda = viaje.distanciaKm;
    const tiempoIda = Math.round((distanciaIda / WORKLOAD_CONFIG.AVG_SPEED_KMH) * 60);
    const tiempoServicio = WORKLOAD_CONFIG.SERVICE_TIME_MIN;
    const kmMuertos = viaje.destinoCoordenadas
      ? calculateDistance(viaje.destinoCoordenadas, origenBase)
      : distanciaIda;

    const [h, m] = horaInicio.split(':').map(Number);
    const minInicio = h * 60 + m;
    const minLlegada = minInicio + tiempoIda;
    const minFin = minLlegada + tiempoServicio + Math.round((kmMuertos / WORKLOAD_CONFIG.AVG_SPEED_KMH) * 60);

    const horaLlegada = formatMinutesToTime(minLlegada);
    const horaFin = formatMinutesToTime(minFin);

    const cumpleVentana = verificarVentana(horaLlegada, viaje.ventanaInicio, viaje.ventanaFin);

    return {
      secuencia: [viaje],
      kmTotales: distanciaIda,
      kmMuertos: Math.round(kmMuertos),
      tiempoTotalMin: minFin - minInicio,
      horaInicio,
      horaFin,
      horasLlegada: [horaLlegada],
      cumpleVentanas: [cumpleVentana],
    };
  }

  // Optimizar secuencia con algoritmo de inserción + 2-opt
  const resultado = await optimizarSecuenciaViajes(viajes, origenBase, horaInicio);
  const secuenciaOptima = resultado.secuenciaOptima.map(i => viajes[i]);

  // Calcular tiempos y km para la secuencia optimizada
  let kmTotales = 0;
  let tiempoAcumuladoMin = 0;
  const horasLlegada: string[] = [];
  const cumpleVentanas: boolean[] = [];

  const [h, m] = horaInicio.split(':').map(Number);
  let minActual = h * 60 + m;

  // Distancia desde base al primer destino
  const primerViaje = secuenciaOptima[0];
  if (primerViaje.destinoCoordenadas) {
    const distBase = calculateDistance(origenBase, primerViaje.destinoCoordenadas);
    kmTotales += distBase;
    tiempoAcumuladoMin += Math.round((distBase / WORKLOAD_CONFIG.AVG_SPEED_KMH) * 60);
  } else {
    kmTotales += primerViaje.distanciaKm;
    tiempoAcumuladoMin += Math.round((primerViaje.distanciaKm / WORKLOAD_CONFIG.AVG_SPEED_KMH) * 60);
  }

  minActual += tiempoAcumuladoMin;
  horasLlegada.push(formatMinutesToTime(minActual));
  cumpleVentanas.push(verificarVentana(
    formatMinutesToTime(minActual),
    primerViaje.ventanaInicio,
    primerViaje.ventanaFin
  ));
  minActual += WORKLOAD_CONFIG.SERVICE_TIME_MIN;

  // Calcular para cada parada siguiente
  for (let i = 1; i < secuenciaOptima.length; i++) {
    const viajeAnterior = secuenciaOptima[i - 1];
    const viajeActual = secuenciaOptima[i];

    let distancia: number;
    if (viajeAnterior.destinoCoordenadas && viajeActual.destinoCoordenadas) {
      distancia = calculateDistance(viajeAnterior.destinoCoordenadas, viajeActual.destinoCoordenadas);
    } else {
      // Estimación si no hay coordenadas
      distancia = viajeActual.distanciaKm * 0.3; // Asumimos 30% de distancia entre destinos
    }

    kmTotales += distancia;
    const tiempoViaje = Math.round((distancia / WORKLOAD_CONFIG.AVG_SPEED_KMH) * 60);
    minActual += tiempoViaje;

    horasLlegada.push(formatMinutesToTime(minActual));
    cumpleVentanas.push(verificarVentana(
      formatMinutesToTime(minActual),
      viajeActual.ventanaInicio,
      viajeActual.ventanaFin
    ));

    minActual += WORKLOAD_CONFIG.SERVICE_TIME_MIN;
  }

  // Calcular km muertos (regreso a base)
  const ultimoViaje = secuenciaOptima[secuenciaOptima.length - 1];
  let kmMuertos = 0;
  if (ultimoViaje.destinoCoordenadas) {
    kmMuertos = Math.round(calculateDistance(ultimoViaje.destinoCoordenadas, origenBase));
  } else {
    kmMuertos = Math.round(ultimoViaje.distanciaKm * 0.8); // Estimación
  }

  const tiempoRegreso = Math.round((kmMuertos / WORKLOAD_CONFIG.AVG_SPEED_KMH) * 60);
  const minFin = minActual + tiempoRegreso;
  const tiempoTotalMin = minFin - (h * 60 + m);

  return {
    secuencia: secuenciaOptima,
    kmTotales: Math.round(kmTotales),
    kmMuertos,
    tiempoTotalMin,
    horaInicio,
    horaFin: formatMinutesToTime(minFin),
    horasLlegada,
    cumpleVentanas,
  };
}

/**
 * Optimiza la secuencia de viajes minimizando km y respetando ventanas de tiempo
 */
export async function optimizarSecuenciaViajes(
  viajes: ViajeParaCarga[],
  origenBase: Coordenadas,
  horaInicio: string = '06:00'
): Promise<ResultadoOptimizacion> {
  const n = viajes.length;

  if (n <= 1) {
    return {
      secuenciaOptima: n === 1 ? [0] : [],
      kmOriginales: viajes.reduce((sum, v) => sum + v.distanciaKm, 0),
      kmOptimizados: viajes.reduce((sum, v) => sum + v.distanciaKm, 0),
      kmAhorrados: 0,
      tiempoAhorradoMin: 0,
      cumpleTodasVentanas: true,
    };
  }

  // Construir matriz de distancias
  const puntos: Coordenadas[] = [origenBase];
  for (const viaje of viajes) {
    if (viaje.destinoCoordenadas) {
      puntos.push(viaje.destinoCoordenadas);
    } else {
      // Punto ficticio basado en distancia
      puntos.push({
        lat: origenBase.lat + (viaje.distanciaKm / 111), // ~111km por grado
        lng: origenBase.lng,
      });
    }
  }

  const matriz = construirMatrizDistancias(puntos);

  // Paso 1: Ordenar por ventana de tiempo (prioridad a las más tempranas)
  const indicesConVentana = viajes
    .map((v, i) => ({
      index: i,
      ventanaInicio: v.ventanaInicio ? timeToMinutes(v.ventanaInicio) : 1440,
      ventanaFin: v.ventanaFin ? timeToMinutes(v.ventanaFin) : 1440,
    }))
    .sort((a, b) => a.ventanaInicio - b.ventanaInicio);

  // Paso 2: Algoritmo de inserción más cercana con penalización
  let secuencia: number[] = [];
  const usados = new Set<number>();

  // Empezar con el viaje con ventana más temprana
  const primero = indicesConVentana[0].index;
  secuencia.push(primero);
  usados.add(primero);

  while (secuencia.length < n) {
    let mejorIndice = -1;
    let mejorCosto = Infinity;
    let mejorPosicion = 0;

    for (let i = 0; i < n; i++) {
      if (usados.has(i)) continue;

      // Probar insertar en cada posición
      for (let pos = 0; pos <= secuencia.length; pos++) {
        const costo = calcularCostoInsercion(secuencia, i, pos, matriz, viajes, horaInicio);
        if (costo < mejorCosto) {
          mejorCosto = costo;
          mejorIndice = i;
          mejorPosicion = pos;
        }
      }
    }

    if (mejorIndice !== -1) {
      secuencia.splice(mejorPosicion, 0, mejorIndice);
      usados.add(mejorIndice);
    }
  }

  // Paso 3: Mejora local con 2-opt
  secuencia = aplicar2Opt(secuencia, matriz, viajes, horaInicio);

  // Calcular métricas finales
  const kmOriginales = calcularKmSecuencia([...Array(n).keys()], matriz);
  const kmOptimizados = calcularKmSecuencia(secuencia, matriz);
  const kmAhorrados = kmOriginales - kmOptimizados;
  const tiempoAhorradoMin = Math.round((kmAhorrados / WORKLOAD_CONFIG.AVG_SPEED_KMH) * 60);

  // Verificar ventanas
  const cumpleTodasVentanas = verificarTodasVentanas(secuencia, viajes, horaInicio);

  return {
    secuenciaOptima: secuencia,
    kmOriginales: Math.round(kmOriginales),
    kmOptimizados: Math.round(kmOptimizados),
    kmAhorrados: Math.round(kmAhorrados),
    tiempoAhorradoMin,
    cumpleTodasVentanas,
  };
}

/**
 * Genera alertas de carga de trabajo
 */
export function generarAlertasCarga(cargas: CargaUnidad[]): AlertaCarga[] {
  const alertas: AlertaCarga[] = [];

  for (const carga of cargas) {
    if (carga.estado === 'sobrecargado') {
      alertas.push({
        tipo: 'sobrecarga',
        unitId: carga.unitId,
        unitLabel: carga.unitLabel,
        mensaje: `${carga.unitLabel} sobrecargado: ${carga.kmTotales}km (${carga.porcentajeCarga}%)`,
        severidad: 'error',
        detalles: {
          kmActuales: carga.kmTotales,
          kmObjetivo: WORKLOAD_CONFIG.TARGET_KM_PER_DAY,
        },
      });
    }

    if (carga.estado === 'subutilizado' && carga.numViajes > 0) {
      alertas.push({
        tipo: 'subutilizacion',
        unitId: carga.unitId,
        unitLabel: carga.unitLabel,
        mensaje: `${carga.unitLabel} subutilizado: ${carga.kmTotales}km (${carga.porcentajeCarga}%)`,
        severidad: 'warning',
        detalles: {
          kmActuales: carga.kmTotales,
          kmObjetivo: WORKLOAD_CONFIG.TARGET_KM_PER_DAY,
        },
      });
    }

    // Verificar conflictos de ventanas
    if (carga.rutaCritica && carga.rutaCritica.cumpleVentanas.some(c => !c)) {
      const viajesConflicto = carga.rutaCritica.secuencia
        .filter((_, i) => !carga.rutaCritica!.cumpleVentanas[i])
        .map(v => v.folio);

      alertas.push({
        tipo: 'conflicto_ventana',
        unitId: carga.unitId,
        unitLabel: carga.unitLabel,
        mensaje: `${carga.unitLabel} tiene ${viajesConflicto.length} viaje(s) con conflicto de horario`,
        severidad: 'warning',
        detalles: {
          viajesConflicto,
        },
      });
    }
  }

  return alertas;
}

/**
 * Sugiere redistribución de viajes entre unidades
 */
export function sugerirRedistribucion(cargas: CargaUnidad[]): SugerenciaRedistribucion[] {
  const sugerencias: SugerenciaRedistribucion[] = [];

  const sobrecargados = cargas.filter(c => c.estado === 'sobrecargado');
  const subutilizados = cargas.filter(c => c.estado === 'subutilizado' || (c.estado === 'normal' && c.porcentajeCarga < 70));

  for (const sobrecargado of sobrecargados) {
    if (sobrecargado.viajes.length <= 1) continue;

    // Buscar el viaje más fácil de redistribuir (el de mayor km que quepa en otra unidad)
    const viajesOrdenados = [...sobrecargado.viajes].sort((a, b) => b.distanciaKm - a.distanciaKm);

    for (const viaje of viajesOrdenados) {
      // Buscar unidad subutilizada que pueda recibir este viaje
      for (const destino of subutilizados) {
        const nuevaCargaDestino = destino.kmTotales + viaje.distanciaKm;
        const nuevoPorcentaje = Math.round((nuevaCargaDestino / WORKLOAD_CONFIG.TARGET_KM_PER_DAY) * 100);

        if (nuevoPorcentaje <= WORKLOAD_CONFIG.OVERLOAD_THRESHOLD) {
          const kmAhorrados = Math.round(
            (sobrecargado.kmTotales - WORKLOAD_CONFIG.TARGET_KM_PER_DAY) -
            (nuevaCargaDestino - destino.kmTotales)
          );

          sugerencias.push({
            viajeId: viaje.id,
            viajeFolio: viaje.folio,
            desdeUnitId: sobrecargado.unitId,
            desdeUnitLabel: sobrecargado.unitLabel,
            haciaUnitId: destino.unitId,
            haciaUnitLabel: destino.unitLabel,
            kmAhorrados: kmAhorrados > 0 ? kmAhorrados : 0,
            razon: `Redistribuir para balancear carga (${sobrecargado.porcentajeCarga}% → ${destino.porcentajeCarga}%)`,
          });

          break; // Solo una sugerencia por viaje
        }
      }
    }
  }

  return sugerencias;
}

// ==================== FUNCIONES AUXILIARES ====================

function construirMatrizDistancias(puntos: Coordenadas[]): number[][] {
  const n = puntos.length;
  const matriz: number[][] = [];

  for (let i = 0; i < n; i++) {
    matriz[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matriz[i][j] = 0;
      } else {
        matriz[i][j] = calculateDistance(puntos[i], puntos[j]);
      }
    }
  }

  return matriz;
}

function calcularCostoInsercion(
  secuencia: number[],
  nuevoIndice: number,
  posicion: number,
  matriz: number[][],
  viajes: ViajeParaCarga[],
  horaInicio: string
): number {
  // Costo base: distancia adicional
  let costoDistancia = 0;

  if (secuencia.length === 0) {
    // Distancia desde base (índice 0 en matriz) al nuevo punto
    costoDistancia = matriz[0][nuevoIndice + 1];
  } else if (posicion === 0) {
    // Insertar al inicio
    costoDistancia = matriz[0][nuevoIndice + 1] + matriz[nuevoIndice + 1][secuencia[0] + 1] - matriz[0][secuencia[0] + 1];
  } else if (posicion === secuencia.length) {
    // Insertar al final
    const ultimo = secuencia[secuencia.length - 1];
    costoDistancia = matriz[ultimo + 1][nuevoIndice + 1];
  } else {
    // Insertar en medio
    const antes = secuencia[posicion - 1];
    const despues = secuencia[posicion];
    costoDistancia = matriz[antes + 1][nuevoIndice + 1] + matriz[nuevoIndice + 1][despues + 1] - matriz[antes + 1][despues + 1];
  }

  // Penalización por incumplir ventana de tiempo
  const viaje = viajes[nuevoIndice];
  if (viaje.ventanaFin) {
    const tiempoHastaPos = calcularTiempoHastaPosicion(secuencia, posicion, matriz, horaInicio);
    const llegadaEstimada = timeToMinutes(horaInicio) + tiempoHastaPos + Math.round((costoDistancia / WORKLOAD_CONFIG.AVG_SPEED_KMH) * 60);
    const ventanaFin = timeToMinutes(viaje.ventanaFin);

    if (llegadaEstimada > ventanaFin) {
      costoDistancia += (llegadaEstimada - ventanaFin) * 10; // Penalización alta
    }
  }

  return costoDistancia;
}

function aplicar2Opt(
  secuencia: number[],
  matriz: number[][],
  viajes: ViajeParaCarga[],
  horaInicio: string
): number[] {
  let mejorado = true;
  let mejorSecuencia = [...secuencia];

  while (mejorado) {
    mejorado = false;

    for (let i = 0; i < mejorSecuencia.length - 1; i++) {
      for (let j = i + 2; j < mejorSecuencia.length; j++) {
        const nuevaSecuencia = [
          ...mejorSecuencia.slice(0, i + 1),
          ...mejorSecuencia.slice(i + 1, j + 1).reverse(),
          ...mejorSecuencia.slice(j + 1),
        ];

        const costoActual = calcularCostoTotal(mejorSecuencia, matriz, viajes, horaInicio);
        const costoNuevo = calcularCostoTotal(nuevaSecuencia, matriz, viajes, horaInicio);

        if (costoNuevo < costoActual) {
          mejorSecuencia = nuevaSecuencia;
          mejorado = true;
        }
      }
    }
  }

  return mejorSecuencia;
}

function calcularCostoTotal(
  secuencia: number[],
  matriz: number[][],
  viajes: ViajeParaCarga[],
  horaInicio: string
): number {
  let costo = calcularKmSecuencia(secuencia, matriz);

  // Añadir penalización por ventanas incumplidas
  let tiempoAcumulado = 0;
  const minInicio = timeToMinutes(horaInicio);

  for (let i = 0; i < secuencia.length; i++) {
    const idx = secuencia[i];
    const viaje = viajes[idx];

    if (i === 0) {
      tiempoAcumulado += Math.round((matriz[0][idx + 1] / WORKLOAD_CONFIG.AVG_SPEED_KMH) * 60);
    } else {
      tiempoAcumulado += Math.round((matriz[secuencia[i - 1] + 1][idx + 1] / WORKLOAD_CONFIG.AVG_SPEED_KMH) * 60);
    }

    const llegada = minInicio + tiempoAcumulado;

    if (viaje.ventanaFin) {
      const ventanaFin = timeToMinutes(viaje.ventanaFin);
      if (llegada > ventanaFin) {
        costo += (llegada - ventanaFin) * 5; // Penalización
      }
    }

    tiempoAcumulado += WORKLOAD_CONFIG.SERVICE_TIME_MIN;
  }

  return costo;
}

function calcularKmSecuencia(secuencia: number[], matriz: number[][]): number {
  if (secuencia.length === 0) return 0;

  let km = matriz[0][secuencia[0] + 1]; // Base al primero

  for (let i = 1; i < secuencia.length; i++) {
    km += matriz[secuencia[i - 1] + 1][secuencia[i] + 1];
  }

  return km;
}

function calcularTiempoHastaPosicion(
  secuencia: number[],
  posicion: number,
  matriz: number[][],
  horaInicio: string
): number {
  let tiempo = 0;

  for (let i = 0; i < posicion && i < secuencia.length; i++) {
    if (i === 0) {
      tiempo += Math.round((matriz[0][secuencia[i] + 1] / WORKLOAD_CONFIG.AVG_SPEED_KMH) * 60);
    } else {
      tiempo += Math.round((matriz[secuencia[i - 1] + 1][secuencia[i] + 1] / WORKLOAD_CONFIG.AVG_SPEED_KMH) * 60);
    }
    tiempo += WORKLOAD_CONFIG.SERVICE_TIME_MIN;
  }

  return tiempo;
}

function verificarTodasVentanas(
  secuencia: number[],
  viajes: ViajeParaCarga[],
  horaInicio: string
): boolean {
  const minInicio = timeToMinutes(horaInicio);
  let tiempoAcumulado = 0;

  for (let i = 0; i < secuencia.length; i++) {
    const viaje = viajes[secuencia[i]];
    // Simplificado: verificar llegada estimada vs ventana
    if (viaje.ventanaFin) {
      const llegadaEstimada = minInicio + tiempoAcumulado + (viaje.distanciaKm / WORKLOAD_CONFIG.AVG_SPEED_KMH) * 60;
      if (llegadaEstimada > timeToMinutes(viaje.ventanaFin)) {
        return false;
      }
    }
    tiempoAcumulado += (viaje.distanciaKm / WORKLOAD_CONFIG.AVG_SPEED_KMH) * 60 + WORKLOAD_CONFIG.SERVICE_TIME_MIN;
  }

  return true;
}

function verificarVentana(horaLlegada: string, ventanaInicio?: string, ventanaFin?: string): boolean {
  if (!ventanaInicio && !ventanaFin) return true;

  const llegada = timeToMinutes(horaLlegada);
  const inicio = ventanaInicio ? timeToMinutes(ventanaInicio) : 0;
  const fin = ventanaFin ? timeToMinutes(ventanaFin) : 1440;

  return llegada >= inicio && llegada <= fin;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
