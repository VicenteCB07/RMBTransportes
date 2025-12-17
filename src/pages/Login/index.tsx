import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Mail, Lock, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetError, setResetError] = useState('')
  const { login, resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/panel')
    } catch (err: any) {
      // Mostrar mensaje específico si es un error personalizado
      if (err?.message?.includes('inactivo')) {
        setError('Tu cuenta está inactiva. Contacta al administrador.')
      } else if (err?.message?.includes('no encontrado')) {
        setError('Usuario no encontrado en el sistema.')
      } else if (err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setError('Credenciales inválidas. Por favor, intente nuevamente.')
      } else {
        setError('Error al iniciar sesión. Intente más tarde.')
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault()
    setResetError('')
    setResetLoading(true)

    try {
      await resetPassword(resetEmail)
      setResetSuccess(true)
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        setResetError('No existe una cuenta con este correo electrónico.')
      } else if (err?.code === 'auth/invalid-email') {
        setResetError('El correo electrónico no es válido.')
      } else {
        setResetError('Error al enviar el correo. Intente más tarde.')
      }
      console.error(err)
    } finally {
      setResetLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setShowForgotPassword(false)
    setResetEmail('')
    setResetSuccess(false)
    setResetError('')
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
          {!showForgotPassword ? (
            <>
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
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-[#BB0034] hover:text-[#8A0027] transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBackToLogin}
                className="flex items-center gap-2 text-[#3D3D3D] hover:text-[#1a1a1a] transition-colors mb-4"
              >
                <ArrowLeft size={20} />
                <span className="text-sm">Volver al inicio de sesión</span>
              </button>

              <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-2 text-center">
                Recuperar Contraseña
              </h2>
              <p className="text-[#3D3D3D] text-sm text-center mb-6">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              {resetSuccess ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">
                    Correo enviado
                  </h3>
                  <p className="text-[#3D3D3D] text-sm mb-6">
                    Revisa tu bandeja de entrada en <strong>{resetEmail}</strong> y sigue las instrucciones para restablecer tu contraseña.
                  </p>
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="w-full py-3 px-4 bg-[#1a1a1a] hover:bg-[#3D3D3D] text-white font-medium rounded-lg transition-colors"
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                <>
                  {resetError && (
                    <div className="mb-4 p-4 bg-red-50 border border-[#BB0034]/30 rounded-lg flex items-center gap-3 text-[#BB0034]">
                      <AlertCircle size={20} />
                      <span className="text-sm">{resetError}</span>
                    </div>
                  )}

                  <form onSubmit={handleResetPassword} className="space-y-5">
                    <div>
                      <label
                        htmlFor="resetEmail"
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
                          id="resetEmail"
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none transition-all"
                          placeholder="correo@ejemplo.com"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full py-3 px-4 bg-[#BB0034] hover:bg-[#8A0027] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resetLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
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
