/**
 * Servicio para gestión de Personal Administrativo
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
  PersonalAdministrativo,
  PersonalAdministrativoFormInput,
  FiltrosPersonalAdministrativo,
} from '../types/staff.types';
import { PERMISOS_POR_ROL } from '../types/staff.types';

const COLLECTION = 'personal_administrativo';

// Obtener todo el personal administrativo
export async function obtenerPersonalAdministrativo(
  filtros?: FiltrosPersonalAdministrativo
): Promise<PersonalAdministrativo[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    let personal = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as PersonalAdministrativo[];

    // Ordenar en memoria por nombre
    personal.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    // Filtrar por activo
    if (filtros?.activo !== undefined) {
      personal = personal.filter(p => p.activo === filtros.activo);
    }

    // Filtrar por búsqueda
    if (filtros?.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      personal = personal.filter(p =>
        p.nombre.toLowerCase().includes(busqueda) ||
        p.email.toLowerCase().includes(busqueda) ||
        p.telefono?.includes(busqueda)
      );
    }

    // Filtrar por rol
    if (filtros?.rol) {
      personal = personal.filter(p => p.rol === filtros.rol);
    }

    return personal;
  } catch (error) {
    console.error('Error al obtener personal administrativo:', error);
    throw error;
  }
}

// Obtener una persona por ID
export async function obtenerPersona(id: string): Promise<PersonalAdministrativo | null> {
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
    } as PersonalAdministrativo;
  } catch (error) {
    console.error('Error al obtener persona:', error);
    throw error;
  }
}

// Crear personal administrativo
export async function crearPersonalAdministrativo(
  input: PersonalAdministrativoFormInput
): Promise<PersonalAdministrativo> {
  try {
    const ahora = Timestamp.now();

    // Si no se especifican permisos, usar los por defecto del rol
    const permisos = input.permisos?.length > 0
      ? input.permisos
      : PERMISOS_POR_ROL[input.rol] || [];

    const nuevoPersonal = {
      nombre: input.nombre,
      email: input.email,
      telefono: input.telefono,
      foto: input.foto || null,
      rol: input.rol,
      permisos,
      activo: true,
      createdAt: ahora,
      updatedAt: ahora,
    };

    const docRef = await addDoc(collection(db, COLLECTION), nuevoPersonal);

    return {
      id: docRef.id,
      ...nuevoPersonal,
      createdAt: ahora.toDate(),
      updatedAt: ahora.toDate(),
    } as PersonalAdministrativo;
  } catch (error) {
    console.error('Error al crear personal administrativo:', error);
    throw error;
  }
}

// Actualizar personal administrativo
export async function actualizarPersonalAdministrativo(
  id: string,
  input: Partial<PersonalAdministrativoFormInput>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    if (input.nombre !== undefined) updateData.nombre = input.nombre;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.telefono !== undefined) updateData.telefono = input.telefono;
    if (input.foto !== undefined) updateData.foto = input.foto;
    if (input.rol !== undefined) updateData.rol = input.rol;
    if (input.permisos !== undefined) updateData.permisos = input.permisos;

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error al actualizar personal administrativo:', error);
    throw error;
  }
}

// Desactivar personal
export async function desactivarPersonal(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      activo: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al desactivar personal:', error);
    throw error;
  }
}

// Reactivar personal
export async function reactivarPersonal(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      activo: true,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al reactivar personal:', error);
    throw error;
  }
}

// Eliminar personal permanentemente
export async function eliminarPersonal(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error al eliminar personal:', error);
    throw error;
  }
}

// Vincular con Firebase Auth
export async function vincularAuthUid(id: string, authUid: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      authUid,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al vincular Auth UID:', error);
    throw error;
  }
}
