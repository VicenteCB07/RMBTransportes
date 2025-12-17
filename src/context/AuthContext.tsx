import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import type { Usuario } from '../types'
import { useAuthStore } from '../store/authStore'

interface AuthContextType {
  user: User | null
  userData: Usuario | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const { setUser: setStoreUser, logout: storeLogout } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        // Obtener datos adicionales del usuario desde Firestore
        const userDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()

          // Verificar si el usuario está activo
          if (data.activo === false) {
            // Usuario inactivo - cerrar sesión
            await signOut(auth)
            setUser(null)
            setUserData(null)
            setLoading(false)
            return
          }

          // Incluir el ID del documento en userData
          const userDataWithId = {
            id: userDoc.id,
            ...data,
          } as Usuario
          setUserData(userDataWithId)
          // Sincronizar con el store de Zustand
          setStoreUser(userDataWithId)
        } else {
          // Usuario en Auth pero no en Firestore - cerrar sesión
          await signOut(auth)
          setUserData(null)
        }
      } else {
        setUserData(null)
        storeLogout()
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [setStoreUser, storeLogout])

  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)

    // Verificar si el usuario está activo
    const userDoc = await getDoc(doc(db, 'usuarios', userCredential.user.uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      if (data.activo === false) {
        await signOut(auth)
        throw new Error('Usuario inactivo. Contacta al administrador.')
      }
    } else {
      await signOut(auth)
      throw new Error('Usuario no encontrado en el sistema.')
    }
  }

  const logout = async () => {
    await signOut(auth)
    setUserData(null)
    storeLogout()
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  const value = {
    user,
    userData,
    loading,
    login,
    logout,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
