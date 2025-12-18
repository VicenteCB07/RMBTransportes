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
import type { DocumentoExpediente, TipoDocumento } from '../types/truck.types';
import { arrayUnion } from 'firebase/firestore';
import { uploadVehicleDocument, deleteStorageFile, type UploadProgress } from './storage.service';

const COLLECTION = 'aditamentos';

// Obtener todos los aditamentos
export async function obtenerAditamentos(filtros?: FiltrosAditamento): Promise<Aditamento[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    let aditamentos = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        seguro: data.seguro ? {
          ...data.seguro,
          vigenciaInicio: data.seguro.vigenciaInicio?.toDate(),
          vigenciaFin: data.seguro.vigenciaFin?.toDate(),
        } : undefined,
        documentos: data.documentos?.map((d: { fechaSubida?: { toDate?: () => Date } }) => ({
          ...d,
          fechaSubida: d.fechaSubida?.toDate?.() || new Date(),
        })) || [],
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      };
    }) as Aditamento[];

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
      seguro: data.seguro ? {
        ...data.seguro,
        vigenciaInicio: data.seguro.vigenciaInicio?.toDate(),
        vigenciaFin: data.seguro.vigenciaFin?.toDate(),
      } : undefined,
      documentos: data.documentos?.map((d: { fechaSubida?: { toDate?: () => Date } }) => ({
        ...d,
        fechaSubida: d.fechaSubida?.toDate?.() || new Date(),
      })) || [],
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
      // Seguro
      seguro: input.seguro ? {
        poliza: input.seguro.poliza,
        aseguradora: input.seguro.aseguradora || null,
        costoAnual: input.seguro.costoAnual,
        vigenciaInicio: input.seguro.vigenciaInicio
          ? (input.seguro.vigenciaInicio instanceof Date
            ? Timestamp.fromDate(input.seguro.vigenciaInicio)
            : Timestamp.fromDate(new Date(input.seguro.vigenciaInicio)))
          : null,
        vigenciaFin: input.seguro.vigenciaFin
          ? (input.seguro.vigenciaFin instanceof Date
            ? Timestamp.fromDate(input.seguro.vigenciaFin)
            : Timestamp.fromDate(new Date(input.seguro.vigenciaFin)))
          : null,
      } : null,
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
      seguro: nuevoAditamento.seguro ? {
        poliza: nuevoAditamento.seguro.poliza,
        aseguradora: nuevoAditamento.seguro.aseguradora || undefined,
        costoAnual: nuevoAditamento.seguro.costoAnual,
        vigenciaInicio: nuevoAditamento.seguro.vigenciaInicio?.toDate(),
        vigenciaFin: nuevoAditamento.seguro.vigenciaFin?.toDate(),
      } : undefined,
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
    if (input.seguro !== undefined) {
      updateData.seguro = input.seguro ? {
        poliza: input.seguro.poliza,
        aseguradora: input.seguro.aseguradora || null,
        costoAnual: input.seguro.costoAnual,
        vigenciaInicio: input.seguro.vigenciaInicio
          ? (input.seguro.vigenciaInicio instanceof Date
            ? Timestamp.fromDate(input.seguro.vigenciaInicio)
            : Timestamp.fromDate(new Date(input.seguro.vigenciaInicio)))
          : null,
        vigenciaFin: input.seguro.vigenciaFin
          ? (input.seguro.vigenciaFin instanceof Date
            ? Timestamp.fromDate(input.seguro.vigenciaFin)
            : Timestamp.fromDate(new Date(input.seguro.vigenciaFin)))
          : null,
      } : null;
    }
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

// Tipo para el select de aditamentos con capacidades
export interface AditamentoSelectItem {
  id: string;
  label: string;
  tipo: string;
  // Capacidades de carga
  capacidadCarga?: number;  // Toneladas
  largo?: number;           // metros
  ancho?: number;           // metros
}

// Obtener aditamentos para select (con capacidades)
export async function obtenerAditamentosSelect(): Promise<AditamentoSelectItem[]> {
  try {
    const aditamentos = await obtenerAditamentos({ activo: true });
    return aditamentos.map(a => ({
      id: a.id,
      label: `${a.numeroEconomico} - ${a.tipo}${a.marca ? ` (${a.marca})` : ''}`,
      tipo: a.tipo,
      capacidadCarga: a.capacidadCarga,
      largo: a.largo,
      ancho: a.ancho,
    }));
  } catch (error) {
    console.error('Error al obtener aditamentos para select:', error);
    return [];
  }
}

// ==================== GESTIÓN DE DOCUMENTOS ====================

// Subir documento al expediente
export async function subirDocumentoAditamento(
  aditamentoId: string,
  file: File,
  categoria: TipoDocumento,
  notas?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<DocumentoExpediente> {
  try {
    const result = await uploadVehicleDocument(`aditamentos/${aditamentoId}`, file, onProgress);

    const documento: DocumentoExpediente = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nombre: result.name,
      tipo: result.type,
      url: result.url,
      path: result.path,
      tamaño: result.size,
      categoria,
      fechaSubida: new Date(),
    };

    // Crear objeto para Firestore sin campos undefined
    const documentoFirestore: Record<string, unknown> = {
      id: documento.id,
      nombre: documento.nombre,
      tipo: documento.tipo,
      url: documento.url,
      path: documento.path,
      tamaño: documento.tamaño,
      categoria: documento.categoria,
      fechaSubida: Timestamp.fromDate(documento.fechaSubida),
    };
    if (notas) documentoFirestore.notas = notas;

    // Guardar en Firestore usando arrayUnion
    const docRef = doc(db, COLLECTION, aditamentoId);
    await updateDoc(docRef, {
      documentos: arrayUnion(documentoFirestore),
      updatedAt: Timestamp.now(),
    });

    return documento;
  } catch (error) {
    console.error('Error al subir documento:', error);
    throw error;
  }
}

// Eliminar documento del expediente
export async function eliminarDocumentoAditamento(
  aditamentoId: string,
  documento: DocumentoExpediente
): Promise<void> {
  try {
    // Eliminar de Storage
    await deleteStorageFile(documento.path);

    // Eliminar de Firestore
    const docRef = doc(db, COLLECTION, aditamentoId);
    const aditamento = await obtenerAditamento(aditamentoId);

    if (aditamento?.documentos) {
      const documentosActualizados = aditamento.documentos.filter(d => d.id !== documento.id);
      await updateDoc(docRef, {
        documentos: documentosActualizados.map(d => ({
          ...d,
          fechaSubida: Timestamp.fromDate(d.fechaSubida),
        })),
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    throw error;
  }
}

// Obtener documentos de un aditamento
export async function obtenerDocumentosAditamento(aditamentoId: string): Promise<DocumentoExpediente[]> {
  try {
    const aditamento = await obtenerAditamento(aditamentoId);
    return aditamento?.documentos || [];
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    return [];
  }
}
