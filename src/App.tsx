import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Layouts
import MainLayout from './components/layout/MainLayout'

// Páginas
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Mantenimiento from './pages/Mantenimiento'
import Combustible from './pages/Combustible'
import Finanzas from './pages/Finanzas'
import Rutas from './pages/Rutas'
import Usuarios from './pages/Usuarios'
import Legal from './pages/Legal'
import Clientes from './pages/Clientes'
import Viajes from './pages/Viajes'
import Planificador from './pages/Planificador'
import Casetas from './pages/Casetas'
import Telemetria from './pages/Telemetria'
import Importador from './pages/Importador'

// Catálogos
import Operadores from './pages/Operadores'
import Maniobristas from './pages/Maniobristas'
import Tractocamiones from './pages/Tractocamiones'
import Aditamentos from './pages/Aditamentos'
import Inventario from './pages/Inventario'
import Estaciones from './pages/Estaciones'

// Componente de ruta protegida
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// Componente de ruta pública (solo para no autenticados)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/panel" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Landing Page - Pública */}
      <Route path="/" element={<Landing />} />

      {/* Login - Pública (redirige a panel si ya está autenticado) */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Rutas protegidas - Panel de administración */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/panel" element={<Dashboard />} />
        <Route path="/viajes" element={<Viajes />} />
        <Route path="/planificador" element={<Planificador />} />
        <Route path="/rutas" element={<Rutas />} />

        {/* Catálogos de Flota */}
        <Route path="/tractocamiones" element={<Tractocamiones />} />
        <Route path="/aditamentos" element={<Aditamentos />} />

        {/* Catálogos de Personal */}
        <Route path="/operadores" element={<Operadores />} />
        <Route path="/maniobristas" element={<Maniobristas />} />

        {/* Catálogos Generales */}
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/estaciones" element={<Estaciones />} />

        {/* Operaciones */}
        <Route path="/combustible" element={<Combustible />} />
        <Route path="/casetas" element={<Casetas />} />
        <Route path="/telemetria" element={<Telemetria />} />
        <Route path="/finanzas" element={<Finanzas />} />
        <Route path="/mantenimiento" element={<Mantenimiento />} />

        {/* Sistema */}
        <Route path="/legal" element={<Legal />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/importador" element={<Importador />} />
      </Route>

      {/* Redirigir rutas no encontradas */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
