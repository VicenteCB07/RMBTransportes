import { NavLink, useLocation } from 'react-router-dom'
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
  Building2,
  ClipboardList,
  CreditCard,
  Radio,
  Upload,
  Key,
  ChevronDown,
  ChevronRight,
  HardHat,
  Database,
  Settings,
  Container,
  Package,
  Calendar,
  type LucideIcon,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../services/firebase'
import toast from 'react-hot-toast'

// Tipos para el menú
interface MenuItem {
  path: string
  icon: LucideIcon
  label: string
}

interface MenuGroup {
  id: string
  label: string
  icon: LucideIcon
  items: MenuItem[]
}

type MenuEntry = MenuItem | MenuGroup

// Verificar si es un grupo
const isMenuGroup = (entry: MenuEntry): entry is MenuGroup => {
  return 'items' in entry
}

// Estructura del menú con grupos colapsables
const menuStructure: MenuEntry[] = [
  // Flujo operativo principal (sin agrupar)
  { path: '/panel', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/viajes', icon: ClipboardList, label: 'Viajes' },
  { path: '/planificador', icon: Calendar, label: 'Planificador' },
  { path: '/rutas', icon: MapPin, label: 'Rutas' },

  // Grupo: Flota
  {
    id: 'flota',
    label: 'Flota',
    icon: Truck,
    items: [
      { path: '/tractocamiones', icon: Truck, label: 'Tractocamiones' },
      { path: '/aditamentos', icon: Container, label: 'Aditamentos' },
    ],
  },

  // Grupo: Personal
  {
    id: 'personal',
    label: 'Personal',
    icon: Users,
    items: [
      { path: '/operadores', icon: HardHat, label: 'Operadores' },
      { path: '/maniobristas', icon: Users, label: 'Maniobristas' },
    ],
  },

  // Grupo: Catálogos
  {
    id: 'catalogos',
    label: 'Catálogos',
    icon: Database,
    items: [
      { path: '/clientes', icon: Building2, label: 'Clientes' },
      { path: '/inventario', icon: Package, label: 'Inventario EPP' },
      { path: '/estaciones', icon: Fuel, label: 'Estaciones' },
    ],
  },

  // Grupo: Operaciones
  {
    id: 'operaciones',
    label: 'Operaciones',
    icon: Fuel,
    items: [
      { path: '/combustible', icon: Fuel, label: 'Combustible' },
      { path: '/casetas', icon: CreditCard, label: 'Casetas' },
      { path: '/telemetria', icon: Radio, label: 'Telemetría' },
    ],
  },

  // Grupo: Administración
  {
    id: 'administracion',
    label: 'Administración',
    icon: Settings,
    items: [
      { path: '/finanzas', icon: DollarSign, label: 'Finanzas' },
      { path: '/mantenimiento', icon: Wrench, label: 'Mantenimiento' },
      { path: '/legal', icon: Scale, label: 'Legal' },
      { path: '/usuarios', icon: Users, label: 'Usuarios' },
      { path: '/importador', icon: Upload, label: 'Importar Datos' },
    ],
  },
]

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const { logout, userData, user } = useAuth()
  const location = useLocation()

  const isAdmin = userData?.rol === 'admin'

  // Auto-expandir el grupo que contiene la ruta actual
  useEffect(() => {
    menuStructure.forEach((entry) => {
      if (isMenuGroup(entry)) {
        const hasActiveItem = entry.items.some((item) => location.pathname === item.path)
        if (hasActiveItem && !expandedGroups.includes(entry.id)) {
          setExpandedGroups((prev) => [...prev, entry.id])
        }
      }
    })
  }, [location.pathname])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    )
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  const handleSendPasswordReset = async () => {
    if (!user?.email) return

    try {
      await sendPasswordResetEmail(auth, user.email)
      toast.success('Se envió un correo de recuperación a tu email')
      setShowPasswordModal(false)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al enviar correo de recuperación')
    }
  }

  // Renderizar un item de menú individual
  const renderMenuItem = (item: MenuItem, isSubItem = false) => (
    <NavLink
      key={item.path}
      to={item.path}
      onClick={() => setIsOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
          isSubItem ? 'pl-10 text-sm' : ''
        } ${
          isActive
            ? 'bg-[#BB0034] text-white'
            : 'text-gray-300 hover:bg-[#3D3D3D]'
        }`
      }
    >
      <item.icon size={isSubItem ? 16 : 20} />
      <span>{item.label}</span>
    </NavLink>
  )

  // Renderizar un grupo de menú colapsable
  const renderMenuGroup = (group: MenuGroup) => {
    const isExpanded = expandedGroups.includes(group.id)
    const hasActiveItem = group.items.some((item) => location.pathname === item.path)

    return (
      <div key={group.id}>
        <button
          onClick={() => toggleGroup(group.id)}
          className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-colors ${
            hasActiveItem
              ? 'bg-[#3D3D3D] text-white'
              : 'text-gray-300 hover:bg-[#3D3D3D]'
          }`}
        >
          <div className="flex items-center gap-3">
            <group.icon size={20} />
            <span>{group.label}</span>
          </div>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {isExpanded && (
          <div className="mt-1 space-y-1">
            {group.items.map((item) => renderMenuItem(item, true))}
          </div>
        )}
      </div>
    )
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
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-400">Bienvenido</p>
              <p className="font-medium truncate">
                {userData?.nombre || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {userData?.rol?.replace('_', ' ') || 'Sin rol'}
              </p>
            </div>
            {/* Botón de cambiar contraseña - solo admin */}
            {isAdmin && (
              <button
                onClick={() => setShowPasswordModal(true)}
                className="p-2 rounded-lg text-gray-400 hover:bg-[#3D3D3D] hover:text-white transition-colors"
                title="Cambiar mi contraseña"
              >
                <Key size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuStructure.map((entry) =>
            isMenuGroup(entry)
              ? renderMenuGroup(entry)
              : renderMenuItem(entry as MenuItem)
          )}
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

      {/* Modal de cambio de contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowPasswordModal(false)}
            />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Key size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[#1a1a1a]">
                      Cambiar mi Contraseña
                    </h2>
                    <p className="text-sm text-gray-500">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Se enviará un correo de recuperación de contraseña a tu email para que puedas establecer una nueva.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-[#3D3D3D] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendPasswordReset}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Enviar Correo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
