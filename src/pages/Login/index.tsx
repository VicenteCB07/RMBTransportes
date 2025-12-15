import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Mail, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/panel')
    } catch (err) {
      setError('Credenciales inválidas. Por favor, intente nuevamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#C4C4C4] flex items-center justify-center p-4">
      {/* Fondo con camión decorativo similar al manual */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-gradient-to-r from-[#3D3D3D]/10 to-transparent" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1a1a1a] rounded-2xl mb-4">
            <Truck size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#1a1a1a]">
            <span className="text-[#BB0034]">RMB</span> Transportes
          </h1>
          <p className="text-[#3D3D3D] mt-2">Panel de Administración</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-6 text-center">
            Iniciar Sesión
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-[#BB0034]/30 rounded-lg flex items-center gap-3 text-[#BB0034]">
              <AlertCircle size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#3D3D3D] mb-2"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3D3D3D]"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none transition-all"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#3D3D3D] mb-2"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3D3D3D]"
                />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#1a1a1a] hover:bg-[#3D3D3D] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="#"
              className="text-sm text-[#BB0034] hover:text-[#8A0027] transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>

        {/* Línea roja decorativa como en el manual */}
        <div className="h-1 bg-[#BB0034] mt-6 rounded-full" />

        <p className="text-center text-[#3D3D3D] text-sm mt-6">
          © {new Date().getFullYear()} RMB Transportes. Todos los derechos
          reservados.
        </p>
      </div>
    </div>
  )
}
