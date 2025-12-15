import { useState } from 'react'
import {
  FileText,
  Scale,
  Shield,
  Truck,
  AlertTriangle,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  Weight,
  Ruler,
  FileCheck,
  Building2,
} from 'lucide-react'

// Tipos de documentos legales
type TipoDocumento = 'norma' | 'reglamento' | 'permiso' | 'verificacion'

interface DocumentoLegal {
  id: string
  codigo: string
  titulo: string
  descripcion: string
  tipo: TipoDocumento
  fechaPublicacion: string
  fechaActualizacion?: string
  vigente: boolean
  urlOficial?: string
  resumen: string[]
  aplicaA: string[]
}

// Base de datos de normativas y reglamentos
const DOCUMENTOS_LEGALES: DocumentoLegal[] = [
  {
    id: '1',
    codigo: 'NOM-012-SCT-2-2017',
    titulo: 'Peso y Dimensiones Máximas',
    descripcion:
      'Establece las condiciones y especificaciones para el peso y las dimensiones máximas con las que pueden circular los vehículos de autotransporte de carga.',
    tipo: 'norma',
    fechaPublicacion: '2017-11-26',
    vigente: true,
    urlOficial: 'https://www.normasoficiales.mx/nom/nom-012-sct-2-2017',
    resumen: [
      'Vehículos unitarios: hasta 23,000 kg',
      'Tractocamión con semirremolque: máximo 40,000 kg',
      'Tractocamión con doble semirremolque (full): máximo 66,500 kg',
      'Ancho máximo: 2.60 metros (sin espejos)',
      'Altura máxima: 4.25 metros',
      'Largo máximo según configuración vehicular',
    ],
    aplicaA: ['tractocamion', 'lowboy', 'plataforma_rolloff', 'gondola', 'remolque'],
  },
  {
    id: '2',
    codigo: 'NOM-068-SCT-2-2014',
    titulo: 'Condiciones Físico Mecánicas',
    descripcion:
      'Establece las condiciones mínimas de seguridad que deben cumplir los vehículos de autotransporte federal en sus condiciones físico-mecánicas.',
    tipo: 'norma',
    fechaPublicacion: '2014-08-19',
    vigente: true,
    urlOficial: 'https://dof.gob.mx/normasOficiales/3363/SCT/SCT.htm',
    resumen: [
      'Verificación anual obligatoria de condiciones físico-mecánicas',
      'Vehículos nuevos exentos por 2 años desde fecha de fabricación',
      'Inspección en Unidades de Verificación acreditadas',
      'Multa de 100 UMAs por incumplimiento',
      'Sistema de frenos, dirección, suspensión y luces',
    ],
    aplicaA: ['tractocamion', 'lowboy', 'plataforma_rolloff', 'gondola', 'remolque'],
  },
  {
    id: '3',
    codigo: 'NOM-045-SEMARNAT-2017',
    titulo: 'Emisiones Contaminantes - Vehículos Diésel',
    descripcion:
      'Establece los niveles máximos permisibles de emisiones de humo provenientes del escape de vehículos automotores en circulación que usan diésel como combustible.',
    tipo: 'norma',
    fechaPublicacion: '2017-06-07',
    vigente: true,
    urlOficial: 'https://www.gob.mx/semarnat',
    resumen: [
      'Verificación semestral de emisiones contaminantes',
      'Aplica a unidades con placas federales',
      'Límites de opacidad según año del vehículo',
      'Verificación en centros autorizados SCT/SEMARNAT',
    ],
    aplicaA: ['tractocamion'],
  },
  {
    id: '4',
    codigo: 'NOM-087-SCT-2-2017',
    titulo: 'Transporte de Materiales y Residuos Peligrosos',
    descripcion:
      'Establece los requisitos de seguridad e información comercial para el autotransporte de sustancias, materiales y residuos peligrosos.',
    tipo: 'norma',
    fechaPublicacion: '2017-12-01',
    vigente: true,
    resumen: [
      'Clasificación de materiales peligrosos',
      'Señalización obligatoria de unidades',
      'Documentación de embarque requerida',
      'Capacitación especial para operadores',
      'Equipo de emergencia obligatorio',
    ],
    aplicaA: ['tractocamion', 'gondola'],
  },
  {
    id: '5',
    codigo: 'REGLAMENTO-PESO-DIMENSIONES',
    titulo: 'Reglamento sobre Peso, Dimensiones y Capacidad',
    descripcion:
      'Reglamento que establece las características de peso, dimensiones y capacidad de los vehículos de autotransporte que transitan en caminos y puentes de jurisdicción federal.',
    tipo: 'reglamento',
    fechaPublicacion: '1994-01-26',
    fechaActualizacion: '2021-12-15',
    vigente: true,
    urlOficial: 'http://www.ordenjuridico.gob.mx/Documentos/Federal/pdf/wo89013.pdf',
    resumen: [
      'Define configuraciones vehiculares permitidas',
      'Establece pesos máximos por eje',
      'Regula circulación en puentes y carreteras federales',
      'Sanciones por exceso de peso',
    ],
    aplicaA: ['tractocamion', 'lowboy', 'plataforma_rolloff', 'gondola', 'remolque'],
  },
]

