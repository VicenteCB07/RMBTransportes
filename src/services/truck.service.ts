/**
 * Servicio para gestión de Tractocamiones
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Tractocamion,
  TractocamionFormInput,
  FiltrosTractocamion,
} from '../types/truck.types';

const COLLECTION = 'tractocamiones';

// Obtener todos los tractocamiones
export async function obtenerTractocamiones(filtros?: FiltrosTractocamion): Promise<Tractocamion[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    let tractocamiones = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fechaAdquisicion: doc.data().fechaAdquisicion?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Tractocamion[];

    // Ordenar en memoria por número económico
    tractocamiones.sort((a, b) => (a.numeroEconomico || '').localeCompare(b.numeroEconomico || ''));

    // Filtrar por activo
    if (filtros?.activo !== undefined) {
      tractocamiones = tractocamiones.filter(t => t.activo === filtros.activo);
    }

    // Filtrar por búsqueda
    if (filtros?.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      tractocamiones = tractocamiones.filter(t =>
        t.numeroEconomico.toLowerCase().includes(busqueda) ||
        t.marca.toLowerCase().includes(busqueda) ||
        t.modelo.toLowerCase().includes(busqueda) ||
        t.placas.toLowerCase().includes(busqueda) ||
        t.numSerie.toLowerCase().includes(busqueda)
      );
    }

    // Filtrar por marca
    if (filtros?.marca) {
      tractocamiones = tractocamiones.filter(t => t.marca === filtros.marca);
    }

    return tractocamiones;
  } catch (error) {
    console.error('Error al obtener tractocamiones:', error);
    throw error;
  }
}

// Obtener un tractocamion por ID
export async function obtenerTractocamion(id: string): Promise<Tractocamion | null> {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      fechaAdquisicion: data.fechaAdquisicion?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as Tractocamion;
  } catch (error) {
    console.error('Error al obtener tractocamion:', error);
    throw error;
  }
}

// Crear tractocamion
export async function crearTractocamion(input: TractocamionFormInput): Promise<Tractocamion> {
  try {
    const ahora = Timestamp.now();

    const nuevoTractocamion = {
      tipoUnidad: input.tipoUnidad || 'tractocamion',
      numeroEconomico: input.numeroEconomico,
      marca: input.marca,
      modelo: input.modelo,
      año: input.año,
      placas: input.placas,
      numSerie: input.numSerie,
      color: input.color || null,
      capacidadCombustible: input.capacidadCombustible || null,
      rendimientoPromedio: input.rendimientoPromedio || null,
      odometroActual: input.odometroActual || 0,
      gpsId: input.gpsId || null,
      tagId: input.tagId || null,
      fechaAdquisicion: input.fechaAdquisicion
        ? (input.fechaAdquisicion instanceof Date
          ? Timestamp.fromDate(input.fechaAdquisicion)
          : Timestamp.fromDate(new Date(input.fechaAdquisicion)))
        : null,
      activo: true,
      foto: input.foto || null,
      notas: input.notas || null,
      createdAt: ahora,
      updatedAt: ahora,
    };

    const docRef = await addDoc(collection(db, COLLECTION), nuevoTractocamion);

    return {
      id: docRef.id,
      ...nuevoTractocamion,
      fechaAdquisicion: nuevoTractocamion.fechaAdquisicion?.toDate(),
      createdAt: ahora.toDate(),
      updatedAt: ahora.toDate(),
    } as Tractocamion;
  } catch (error) {
    console.error('Error al crear tractocamion:', error);
    throw error;
  }
}

// Actualizar tractocamion
export async function actualizarTractocamion(
  id: string,
  input: Partial<TractocamionFormInput>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    if (input.tipoUnidad !== undefined) updateData.tipoUnidad = input.tipoUnidad;
    if (input.numeroEconomico !== undefined) updateData.numeroEconomico = input.numeroEconomico;
    if (input.marca !== undefined) updateData.marca = input.marca;
    if (input.modelo !== undefined) updateData.modelo = input.modelo;
    if (input.año !== undefined) updateData.año = input.año;
    if (input.placas !== undefined) updateData.placas = input.placas;
    if (input.numSerie !== undefined) updateData.numSerie = input.numSerie;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.capacidadCombustible !== undefined) updateData.capacidadCombustible = input.capacidadCombustible;
    if (input.rendimientoPromedio !== undefined) updateData.rendimientoPromedio = input.rendimientoPromedio;
    if (input.odometroActual !== undefined) updateData.odometroActual = input.odometroActual;
    if (input.gpsId !== undefined) updateData.gpsId = input.gpsId;
    if (input.tagId !== undefined) updateData.tagId = input.tagId;
    if (input.foto !== undefined) updateData.foto = input.foto;
    if (input.notas !== undefined) updateData.notas = input.notas;

    if (input.fechaAdquisicion) {
      updateData.fechaAdquisicion = input.fechaAdquisicion instanceof Date
        ? Timestamp.fromDate(input.fechaAdquisicion)
        : Timestamp.fromDate(new Date(input.fechaAdquisicion));
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error al actualizar tractocamion:', error);
    throw error;
  }
}

// Actualizar odómetro
export async function actualizarOdometro(id: string, kilometros: number): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      odometroActual: kilometros,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al actualizar odómetro:', error);
    throw error;
  }
}

// Desactivar tractocamion
export async function desactivarTractocamion(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      activo: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al desactivar tractocamion:', error);
    throw error;
  }
}

// Reactivar tractocamion
export async function reactivarTractocamion(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      activo: true,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al reactivar tractocamion:', error);
    throw error;
  }
}

// Eliminar tractocamion permanentemente
export async function eliminarTractocamion(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error al eliminar tractocamion:', error);
    throw error;
  }
}

// Obtener tractocamiones para select
export async function obtenerTractocamionesSelect(): Promise<{ id: string; label: string; marca: string; tipoUnidad: string }[]> {
  try {
    const tractocamiones = await obtenerTractocamiones({ activo: true });
    return tractocamiones.map(t => ({
      id: t.id,
      label: `${t.numeroEconomico} - ${t.marca} ${t.modelo}`,
      marca: t.marca,
      tipoUnidad: t.tipoUnidad || 'tractocamion',
    }));
  } catch (error) {
    console.error('Error al obtener tractocamiones para select:', error);
    return [];
  }
}
