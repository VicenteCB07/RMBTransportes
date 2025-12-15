/**
 * Modal para crear/editar costos
 * Incluye conversión de divisas y subida de comprobantes
 */

import { useState, useEffect } from 'react'
import { X, DollarSign, Loader2, Upload } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '../../utils/cn'
import {
  type CategoriaGasto,
  type EstadoGasto,
  type MetodoPago,
  CATEGORIAS_GASTO,
  ESTADOS_GASTO,
  METODOS_PAGO,
} from '../../types/cost.types'
import type { Currency } from '../../services/currency.service'
import { getExchangeRate, formatCurrency } from '../../services/currency.service'

// Schema de validación con Zod
const costoSchema = z.object({
  fecha: z.string().min(1, 'La fecha es requerida'),
  categoria: z.string().min(1, 'La categoría es requerida'),
  descripcion: z.string().min(3, 'La descripción debe tener al menos 3 caracteres'),
  monto: z.number().positive('El monto debe ser mayor a 0'),
  moneda: z.enum(['MXN', 'USD']),
  estado: z.enum(['pendiente', 'pagado', 'cancelado']),
  metodoPago: z.string().optional(),
  vehiculoId: z.string().optional(),
  proveedorNombre: z.string().optional(),
  proveedorRFC: z.string().optional(),
  numeroFactura: z.string().optional(),
  notas: z.string().optional(),
})

type CostoFormData = z.infer<typeof costoSchema>

interface CostFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CostoFormData & { montoMXN: number; tipoCambio?: number }) => Promise<void>
  vehiculos?: Array<{ id: string; numeroInterno: string; placa: string }>
  initialData?: Partial<CostoFormData>
  isEditing?: boolean
}

export default function CostFormModal({
  isOpen,
  onClose,
  onSubmit,
  vehiculos = [],
  initialData,
  isEditing = false,
}: CostFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number>(18.0)
  const [loadingRate, setLoadingRate] = useState(false)
  const [montoMXN, setMontoMXN] = useState<number>(0)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CostoFormData>({
    resolver: zodResolver(costoSchema),
    defaultValues: {
      fecha: new Date().toISOString().split('T')[0],
      categoria: '',
      descripcion: '',
      monto: 0,
      moneda: 'MXN',
      estado: 'pendiente',
      metodoPago: '',
      vehiculoId: '',
      proveedorNombre: '',
      proveedorRFC: '',
      numeroFactura: '',
      notas: '',
      ...initialData,
    },
  })

  const moneda = watch('moneda')
  const monto = watch('monto')

  // Cargar tipo de cambio
  useEffect(() => {
    const fetchRate = async () => {
      setLoadingRate(true)
      try {
        const rate = await getExchangeRate()
        setExchangeRate(rate)
      } catch (error) {
        console.error('Error fetching exchange rate:', error)
      } finally {
        setLoadingRate(false)
      }
    }
    fetchRate()
  }, [])

  // Calcular monto en MXN
  useEffect(() => {
    if (moneda === 'USD') {
      setMontoMXN(monto * exchangeRate)
    } else {
      setMontoMXN(monto)
    }
  }, [monto, moneda, exchangeRate])

  // Reset form cuando se abre
  useEffect(() => {
    if (isOpen && initialData) {
      reset({
        fecha: new Date().toISOString().split('T')[0],
        categoria: '',
        descripcion: '',
        monto: 0,
        moneda: 'MXN',
        estado: 'pendiente',
        ...initialData,
      })
    }
  }, [isOpen, initialData, reset])

  const handleFormSubmit = async (data: CostoFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit({
        ...data,
        montoMXN,
        tipoCambio: moneda === 'USD' ? exchangeRate : undefined,
      })
      reset()
      onClose()
    } catch (error) {
      console.error('Error submitting cost:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold text-[#1a1a1a]">
              {isEditing ? 'Editar Gasto' : 'Registrar Nuevo Gasto'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="p-4 space-y-4">
            {/* Fecha y Categoría */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  {...register('fecha')}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none',
                    errors.fecha ? 'border-red-500' : 'border-gray-300'
                  )}
                />
                {errors.fecha && (
                  <p className="text-red-500 text-xs mt-1">{errors.fecha.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Categoría *
                </label>
                <select
                  {...register('categoria')}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none',
                    errors.categoria ? 'border-red-500' : 'border-gray-300'
                  )}
                >
                  <option value="">Seleccionar...</option>
                  {Object.entries(CATEGORIAS_GASTO).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
                {errors.categoria && (
                  <p className="text-red-500 text-xs mt-1">{errors.categoria.message}</p>
                )}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                Descripción *
              </label>
              <input
                type="text"
                {...register('descripcion')}
                placeholder="Descripción del gasto..."
                className={cn(
                  'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none',
                  errors.descripcion ? 'border-red-500' : 'border-gray-300'
                )}
              />
              {errors.descripcion && (
                <p className="text-red-500 text-xs mt-1">{errors.descripcion.message}</p>
              )}
            </div>

            {/* Monto y Moneda */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Monto *
                </label>
                <div className="relative">
                  <DollarSign
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="number"
                    step="0.01"
                    {...register('monto', { valueAsNumber: true })}
                    placeholder="0.00"
                    className={cn(
                      'w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none',
                      errors.monto ? 'border-red-500' : 'border-gray-300'
                    )}
                  />
                </div>
                {errors.monto && (
                  <p className="text-red-500 text-xs mt-1">{errors.monto.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Moneda
                </label>
                <select
                  {...register('moneda')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            {/* Conversión de moneda */}
            {moneda === 'USD' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700">
                    Tipo de cambio: {loadingRate ? 'Cargando...' : `$${exchangeRate.toFixed(2)} MXN`}
                  </span>
                  <span className="font-medium text-blue-800">
                    Equivalente: {formatCurrency(montoMXN, 'MXN')}
                  </span>
                </div>
              </div>
            )}

            {/* Estado y Método de Pago */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Estado *
                </label>
                <select
                  {...register('estado')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                >
                  {Object.entries(ESTADOS_GASTO).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Método de Pago
                </label>
                <select
                  {...register('metodoPago')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {Object.entries(METODOS_PAGO).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vehículo */}
            {vehiculos.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Vehículo (opcional)
                </label>
                <select
                  {...register('vehiculoId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                >
                  <option value="">Sin asignar</option>
                  {vehiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.numeroInterno} - {v.placa}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Proveedor */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Proveedor
                </label>
                <input
                  type="text"
                  {...register('proveedorNombre')}
                  placeholder="Nombre del proveedor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  RFC Proveedor
                </label>
                <input
                  type="text"
                  {...register('proveedorRFC')}
                  placeholder="RFC"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none uppercase"
                />
              </div>
            </div>

            {/* Factura */}
            <div>
              <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                Número de Factura
              </label>
              <input
                type="text"
                {...register('numeroFactura')}
                placeholder="# de factura o comprobante"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
              />
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                Notas adicionales
              </label>
              <textarea
                {...register('notas')}
                rows={2}
                placeholder="Notas o comentarios..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none resize-none"
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[#3D3D3D] hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#BB0034] text-white rounded-lg hover:bg-[#9a002b] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isEditing ? 'Guardar Cambios' : 'Registrar Gasto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