// Información de verificaciones
const INFO_VERIFICACIONES = {
  fisicoMecanica: {
    titulo: 'Verificación Físico-Mecánica',
    norma: 'NOM-068-SCT-2-2014',
    frecuencia: 'Anual',
    descripcion:
      'Inspección de sistemas de frenos, dirección, suspensión, luces y demás componentes de seguridad.',
    requisitos: [
      'Copia de tarjeta de circulación vigente',
      'Certificado del período anterior (si aplica)',
      'Pago de derechos correspondientes',
    ],
    exenciones: ['Vehículos nuevos: exentos por 2 años desde fabricación'],
    sancion: '100 UMAs por incumplimiento',
  },
  emisiones: {
    titulo: 'Verificación de Emisiones Contaminantes',
    norma: 'NOM-045-SEMARNAT-2017',
    frecuencia: 'Semestral',
    descripcion:
      'Medición de niveles de opacidad y emisiones de gases contaminantes en vehículos diésel.',
    requisitos: [
      'Tarjeta de circulación',
      'Motor en condiciones de operación',
      'Sin fugas visibles de aceite o combustible',
    ],
    exenciones: [],
    sancion: 'Retiro de circulación hasta cumplimiento',
  },
}

// Permisos especiales para carga sobredimensionada
const PERMISOS_ESPECIALES = [
  {
    tipo: 'Carga Indivisible',
    descripcion:
      'Para transporte de maquinaria o estructuras que excedan dimensiones normativas.',
    requisitos: [
      'Solicitud ante DGAF (Dirección General de Autotransporte Federal)',
      'Descripción detallada de la carga',
      'Ruta propuesta con estudio de factibilidad',
      'Póliza de seguro ampliada',
      'Vehículos de escolta si se requiere',
    ],
    tiempoTramite: '5-15 días hábiles',
    vigencia: 'Por viaje o temporal',
  },
  {
    tipo: 'Exceso de Peso',
    descripcion:
      'Para cargas que excedan los límites de peso establecidos en NOM-012-SCT-2-2017.',
    requisitos: [
      'Justificación técnica de imposibilidad de división',
      'Análisis estructural de ruta',
      'Horarios especiales de circulación',
      'Medidas de seguridad adicionales',
    ],
    tiempoTramite: '10-20 días hábiles',
    vigencia: 'Por viaje específico',
  },
  {
    tipo: 'Circulación Nocturna',
    descripcion: 'Para tránsito en horarios restringidos en ciertas vías.',
    requisitos: [
      'Permiso de ruta',
      'Señalización luminosa especial',
      'Vehículo piloto en algunos casos',
    ],
    tiempoTramite: '3-5 días hábiles',
    vigencia: 'Según necesidad del servicio',
  },
]

// Calendario de verificación por terminación de placa
const CALENDARIO_VERIFICACION = [
  { terminacion: '1 y 2', meses: 'Enero y Julio' },
  { terminacion: '3 y 4', meses: 'Febrero y Agosto' },
  { terminacion: '5 y 6', meses: 'Marzo y Septiembre' },
  { terminacion: '7 y 8', meses: 'Abril y Octubre' },
  { terminacion: '9 y 0', meses: 'Mayo y Noviembre' },
]

