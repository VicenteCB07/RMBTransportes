/**
 * WorkloadBar - Barra visual de carga de trabajo por unidad
 */

import { Truck, User, AlertTriangle } from 'lucide-react';
import type { CargaUnidad } from '../../types/workload.types';
import { WORKLOAD_CONFIG } from '../../types/workload.types';

interface WorkloadBarProps {
  carga: CargaUnidad;
  isSelected: boolean;
  onClick: () => void;
}

export default function WorkloadBar({ carga, isSelected, onClick }: WorkloadBarProps) {
  // Determinar color basado en porcentaje de carga
  const getBarColor = () => {
    if (carga.porcentajeCarga > WORKLOAD_CONFIG.OVERLOAD_THRESHOLD) {
      return 'bg-red-500';
    }
    if (carga.porcentajeCarga > 80) {
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
  };

  const getTextColor = () => {
    if (carga.porcentajeCarga > WORKLOAD_CONFIG.OVERLOAD_THRESHOLD) {
      return 'text-red-600';
    }
    if (carga.porcentajeCarga > 80) {
      return 'text-yellow-600';
    }
    return 'text-green-600';
  };

  const getBorderColor = () => {
    if (isSelected) {
      return 'border-blue-500 ring-2 ring-blue-200';
    }
    if (carga.estado === 'sobrecargado') {
      return 'border-red-200';
    }
    return 'border-gray-200';
  };

  // Verificar si hay conflictos de ventana
  const tieneConflictos = carga.rutaCritica?.cumpleVentanas.some(c => !c) || false;

  return (
    <div
      onClick={onClick}
      className={`
        p-3 rounded-lg border cursor-pointer transition-all
        hover:shadow-md bg-white
        ${getBorderColor()}
      `}
    >
      {/* Header con nombre de unidad */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Truck className={`w-4 h-4 ${
            carga.tipoUnidad === 'rolloff-plataforma' ? 'text-amber-600' : 'text-blue-600'
          }`} />
          <span className="font-medium text-sm truncate max-w-[120px]">
            {carga.unitLabel.split(' - ')[0]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {tieneConflictos && (
            <span title="Conflicto de ventanas">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </span>
          )}
          <span className={`text-sm font-bold ${getTextColor()}`}>
            {carga.porcentajeCarga}%
          </span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${Math.min(carga.porcentajeCarga, 100)}%` }}
        />
        {carga.porcentajeCarga > 100 && (
          <div
            className="h-full bg-red-300 -mt-2 animate-pulse"
            style={{ width: `${carga.porcentajeCarga - 100}%`, marginLeft: '100%' }}
          />
        )}
      </div>

      {/* Métricas */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{carga.kmTotales} km</span>
        <span>{carga.numViajes} viaje{carga.numViajes !== 1 ? 's' : ''}</span>
        <span>~{carga.horasEstimadas}h</span>
      </div>

      {/* Operador asignado */}
      {carga.operadorNombre && (
        <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
          <User className="w-3 h-3" />
          <span className="truncate">{carga.operadorNombre}</span>
        </div>
      )}

      {/* Indicador de estado */}
      {carga.estado !== 'normal' && (
        <div className={`
          mt-2 text-xs px-2 py-0.5 rounded-full text-center
          ${carga.estado === 'sobrecargado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}
        `}>
          {carga.estado === 'sobrecargado' ? 'Sobrecargado' : 'Subutilizado'}
        </div>
      )}
    </div>
  );
}
