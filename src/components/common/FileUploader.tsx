/**
 * Componente de carga de archivos con drag & drop
 * Soporta múltiples archivos con barra de progreso
 */

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, Image, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'
import { formatFileSize, isImageFile, isPDFFile } from '../../services/storage.service'

export interface UploadedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  url?: string
  error?: string
}

interface FileUploaderProps {
  onUpload: (file: File, onProgress: (progress: number) => void) => Promise<string>
  onRemove?: (fileId: string) => void
  accept?: Record<string, string[]>
  maxFiles?: number
  maxSize?: number
  label?: string
  hint?: string
  disabled?: boolean
  className?: string
}

const DEFAULT_ACCEPT = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  'application/pdf': ['.pdf'],
}

export default function FileUploader({
  onUpload,
  onRemove,
  accept = DEFAULT_ACCEPT,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  label = 'Subir archivos',
  hint = 'Arrastra archivos aquí o haz clic para seleccionar',
  disabled = false,
  className,
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])

  const uploadFile = async (uploadedFile: UploadedFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadedFile.id ? { ...f, status: 'uploading' as const } : f
      )
    )

    try {
      const url = await onUpload(uploadedFile.file, (progress) => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id ? { ...f, progress } : f
          )
        )
      })

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? { ...f, status: 'success' as const, progress: 100, url }
            : f
        )
      )
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Error al subir',
              }
            : f
        )
      )
    }
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'pending' as const,
      }))

      setFiles((prev) => [...prev, ...newFiles])

      // Iniciar upload de cada archivo
      newFiles.forEach((file) => uploadFile(file))
    },
    [onUpload]
  )

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
    onRemove?.(fileId)
  }

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles - files.length,
    maxSize,
    disabled: disabled || files.length >= maxFiles,
  })

  const getFileIcon = (file: UploadedFile) => {
    if (isImageFile(file.file)) {
      return <Image size={20} className="text-blue-500" />
    }
    if (isPDFFile(file.file)) {
      return <FileText size={20} className="text-red-500" />
    }
    return <FileText size={20} className="text-gray-500" />
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 size={16} className="text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <label className="block text-sm font-medium text-[#3D3D3D]">{label}</label>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragActive && !isDragReject && 'border-[#BB0034] bg-red-50',
          isDragReject && 'border-red-500 bg-red-50',
          !isDragActive && !isDragReject && 'border-gray-300 hover:border-[#BB0034]',
          (disabled || files.length >= maxFiles) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <Upload
          size={32}
          className={cn(
            'mx-auto mb-2',
            isDragActive ? 'text-[#BB0034]' : 'text-gray-400'
          )}
        />
        <p className="text-sm text-[#3D3D3D]">{hint}</p>
        <p className="text-xs text-gray-400 mt-1">
          Máximo {maxFiles} archivos, {formatFileSize(maxSize)} cada uno
        </p>
      </div>

      {/* Lista de archivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              {/* Icono */}
              {getFileIcon(file)}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1a1a1a] truncate">
                  {file.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </span>
                  {file.status === 'uploading' && (
                    <span className="text-xs text-blue-500">
                      {Math.round(file.progress)}%
                    </span>
                  )}
                  {file.status === 'error' && (
                    <span className="text-xs text-red-500">{file.error}</span>
                  )}
                </div>

                {/* Barra de progreso */}
                {file.status === 'uploading' && (
                  <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#BB0034] transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Status icon */}
              {getStatusIcon(file.status)}

              {/* Remove button */}
              <button
                onClick={() => removeFile(file.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                type="button"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
