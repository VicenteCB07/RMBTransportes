/**
 * Tipos para el módulo de Inventario EPP y Herramientas
 * Equipo de protección personal y herramientas en resguardo
 */

export type CategoriaInventario = 'epp' | 'herramienta' | 'accesorio';
export type CondicionItem = 'nuevo' | 'bueno' | 'regular' | 'malo';
export type TipoAsignacion = 'operador' | 'tracto' | 'almacen';

export interface AsignacionInventario {
  tipo: TipoAsignacion;
  id: string; // ID del operador o tracto
  nombre: string; // Nombre para mostrar
}

export interface ItemInventario {
  id: string;
  nombre: string;
  categoria: CategoriaInventario;
  cantidad: number;

  // Asignación
  asignadoA?: AsignacionInventario;
  fechaAsignacion?: Date;

  // Estado
  condicion: CondicionItem;
  foto?: string; // URL de imagen
  notas?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemInventarioFormInput {
  nombre: string;
  categoria: CategoriaInventario;
  cantidad: number;
  asignadoA?: {
    tipo: TipoAsignacion;
    id: string;
    nombre: string;
  };
  fechaAsignacion?: Date | string;
  condicion: CondicionItem;
  foto?: string;
  notas?: string;
}

export interface FiltrosInventario {
  busqueda?: string;
  categoria?: CategoriaInventario;
  condicion?: CondicionItem;
  asignadoA?: string;
}

// Constantes
export const CATEGORIAS_INVENTARIO: { value: CategoriaInventario; label: string }[] = [
  { value: 'epp', label: 'EPP (Equipo de Protección Personal)' },
  { value: 'herramienta', label: 'Herramienta' },
  { value: 'accesorio', label: 'Accesorio' },
];

export const CONDICIONES_ITEM: { value: CondicionItem; label: string; color: string }[] = [
  { value: 'nuevo', label: 'Nuevo', color: 'green' },
  { value: 'bueno', label: 'Bueno', color: 'blue' },
  { value: 'regular', label: 'Regular', color: 'yellow' },
  { value: 'malo', label: 'Malo', color: 'red' },
];

// Items comunes de EPP
export const EPP_COMUNES: string[] = [
  'Casco con barbiquejo',
  'Chaleco reflejante',
  'Botas con casquillo',
  'Guantes de trabajo',
  'Lentes de seguridad',
  'Tapones auditivos',
  'Arnés de seguridad',
  'Mascarilla',
];

// Herramientas comunes
export const HERRAMIENTAS_COMUNES: string[] = [
  'Gato hidráulico',
  'Llave de cruz',
  'Juego de llaves mixtas',
  'Desarmadores',
  'Cables pasa corriente',
  'Linterna',
  'Cinta de aislar',
  'Extintor',
];

/**
 * Requisitos reglamentarios por unidad
 * Checklist de lo que debe tener cada tractocamión por ley
 */
export interface RequisitosReglamentarios {
  id: string;
  tractocamionId: string;

  // Equipo de emergencia obligatorio
  llantaRefaccion: boolean;
  llantaRefaccionCondicion?: CondicionItem;
  gato: boolean;
  llaveCruz: boolean;
  triangulos: boolean; // Mínimo 2
  cantidadTriangulos?: number;
  extintor: boolean;
  extintorVigencia?: Date;
  botiquin: boolean;

  // Seguridad
  chalecosReflejantes: number;
  cablesArranque?: boolean;
  linterna?: boolean;

  // Verificación
  ultimaRevision: Date;
  proximaRevision?: Date;
  revisadoPor?: string;

  notas?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface RequisitosReglamentariosFormInput {
  tractocamionId: string;
  llantaRefaccion: boolean;
  llantaRefaccionCondicion?: CondicionItem;
  gato: boolean;
  llaveCruz: boolean;
  triangulos: boolean;
  cantidadTriangulos?: number;
  extintor: boolean;
  extintorVigencia?: Date | string;
  botiquin: boolean;
  chalecosReflejantes: number;
  cablesArranque?: boolean;
  linterna?: boolean;
  ultimaRevision: Date | string;
  proximaRevision?: Date | string;
  revisadoPor?: string;
  notas?: string;
}
