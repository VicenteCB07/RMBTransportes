/**
 * Servicio para gestión de Inventario EPP y Herramientas
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
  ItemInventario,
  ItemInventarioFormInput,
  FiltrosInventario,
  RequisitosReglamentarios,
  RequisitosReglamentariosFormInput,
} from '../types/inventory.types';

const COLLECTION = 'inventario';
const REQUISITOS_COLLECTION = 'requisitos_reglamentarios';

// ==================== INVENTARIO ====================

// Obtener todos los items del inventario
export async function obtenerInventario(filtros?: FiltrosInventario): Promise<ItemInventario[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    let items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fechaAsignacion: doc.data().fechaAsignacion?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ItemInventario[];

    // Ordenar en memoria por nombre
    items.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    // Filtrar por búsqueda
    if (filtros?.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      items = items.filter(i =>
        i.nombre.toLowerCase().includes(busqueda) ||
        i.categoria.toLowerCase().includes(busqueda) ||
        i.asignadoA?.nombre?.toLowerCase().includes(busqueda)
      );
    }

    // Filtrar por categoría
    if (filtros?.categoria) {
      items = items.filter(i => i.categoria === filtros.categoria);
    }

    // Filtrar por condición
    if (filtros?.condicion) {
      items = items.filter(i => i.condicion === filtros.condicion);
    }

    // Filtrar por asignación
    if (filtros?.asignadoA) {
      items = items.filter(i => i.asignadoA?.id === filtros.asignadoA);
    }

    return items;
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    throw error;
  }
}

// Obtener un item por ID
export async function obtenerItem(id: string): Promise<ItemInventario | null> {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      fechaAsignacion: data.fechaAsignacion?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as ItemInventario;
  } catch (error) {
    console.error('Error al obtener item:', error);
    throw error;
  }
}

// Crear item de inventario
export async function crearItem(input: ItemInventarioFormInput): Promise<ItemInventario> {
  try {
    const ahora = Timestamp.now();

    const nuevoItem = {
      nombre: input.nombre,
      categoria: input.categoria,
      cantidad: input.cantidad,
      asignadoA: input.asignadoA || null,
      fechaAsignacion: input.fechaAsignacion
        ? (input.fechaAsignacion instanceof Date
          ? Timestamp.fromDate(input.fechaAsignacion)
          : Timestamp.fromDate(new Date(input.fechaAsignacion)))
        : null,
      condicion: input.condicion,
      foto: input.foto || null,
      notas: input.notas || null,
      createdAt: ahora,
      updatedAt: ahora,
    };

    const docRef = await addDoc(collection(db, COLLECTION), nuevoItem);

    return {
      id: docRef.id,
      ...nuevoItem,
      fechaAsignacion: nuevoItem.fechaAsignacion?.toDate(),
      createdAt: ahora.toDate(),
      updatedAt: ahora.toDate(),
    } as ItemInventario;
  } catch (error) {
    console.error('Error al crear item:', error);
    throw error;
  }
}

// Actualizar item de inventario
export async function actualizarItem(
  id: string,
  input: Partial<ItemInventarioFormInput>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    if (input.nombre !== undefined) updateData.nombre = input.nombre;
    if (input.categoria !== undefined) updateData.categoria = input.categoria;
    if (input.cantidad !== undefined) updateData.cantidad = input.cantidad;
    if (input.asignadoA !== undefined) updateData.asignadoA = input.asignadoA;
    if (input.condicion !== undefined) updateData.condicion = input.condicion;
    if (input.foto !== undefined) updateData.foto = input.foto;
    if (input.notas !== undefined) updateData.notas = input.notas;

    if (input.fechaAsignacion) {
      updateData.fechaAsignacion = input.fechaAsignacion instanceof Date
        ? Timestamp.fromDate(input.fechaAsignacion)
        : Timestamp.fromDate(new Date(input.fechaAsignacion));
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error al actualizar item:', error);
    throw error;
  }
}

// Asignar item a operador o tracto
export async function asignarItem(
  itemId: string,
  asignacion: { tipo: 'operador' | 'tracto' | 'almacen'; id: string; nombre: string }
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, itemId);
    await updateDoc(docRef, {
      asignadoA: asignacion,
      fechaAsignacion: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al asignar item:', error);
    throw error;
  }
}

// Devolver item al almacén
export async function devolverItem(itemId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, itemId);
    await updateDoc(docRef, {
      asignadoA: { tipo: 'almacen', id: 'almacen', nombre: 'Almacén' },
      fechaAsignacion: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al devolver item:', error);
    throw error;
  }
}

// Eliminar item permanentemente
export async function eliminarItem(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error al eliminar item:', error);
    throw error;
  }
}

// ==================== REQUISITOS REGLAMENTARIOS ====================

// Obtener requisitos por tractocamión
export async function obtenerRequisitosPorTracto(
  tractocamionId: string
): Promise<RequisitosReglamentarios | null> {
  try {
    const snapshot = await getDocs(collection(db, REQUISITOS_COLLECTION));
    const docs = snapshot.docs.filter(d => d.data().tractocamionId === tractocamionId);

    if (docs.length === 0) return null;

    const data = docs[0].data();
    return {
      id: docs[0].id,
      ...data,
      extintorVigencia: data.extintorVigencia?.toDate(),
      ultimaRevision: data.ultimaRevision?.toDate(),
      proximaRevision: data.proximaRevision?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as RequisitosReglamentarios;
  } catch (error) {
    console.error('Error al obtener requisitos:', error);
    throw error;
  }
}

// Crear o actualizar requisitos reglamentarios
export async function guardarRequisitos(
  input: RequisitosReglamentariosFormInput
): Promise<RequisitosReglamentarios> {
  try {
    const ahora = Timestamp.now();

    // Buscar si ya existe
    const existente = await obtenerRequisitosPorTracto(input.tractocamionId);

    const requisitosData = {
      tractocamionId: input.tractocamionId,
      llantaRefaccion: input.llantaRefaccion,
      llantaRefaccionCondicion: input.llantaRefaccionCondicion || null,
      gato: input.gato,
      llaveCruz: input.llaveCruz,
      triangulos: input.triangulos,
      cantidadTriangulos: input.cantidadTriangulos || 2,
      extintor: input.extintor,
      extintorVigencia: input.extintorVigencia
        ? (input.extintorVigencia instanceof Date
          ? Timestamp.fromDate(input.extintorVigencia)
          : Timestamp.fromDate(new Date(input.extintorVigencia)))
        : null,
      botiquin: input.botiquin,
      chalecosReflejantes: input.chalecosReflejantes,
      cablesArranque: input.cablesArranque || false,
      linterna: input.linterna || false,
      ultimaRevision: input.ultimaRevision instanceof Date
        ? Timestamp.fromDate(input.ultimaRevision)
        : Timestamp.fromDate(new Date(input.ultimaRevision)),
      proximaRevision: input.proximaRevision
        ? (input.proximaRevision instanceof Date
          ? Timestamp.fromDate(input.proximaRevision)
          : Timestamp.fromDate(new Date(input.proximaRevision)))
        : null,
      revisadoPor: input.revisadoPor || null,
      notas: input.notas || null,
      updatedAt: ahora,
    };

    if (existente) {
      // Actualizar
      const docRef = doc(db, REQUISITOS_COLLECTION, existente.id);
      await updateDoc(docRef, requisitosData);

      return {
        ...existente,
        ...requisitosData,
        extintorVigencia: requisitosData.extintorVigencia?.toDate(),
        ultimaRevision: requisitosData.ultimaRevision.toDate(),
        proximaRevision: requisitosData.proximaRevision?.toDate(),
        updatedAt: ahora.toDate(),
      } as RequisitosReglamentarios;
    } else {
      // Crear nuevo
      const nuevoReq = {
        ...requisitosData,
        createdAt: ahora,
      };

      const docRef = await addDoc(collection(db, REQUISITOS_COLLECTION), nuevoReq);

      return {
        id: docRef.id,
        ...nuevoReq,
        extintorVigencia: nuevoReq.extintorVigencia?.toDate(),
        ultimaRevision: nuevoReq.ultimaRevision.toDate(),
        proximaRevision: nuevoReq.proximaRevision?.toDate(),
        createdAt: ahora.toDate(),
        updatedAt: ahora.toDate(),
      } as RequisitosReglamentarios;
    }
  } catch (error) {
    console.error('Error al guardar requisitos:', error);
    throw error;
  }
}

// Obtener items asignados a un operador
export async function obtenerItemsPorOperador(operadorId: string): Promise<ItemInventario[]> {
  try {
    const items = await obtenerInventario();
    return items.filter(i => i.asignadoA?.tipo === 'operador' && i.asignadoA?.id === operadorId);
  } catch (error) {
    console.error('Error al obtener items por operador:', error);
    throw error;
  }
}

// Obtener items asignados a un tractocamión
export async function obtenerItemsPorTracto(tractoId: string): Promise<ItemInventario[]> {
  try {
    const items = await obtenerInventario();
    return items.filter(i => i.asignadoA?.tipo === 'tracto' && i.asignadoA?.id === tractoId);
  } catch (error) {
    console.error('Error al obtener items por tracto:', error);
    throw error;
  }
}
