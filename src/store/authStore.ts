/**
 * Store de autenticación con Zustand
 * Manejo de estado global de usuario
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Usuario, RolUsuario } from '../types'

interface AuthState {
  user: Usuario | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (user: Usuario | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
  hasRole: (roles: RolUsuario[]) => boolean
  hasPermission: (permission: string) => boolean
}

// Permisos por rol
const ROLE_PERMISSIONS: Record<RolUsuario, string[]> = {
  admin: ['*'], // Acceso total
  dispatcher: [
    'flota.read',
    'flota.assign',
    'rutas.read',
    'rutas.write',
    'viajes.read',
    'viajes.write',
    'mantenimiento.read',
  ],
  manager: [
    'flota.read',
    'finanzas.read',
    'finanzas.write',
    'reportes.read',
    'reportes.write',
    'usuarios.read',
  ],
  operador: [
    'flota.read',
    'viajes.read',
    'viajes.update_status',
    'mantenimiento.report',
  ],
  maniobrista: [
    'flota.read',
    'viajes.read',
  ],
  seguridad: [
    'flota.read',
    'entradas_salidas.read',
    'entradas_salidas.write',
  ],
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
          error: null,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }),

      hasRole: (roles) => {
        const { user } = get()
        if (!user) return false
        return roles.includes(user.rol)
      },

      hasPermission: (permission) => {
        const { user } = get()
        if (!user) return false

        const userPermissions = ROLE_PERMISSIONS[user.rol] || []

        // Admin tiene acceso total
        if (userPermissions.includes('*')) return true

        // Verificar permiso específico
        return userPermissions.includes(permission)
      },
    }),
    {
      name: 'rmb-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Hook para verificar permisos fácilmente
export function usePermission(permission: string): boolean {
  return useAuthStore((state) => state.hasPermission(permission))
}

// Hook para verificar roles
export function useHasRole(roles: RolUsuario[]): boolean {
  return useAuthStore((state) => state.hasRole(roles))
}
