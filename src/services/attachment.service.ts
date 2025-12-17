/**
 * Servicio para gestión de Aditamentos (Lowboys, Plataformas, etc.)
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
  Aditamento,
  AditamentoFormInput,
  FiltrosAditamento,
} from '../types/attachment.types';

const COLLECTION = 'aditamentos';

// Obtener todos los aditamentos
export async function obtenerAditamentos(filtros?: FiltrosAditamento): Promise<Aditamento[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    let aditamentos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Aditamento[];

    // Ordenar en memoria por número económico
    aditamentos.sort((a, b) => (a.numeroEconomico || '').localeCompare(b.numeroEconomico || ''));

    // Filtrar por activo
    if (filtros?.activo !== undefined) {
      aditamentos = aditamentos.filter(a => a.activo === filtros.activo);
    }

    // Filtrar por búsqueda
    if (filtros?.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      aditamentos = aditamentos.filter(a =>
        a.numeroEconomico.toLowerCase().includes(busqueda) ||
        a.tipo.toLowerCase().includes(busqueda) ||
        a.marca?.toLowerCase().includes(busqueda) ||
        a.modelo?.toLowerCase().includes(busqueda) ||
        a.placas?.toLowerCase().includes(busqueda)
      );
    }

    // Filtrar por tipo
    if (filtros?.tipo) {
      aditamentos = aditamentos.filter(a => a.tipo === filtros.tipo);
    }

    return aditamentos;
  } catch (error) {
    console.error('Error al obtener aditamentos:', error);
    throw error;
  }
}

// Obtener un aditamento por ID
export async function obtenerAditamento(id: string): Promise<Aditamento | null> {
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
    } as Aditamento;
  } catch (error) {
    console.error('Error al obtener aditamento:', error);
    throw error;
  }
}

// Crear aditamento
export async function crearAditamento(input: AditamentoFormInput): Promise<Aditamento> {
  try {
    const ahora = Timestamp.now();

    const nuevoAditamento = {
      numeroEconomico: input.numeroEconomico,
      tipo: input.tipo,
      marca: input.marca || null,
      modelo: input.modelo || null,
      año: input.año || null,
      placas: input.placas || null,
      numSerie: input.numSerie || null,
      capacidadCarga: input.capacidadCarga || null,
      largo: input.largo || null,
      ancho: input.ancho || null,
      activo: true,
      foto: input.foto || null,
      notas: input.notas || null,
      createdAt: ahora,
      updatedAt: ahora,
    };

    const docRef = await addDoc(collection(db, COLLECTION), nuevoAditamento);

    return {
      id: docRef.id,
      ...nuevoAditamento,
      createdAt: ahora.toDate(),
      updatedAt: ahora.toDate(),
    } as Aditamento;
  } catch (error) {
    console.error('Error al crear aditamento:', error);
    throw error;
  }
}

// Actualizar aditamento
export async function actualizarAditamento(
  id: string,
  input: Partial<AditamentoFormInput>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    if (input.numeroEconomico !== undefined) updateData.numeroEconomico = input.numeroEconomico;
    if (input.tipo !== undefined) updateData.tipo = input.tipo;
    if (input.marca !== undefined) updateData.marca = input.marca;
    if (input.modelo !== undefined) updateData.modelo = input.modelo;
    if (input.año !== undefined) updateData.año = input.año;
    if (input.placas !== undefined) updateData.placas = input.placas;
    if (input.numSerie !== undefined) updateData.numSerie = input.numSerie;
    if (input.capacidadCarga !== undefined) updateData.capacidadCarga = input.capacidadCarga;
    if (input.largo !== undefined) updateData.largo = input.largo;
    if (input.ancho !== undefined) updateData.ancho = input.ancho;
    if (input.foto !== undefined) updateData.foto = input.foto;
    if (input.notas !== undefined) updateData.notas = input.notas;

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error al actualizar aditamento:', error);
    throw error;
  }
}

// Desactivar aditamento
export async function desactivarAditamento(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      activo: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al desactivar aditamento:', error);
    throw error;
  }
}

// Reactivar aditamento
export async function reactivarAditamento(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      activo: true,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al reactivar aditamento:', error);
    throw error;
  }
}

// Eliminar aditamento permanentemente
export async function eliminarAditamento(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error al eliminar aditamento:', error);
    throw error;
  }
}

// Obtener aditamentos para select
export async function obtenerAditamentosSelect(): Promise<{ id: string; label: string; tipo: string }[]> {
  try {
    const aditamentos = await obtenerAditamentos({ activo: true });
    return aditamentos.map(a => ({
      id: a.id,
      label: `${a.numeroEconomico} - ${a.tipo}${a.marca ? ` (${a.marca})` : ''}`,
      tipo: a.tipo,
    }));
  } catch (error) {
    console.error('Error al obtener aditamentos para select:', error);
    return [];
  }
}
