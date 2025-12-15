import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Truck,
  Wrench,
  DollarSign,
  MapPin,
  Users,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/flota', icon: Truck, label: 'Flota' },
  { path: '/mantenimiento', icon: Wrench, label: 'Mantenimiento' },
  { path: '/finanzas', icon: DollarSign, label: 'Finanzas' },
  { path: '/rutas', icon: MapPin, label: 'Rutas' },
  { path: '/usuarios', icon: Users, label: 'Usuarios' },
]

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const { logout, userData } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  return (
    <>
      {/* Botón móvil */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-blue-600 text-white lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-white
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-center h-20 border-b border-slate-700">
          <h1 className="text-xl font-bold">
            <span className="text-blue-400">RMB</span> Transportes
          </h1>
        </div>

        {/* Usuario */}
        <div className="p-4 border-b border-slate-700">
          <p className="text-sm text-slate-400">Bienvenido</p>
          <p className="font-medium truncate">
            {userData?.nombre || 'Usuario'}
          </p>
          <p className="text-xs text-slate-500 capitalize">
            {userData?.rol?.replace('_', ' ') || 'Sin rol'}
          </p>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Cerrar sesión */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
