/**
 * CriticalPathView - Vista de ruta crítica con timeline
 */

import {
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Navigation,
  AlertTriangle,
  RefreshCw,
  Map,
  Home,
} from 'lucide-react';
import type { CargaUnidad } from '../../types/workload.types';

interface CriticalPathViewProps {
  carga: CargaUnidad;
  onOptimizar: () => Promise<void>;
  onVerMapa: () => void;
  isOptimizing: boolean;
}

export default function CriticalPathView({
  carga,
  onOptimizar,
  onVerMapa,
  isOptimizing,
}: CriticalPathViewProps) {
  const rutaCritica = carga.rutaCritica;

  if (!rutaCritica || rutaCritica.secuencia.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
        <Navigation className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>No hay viajes asignados a esta unidad</p>
      </div>
    );
  }

  const ventanasIncumplidas = rutaCritica.cumpleVentanas.filter(c => !c).length;

  return (
    <div className="bg-blue-50 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-blue-800 flex items-center gap-2">
          <Navigation className="w-4 h-4" />
          Ruta Crítica
        </h4>
        {ventanasIncumplidas > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            {ventanasIncumplidas} conflicto{ventanasIncumplidas > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Timeline de paradas */}
      <div className="relative pl-6 space-y-3 mb-4">
        {/* Línea vertical */}
        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-blue-200" />

        {/* Origen (Base) */}
        <div className="relative flex items-start gap-3">
          <div className="absolute -left-4 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
            <Home className="w-2.5 h-2.5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">Base RMB</p>
            <p className="text-xs text-gray-500">Salida: {rutaCritica.horaInicio}</p>
          </div>
        </div>

        {/* Paradas */}
        {rutaCritica.secuencia.map((viaje, idx) => {
          const cumpleVentana = rutaCritica.cumpleVentanas[idx];
          const horaLlegada = rutaCritica.horasLlegada[idx];

          return (
            <div key={viaje.id} className="relative flex items-start gap-3">
              {/* Indicador de punto */}
              <div className={`
                absolute -left-4 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold
                ${cumpleVentana ? 'bg-blue-500' : 'bg-red-500'}
              `}>
                {idx + 1}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {viaje.clienteNombre}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {viaje.destino}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {viaje.distanciaKm} km
                  </span>
                </div>

                {/* Horarios */}
                <div className="flex items-center gap-2 mt-1">
                  {/* ETA */}
                  <span className={`
                    flex items-center gap-1 text-xs px-1.5 py-0.5 rounded
                    ${cumpleVentana ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                  `}>
                    {cumpleVentana ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    ETA: {horaLlegada}
                  </span>

                  {/* Ventana de tiempo si existe */}
                  {(viaje.ventanaInicio || viaje.ventanaFin) && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {viaje.ventanaInicio || '--:--'} - {viaje.ventanaFin || '--:--'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Regreso a Base */}
        <div className="relative flex items-start gap-3">
          <div className="absolute -left-4 w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center">
            <Home className="w-2.5 h-2.5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">Regreso a Base</p>
            <p className="text-xs text-gray-400">
              Llegada estimada: {rutaCritica.horaFin}
              <span className="text-gray-300 mx-1">·</span>
              {rutaCritica.kmMuertos} km
            </p>
          </div>
        </div>
      </div>

      {/* Métricas resumen */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-white rounded-lg mb-4 text-sm">
        <div>
          <span className="text-gray-500">Km totales:</span>
          <span className="font-semibold ml-1 text-gray-800">{rutaCritica.kmTotales}</span>
        </div>
        <div>
          <span className="text-gray-500">Km muertos:</span>
          <span className={`font-semibold ml-1 ${
            rutaCritica.kmMuertos > 50 ? 'text-red-600' : 'text-green-600'
          }`}>
            {rutaCritica.kmMuertos}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Tiempo total:</span>
          <span className="font-semibold ml-1 text-gray-800">
            {Math.floor(rutaCritica.tiempoTotalMin / 60)}h {rutaCritica.tiempoTotalMin % 60}m
          </span>
        </div>
        <div>
          <span className="text-gray-500">Paradas:</span>
          <span className="font-semibold ml-1 text-gray-800">{rutaCritica.secuencia.length}</span>
        </div>
      </div>

      {/* Costos */}
      <div className="flex justify-between text-sm p-3 bg-white rounded-lg mb-4">
        <div>
          <span className="text-gray-500">Combustible:</span>
          <span className="font-semibold ml-1 text-gray-800">
            ${carga.costosCombustible.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Casetas:</span>
          <span className="font-semibold ml-1 text-gray-800">
            ${carga.costosCasetas.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-2">
        <button
          onClick={onVerMapa}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          <Map className="w-4 h-4" />
          Ver en Mapa
        </button>
        <button
          onClick={onOptimizar}
          disabled={isOptimizing || rutaCritica.secuencia.length < 2}
          className="flex-1 flex items-center justify-center gap-2 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isOptimizing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Optimizar
        </button>
      </div>
    </div>
  );
}