const TIPO_BADGE: Record<TipoDocumento, { label: string; color: string }> = {
  norma: { label: 'NOM', color: 'bg-blue-100 text-blue-700' },
  reglamento: { label: 'Reglamento', color: 'bg-purple-100 text-purple-700' },
  permiso: { label: 'Permiso', color: 'bg-green-100 text-green-700' },
  verificacion: { label: 'Verificación', color: 'bg-yellow-100 text-yellow-700' },
}

export default function Legal() {
  const [activeTab, setActiveTab] = useState<'normativas' | 'verificaciones' | 'permisos'>(
    'normativas'
  )
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [filterTipo, setFilterTipo] = useState<TipoDocumento | 'todos'>('todos')

  const filteredDocs =
    filterTipo === 'todos'
      ? DOCUMENTOS_LEGALES
      : DOCUMENTOS_LEGALES.filter((d) => d.tipo === filterTipo)

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Marco Legal y Normativo</h1>
          <p className="text-[#3D3D3D]">
            Regulaciones SCT, verificaciones y permisos para transporte de carga
          </p>
        </div>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-[#3D3D3D]">NOMs Vigentes</p>
              <p className="text-xl font-bold text-[#1a1a1a]">
                {DOCUMENTOS_LEGALES.filter((d) => d.tipo === 'norma' && d.vigente).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-[#3D3D3D]">Verificaciones</p>
              <p className="text-xl font-bold text-[#1a1a1a]">2 tipos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FileCheck size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-[#3D3D3D]">Permisos Especiales</p>
              <p className="text-xl font-bold text-[#1a1a1a]">{PERMISOS_ESPECIALES.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-[#3D3D3D]">Sanción Máxima</p>
              <p className="text-xl font-bold text-[#1a1a1a]">100 UMAs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab('normativas')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'normativas'
                  ? 'border-[#BB0034] text-[#BB0034]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Scale size={18} />
                Normativas y Reglamentos
              </div>
            </button>
            <button
              onClick={() => setActiveTab('verificaciones')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'verificaciones'
                  ? 'border-[#BB0034] text-[#BB0034]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle size={18} />
                Verificaciones
              </div>
            </button>
            <button
              onClick={() => setActiveTab('permisos')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'permisos'
                  ? 'border-[#BB0034] text-[#BB0034]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileCheck size={18} />
                Permisos Especiales
              </div>
            </button>
          </nav>
        </div>

        {/* Contenido de tabs */}
        <div className="p-6">
          {/* Tab: Normativas */}
          {activeTab === 'normativas' && (
            <div className="space-y-4">
              {/* Filtros */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setFilterTipo('todos')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterTipo === 'todos'
                      ? 'bg-[#1a1a1a] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterTipo('norma')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterTipo === 'norma'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  NOMs
                </button>
                <button
                  onClick={() => setFilterTipo('reglamento')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterTipo === 'reglamento'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Reglamentos
                </button>
              </div>

              {/* Lista de documentos */}
              <div className="space-y-3">
                {filteredDocs.map((doc) => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${TIPO_BADGE[doc.tipo].color}`}
                        >
                          {TIPO_BADGE[doc.tipo].label}
                        </span>
                        <div className="text-left">
                          <p className="font-medium text-[#1a1a1a]">{doc.codigo}</p>
                          <p className="text-sm text-[#3D3D3D]">{doc.titulo}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {doc.vigente && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700">
                            Vigente
                          </span>
                        )}
                        {expandedDoc === doc.id ? (
                          <ChevronDown size={20} className="text-gray-400" />
                        ) : (
                          <ChevronRight size={20} className="text-gray-400" />
                        )}
                      </div>
                    </button>

                    {expandedDoc === doc.id && (
                      <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                        <div className="pt-4 space-y-4">
                          <p className="text-sm text-[#3D3D3D]">{doc.descripcion}</p>

                          <div>
                            <h4 className="text-sm font-medium text-[#1a1a1a] mb-2">
                              Puntos Clave:
                            </h4>
                            <ul className="space-y-1">
                              {doc.resumen.map((punto, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <CheckCircle
                                    size={16}
                                    className="text-green-500 mt-0.5 flex-shrink-0"
                                  />
                                  <span className="text-[#3D3D3D]">{punto}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1 text-[#3D3D3D]">
                              <Calendar size={14} />
                              Publicación: {doc.fechaPublicacion}
                            </span>
                            {doc.urlOficial && (
                              <a
                                href={doc.urlOficial}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[#BB0034] hover:underline"
                              >
                                <ExternalLink size={14} />
                                Ver documento oficial
                              </a>
                            )}
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              Aplica a:{' '}
                              {doc.aplicaA
                                .map((t) =>
                                  t === 'tractocamion'
                                    ? 'Tractocamión'
                                    : t === 'lowboy'
                                      ? 'Lowboy'
                                      : t === 'plataforma_rolloff'
                                        ? 'Plataforma Roll-off'
                                        : t === 'gondola'
                                          ? 'Góndola'
                                          : 'Remolque'
                                )
                                .join(', ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Verificaciones */}
          {activeTab === 'verificaciones' && (
            <div className="space-y-6">
              {/* Calendario de verificación */}
              <div className="bg-gradient-to-r from-[#1a1a1a] to-[#3D3D3D] rounded-xl p-6 text-white">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Calendar size={20} />
                  Calendario de Verificación Federal
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {CALENDARIO_VERIFICACION.map((item, idx) => (
                    <div key={idx} className="bg-white/10 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">{item.terminacion}</p>
                      <p className="text-xs text-gray-300">Terminación de placa</p>
                      <p className="text-sm mt-1 text-[#BB0034] font-medium">{item.meses}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tipos de verificación */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Físico-Mecánica */}
                <div className="border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Truck size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1a1a1a]">
                        {INFO_VERIFICACIONES.fisicoMecanica.titulo}
                      </h3>
                      <p className="text-sm text-[#3D3D3D]">
                        {INFO_VERIFICACIONES.fisicoMecanica.norma}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-[#BB0034]" />
                      <span className="text-sm">
                        Frecuencia: <strong>{INFO_VERIFICACIONES.fisicoMecanica.frecuencia}</strong>
                      </span>
                    </div>

                    <p className="text-sm text-[#3D3D3D]">
                      {INFO_VERIFICACIONES.fisicoMecanica.descripcion}
                    </p>

                    <div>
                      <p className="text-sm font-medium mb-2">Requisitos:</p>
                      <ul className="space-y-1">
                        {INFO_VERIFICACIONES.fisicoMecanica.requisitos.map((req, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-[#3D3D3D]">
                            <CheckCircle size={14} className="text-green-500" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {INFO_VERIFICACIONES.fisicoMecanica.exenciones.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-yellow-800">Exenciones:</p>
                        {INFO_VERIFICACIONES.fisicoMecanica.exenciones.map((ex, idx) => (
                          <p key={idx} className="text-sm text-yellow-700">
                            {ex}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-700">
                        <AlertTriangle size={14} className="inline mr-1" />
                        Sanción: {INFO_VERIFICACIONES.fisicoMecanica.sancion}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Emisiones */}
                <div className="border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Shield size={24} className="text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1a1a1a]">
                        {INFO_VERIFICACIONES.emisiones.titulo}
                      </h3>
                      <p className="text-sm text-[#3D3D3D]">{INFO_VERIFICACIONES.emisiones.norma}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-[#BB0034]" />
                      <span className="text-sm">
                        Frecuencia: <strong>{INFO_VERIFICACIONES.emisiones.frecuencia}</strong>
                      </span>
                    </div>

                    <p className="text-sm text-[#3D3D3D]">
                      {INFO_VERIFICACIONES.emisiones.descripcion}
                    </p>

                    <div>
                      <p className="text-sm font-medium mb-2">Requisitos:</p>
                      <ul className="space-y-1">
                        {INFO_VERIFICACIONES.emisiones.requisitos.map((req, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-[#3D3D3D]">
                            <CheckCircle size={14} className="text-green-500" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-700">
                        <AlertTriangle size={14} className="inline mr-1" />
                        Sanción: {INFO_VERIFICACIONES.emisiones.sancion}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Unidades de verificación */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-bold text-[#1a1a1a] mb-3 flex items-center gap-2">
                  <Building2 size={20} />
                  Unidades de Verificación Autorizadas
                </h3>
                <p className="text-sm text-[#3D3D3D] mb-3">
                  Las verificaciones deben realizarse en Unidades de Verificación acreditadas y
                  aprobadas por la SCT.
                </p>
                <a
                  href="https://www.sct.gob.mx/transporte-y-medicina-preventiva/autotransporte-federal/tramites-y-servicios/unidades-de-verificacion/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#BB0034] hover:underline text-sm"
                >
                  <ExternalLink size={14} />
                  Consultar directorio de unidades autorizadas
                </a>
              </div>
            </div>
          )}

          {/* Tab: Permisos Especiales */}
          {activeTab === 'permisos' && (
            <div className="space-y-6">
              {/* Alerta informativa */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="text-blue-600 flex-shrink-0" size={20} />
                  <div>
                    <p className="font-medium text-blue-800">Información importante</p>
                    <p className="text-sm text-blue-700">
                      Los permisos especiales se tramitan ante la Dirección General de
                      Autotransporte Federal (DGAF) de la SCT. Es necesario contar con Firma
                      Electrónica Avanzada (FIEL) para trámites en línea.
                    </p>
                  </div>
                </div>
              </div>

              {/* Límites de la NOM-012 */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                  <Weight size={20} />
                  Límites según NOM-012-SCT-2-2017
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-[#3D3D3D] flex items-center gap-2">
                      <Weight size={16} />
                      Peso Máximo
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>Vehículo unitario</span>
                        <strong>23,000 kg</strong>
                      </li>
                      <li className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>Tractocamión + semirremolque</span>
                        <strong>40,000 kg</strong>
                      </li>
                      <li className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>Tractocamión + doble semirremolque</span>
                        <strong>66,500 kg</strong>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium text-[#3D3D3D] flex items-center gap-2">
                      <Ruler size={16} />
                      Dimensiones Máximas
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>Ancho</span>
                        <strong>2.60 m</strong>
                      </li>
                      <li className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>Altura</span>
                        <strong>4.25 m</strong>
                      </li>
                      <li className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>Largo (según config.)</span>
                        <strong>Variable</strong>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Lista de permisos especiales */}
              <div className="space-y-4">
                <h3 className="font-bold text-[#1a1a1a]">Tipos de Permisos Especiales</h3>
                {PERMISOS_ESPECIALES.map((permiso, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-[#1a1a1a]">{permiso.tipo}</h4>
                        <p className="text-sm text-[#3D3D3D]">{permiso.descripcion}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-[#3D3D3D]">
                          Trámite: <strong>{permiso.tiempoTramite}</strong>
                        </p>
                        <p className="text-[#3D3D3D]">
                          Vigencia: <strong>{permiso.vigencia}</strong>
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Requisitos:</p>
                      <ul className="grid md:grid-cols-2 gap-2">
                        {permiso.requisitos.map((req, reqIdx) => (
                          <li
                            key={reqIdx}
                            className="flex items-center gap-2 text-sm text-[#3D3D3D]"
                          >
                            <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* Enlace a trámites */}
              <div className="bg-[#1a1a1a] rounded-xl p-5 text-white">
                <h3 className="font-bold mb-2">Trámites en línea - SCT</h3>
                <p className="text-sm text-gray-300 mb-4">
                  Realiza tus trámites de permisos de carga con firma electrónica.
                </p>
                <a
                  href="https://www.sct.gob.mx/transporte-y-medicina-preventiva/autotransporte-federal/tramites-y-servicios/tramites-con-firma-electronica/carga/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#BB0034] rounded-lg hover:bg-[#9a002b] transition-colors"
                >
                  <ExternalLink size={16} />
                  Ir al portal de trámites SCT
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
