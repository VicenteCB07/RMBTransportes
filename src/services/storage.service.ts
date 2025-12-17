/**
 * Servicio de Storage para Firebase
 * Maneja upload de documentos e imágenes con progreso
 */

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadTaskSnapshot,
} from 'firebase/storage'
import { storage } from './firebase'

export interface UploadProgress {
  progress: number
  bytesTransferred: number
  totalBytes: number
}

export interface UploadResult {
  url: string
  path: string
  name: string
  size: number
  type: string
}

/**
 * Tipos de archivo permitidos
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Valida si un archivo es una imagen
 */
export function isImageFile(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type)
}

/**
 * Valida si un archivo es un PDF
 */
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf'
}

/**
 * Valida si un archivo es un documento
 */
export function isDocumentFile(file: File): boolean {
  return ALLOWED_DOCUMENT_TYPES.includes(file.type)
}

/**
 * Limpia el nombre del archivo para URL
 */
function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_+/g, '_')
}

/**
 * Genera un nombre único para el archivo
 */
function generateFileName(originalName: string): string {
  const timestamp = Date.now()
  const sanitized = sanitizeFileName(originalName)
  return `${timestamp}_${sanitized}`
}

/**
 * Upload de documento para vehículo
 */
export async function uploadVehicleDocument(
  vehicleId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  if (!isDocumentFile(file) && !isPDFFile(file)) {
    throw new Error('Tipo de archivo no permitido. Solo PDF, DOC, DOCX.')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('El archivo excede el tamaño máximo de 10MB.')
  }

  const fileName = generateFileName(file.name)
  const storagePath = `vehiculos/${vehicleId}/documentos/${fileName}`
  const storageRef = ref(storage, storagePath)

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file)

    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress?.({
          progress,
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
        })
      },
      (error) => {
        console.error('Error uploading document:', error)
        reject(new Error('Error al subir el documento'))
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref)
          resolve({
            url,
            path: storagePath,
            name: file.name,
            size: file.size,
            type: file.type,
          })
        } catch (error) {
          reject(new Error('Error al obtener URL del documento'))
        }
      }
    )
  })
}

/**
 * Upload de imagen para vehículo
 */
export async function uploadVehicleImage(
  vehicleId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  if (!isImageFile(file)) {
    throw new Error('Tipo de archivo no permitido. Solo JPG, PNG, GIF, WebP.')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('El archivo excede el tamaño máximo de 10MB.')
  }

  const fileName = generateFileName(file.name)
  const storagePath = `vehiculos/${vehicleId}/imagenes/${fileName}`
  const storageRef = ref(storage, storagePath)

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file)

    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress?.({
          progress,
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
        })
      },
      (error) => {
        console.error('Error uploading image:', error)
        reject(new Error('Error al subir la imagen'))
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref)
          resolve({
            url,
            path: storagePath,
            name: file.name,
            size: file.size,
            type: file.type,
          })
        } catch (error) {
          reject(new Error('Error al obtener URL de la imagen'))
        }
      }
    )
  })
}

/**
 * Upload genérico de comprobante/factura
 */
export async function uploadComprobante(
  tipo: 'gastos' | 'viajes' | 'mantenimiento',
  registroId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  if (!isDocumentFile(file) && !isPDFFile(file) && !isImageFile(file)) {
    throw new Error('Tipo de archivo no permitido.')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('El archivo excede el tamaño máximo de 10MB.')
  }

  const fileName = generateFileName(file.name)
  const storagePath = `comprobantes/${tipo}/${registroId}/${fileName}`
  const storageRef = ref(storage, storagePath)

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file)

    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress?.({
          progress,
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
        })
      },
      (error) => {
        console.error('Error uploading comprobante:', error)
        reject(new Error('Error al subir el comprobante'))
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref)
          resolve({
            url,
            path: storagePath,
            name: file.name,
            size: file.size,
            type: file.type,
          })
        } catch (error) {
          reject(new Error('Error al obtener URL del comprobante'))
        }
      }
    )
  })
}

/**
 * Elimina un archivo de Storage
 */
export async function deleteStorageFile(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
  } catch (error) {
    console.error('Error deleting file:', error)
    throw new Error('Error al eliminar el archivo')
  }
}

/**
 * Obtiene la extensión de un archivo
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2)
}

/**
 * Formatea el tamaño del archivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
