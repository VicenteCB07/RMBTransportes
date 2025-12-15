import {
  Truck,
  Wrench,
  MapPin,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
} from 'lucide-react'

// Componente de tarjeta de estadística
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  subtitle?: string
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]} text-white`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  )
}

// Datos de ejemplo para el dashboard
const mockData = {
  stats: {
    vehiculosActivos: 12,
    vehiculosEnRuta: 8,
    mantenimientosPendientes: 3,
    viajesHoy: 15,
    ingresosDelMes: 245000,
    alertasActivas: 5,
  },
  viajesRecientes: [
    {
      id: 1,
      destino: 'CDMX - Guadalajara',
      cliente: 'RMB Maquinaria',
      estado: 'en_transito',
      conductor: 'Juan Pérez',
    },
    {
      id: 2,
      destino: 'Monterrey - Querétaro',
      cliente: 'RMB Maquinaria',
      estado: 'completado',
      conductor: 'Carlos López',
    },
    {
      id: 3,
      destino: 'Puebla - Veracruz',
      cliente: 'Cliente Externo',
      estado: 'pendiente',
      conductor: 'Sin asignar',
    },
  ],
  alertas: [
    {
      id: 1,
      tipo: 'mantenimiento',
      mensaje: 'Unidad TRC-005 requiere cambio de aceite',
      fecha: 'Hace 2 horas',
    },
    {
      id: 2,
      tipo: 'documento',
      mensaje: 'Seguro de TRC-012 vence en 7 días',
      fecha: 'Hace 5 horas',
    },
    {
      id: 3,
      tipo: 'ruta',
      mensaje: 'Retraso en entrega ruta #1542',
      fecha: 'Hace 1 día',
    },
  ],
}

export default function Dashboard() {
  const { stats, viajesRecientes, alertas } = mockData

  const getEstadoBadge = (estado: string) => {
    const estilos: Record<string, string> = {
      en_transito: 'bg-blue-100 text-blue-700',
      completado: 'bg-green-100 text-green-700',
      pendiente: 'bg-yellow-100 text-yellow-700',
      cancelado: 'bg-red-100 text-red-700',
    }
    const etiquetas: Record<string, string> = {
      en_transito: 'En Tránsito',
      completado: 'Completado',
      pendiente: 'Pendiente',
      cancelado: 'Cancelado',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${estilos[estado]}`}>
        {etiquetas[estado]}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500">Resumen general de operaciones</p>
        </div>
        <div className="text-sm text-slate-500">
          Última actualización: {new Date().toLocaleString('es-MX')}
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Vehículos Activos"
          value={stats.vehiculosActivos}
          icon={Truck}
          color="blue"
        />
        <StatCard
          title="En Ruta"
          value={stats.vehiculosEnRuta}
          icon={MapPin}
          color="green"
        />
        <StatCard
          title="Mantenimientos"
          value={stats.mantenimientosPendientes}
          icon={Wrench}
          color="yellow"
          subtitle="Pendientes"
        />
        <StatCard
          title="Viajes Hoy"
          value={stats.viajesHoy}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Ingresos del Mes"
          value={`$${stats.ingresosDelMes.toLocaleString()}`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Alertas Activas"
          value={stats.alertasActivas}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Viajes recientes */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">
              Viajes Recientes
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {viajesRecientes.map((viaje) => (
              <div key={viaje.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <MapPin size={20} className="text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{viaje.destino}</p>
                      <p className="text-sm text-slate-500">
                        {viaje.cliente} • {viaje.conductor}
                      </p>
                    </div>
                  </div>
                  {getEstadoBadge(viaje.estado)}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100">
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Ver todos los viajes →
            </button>
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">
              Alertas Recientes
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {alertas.map((alerta) => (
              <div key={alerta.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex gap-3">
                  <div className="p-2 bg-red-100 rounded-lg h-fit">
                    <AlertTriangle size={16} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-800">{alerta.mensaje}</p>
                    <p className="text-xs text-slate-400 mt-1">{alerta.fecha}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100">
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Ver todas las alertas →
            </button>
          </div>
        </div>
      </div>

      {/* Estado de la flota */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Estado de la Flota
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="mx-auto text-green-600 mb-2" size={32} />
            <p className="text-2xl font-bold text-green-700">8</p>
            <p className="text-sm text-green-600">Disponibles</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <MapPin className="mx-auto text-blue-600 mb-2" size={32} />
            <p className="text-2xl font-bold text-blue-700">5</p>
            <p className="text-sm text-blue-600">En Ruta</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <Wrench className="mx-auto text-yellow-600 mb-2" size={32} />
            <p className="text-2xl font-bold text-yellow-700">2</p>
            <p className="text-sm text-yellow-600">Mantenimiento</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <Clock className="mx-auto text-red-600 mb-2" size={32} />
            <p className="text-2xl font-bold text-red-700">1</p>
            <p className="text-sm text-red-600">Fuera de Servicio</p>
          </div>
        </div>
      </div>
    </div>
  )
}
