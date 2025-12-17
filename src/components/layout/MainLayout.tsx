import { Outlet } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'

export default function MainLayout() {
  const { logout, userData } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />

      {/* Header fijo con botón de logout */}
      <header className="fixed top-0 right-0 left-0 lg:left-64 h-14 bg-white border-b border-gray-200 z-30 flex items-center justify-end px-4 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-[#3D3D3D]">
            <User size={18} />
            <span>{userData?.nombre || 'Usuario'}</span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded capitalize">
              {userData?.rol || 'Sin rol'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 bg-[#BB0034] text-white rounded-lg hover:bg-[#8A0027] transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      <main className="lg:ml-64 min-h-screen pt-14">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
