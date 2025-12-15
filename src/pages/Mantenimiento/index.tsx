import { Plus, Search, Filter, Wrench } from 'lucide-react'

export default function Mantenimiento() {
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mantenimiento</h1>
          <p className="text-slate-500">Gestiona el mantenimiento preventivo y correctivo</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={20} />
          Nueva Orden
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-slate-200">
          <nav className="flex gap-4 px-6">
            <button className="py-4 px-2 border-b-2 border-blue-600 text-blue-600 font-medium">
              Órdenes de Trabajo
            </button>
            <button className="py-4 px-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700">
              Calendario
            </button>
            <button className="py-4 px-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700">
              Refacciones
            </button>
          </nav>
        </div>

        {/* Filtros */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar orden de trabajo..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              <Filter size={20} />
              Filtros
            </button>
          </div>
        </div>

        {/* Estado vacío */}
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
            <Wrench size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">
            No hay órdenes de trabajo
          </h3>
          <p className="text-slate-500 mb-4">
            Crea una nueva orden de trabajo para dar mantenimiento a un vehículo
          </p>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            Nueva Orden
          </button>
        </div>
      </div>
    </div>
  )
}
