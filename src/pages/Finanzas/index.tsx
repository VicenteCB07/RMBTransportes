import { Plus, DollarSign, TrendingUp, TrendingDown, Receipt } from 'lucide-react'

export default function Finanzas() {
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Finanzas</h1>
          <p className="text-slate-500">Control de ingresos, gastos y facturación</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Receipt size={20} />
            Nueva Factura
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            Registrar Gasto
          </button>
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Ingresos del Mes</p>
              <p className="text-2xl font-bold text-slate-800">$0.00</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Gastos del Mes</p>
              <p className="text-2xl font-bold text-slate-800">$0.00</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Balance</p>
              <p className="text-2xl font-bold text-slate-800">$0.00</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-slate-200">
          <nav className="flex gap-4 px-6">
            <button className="py-4 px-2 border-b-2 border-blue-600 text-blue-600 font-medium">
              Gastos
            </button>
            <button className="py-4 px-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700">
              Facturas
            </button>
            <button className="py-4 px-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700">
              Reportes
            </button>
          </nav>
        </div>

        {/* Estado vacío */}
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
            <DollarSign size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">
            No hay registros financieros
          </h3>
          <p className="text-slate-500 mb-4">
            Comienza registrando gastos o creando facturas
          </p>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            Registrar Gasto
          </button>
        </div>
      </div>
    </div>
  )
}
