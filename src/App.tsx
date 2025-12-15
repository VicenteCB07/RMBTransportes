import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Layouts
import MainLayout from './components/layout/MainLayout'

// Páginas
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Flota from './pages/Flota'
import Mantenimiento from './pages/Mantenimiento'
import Combustible from './pages/Combustible'
import Finanzas from './pages/Finanzas'
import Rutas from './pages/Rutas'
import Usuarios from './pages/Usuarios'
import Legal from './pages/Legal'

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
        <Route path="/flota" element={<Flota />} />
        <Route path="/mantenimiento" element={<Mantenimiento />} />
        <Route path="/combustible" element={<Combustible />} />
        <Route path="/finanzas" element={<Finanzas />} />
        <Route path="/rutas" element={<Rutas />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/legal" element={<Legal />} />
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
