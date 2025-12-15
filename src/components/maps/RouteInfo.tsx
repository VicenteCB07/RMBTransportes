/**
 * Componente para mostrar información detallada de una ruta
 * Incluye distancia, tiempo, costos estimados y alertas
 */

import {
  Clock,
  MapPin,
  Fuel,
  DollarSign,
  AlertTriangle,
  Shield,
  Route,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'
import type { NivelRiesgo } from '../../types/route.types'
import { NIVELES_RIESGO } from '../../types/route.types'
import { cn } from '../../utils/cn'
import { formatCurrency } from '../../services/currency.service'

interface RouteInfoProps {
  distanceKm: number
  durationMin: number
  costoCasetas: number
  costoCombustible: number
  nivelRiesgo?: NivelRiesgo
  restricciones?: string[]
  waypoints?: Array<{
    name: string
    type: string
  }>
  onOptimize?: () => void
  isOptimizing?: boolean
  className?: string
}

export default function RouteInfo({
  distanceKm,
  durationMin,
  costoCasetas,
  costoCombustible,
  nivelRiesgo = 'bajo',
  restricciones = [],
  waypoints = [],
  onOptimize,
  isOptimizing = false,
  className,
}: RouteInfoProps) {
  const [showDetails, setShowDetails] = useState(false)

  const costoTotal = costoCasetas + costoCombustible
  const riesgoInfo = NIVELES_RIESGO[nivelRiesgo]

  // Formatear duración
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    if (hours > 0) {
      return `${hours}h ${mins}min`
    }
    return `${mins} min`
  }

  return (
    <div className={cn('bg-white rounded-lg shadow-md overflow-hidden', className)}>
      {/* Header con datos principales */}
      <div className="p-4 bg-gradient-to-r from-[#1a1a1a] to-[#3D3D3D] text-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2">
            <Route size={20} />
            Resumen de Ruta
          </h3>
          {nivelRiesgo !== 'bajo' && (
            <span className={cn('px-2 py-1 rounded text-xs font-medium', riesgoInfo.bgColor, riesgoInfo.color)}>
              Riesgo {riesgoInfo.label}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Distancia */}
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-[#BB0034]" />
            <div>
              <p className="text-xs text-gray-300">Distancia</p>
              <p className="font-bold text-lg">{distanceKm.toFixed(1)} km</p>
            </div>
          </div>

          {/* Tiempo */}
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-[#BB0034]" />
            <div>
              <p className="text-xs text-gray-300">Tiempo Est.</p>
              <p className="font-bold text-lg">{formatDuration(durationMin)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Costos */}
      <div className="p-4 border-b">
        <h4 className="text-sm font-medium text-gray-500 mb-3">Costos Estimados</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <Fuel size={16} />
              Combustible
            </span>
            <span className="font-medium">{formatCurrency(costoCombustible)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <DollarSign size={16} />
              Casetas
            </span>
            <span className="font-medium">{formatCurrency(costoCasetas)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-medium text-[#1a1a1a]">Total Estimado</span>
            <span className="font-bold text-lg text-[#BB0034]">
              {formatCurrency(costoTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Alertas/Restricciones */}
      {restricciones.length > 0 && (
        <div className="p-4 bg-yellow-50 border-b">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-yellow-600" />
            <h4 className="text-sm font-medium text-yellow-800">Restricciones</h4>
          </div>
          <ul className="space-y-1">
            {restricciones.map((restriccion, index) => (
              <li key={index} className="text-sm text-yellow-700 flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                {restriccion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detalles expandibles */}
      {waypoints.length > 0 && (
        <div className="border-b">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full p-4 flex items-center justify-between text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <span>Ver puntos de la ruta ({waypoints.length})</span>
            {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showDetails && (
            <div className="px-4 pb-4">
              <div className="space-y-2">
                {waypoints.map((point, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold',
                        index === 0
                          ? 'bg-green-500'
                          : index === waypoints.length - 1
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                      )}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-[#1a1a1a]">{point.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{point.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botón de optimizar */}
      {onOptimize && waypoints.length > 2 && (
        <div className="p-4">
          <button
            onClick={onOptimize}
            disabled={isOptimizing}
            className={cn(
              'w-full py-2 px-4 rounded-lg font-medium transition-colors',
              'bg-[#BB0034] text-white hover:bg-[#9a002b]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2'
            )}
          >
            {isOptimizing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Optimizando...
              </>
            ) : (
              <>
                <Route size={18} />
                Optimizar orden de paradas
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Reorganiza las paradas para minimizar distancia
          </p>
        </div>
      )}
    </div>
  )
}
