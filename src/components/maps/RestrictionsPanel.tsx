/**
 * Panel de restricciones y alertas de seguridad para rutas
 * Muestra información sobre zonas de riesgo, horarios y requisitos
 */

import { useState } from 'react'
import {
  AlertTriangle,
  Shield,
  Clock,
  Truck,
  Ban,
  Info,
  ChevronDown,
  ChevronUp,
  MapPin,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import type { NivelRiesgo, RestriccionAcceso, CondicionesSeguridad } from '../../types/route.types'
import { NIVELES_RIESGO, TIPOS_ZONA, DIAS_SEMANA, HOY_NO_CIRCULA } from '../../types/route.types'
import { cn } from '../../utils/cn'

interface RestrictionsPanelProps {
  restricciones?: RestriccionAcceso[]
  seguridad?: CondicionesSeguridad
  placa?: string  // Para verificar Hoy No Circula
  className?: string
}

export default function RestrictionsPanel({
  restricciones = [],
  seguridad,
  placa,
  className,
}: RestrictionsPanelProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['seguridad'])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    )
  }

  // Verificar Hoy No Circula
  const verificarHoyNoCircula = () => {
    if (!placa) return null

    const hoy = new Date()
    const diaSemana = hoy.getDay()
    const ultimoDigito = placa.slice(-1)

    const diasMap: Record<number, keyof typeof HOY_NO_CIRCULA> = {
      1: 'lunes',
      2: 'martes',
      3: 'miercoles',
      4: 'jueves',
      5: 'viernes',
      6: 'sabado',
      0: 'domingo',
    }

    const diaActual = diasMap[diaSemana]
    const placasRestringidas = HOY_NO_CIRCULA[diaActual] || []

    return {
      restringido: placasRestringidas.includes(ultimoDigito as never),
      dia: DIAS_SEMANA.find((d) => d.value === diaSemana)?.label || '',
      ultimoDigito,
    }
  }

  const hoyNoCircula = verificarHoyNoCircula()

  // Agrupar restricciones por tipo
  const restriccionesPorTipo = restricciones.reduce(
    (acc, r) => {
      const tipo = r.tipo.includes('horario') || r.tipo.includes('dia')
        ? 'horario'
        : r.tipo.includes('peso') || r.tipo.includes('altura') || r.tipo.includes('ancho')
        ? 'vehiculo'
        : 'zona'

      if (!acc[tipo]) acc[tipo] = []
      acc[tipo].push(r)
      return acc
    },
    {} as Record<string, RestriccionAcceso[]>
  )

  return (
    <div className={cn('bg-white rounded-lg shadow-md overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} />
          <h3 className="font-bold">Restricciones y Seguridad</h3>
        </div>
        <p className="text-sm text-orange-100 mt-1">
          Revisa las alertas antes de iniciar el viaje
        </p>
      </div>

      {/* Hoy No Circula */}
      {placa && hoyNoCircula && (
        <div
          className={cn(
            'p-4 border-b flex items-center gap-3',
            hoyNoCircula.restringido ? 'bg-red-50' : 'bg-green-50'
          )}
        >
          {hoyNoCircula.restringido ? (
            <>
              <XCircle size={24} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800">
                  Hoy No Circula - {hoyNoCircula.dia}
                </p>
                <p className="text-sm text-red-600">
                  Vehículos con placa terminación {hoyNoCircula.ultimoDigito} no pueden circular
                </p>
              </div>
            </>
          ) : (
            <>
              <CheckCircle size={24} className="text-green-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800">
                  Circulación permitida - {hoyNoCircula.dia}
                </p>
                <p className="text-sm text-green-600">
                  Placa {placa} puede circular hoy
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Sección de Seguridad */}
      {seguridad && (
        <div className="border-b">
          <button
            onClick={() => toggleSection('seguridad')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-[#BB0034]" />
              <span className="font-medium">Condiciones de Seguridad</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs',
                  NIVELES_RIESGO[seguridad.nivelRiesgo].bgColor,
                  NIVELES_RIESGO[seguridad.nivelRiesgo].color
                )}
              >
                Riesgo {NIVELES_RIESGO[seguridad.nivelRiesgo].label}
              </span>
            </div>
            {expandedSections.includes('seguridad') ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </button>

          {expandedSections.includes('seguridad') && (
            <div className="px-4 pb-4 space-y-3">
              {/* Tipo de zona */}
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-gray-400" />
                <span className="text-gray-600">Tipo de zona:</span>
                <span className="font-medium">{TIPOS_ZONA[seguridad.tipoZona]}</span>
              </div>

              {/* Requisitos de seguridad */}
              <div className="grid grid-cols-2 gap-2">
                <RequisitoItem
                  label="Escolta"
                  activo={seguridad.requiereEscolta}
                />
                <RequisitoItem
                  label="Custodia armada"
                  activo={seguridad.requiereCustodiaArmada}
                />
                <RequisitoItem
                  label="GPS activo"
                  activo={seguridad.requiereGPS}
                />
                <RequisitoItem
                  label="Sello electrónico"
                  activo={seguridad.requiereSelloElectronico}
                />
              </div>

              {/* Zonas peligrosas */}
              {seguridad.zonasPeligrosas && seguridad.zonasPeligrosas.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800 mb-1">
                    Zonas a evitar:
                  </p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {seguridad.zonasPeligrosas.map((zona, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <span className="text-red-400">•</span>
                        {zona}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recomendaciones */}
              {seguridad.recomendaciones && seguridad.recomendaciones.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-800 mb-1">
                    Recomendaciones:
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {seguridad.recomendaciones.map((rec, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <Info size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Estacionamientos seguros */}
              {seguridad.estacionamientosSeguro && seguridad.estacionamientosSeguro.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Estacionamientos seguros:
                  </p>
                  <div className="space-y-2">
                    {seguridad.estacionamientosSeguro.map((est, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-2 text-sm">
                        <p className="font-medium">{est.nombre}</p>
                        <p className="text-gray-500 text-xs">{est.direccion}</p>
                        {est.servicios.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {est.servicios.map((s, j) => (
                              <span
                                key={j}
                                className="px-1.5 py-0.5 bg-gray-200 rounded text-xs"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Restricciones de vehículo */}
      {restriccionesPorTipo.vehiculo && restriccionesPorTipo.vehiculo.length > 0 && (
        <div className="border-b">
          <button
            onClick={() => toggleSection('vehiculo')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-orange-500" />
              <span className="font-medium">Restricciones de Vehículo</span>
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                {restriccionesPorTipo.vehiculo.length}
              </span>
            </div>
            {expandedSections.includes('vehiculo') ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </button>

          {expandedSections.includes('vehiculo') && (
            <div className="px-4 pb-4 space-y-2">
              {restriccionesPorTipo.vehiculo.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-orange-50 rounded-lg"
                >
                  <span className="text-sm text-orange-800">{r.descripcion}</span>
                  {r.valor && r.unidad && (
                    <span className="font-bold text-orange-700">
                      {r.valor} {r.unidad}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Restricciones de horario */}
      {restriccionesPorTipo.horario && restriccionesPorTipo.horario.length > 0 && (
        <div className="border-b">
          <button
            onClick={() => toggleSection('horario')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-blue-500" />
              <span className="font-medium">Restricciones de Horario</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                {restriccionesPorTipo.horario.length}
              </span>
            </div>
            {expandedSections.includes('horario') ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </button>

          {expandedSections.includes('horario') && (
            <div className="px-4 pb-4 space-y-2">
              {restriccionesPorTipo.horario.map((r, i) => (
                <div
                  key={i}
                  className="p-2 bg-blue-50 rounded-lg"
                >
                  <p className="text-sm text-blue-800 font-medium">{r.descripcion}</p>
                  {r.horasAplica && (
                    <p className="text-xs text-blue-600 mt-1">
                      Horario: {r.horasAplica.inicio} - {r.horasAplica.fin}
                    </p>
                  )}
                  {r.diasAplica && r.diasAplica.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {DIAS_SEMANA.map((dia) => (
                        <span
                          key={dia.value}
                          className={cn(
                            'px-1.5 py-0.5 rounded text-xs',
                            r.diasAplica?.includes(dia.value)
                              ? 'bg-blue-200 text-blue-800'
                              : 'bg-gray-100 text-gray-400'
                          )}
                        >
                          {dia.short}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Restricciones de zona */}
      {restriccionesPorTipo.zona && restriccionesPorTipo.zona.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('zona')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <Ban size={18} className="text-red-500" />
              <span className="font-medium">Restricciones de Zona</span>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                {restriccionesPorTipo.zona.length}
              </span>
            </div>
            {expandedSections.includes('zona') ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </button>

          {expandedSections.includes('zona') && (
            <div className="px-4 pb-4 space-y-2">
              {restriccionesPorTipo.zona.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 bg-red-50 rounded-lg"
                >
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-800">{r.descripcion}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sin restricciones */}
      {restricciones.length === 0 && !seguridad && (
        <div className="p-8 text-center">
          <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
          <p className="text-gray-600">No hay restricciones registradas</p>
          <p className="text-sm text-gray-400">
            La ruta no tiene alertas de seguridad conocidas
          </p>
        </div>
      )}
    </div>
  )
}

// Componente auxiliar para mostrar requisitos
function RequisitoItem({ label, activo }: { label: string; activo: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded text-sm',
        activo ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'
      )}
    >
      {activo ? (
        <AlertTriangle size={14} className="text-red-500" />
      ) : (
        <CheckCircle size={14} className="text-gray-400" />
      )}
      <span>{label}</span>
      <span className="ml-auto font-medium">
        {activo ? 'Requerido' : 'No'}
      </span>
    </div>
  )
}
