/**
 * WorkloadPanel - Panel lateral de optimización de carga de trabajo
 */

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { CargaUnidad, AlertaCarga, SugerenciaRedistribucion } from '../../types/workload.types';
import WorkloadBar from './WorkloadBar';
import CriticalPathView from './CriticalPathView';

interface WorkloadPanelProps {
  cargas: CargaUnidad[];
  alertas: AlertaCarga[];
  sugerencias: SugerenciaRedistribucion[];
  selectedUnitId: string | null;
  onSelectUnit: (unitId: string | null) => void;
  onOptimizar: (unitId: string) => Promise<void>;
  onVerMapa: (unitId: string) => void;
  onAplicarSugerencia: (sugerencia: SugerenciaRedistribucion) => void;
  isOptimizing: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function WorkloadPanel({
  cargas,
  alertas,
  sugerencias,
  selectedUnitId,
  onSelectUnit,
  onOptimizar,
  onVerMapa,
  onAplicarSugerencia,
  isOptimizing,
  isCollapsed,
  onToggleCollapse,
}: WorkloadPanelProps) {
  const [activeTab, setActiveTab] = useState<'cargas' | 'alertas' | 'sugerencias'>('cargas');

  // Obtener carga seleccionada
  const cargaSeleccionada = selectedUnitId
    ? cargas.find(c => c.unitId === selectedUnitId)
    : null;

  // Estadísticas generales
  const stats = {
    totalUnidades: cargas.length,
    unidadesConViajes: cargas.filter(c => c.numViajes > 0).length,
    sobrecargadas: cargas.filter(c => c.estado === 'sobrecargado').length,
    subutilizadas: cargas.filter(c => c.estado === 'subutilizado').length,
    kmPromedio: cargas.length > 0
      ? Math.round(cargas.reduce((acc, c) => acc + c.kmTotales, 0) / cargas.length)
      : 0,
  };

  // Panel colapsado
  if (isCollapsed) {
    return (
      <div className="w-10 bg-white border-l border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Expandir panel"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="mt-4 flex flex-col items-center gap-3">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          {alertas.length > 0 && (
            <div className="relative">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {alertas.length}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Optimización
          </h3>
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Colapsar panel"
          >
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded p-2">
            <p className="text-lg font-bold text-gray-800">{stats.unidadesConViajes}</p>
            <p className="text-xs text-gray-500">Con viajes</p>
          </div>
          <div className="bg-red-50 rounded p-2">
            <p className="text-lg font-bold text-red-600">{stats.sobrecargadas}</p>
            <p className="text-xs text-gray-500">Sobrecarga</p>
          </div>
          <div className="bg-yellow-50 rounded p-2">
            <p className="text-lg font-bold text-yellow-600">{stats.subutilizadas}</p>
            <p className="text-xs text-gray-500">Subutiliz.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('cargas')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'cargas'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Cargas
        </button>
        <button
          onClick={() => setActiveTab('alertas')}
          className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'alertas'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Alertas
          {alertas.length > 0 && (
            <span className="absolute top-1 right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {alertas.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('sugerencias')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'sugerencias'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Ideas
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Tab: Cargas */}
        {activeTab === 'cargas' && (
          <div className="p-3">
            {/* Lista de unidades */}
            {!cargaSeleccionada ? (
              <div className="space-y-2">
                {cargas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No hay unidades disponibles</p>
                  </div>
                ) : (
                  cargas.map(carga => (
                    <WorkloadBar
                      key={carga.unitId}
                      carga={carga}
                      isSelected={selectedUnitId === carga.unitId}
                      onClick={() => onSelectUnit(carga.unitId)}
                    />
                  ))
                )}
              </div>
            ) : (
              /* Vista de detalle de unidad seleccionada */
              <div>
                {/* Botón volver */}
                <button
                  onClick={() => onSelectUnit(null)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-3"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Volver a lista
                </button>

                {/* Info de unidad */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <h4 className="font-semibold text-gray-800">{cargaSeleccionada.unitLabel}</h4>
                  <p className="text-sm text-gray-500">{cargaSeleccionada.marca}</p>
                  {cargaSeleccionada.operadorNombre && (
                    <p className="text-sm text-green-600 mt-1">
                      Operador: {cargaSeleccionada.operadorNombre}
                    </p>
                  )}
                </div>

                {/* Ruta crítica */}
                <CriticalPathView
                  carga={cargaSeleccionada}
                  onOptimizar={() => onOptimizar(cargaSeleccionada.unitId)}
                  onVerMapa={() => onVerMapa(cargaSeleccionada.unitId)}
                  isOptimizing={isOptimizing}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab: Alertas */}
        {activeTab === 'alertas' && (
          <div className="p-3 space-y-2">
            {alertas.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No hay alertas</p>
                <p className="text-xs text-gray-400 mt-1">Todo parece estar bien</p>
              </div>
            ) : (
              alertas.map((alerta, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    alerta.severidad === 'error'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {alerta.tipo === 'sobrecarga' ? (
                      <TrendingUp className={`w-4 h-4 mt-0.5 ${
                        alerta.severidad === 'error' ? 'text-red-500' : 'text-amber-500'
                      }`} />
                    ) : alerta.tipo === 'subutilizacion' ? (
                      <TrendingDown className="w-4 h-4 mt-0.5 text-yellow-500" />
                    ) : (
                      <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                        alerta.severidad === 'error' ? 'text-red-500' : 'text-amber-500'
                      }`} />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        alerta.severidad === 'error' ? 'text-red-700' : 'text-amber-700'
                      }`}>
                        {alerta.unitLabel}
                      </p>
                      <p className={`text-xs ${
                        alerta.severidad === 'error' ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        {alerta.mensaje}
                      </p>
                      {alerta.detalles?.kmActuales && alerta.detalles?.kmObjetivo && (
                        <p className="text-xs text-gray-500 mt-1">
                          {alerta.detalles.kmActuales} km / {alerta.detalles.kmObjetivo} km objetivo
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onSelectUnit(alerta.unitId);
                      setActiveTab('cargas');
                    }}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                  >
                    Ver detalles →
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: Sugerencias */}
        {activeTab === 'sugerencias' && (
          <div className="p-3 space-y-2">
            {sugerencias.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <Lightbulb className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Sin sugerencias</p>
                <p className="text-xs text-gray-400 mt-1">La carga parece balanceada</p>
              </div>
            ) : (
              sugerencias.map((sugerencia, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-blue-50 border border-blue-200"
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 mt-0.5 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-700">
                        Mover viaje {sugerencia.viajeFolio}
                      </p>
                      <p className="text-xs text-blue-600">
                        {sugerencia.desdeUnitLabel} → {sugerencia.haciaUnitLabel}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {sugerencia.razon}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Ahorro estimado: {sugerencia.kmAhorrados} km
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onAplicarSugerencia(sugerencia)}
                    className="mt-2 w-full py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Aplicar sugerencia
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer con promedio */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Promedio de carga:</span>
          <span className="font-medium text-gray-700">{stats.kmPromedio} km/unidad</span>
        </div>
      </div>
    </div>
  );
}
