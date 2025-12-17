/**
 * Servicio para gestión de Operadores
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
  Operador,
  OperadorFormInput,
  FiltrosOperador,
} from '../types/operator.types';

const COLLECTION = 'operadores';

// Obtener todos los operadores
export async function obtenerOperadores(filtros?: FiltrosOperador): Promise<Operador[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    let operadores = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      licencia: {
        ...doc.data().licencia,
        vigencia: doc.data().licencia?.vigencia?.toDate(),
      },
      fechaIngreso: doc.data().fechaIngreso?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Operador[];

    // Ordenar en memoria por nombre
    operadores.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    // Filtrar por activo
    if (filtros?.activo !== undefined) {
      operadores = operadores.filter(o => o.activo === filtros.activo);
    }

    // Filtrar por búsqueda
    if (filtros?.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      operadores = operadores.filter(o =>
        o.nombre.toLowerCase().includes(busqueda) ||
        o.licencia.numero.toLowerCase().includes(busqueda) ||
        o.telefono?.includes(busqueda)
      );
    }

    // Filtrar por tipo de licencia
    if (filtros?.tipoLicencia) {
      operadores = operadores.filter(o => o.licencia.tipo === filtros.tipoLicencia);
    }

    // Filtrar por tracto autorizado
    if (filtros?.tractoAutorizado) {
      operadores = operadores.filter(o =>
        o.tractosAutorizados?.includes(filtros.tractoAutorizado!)
      );
    }

    return operadores;
  } catch (error) {
    console.error('Error al obtener operadores:', error);
    throw error;
  }
}

// Obtener un operador por ID
export async function obtenerOperador(id: string): Promise<Operador | null> {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      licencia: {
        ...data.licencia,
        vigencia: data.licencia?.vigencia?.toDate(),
      },
      fechaIngreso: data.fechaIngreso?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as Operador;
  } catch (error) {
    console.error('Error al obtener operador:', error);
    throw error;
  }
}

// Crear operador
export async function crearOperador(input: OperadorFormInput): Promise<Operador> {
  try {
    const ahora = Timestamp.now();

    const nuevoOperador = {
      nombre: input.nombre,
      telefono: input.telefono,
      telefonoEmergencia: input.telefonoEmergencia || null,
      foto: input.foto || null,
      licencia: {
        numero: input.licencia.numero,
        tipo: input.licencia.tipo,
        vigencia: input.licencia.vigencia instanceof Date
          ? Timestamp.fromDate(input.licencia.vigencia)
          : Timestamp.fromDate(new Date(input.licencia.vigencia)),
      },
      sueldoDiario: input.sueldoDiario,
      tractosAutorizados: input.tractosAutorizados || [],
      fechaIngreso: input.fechaIngreso instanceof Date
        ? Timestamp.fromDate(input.fechaIngreso)
        : Timestamp.fromDate(new Date(input.fechaIngreso)),
      activo: true,
      notas: input.notas || null,
      createdAt: ahora,
      updatedAt: ahora,
    };

    const docRef = await addDoc(collection(db, COLLECTION), nuevoOperador);

    return {
      id: docRef.id,
      ...nuevoOperador,
      licencia: {
        ...nuevoOperador.licencia,
        vigencia: nuevoOperador.licencia.vigencia.toDate(),
      },
      fechaIngreso: nuevoOperador.fechaIngreso.toDate(),
      createdAt: ahora.toDate(),
      updatedAt: ahora.toDate(),
    } as Operador;
  } catch (error) {
    console.error('Error al crear operador:', error);
    throw error;
  }
}

// Actualizar operador
export async function actualizarOperador(
  id: string,
  input: Partial<OperadorFormInput>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    if (input.nombre !== undefined) updateData.nombre = input.nombre;
    if (input.telefono !== undefined) updateData.telefono = input.telefono;
    if (input.telefonoEmergencia !== undefined) updateData.telefonoEmergencia = input.telefonoEmergencia;
    if (input.foto !== undefined) updateData.foto = input.foto;
    if (input.sueldoDiario !== undefined) updateData.sueldoDiario = input.sueldoDiario;
    if (input.tractosAutorizados !== undefined) updateData.tractosAutorizados = input.tractosAutorizados;
    if (input.notas !== undefined) updateData.notas = input.notas;

    if (input.licencia) {
      updateData.licencia = {
        numero: input.licencia.numero,
        tipo: input.licencia.tipo,
        vigencia: input.licencia.vigencia instanceof Date
          ? Timestamp.fromDate(input.licencia.vigencia)
          : Timestamp.fromDate(new Date(input.licencia.vigencia)),
      };
    }

    if (input.fechaIngreso) {
      updateData.fechaIngreso = input.fechaIngreso instanceof Date
        ? Timestamp.fromDate(input.fechaIngreso)
        : Timestamp.fromDate(new Date(input.fechaIngreso));
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error al actualizar operador:', error);
    throw error;
  }
}

// Desactivar operador
export async function desactivarOperador(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      activo: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al desactivar operador:', error);
    throw error;
  }
}

// Reactivar operador
export async function reactivarOperador(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      activo: true,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al reactivar operador:', error);
    throw error;
  }
}

// Eliminar operador permanentemente
export async function eliminarOperador(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error al eliminar operador:', error);
    throw error;
  }
}

// Obtener operadores para select (formato simplificado)
export async function obtenerOperadoresSelect(): Promise<{
  id: string;
  nombre: string;
  licenciaTipo: string;
  sueldoDiario: number;
  tractosAutorizados: string[];
}[]> {
  try {
    const operadores = await obtenerOperadores({ activo: true });
    return operadores.map(o => ({
      id: o.id,
      nombre: o.nombre,
      licenciaTipo: o.licencia.tipo,
      sueldoDiario: o.sueldoDiario,
      tractosAutorizados: o.tractosAutorizados || [],
    }));
  } catch (error) {
    console.error('Error al obtener operadores para select:', error);
    return [];
  }
}
