import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import {
  Plus,
  Search,
  Users,
  Shield,
  UserCheck,
  X,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  UserCircle,
  Key,
  RefreshCw,
  Copy,
  Mail,
} from 'lucide-react'
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { db, auth } from '../../services/firebase'
import toast from 'react-hot-toast'
import type { Usuario, RolUsuario } from '../../types'
import { ROLES_INFO } from '../../types'
import { useAuthStore } from '../../store/authStore'

const roleColors: Record<string, string> = {
  red: 'bg-[#BB0034]/10 text-[#BB0034]',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  gray: 'bg-gray-100 text-gray-700',
}

export default function UsuariosPage() {
  const { user: currentUser } = useAuthStore()
  const isAdmin = currentUser?.rol === 'admin'

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRol, setFilterRol] = useState<RolUsuario | 'todos'>('todos')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordUser, setPasswordUser] = useState<Usuario | null>(null)
  const [showStoredPassword, setShowStoredPassword] = useState(false)
  const [newGeneratedPassword, setNewGeneratedPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [manualPassword, setManualPassword] = useState('')
  const [showManualPassword, setShowManualPassword] = useState(false)
  const [sendingResetEmail, setSendingResetEmail] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    password: '',
    telefono: '',
    rol: 'operador' as RolUsuario,
    licencia: '',
    nss: '',
  })

  // Cargar usuarios
  const fetchUsuarios = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'usuarios'))
      const usuariosData: Usuario[] = []
      querySnapshot.forEach((doc) => {
        usuariosData.push({ id: doc.id, ...doc.data() } as Usuario)
      })
      setUsuarios(usuariosData)
    } catch (err) {
      console.error('Error al cargar usuarios:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsuarios()
  }, [])

  // Abrir modal para nuevo usuario
  const handleNewUser = () => {
    setEditingUser(null)
    setFormData({
      nombre: '',
      apellidos: '',
      email: '',
      password: '',
      telefono: '',
      rol: 'operador',
      licencia: '',
      nss: '',
    })
    setError('')
    setShowModal(true)
  }

  // Abrir modal para editar usuario
  const handleEditUser = (user: Usuario) => {
    setEditingUser(user)
    setFormData({
      nombre: user.nombre,
      apellidos: user.apellidos,
      email: user.email,
      password: '',
      telefono: user.telefono || '',
      rol: user.rol,
      licencia: user.licencia || '',
      nss: user.nss || '',
    })
    setError('')
    setShowModal(true)
  }

  // Crear o actualizar usuario
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (editingUser) {
        // Actualizar usuario existente
        await updateDoc(doc(db, 'usuarios', editingUser.id), {
          nombre: formData.nombre,
          apellidos: formData.apellidos,
          telefono: formData.telefono || null,
          rol: formData.rol,
          licencia: formData.licencia || null,
          nss: formData.nss || null,
        })
      } else {
        // Crear nuevo usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        )

        // Crear documento en Firestore
        await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
          email: formData.email,
          nombre: formData.nombre,
          apellidos: formData.apellidos,
          telefono: formData.telefono || null,
          rol: formData.rol,
          activo: true,
          fechaCreacion: serverTimestamp(),
          licencia: formData.licencia || null,
          nss: formData.nss || null,
        })
      }

      setShowModal(false)
      fetchUsuarios()
    } catch (err: unknown) {
      console.error('Error:', err)
      if (err instanceof Error) {
        if (err.message.includes('email-already-in-use')) {
          setError('Este correo ya está registrado')
        } else if (err.message.includes('weak-password')) {
          setError('La contraseña debe tener al menos 6 caracteres')
        } else {
          setError('Error al guardar el usuario')
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Eliminar usuario
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return

    try {
      await deleteDoc(doc(db, 'usuarios', userId))
      fetchUsuarios()
    } catch (err) {
      console.error('Error al eliminar:', err)
    }
  }

  // Toggle activo/inactivo
  const handleToggleActive = async (user: Usuario) => {
    try {
      await updateDoc(doc(db, 'usuarios', user.id), {
        activo: !user.activo,
      })
      fetchUsuarios()
      toast.success(`Usuario ${user.activo ? 'desactivado' : 'activado'}`)
    } catch (err) {
      console.error('Error al actualizar estado:', err)
      toast.error('Error al actualizar estado')
    }
  }

  // Abrir modal de cambio de contraseña (solo admin)
  const handleOpenPasswordModal = (user: Usuario) => {
    setPasswordUser(user)
    setShowStoredPassword(false)
    setNewGeneratedPassword('')
    setManualPassword('')
    setShowManualPassword(false)
    setShowPasswordModal(true)
  }

  // Generar nueva contraseña segura
  const generatePassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    const specialChars = '!@#$%&*'
    let password = 'Rmb'
    for (let i = 0; i < 6; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length))
    return password
  }

  // Generar y guardar nueva contraseña
  const handleGenerateNewPassword = async () => {
    if (!passwordUser) return

    const newPassword = generatePassword()
    setNewGeneratedPassword(newPassword)
    setSavingPassword(true)

    try {
      // Guardar la nueva contraseña en Firestore
      await updateDoc(doc(db, 'usuarios', passwordUser.id), {
        passwordTemporal: newPassword,
        passwordActualizada: serverTimestamp(),
      })

      toast.success('Nueva contraseña generada y guardada')

      // Actualizar el usuario local
      setPasswordUser({
        ...passwordUser,
        passwordTemporal: newPassword,
      } as Usuario & { passwordTemporal?: string })

      fetchUsuarios()
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al guardar la contraseña')
    } finally {
      setSavingPassword(false)
    }
  }

  // Copiar contraseña al portapapeles
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Contraseña copiada al portapapeles')
    } catch (err) {
      toast.error('Error al copiar')
    }
  }

  // Enviar correo de reset de contraseña (solo admin)
  const handleSendResetEmail = async () => {
    if (!passwordUser) return

    setSendingResetEmail(true)
    try {
      await sendPasswordResetEmail(auth, passwordUser.email)
      toast.success(`Se envió un correo de recuperación a ${passwordUser.email}`)
    } catch (err: any) {
      console.error('Error:', err)
      if (err?.code === 'auth/user-not-found') {
        toast.error('El usuario no existe en Firebase Auth')
      } else {
        toast.error('Error al enviar correo de recuperación')
      }
    } finally {
      setSendingResetEmail(false)
    }
  }

  // Guardar contraseña manual asignada por el admin
  const handleSaveManualPassword = async () => {
    if (!passwordUser || !manualPassword.trim()) {
      toast.error('Ingresa una contraseña válida')
      return
    }

    if (manualPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setSavingPassword(true)
    try {
      await updateDoc(doc(db, 'usuarios', passwordUser.id), {
        passwordTemporal: manualPassword,
        passwordActualizada: serverTimestamp(),
      })

      toast.success('Contraseña guardada correctamente')
      setNewGeneratedPassword(manualPassword)
      setManualPassword('')

      // Actualizar usuario local
      setPasswordUser({
        ...passwordUser,
        passwordTemporal: manualPassword,
      } as Usuario & { passwordTemporal?: string })

      fetchUsuarios()
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al guardar la contraseña')
    } finally {
      setSavingPassword(false)
    }
  }

  // Filtrar usuarios
  const filteredUsuarios = usuarios.filter((user) => {
    const matchesSearch =
      user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRol = filterRol === 'todos' || user.rol === filterRol
    return matchesSearch && matchesRol
  })

  // Contadores
  const totalUsuarios = usuarios.length
  const usuariosActivos = usuarios.filter((u) => u.activo).length
  const admins = usuarios.filter((u) => u.rol === 'admin').length

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Usuarios</h1>
          <p className="text-[#3D3D3D]">Administra los usuarios y sus roles</p>
        </div>
        <button
          onClick={handleNewUser}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#3D3D3D] transition-colors"
        >
          <Plus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#BB0034]/10 rounded-lg">
              <Users size={24} className="text-[#BB0034]" />
            </div>
            <div>
              <p className="text-sm text-[#3D3D3D]">Total Usuarios</p>
              <p className="text-2xl font-bold text-[#1a1a1a]">{totalUsuarios}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-[#3D3D3D]">Usuarios Activos</p>
              <p className="text-2xl font-bold text-[#1a1a1a]">{usuariosActivos}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Shield size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-[#3D3D3D]">Administradores</p>
              <p className="text-2xl font-bold text-[#1a1a1a]">{admins}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="bg-white rounded-xl shadow-sm">
        {/* Filtros */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
              />
            </div>
            <select
              value={filterRol}
              onChange={(e) => setFilterRol(e.target.value as RolUsuario | 'todos')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
            >
              <option value="todos">Todos los roles</option>
              {Object.entries(ROLES_INFO).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla o estado vacío */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-[#BB0034] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#3D3D3D]">Cargando usuarios...</p>
          </div>
        ) : filteredUsuarios.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Users size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">
              {searchTerm || filterRol !== 'todos'
                ? 'No se encontraron usuarios'
                : 'No hay usuarios registrados'}
            </h3>
            <p className="text-[#3D3D3D] mb-4">
              {searchTerm || filterRol !== 'todos'
                ? 'Intenta con otros filtros'
                : 'Agrega usuarios para que puedan acceder al sistema'}
            </p>
            {!searchTerm && filterRol === 'todos' && (
              <button
                onClick={handleNewUser}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#3D3D3D] transition-colors"
              >
                <Plus size={20} />
                Nuevo Usuario
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsuarios.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#1a1a1a] rounded-full flex items-center justify-center text-white font-medium">
                          {user.nombre.charAt(0)}
                          {user.apellidos.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-[#1a1a1a]">
                            {user.nombre} {user.apellidos}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          roleColors[ROLES_INFO[user.rol]?.color || 'gray']
                        }`}
                      >
                        {ROLES_INFO[user.rol]?.label || user.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.activo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.telefono || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-gray-500 hover:text-[#BB0034] hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar datos"
                        >
                          <Pencil size={18} />
                        </button>
                        {/* Solo admin puede gestionar contraseñas */}
                        {isAdmin && (
                          <button
                            onClick={() => handleOpenPasswordModal(user)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Cambiar contraseña"
                          >
                            <Key size={18} />
                          </button>
                        )}
                        {/* Solo admin puede eliminar usuarios */}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar usuario"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Usuario */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowModal(false)}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#BB0034]/10 rounded-lg">
                    <UserCircle size={24} className="text-[#BB0034]" />
                  </div>
                  <h2 className="text-xl font-semibold text-[#1a1a1a]">
                    {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) =>
                        setFormData({ ...formData, nombre: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Apellidos *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.apellidos}
                      onChange={(e) =>
                        setFormData({ ...formData, apellidos: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!!editingUser}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none disabled:bg-gray-100"
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Mínimo 6 caracteres
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) =>
                        setFormData({ ...formData, telefono: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                      Rol *
                    </label>
                    <select
                      required
                      value={formData.rol}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rol: e.target.value as RolUsuario,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                    >
                      {Object.entries(ROLES_INFO).map(([key, info]) => (
                        <option key={key} value={key}>
                          {info.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Campos adicionales para operadores/maniobristas */}
                {(formData.rol === 'operador' || formData.rol === 'maniobrista') && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                        Licencia
                      </label>
                      <input
                        type="text"
                        value={formData.licencia}
                        onChange={(e) =>
                          setFormData({ ...formData, licencia: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                        NSS
                      </label>
                      <input
                        type="text"
                        value={formData.nss}
                        onChange={(e) =>
                          setFormData({ ...formData, nss: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Descripción del rol */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">
                      {ROLES_INFO[formData.rol]?.label}:
                    </span>{' '}
                    {ROLES_INFO[formData.rol]?.descripcion}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-[#3D3D3D] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#3D3D3D] transition-colors disabled:opacity-50"
                  >
                    {submitting
                      ? 'Guardando...'
                      : editingUser
                        ? 'Guardar Cambios'
                        : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Contraseña */}
      {showPasswordModal && passwordUser && (
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
                      Gestión de Contraseña
                    </h2>
                    <p className="text-sm text-gray-500">
                      {passwordUser.nombre} {passwordUser.apellidos}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Información */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    Se enviará un correo de recuperación a <strong>{passwordUser.email}</strong> para que el usuario establezca su nueva contraseña.
                  </p>
                </div>

                {/* Enviar correo de reset */}
                <button
                  onClick={handleSendResetEmail}
                  disabled={sendingResetEmail}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#3D3D3D] transition-colors disabled:opacity-50"
                >
                  {sendingResetEmail ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      Enviar Correo de Recuperación
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="w-full px-4 py-2 border border-gray-300 text-[#3D3D3D] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
