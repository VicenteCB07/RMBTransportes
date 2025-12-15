import { Plus, Search, Filter, Users, Shield, UserCheck } from 'lucide-react'

export default function UsuariosPage() {
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
          <p className="text-slate-500">Administra los usuarios y sus permisos</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {/* Resumen de usuarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Usuarios</p>
              <p className="text-2xl font-bold text-slate-800">0</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Usuarios Activos</p>
              <p className="text-2xl font-bold text-slate-800">0</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Shield size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Administradores</p>
              <p className="text-2xl font-bold text-slate-800">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="bg-white rounded-xl shadow-sm">
        {/* Filtros */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar usuario por nombre, email..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              <Filter size={20} />
              Filtrar por Rol
            </button>
          </div>
        </div>

        {/* Estado vacío */}
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
            <Users size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">
            No hay usuarios registrados
          </h3>
          <p className="text-slate-500 mb-4">
            Agrega usuarios para que puedan acceder al sistema
          </p>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            Nuevo Usuario
          </button>
        </div>
      </div>
    </div>
  )
}
