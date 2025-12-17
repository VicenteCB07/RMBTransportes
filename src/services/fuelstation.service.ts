/**
 * Servicio para gestión de Estaciones de Servicio
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
  EstacionServicio,
  EstacionServicioFormInput,
  FiltrosEstacionServicio,
} from '../types/fuelstation.types';

const COLLECTION = 'estaciones_servicio';

// Obtener todas las estaciones de servicio
export async function obtenerEstaciones(
  filtros?: FiltrosEstacionServicio
): Promise<EstacionServicio[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    let estaciones = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as EstacionServicio[];

    // Ordenar en memoria por nombre
    estaciones.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    // Filtrar por activo
    if (filtros?.activo !== undefined) {
      estaciones = estaciones.filter(e => e.activo === filtros.activo);
    }

    // Filtrar por búsqueda
    if (filtros?.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      estaciones = estaciones.filter(e =>
        e.nombre.toLowerCase().includes(busqueda) ||
        e.direccion.municipio?.toLowerCase().includes(busqueda) ||
        e.direccion.estado?.toLowerCase().includes(busqueda)
      );
    }

    // Filtrar por tipo de combustible
    if (filtros?.tipoCombustible) {
      estaciones = estaciones.filter(e =>
        e.tiposCombustible.includes(filtros.tipoCombustible!)
      );
    }

    // Filtrar por estado
    if (filtros?.estado) {
      estaciones = estaciones.filter(e => e.direccion.estado === filtros.estado);
    }

    return estaciones;
  } catch (error) {
    console.error('Error al obtener estaciones:', error);
    throw error;
  }
}

// Obtener una estación por ID
export async function obtenerEstacion(id: string): Promise<EstacionServicio | null> {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as EstacionServicio;
  } catch (error) {
    console.error('Error al obtener estación:', error);
    throw error;
  }
}

// Crear estación de servicio
export async function crearEstacion(input: EstacionServicioFormInput): Promise<EstacionServicio> {
  try {
    const ahora = Timestamp.now();

    const nuevaEstacion = {
      nombre: input.nombre,
      direccion: {
        calle: input.direccion.calle || '',
        numero: input.direccion.numero || null,
        colonia: input.direccion.colonia || null,
        municipio: input.direccion.municipio || '',
        estado: input.direccion.estado || '',
        codigoPostal: input.direccion.codigoPostal || null,
      },
      coordenadas: input.coordenadas || null,
      telefono: input.telefono || null,
      tiposCombustible: input.tiposCombustible,
      activo: true,
      notas: input.notas || null,
      createdAt: ahora,
      updatedAt: ahora,
    };

    const docRef = await addDoc(collection(db, COLLECTION), nuevaEstacion);

    return {
      id: docRef.id,
      ...nuevaEstacion,
      createdAt: ahora.toDate(),
      updatedAt: ahora.toDate(),
    } as EstacionServicio;
  } catch (error) {
    console.error('Error al crear estación:', error);
    throw error;
  }
}

// Actualizar estación de servicio
export async function actualizarEstacion(
  id: string,
  input: Partial<EstacionServicioFormInput>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    if (input.nombre !== undefined) updateData.nombre = input.nombre;
    if (input.direccion !== undefined) {
      updateData.direccion = {
        calle: input.direccion.calle || '',
        numero: input.direccion.numero || null,
        colonia: input.direccion.colonia || null,
        municipio: input.direccion.municipio || '',
        estado: input.direccion.estado || '',
        codigoPostal: input.direccion.codigoPostal || null,
      };
    }
    if (input.coordenadas !== undefined) updateData.coordenadas = input.coordenadas;
    if (input.telefono !== undefined) updateData.telefono = input.telefono;
    if (input.tiposCombustible !== undefined) updateData.tiposCombustible = input.tiposCombustible;
    if (input.notas !== undefined) updateData.notas = input.notas;

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error al actualizar estación:', error);
    throw error;
  }
}

// Desactivar estación
export async function desactivarEstacion(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      activo: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al desactivar estación:', error);
    throw error;
  }
}

// Reactivar estación
export async function reactivarEstacion(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      activo: true,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al reactivar estación:', error);
    throw error;
  }
}

// Eliminar estación permanentemente
export async function eliminarEstacion(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error al eliminar estación:', error);
    throw error;
  }
}

// Obtener estaciones para select
export async function obtenerEstacionesSelect(): Promise<{ id: string; nombre: string; ubicacion: string }[]> {
  try {
    const estaciones = await obtenerEstaciones({ activo: true });
    return estaciones.map(e => ({
      id: e.id,
      nombre: e.nombre,
      ubicacion: `${e.direccion.municipio}, ${e.direccion.estado}`,
    }));
  } catch (error) {
    console.error('Error al obtener estaciones para select:', error);
    return [];
  }
}
