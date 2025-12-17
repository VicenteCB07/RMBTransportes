/**
 * Tipos para el módulo de Personal Administrativo
 * Despachadores, asistentes, seguridad y administradores
 */

export type RolAdministrativo = 'despachador' | 'asistente' | 'seguridad' | 'admin';

export type PermisoSistema =
  | 'dashboard'
  | 'viajes'
  | 'viajes.crear'
  | 'viajes.editar'
  | 'viajes.cancelar'
  | 'clientes'
  | 'clientes.crear'
  | 'clientes.editar'
  | 'clientes.eliminar'
  | 'flota'
  | 'flota.crear'
  | 'flota.editar'
  | 'operadores'
  | 'operadores.crear'
  | 'operadores.editar'
  | 'maniobristas'
  | 'finanzas'
  | 'finanzas.gastos'
  | 'finanzas.facturas'
  | 'reportes'
  | 'configuracion'
  | 'usuarios';

export interface PersonalAdministrativo {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  foto?: string; // URL de imagen

  // Rol y permisos
  rol: RolAdministrativo;
  permisos: PermisoSistema[];

  // Estado
  activo: boolean;

  // Firebase Auth UID (si tiene cuenta de acceso)
  authUid?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalAdministrativoFormInput {
  nombre: string;
  email: string;
  telefono: string;
  foto?: string;
  rol: RolAdministrativo;
  permisos: PermisoSistema[];
}

export interface FiltrosPersonalAdministrativo {
  busqueda?: string;
  activo?: boolean;
  rol?: RolAdministrativo;
}

// Constantes
export const ROLES_ADMINISTRATIVOS: { value: RolAdministrativo; label: string; descripcion: string }[] = [
  { value: 'admin', label: 'Administrador', descripcion: 'Acceso total al sistema' },
  { value: 'despachador', label: 'Despachador', descripcion: 'Coordina rutas y viajes' },
  { value: 'asistente', label: 'Asistente', descripcion: 'Soporte administrativo' },
  { value: 'seguridad', label: 'Seguridad', descripcion: 'Control de accesos y vigilancia' },
];

// Permisos por defecto según rol
export const PERMISOS_POR_ROL: Record<RolAdministrativo, PermisoSistema[]> = {
  admin: [
    'dashboard', 'viajes', 'viajes.crear', 'viajes.editar', 'viajes.cancelar',
    'clientes', 'clientes.crear', 'clientes.editar', 'clientes.eliminar',
    'flota', 'flota.crear', 'flota.editar',
    'operadores', 'operadores.crear', 'operadores.editar',
    'maniobristas', 'finanzas', 'finanzas.gastos', 'finanzas.facturas',
    'reportes', 'configuracion', 'usuarios'
  ],
  despachador: [
    'dashboard', 'viajes', 'viajes.crear', 'viajes.editar',
    'clientes', 'clientes.crear',
    'flota', 'operadores', 'maniobristas'
  ],
  asistente: [
    'dashboard', 'viajes', 'clientes', 'flota', 'operadores', 'maniobristas'
  ],
  seguridad: [
    'dashboard', 'viajes', 'flota', 'operadores'
  ],
};

export const PERMISOS_INFO: { value: PermisoSistema; label: string; grupo: string }[] = [
  // Dashboard
  { value: 'dashboard', label: 'Ver Dashboard', grupo: 'General' },
  // Viajes
  { value: 'viajes', label: 'Ver Viajes', grupo: 'Viajes' },
  { value: 'viajes.crear', label: 'Crear Viajes', grupo: 'Viajes' },
  { value: 'viajes.editar', label: 'Editar Viajes', grupo: 'Viajes' },
  { value: 'viajes.cancelar', label: 'Cancelar Viajes', grupo: 'Viajes' },
  // Clientes
  { value: 'clientes', label: 'Ver Clientes', grupo: 'Clientes' },
  { value: 'clientes.crear', label: 'Crear Clientes', grupo: 'Clientes' },
  { value: 'clientes.editar', label: 'Editar Clientes', grupo: 'Clientes' },
  { value: 'clientes.eliminar', label: 'Eliminar Clientes', grupo: 'Clientes' },
  // Flota
  { value: 'flota', label: 'Ver Flota', grupo: 'Flota' },
  { value: 'flota.crear', label: 'Crear Vehículos', grupo: 'Flota' },
  { value: 'flota.editar', label: 'Editar Vehículos', grupo: 'Flota' },
  // Operadores
  { value: 'operadores', label: 'Ver Operadores', grupo: 'Personal' },
  { value: 'operadores.crear', label: 'Crear Operadores', grupo: 'Personal' },
  { value: 'operadores.editar', label: 'Editar Operadores', grupo: 'Personal' },
  { value: 'maniobristas', label: 'Ver Maniobristas', grupo: 'Personal' },
  // Finanzas
  { value: 'finanzas', label: 'Ver Finanzas', grupo: 'Finanzas' },
  { value: 'finanzas.gastos', label: 'Registrar Gastos', grupo: 'Finanzas' },
  { value: 'finanzas.facturas', label: 'Gestionar Facturas', grupo: 'Finanzas' },
  // Sistema
  { value: 'reportes', label: 'Ver Reportes', grupo: 'Sistema' },
  { value: 'configuracion', label: 'Configuración', grupo: 'Sistema' },
  { value: 'usuarios', label: 'Gestionar Usuarios', grupo: 'Sistema' },
];
