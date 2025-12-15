import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Truck,
  Wrench,
  Fuel,
  DollarSign,
  MapPin,
  Users,
  Scale,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const menuItems = [
  { path: '/panel', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/flota', icon: Truck, label: 'Flota' },
  { path: '/mantenimiento', icon: Wrench, label: 'Mantenimiento' },
  { path: '/combustible', icon: Fuel, label: 'Combustible' },
  { path: '/finanzas', icon: DollarSign, label: 'Finanzas' },
  { path: '/rutas', icon: MapPin, label: 'Rutas' },
  { path: '/legal', icon: Scale, label: 'Legal' },
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
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#1a1a1a] text-white lg:hidden"
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

      {/* Sidebar - Colores RMB */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64 bg-[#1a1a1a] text-white
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-center h-20 border-b border-[#3D3D3D]">
          <h1 className="text-xl font-bold">
            <span className="text-[#BB0034]">RMB</span> Transportes
          </h1>
        </div>

        {/* Usuario */}
        <div className="p-4 border-b border-[#3D3D3D]">
          <p className="text-sm text-gray-400">Bienvenido</p>
          <p className="font-medium truncate">
            {userData?.nombre || 'Usuario'}
          </p>
          <p className="text-xs text-gray-500 capitalize">
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
                    ? 'bg-[#BB0034] text-white'
                    : 'text-gray-300 hover:bg-[#3D3D3D]'
                }`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Cerrar sesión */}
        <div className="p-4 border-t border-[#3D3D3D]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-[#BB0034]/20 hover:text-[#BB0034] transition-colors"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
