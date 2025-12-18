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
  DocumentoExpediente,
  TipoDocumento,
} from '../types/truck.types';
import { arrayUnion, arrayRemove } from 'firebase/firestore';
import { uploadVehicleDocument, deleteStorageFile, type UploadProgress } from './storage.service';

const COLLECTION = 'tractocamiones';

// Obtener todos los tractocamiones
export async function obtenerTractocamiones(filtros?: FiltrosTractocamion): Promise<Tractocamion[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    let tractocamiones = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        fechaAdquisicion: data.fechaAdquisicion?.toDate(),
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
    }) as Tractocamion[];

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
      // Capacidad de carga (para Roll-Off principalmente)
      plataformaCarga: input.plataformaCarga || null,
      gpsId: input.gpsId || null,
      tagId: input.tagId || null,
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
      seguro: nuevoTractocamion.seguro ? {
        poliza: nuevoTractocamion.seguro.poliza,
        aseguradora: nuevoTractocamion.seguro.aseguradora || undefined,
        costoAnual: nuevoTractocamion.seguro.costoAnual,
        vigenciaInicio: nuevoTractocamion.seguro.vigenciaInicio?.toDate(),
        vigenciaFin: nuevoTractocamion.seguro.vigenciaFin?.toDate(),
      } : undefined,
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
    if (input.plataformaCarga !== undefined) updateData.plataformaCarga = input.plataformaCarga;
    if (input.gpsId !== undefined) updateData.gpsId = input.gpsId;
    if (input.tagId !== undefined) updateData.tagId = input.tagId;
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

// Tipo para el select de tractocamiones con capacidades
export interface TractocamionSelectItem {
  id: string;
  label: string;
  marca: string;
  tipoUnidad: string;
  // Capacidades de carga (para rolloff-plataforma)
  plataformaCarga?: {
    largo: number;           // metros
    ancho: number;           // metros
    capacidadToneladas: number;
  };
}

// Obtener tractocamiones para select (con capacidades)
export async function obtenerTractocamionesSelect(): Promise<TractocamionSelectItem[]> {
  try {
    const tractocamiones = await obtenerTractocamiones({ activo: true });
    return tractocamiones.map(t => ({
      id: t.id,
      label: `${t.numeroEconomico} - ${t.marca} ${t.modelo}`,
      marca: t.marca,
      tipoUnidad: t.tipoUnidad || 'tractocamion',
      plataformaCarga: t.plataformaCarga,
    }));
  } catch (error) {
    console.error('Error al obtener tractocamiones para select:', error);
    return [];
  }
}

// ==================== GESTIÓN DE DOCUMENTOS ====================

// Subir documento al expediente
export async function subirDocumentoTractocamion(
  tractoId: string,
  file: File,
  categoria: TipoDocumento,
  notas?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<DocumentoExpediente> {
  try {
    const result = await uploadVehicleDocument(tractoId, file, onProgress);

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
    const docRef = doc(db, COLLECTION, tractoId);
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
export async function eliminarDocumentoTractocamion(
  tractoId: string,
  documento: DocumentoExpediente
): Promise<void> {
  try {
    // Eliminar de Storage
    await deleteStorageFile(documento.path);

    // Eliminar de Firestore
    const docRef = doc(db, COLLECTION, tractoId);
    const tracto = await obtenerTractocamion(tractoId);

    if (tracto?.documentos) {
      const documentosActualizados = tracto.documentos.filter(d => d.id !== documento.id);
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

// Obtener documentos de un tractocamion
export async function obtenerDocumentosTractocamion(tractoId: string): Promise<DocumentoExpediente[]> {
  try {
    const tracto = await obtenerTractocamion(tractoId);
    return tracto?.documentos || [];
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    return [];
  }
}
