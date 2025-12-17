/**
 * Servicio para gestión de Maniobristas
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
  Maniobrista,
  ManiobristaFormInput,
  FiltrosManiobrista,
} from '../types/maniobrista.types';

const COLLECTION = 'maniobristas';

// Obtener todos los maniobristas
export async function obtenerManiobristas(filtros?: FiltrosManiobrista): Promise<Maniobrista[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    let maniobristas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fechaIngreso: doc.data().fechaIngreso?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Maniobrista[];

    // Ordenar en memoria por nombre
    maniobristas.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    // Filtrar por activo
    if (filtros?.activo !== undefined) {
      maniobristas = maniobristas.filter(m => m.activo === filtros.activo);
    }

    // Filtrar por búsqueda
    if (filtros?.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      maniobristas = maniobristas.filter(m =>
        m.nombre.toLowerCase().includes(busqueda) ||
        m.telefono?.includes(busqueda)
      );
    }

    return maniobristas;
  } catch (error) {
    console.error('Error al obtener maniobristas:', error);
    throw error;
  }
}

// Obtener un maniobrista por ID
export async function obtenerManiobrista(id: string): Promise<Maniobrista | null> {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      fechaIngreso: data.fechaIngreso?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as Maniobrista;
  } catch (error) {
    console.error('Error al obtener maniobrista:', error);
    throw error;
  }
}

// Crear maniobrista
export async function crearManiobrista(input: ManiobristaFormInput): Promise<Maniobrista> {
  try {
    const ahora = Timestamp.now();

    const nuevoManiobrista = {
      nombre: input.nombre,
      telefono: input.telefono,
      foto: input.foto || null,
      sueldoDiario: input.sueldoDiario,
      fechaIngreso: input.fechaIngreso instanceof Date
        ? Timestamp.fromDate(input.fechaIngreso)
        : Timestamp.fromDate(new Date(input.fechaIngreso)),
      activo: true,
      notas: input.notas || null,
      createdAt: ahora,
      updatedAt: ahora,
    };

    const docRef = await addDoc(collection(db, COLLECTION), nuevoManiobrista);

    return {
      id: docRef.id,
      ...nuevoManiobrista,
      fechaIngreso: nuevoManiobrista.fechaIngreso.toDate(),
      createdAt: ahora.toDate(),
      updatedAt: ahora.toDate(),
    } as Maniobrista;
  } catch (error) {
    console.error('Error al crear maniobrista:', error);
    throw error;
  }
}

// Actualizar maniobrista
export async function actualizarManiobrista(
  id: string,
  input: Partial<ManiobristaFormInput>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    if (input.nombre !== undefined) updateData.nombre = input.nombre;
    if (input.telefono !== undefined) updateData.telefono = input.telefono;
    if (input.foto !== undefined) updateData.foto = input.foto;
    if (input.sueldoDiario !== undefined) updateData.sueldoDiario = input.sueldoDiario;
    if (input.notas !== undefined) updateData.notas = input.notas;

    if (input.fechaIngreso) {
      updateData.fechaIngreso = input.fechaIngreso instanceof Date
        ? Timestamp.fromDate(input.fechaIngreso)
        : Timestamp.fromDate(new Date(input.fechaIngreso));
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error al actualizar maniobrista:', error);
    throw error;
  }
}

// Desactivar maniobrista
export async function desactivarManiobrista(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      activo: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al desactivar maniobrista:', error);
    throw error;
  }
}

// Reactivar maniobrista
export async function reactivarManiobrista(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      activo: true,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al reactivar maniobrista:', error);
    throw error;
  }
}

// Eliminar maniobrista permanentemente
export async function eliminarManiobrista(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error al eliminar maniobrista:', error);
    throw error;
  }
}

// Obtener maniobristas para select
export async function obtenerManiobrristasSelect(): Promise<{ id: string; nombre: string; sueldoDiario: number }[]> {
  try {
    const maniobristas = await obtenerManiobristas({ activo: true });
    return maniobristas.map(m => ({
      id: m.id,
      nombre: m.nombre,
      sueldoDiario: m.sueldoDiario,
    }));
  } catch (error) {
    console.error('Error al obtener maniobristas para select:', error);
    return [];
  }
}

// Alias con nombre correcto
export const obtenerManiobristasSelect = obtenerManiobrristasSelect;
