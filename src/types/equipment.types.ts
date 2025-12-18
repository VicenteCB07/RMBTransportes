/**
 * Tipos para el Catálogo de Equipos/Cargas
 * Dimensiones y pesos para planificación de transporte
 * RMB Transportes - Diciembre 2025
 */

/**
 * Categorías de equipos
 */
export type CategoriaEquipo =
  | 'tijera_electrica'      // Scissor lift eléctrica
  | 'tijera_diesel'         // Scissor lift diesel/RT
  | 'brazo_articulado'      // Articulating boom
  | 'brazo_telescopico'     // Telescopic boom
  | 'telehandler'           // Manipulador telescópico
  | 'montacargas'           // Forklift
  | 'plataforma_personal'   // Personnel lift / AWP
  | 'otro';

/**
 * Especificaciones de un equipo
 */
export interface EquipoSpec {
  modelo: string;
  marca: MarcaEquipo;
  categoria: CategoriaEquipo;

  // Dimensiones en metros
  dimensiones: {
    largo: number;      // Longitud total (m)
    ancho: number;      // Ancho total (m)
    alto: number;       // Altura de transporte (m)
  };

  // Peso en kg
  peso: number;

  // Capacidad de trabajo
  capacidad?: {
    carga: number;           // Capacidad de carga (kg)
    alturaMaxima?: number;   // Altura máxima de trabajo (m)
    alcanceHorizontal?: number; // Alcance horizontal (m)
  };

  // Notas adicionales
  notas?: string;
}

export type MarcaEquipo =
  | 'DINGLI'
  | 'FRONTEQ'
  | 'GENIE'
  | 'HAULOTTE'
  | 'JLG'
  | 'MANITOU'
  | 'MITSUBISHI'
  | 'SANY'
  | 'SKYTRAK'
  | 'TOYOTA'
  | 'ZOOMLION';

/**
 * Catálogo completo de equipos con especificaciones
 * Datos recopilados de fichas técnicas oficiales
 */
export const CATALOGO_EQUIPOS: EquipoSpec[] = [
  // ═══════════════════════════════════════════════════════════════
  // DINGLI
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: 'BA16NE',
    marca: 'DINGLI',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 6.50, ancho: 1.80, alto: 2.10 },
    peso: 7200,
    capacidad: { carga: 230, alturaMaxima: 16.0, alcanceHorizontal: 8.0 },
  },
  {
    modelo: 'BA20CHRT',
    marca: 'DINGLI',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.20, ancho: 2.30, alto: 2.50 },
    peso: 9500,
    capacidad: { carga: 230, alturaMaxima: 20.0, alcanceHorizontal: 10.5 },
    notas: 'Versión rough terrain',
  },
  {
    modelo: 'BA20CHRT2',
    marca: 'DINGLI',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.20, ancho: 2.30, alto: 2.50 },
    peso: 9700,
    capacidad: { carga: 230, alturaMaxima: 20.0, alcanceHorizontal: 10.5 },
    notas: 'Versión rough terrain mejorada',
  },
  {
    modelo: 'BA20ERT',
    marca: 'DINGLI',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.00, ancho: 2.30, alto: 2.45 },
    peso: 9200,
    capacidad: { carga: 230, alturaMaxima: 20.0, alcanceHorizontal: 10.0 },
    notas: 'Eléctrica rough terrain',
  },
  {
    modelo: 'JCPT1212AC',
    marca: 'DINGLI',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.48, ancho: 1.22, alto: 2.28 },
    peso: 2950,
    capacidad: { carga: 320, alturaMaxima: 12.0 },
  },
  {
    modelo: 'JCPT1412AC',
    marca: 'DINGLI',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.48, ancho: 1.22, alto: 2.42 },
    peso: 3200,
    capacidad: { carga: 320, alturaMaxima: 14.0 },
  },
  {
    modelo: 'JCPT1612AC',
    marca: 'DINGLI',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.50, ancho: 1.22, alto: 2.56 },
    peso: 3450,
    capacidad: { carga: 300, alturaMaxima: 16.0 },
  },

  // ═══════════════════════════════════════════════════════════════
  // FRONTEQ
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: 'FB12E',
    marca: 'FRONTEQ',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 5.20, ancho: 1.75, alto: 2.00 },
    peso: 5800,
    capacidad: { carga: 200, alturaMaxima: 12.0, alcanceHorizontal: 5.5 },
    notas: 'Brazo articulado eléctrico compacto',
  },
  {
    modelo: 'FS0507E',
    marca: 'FRONTEQ',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 1.85, ancho: 0.76, alto: 2.00 },
    peso: 1100,
    capacidad: { carga: 230, alturaMaxima: 5.0 },
    notas: 'Tijera compacta para espacios reducidos',
  },
  {
    modelo: 'FS1012E',
    marca: 'FRONTEQ',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.48, ancho: 1.15, alto: 2.30 },
    peso: 2800,
    capacidad: { carga: 320, alturaMaxima: 10.0 },
  },

  // ═══════════════════════════════════════════════════════════════
  // GENIE - Plataformas Personales (AWP)
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: 'AWP-25S',
    marca: 'GENIE',
    categoria: 'plataforma_personal',
    dimensiones: { largo: 1.35, ancho: 0.74, alto: 2.00 },
    peso: 295,
    capacidad: { carga: 159, alturaMaxima: 7.57 },
    notas: 'Plataforma personal DC',
  },
  {
    modelo: 'AWP-30S',
    marca: 'GENIE',
    categoria: 'plataforma_personal',
    dimensiones: { largo: 1.35, ancho: 0.74, alto: 2.00 },
    peso: 318,
    capacidad: { carga: 159, alturaMaxima: 9.02 },
    notas: 'Plataforma personal DC',
  },
  {
    modelo: 'AWP-36S',
    marca: 'GENIE',
    categoria: 'plataforma_personal',
    dimensiones: { largo: 1.35, ancho: 0.74, alto: 2.00 },
    peso: 345,
    capacidad: { carga: 159, alturaMaxima: 10.97 },
    notas: 'Plataforma personal DC',
  },
  {
    modelo: 'AWP-40S',
    marca: 'GENIE',
    categoria: 'plataforma_personal',
    dimensiones: { largo: 1.35, ancho: 0.74, alto: 2.00 },
    peso: 386,
    capacidad: { carga: 159, alturaMaxima: 12.19 },
    notas: 'Plataforma personal DC',
  },

  // ═══════════════════════════════════════════════════════════════
  // GENIE - Tijeras Eléctricas (GS)
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: 'GS-1530',
    marca: 'GENIE',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 1.83, ancho: 0.76, alto: 1.78 },
    peso: 1134,
    capacidad: { carga: 227, alturaMaxima: 6.35 },
  },
  {
    modelo: 'GS-1930',
    marca: 'GENIE',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 1.83, ancho: 0.76, alto: 1.98 },
    peso: 1247,
    capacidad: { carga: 227, alturaMaxima: 7.79 },
  },
  {
    modelo: 'GS-2032',
    marca: 'GENIE',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 1.83, ancho: 0.81, alto: 2.00 },
    peso: 1406,
    capacidad: { carga: 363, alturaMaxima: 8.10 },
  },
  {
    modelo: 'GS-2046',
    marca: 'GENIE',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.44, ancho: 1.17, alto: 2.08 },
    peso: 2177,
    capacidad: { carga: 454, alturaMaxima: 8.10 },
  },
  {
    modelo: 'GS-2632',
    marca: 'GENIE',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 1.83, ancho: 0.81, alto: 2.26 },
    peso: 1633,
    capacidad: { carga: 227, alturaMaxima: 9.92 },
  },
  {
    modelo: 'GS-2646',
    marca: 'GENIE',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.44, ancho: 1.17, alto: 2.31 },
    peso: 2404,
    capacidad: { carga: 454, alturaMaxima: 9.92 },
  },
  {
    modelo: 'GS-3232',
    marca: 'GENIE',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 1.83, ancho: 0.81, alto: 2.51 },
    peso: 1860,
    capacidad: { carga: 227, alturaMaxima: 11.75 },
  },
  {
    modelo: 'GS-3246',
    marca: 'GENIE',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.44, ancho: 1.17, alto: 2.54 },
    peso: 2857,
    capacidad: { carga: 318, alturaMaxima: 11.75 },
  },
  {
    modelo: 'GS-4047',
    marca: 'GENIE',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.49, ancho: 1.19, alto: 2.79 },
    peso: 3856,
    capacidad: { carga: 350, alturaMaxima: 14.0 },
  },

  // ═══════════════════════════════════════════════════════════════
  // GENIE - Tijeras Rough Terrain (GS RT)
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: 'GS-2669-RT',
    marca: 'GENIE',
    categoria: 'tijera_diesel',
    dimensiones: { largo: 3.07, ancho: 1.75, alto: 2.44 },
    peso: 3810,
    capacidad: { carga: 454, alturaMaxima: 9.92 },
    notas: 'Rough terrain 4x4',
  },
  {
    modelo: 'GS-3369-RT',
    marca: 'GENIE',
    categoria: 'tijera_diesel',
    dimensiones: { largo: 3.07, ancho: 1.75, alto: 2.69 },
    peso: 4264,
    capacidad: { carga: 454, alturaMaxima: 11.89 },
    notas: 'Rough terrain 4x4',
  },
  {
    modelo: 'GS-4069-RT',
    marca: 'GENIE',
    categoria: 'tijera_diesel',
    dimensiones: { largo: 3.07, ancho: 1.75, alto: 2.97 },
    peso: 5080,
    capacidad: { carga: 363, alturaMaxima: 14.02 },
    notas: 'Rough terrain 4x4',
  },
  {
    modelo: 'GS-5390-RT',
    marca: 'GENIE',
    categoria: 'tijera_diesel',
    dimensiones: { largo: 4.11, ancho: 2.29, alto: 3.20 },
    peso: 8165,
    capacidad: { carga: 454, alturaMaxima: 18.12 },
    notas: 'Rough terrain 4x4 - Gran capacidad',
  },

  // ═══════════════════════════════════════════════════════════════
  // GENIE - Telehandlers (GTH)
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: 'GTH-636',
    marca: 'GENIE',
    categoria: 'telehandler',
    dimensiones: { largo: 4.90, ancho: 2.16, alto: 2.20 },
    peso: 5670,
    capacidad: { carga: 2722, alturaMaxima: 10.70, alcanceHorizontal: 6.10 },
  },
  {
    modelo: 'GTH-844',
    marca: 'GENIE',
    categoria: 'telehandler',
    dimensiones: { largo: 5.18, ancho: 2.29, alto: 2.36 },
    peso: 7711,
    capacidad: { carga: 3629, alturaMaxima: 13.10, alcanceHorizontal: 7.62 },
  },
  {
    modelo: 'GTH-1056',
    marca: 'GENIE',
    categoria: 'telehandler',
    dimensiones: { largo: 6.22, ancho: 2.49, alto: 2.54 },
    peso: 11340,
    capacidad: { carga: 4536, alturaMaxima: 17.07, alcanceHorizontal: 11.89 },
  },
  {
    modelo: 'GTH-1256',
    marca: 'GENIE',
    categoria: 'telehandler',
    dimensiones: { largo: 6.40, ancho: 2.49, alto: 2.64 },
    peso: 14061,
    capacidad: { carga: 5443, alturaMaxima: 17.07, alcanceHorizontal: 12.80 },
  },

  // ═══════════════════════════════════════════════════════════════
  // GENIE - Brazos Telescópicos (S)
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: 'S-40',
    marca: 'GENIE',
    categoria: 'brazo_telescopico',
    dimensiones: { largo: 7.57, ancho: 2.29, alto: 2.36 },
    peso: 6124,
    capacidad: { carga: 227, alturaMaxima: 14.20, alcanceHorizontal: 10.06 },
  },
  {
    modelo: 'S-45',
    marca: 'GENIE',
    categoria: 'brazo_telescopico',
    dimensiones: { largo: 8.03, ancho: 2.29, alto: 2.44 },
    peso: 6804,
    capacidad: { carga: 227, alturaMaxima: 15.72, alcanceHorizontal: 11.28 },
  },
  {
    modelo: 'S-60',
    marca: 'GENIE',
    categoria: 'brazo_telescopico',
    dimensiones: { largo: 8.03, ancho: 2.49, alto: 2.59 },
    peso: 9525,
    capacidad: { carga: 227, alturaMaxima: 20.39, alcanceHorizontal: 14.63 },
  },
  {
    modelo: 'S-60X',
    marca: 'GENIE',
    categoria: 'brazo_telescopico',
    dimensiones: { largo: 8.03, ancho: 2.49, alto: 2.59 },
    peso: 9707,
    capacidad: { carga: 227, alturaMaxima: 20.39, alcanceHorizontal: 15.09 },
    notas: 'Xtra Capacity - mayor alcance',
  },
  {
    modelo: 'S-65',
    marca: 'GENIE',
    categoria: 'brazo_telescopico',
    dimensiones: { largo: 9.30, ancho: 2.49, alto: 2.69 },
    peso: 10206,
    capacidad: { carga: 227, alturaMaxima: 21.81, alcanceHorizontal: 17.37 },
  },
  {
    modelo: 'S-80X',
    marca: 'GENIE',
    categoria: 'brazo_telescopico',
    dimensiones: { largo: 10.13, ancho: 2.49, alto: 2.69 },
    peso: 12247,
    capacidad: { carga: 227, alturaMaxima: 26.38, alcanceHorizontal: 21.34 },
  },
  {
    modelo: 'S-85',
    marca: 'GENIE',
    categoria: 'brazo_telescopico',
    dimensiones: { largo: 10.31, ancho: 2.49, alto: 2.79 },
    peso: 13608,
    capacidad: { carga: 227, alturaMaxima: 27.91, alcanceHorizontal: 23.47 },
  },

  // ═══════════════════════════════════════════════════════════════
  // GENIE - Brazos Articulados (Z)
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: 'Z-34/22IC',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 5.59, ancho: 1.75, alto: 2.03 },
    peso: 5897,
    capacidad: { carga: 227, alturaMaxima: 12.52, alcanceHorizontal: 6.71 },
    notas: 'Motor de combustión interna',
  },
  {
    modelo: 'Z-45/25J-RT',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.47, ancho: 2.29, alto: 2.34 },
    peso: 7348,
    capacidad: { carga: 227, alturaMaxima: 15.87, alcanceHorizontal: 7.65 },
    notas: 'Rough terrain diesel',
  },
  {
    modelo: 'Z-60/37-FE',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 8.31, ancho: 2.49, alto: 2.59 },
    peso: 11340,
    capacidad: { carga: 227, alturaMaxima: 20.16, alcanceHorizontal: 11.35 },
    notas: 'Fuel-Electric híbrido',
  },
  {
    modelo: 'Z-62/40',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 8.69, ancho: 2.49, alto: 2.72 },
    peso: 12247,
    capacidad: { carga: 227, alturaMaxima: 20.87, alcanceHorizontal: 12.34 },
  },
  {
    modelo: 'Z-80/60',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 10.97, ancho: 2.49, alto: 3.00 },
    peso: 17237,
    capacidad: { carga: 227, alturaMaxima: 26.21, alcanceHorizontal: 18.29 },
  },

  // ═══════════════════════════════════════════════════════════════
  // GENIE - Brazos Articulados Eléctricos (ZX)
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: 'ZX-135/70',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 11.63, ancho: 2.49, alto: 3.10 },
    peso: 20412,
    capacidad: { carga: 272, alturaMaxima: 43.15, alcanceHorizontal: 21.26 },
    notas: 'Ultra alto alcance',
  },

  // ═══════════════════════════════════════════════════════════════
  // GENIE - Modelos adicionales
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: 'AWP-25-DC',
    marca: 'GENIE',
    categoria: 'plataforma_personal',
    dimensiones: { largo: 1.35, ancho: 0.74, alto: 2.00 },
    peso: 295,
    capacidad: { carga: 159, alturaMaxima: 7.57 },
    notas: 'Plataforma personal DC',
  },
  {
    modelo: 'AWP-35-DC',
    marca: 'GENIE',
    categoria: 'plataforma_personal',
    dimensiones: { largo: 1.35, ancho: 0.74, alto: 2.00 },
    peso: 340,
    capacidad: { carga: 159, alturaMaxima: 10.67 },
    notas: 'Plataforma personal DC',
  },
  {
    modelo: 'GS-3246-DC',
    marca: 'GENIE',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.44, ancho: 1.17, alto: 2.54 },
    peso: 2900,
    capacidad: { carga: 318, alturaMaxima: 11.75 },
    notas: 'Versión DC',
  },
  {
    modelo: 'GS-4047-DC',
    marca: 'GENIE',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.49, ancho: 1.19, alto: 2.79 },
    peso: 3900,
    capacidad: { carga: 350, alturaMaxima: 14.0 },
    notas: 'Versión DC',
  },
  {
    modelo: 'GS-4069-DC',
    marca: 'GENIE',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 3.07, ancho: 1.75, alto: 2.97 },
    peso: 5100,
    capacidad: { carga: 363, alturaMaxima: 14.02 },
    notas: 'Versión DC',
  },
  {
    modelo: 'GS-4390',
    marca: 'GENIE',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 3.58, ancho: 2.29, alto: 3.05 },
    peso: 7030,
    capacidad: { carga: 454, alturaMaxima: 15.11 },
  },
  {
    modelo: 'GS-4390-RT',
    marca: 'GENIE',
    categoria: 'tijera_diesel',
    dimensiones: { largo: 3.58, ancho: 2.29, alto: 3.05 },
    peso: 7484,
    capacidad: { carga: 454, alturaMaxima: 15.11 },
    notas: 'Rough terrain 4x4',
  },
  {
    modelo: 'GTH-5519',
    marca: 'GENIE',
    categoria: 'telehandler',
    dimensiones: { largo: 5.49, ancho: 2.31, alto: 2.21 },
    peso: 7257,
    capacidad: { carga: 2495, alturaMaxima: 16.76, alcanceHorizontal: 12.50 },
  },
  {
    modelo: 'IWP-30S',
    marca: 'GENIE',
    categoria: 'plataforma_personal',
    dimensiones: { largo: 1.35, ancho: 0.74, alto: 2.00 },
    peso: 320,
    capacidad: { carga: 159, alturaMaxima: 9.02 },
    notas: 'Plataforma industrial de mástil',
  },
  {
    modelo: 'S-125',
    marca: 'GENIE',
    categoria: 'brazo_telescopico',
    dimensiones: { largo: 13.54, ancho: 2.49, alto: 3.05 },
    peso: 22680,
    capacidad: { carga: 340, alturaMaxima: 40.15, alcanceHorizontal: 27.43 },
    notas: 'Brazo telescópico de gran altura',
  },
  {
    modelo: 'SX-180',
    marca: 'GENIE',
    categoria: 'brazo_telescopico',
    dimensiones: { largo: 14.88, ancho: 2.49, alto: 3.05 },
    peso: 29030,
    capacidad: { carga: 340, alturaMaxima: 56.86, alcanceHorizontal: 24.38 },
    notas: 'Ultra alto alcance telescópico',
  },
  {
    modelo: 'Z-135',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 12.65, ancho: 2.49, alto: 3.10 },
    peso: 24494,
    capacidad: { carga: 227, alturaMaxima: 43.15, alcanceHorizontal: 21.26 },
    notas: 'Brazo articulado de gran altura',
  },
  {
    modelo: 'Z-33/18',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 4.80, ancho: 1.50, alto: 1.98 },
    peso: 4173,
    capacidad: { carga: 200, alturaMaxima: 11.75, alcanceHorizontal: 5.56 },
    notas: 'Compacto para interiores',
  },
  {
    modelo: 'Z-34/22-N',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 5.59, ancho: 1.50, alto: 2.03 },
    peso: 5352,
    capacidad: { carga: 227, alturaMaxima: 12.52, alcanceHorizontal: 6.71 },
    notas: 'Versión narrow - ancho reducido',
  },
  {
    modelo: 'Z-40/23-N-RJ',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 6.10, ancho: 1.50, alto: 2.13 },
    peso: 6350,
    capacidad: { carga: 227, alturaMaxima: 14.32, alcanceHorizontal: 7.01 },
    notas: 'Narrow con jib rotatorio',
  },
  {
    modelo: 'Z-45/25',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.47, ancho: 2.29, alto: 2.34 },
    peso: 7167,
    capacidad: { carga: 227, alturaMaxima: 15.87, alcanceHorizontal: 7.65 },
  },
  {
    modelo: 'Z-45/25-DC',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.47, ancho: 2.29, alto: 2.34 },
    peso: 7300,
    capacidad: { carga: 227, alturaMaxima: 15.87, alcanceHorizontal: 7.65 },
    notas: 'Versión DC eléctrica',
  },
  {
    modelo: 'Z-45/25-J',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.47, ancho: 2.29, alto: 2.34 },
    peso: 7394,
    capacidad: { carga: 227, alturaMaxima: 15.87, alcanceHorizontal: 7.65 },
    notas: 'Con jib',
  },
  {
    modelo: 'Z-45/25-J-DC',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.47, ancho: 2.29, alto: 2.34 },
    peso: 7500,
    capacidad: { carga: 227, alturaMaxima: 15.87, alcanceHorizontal: 7.65 },
    notas: 'Con jib, versión DC',
  },
  {
    modelo: 'Z-45/25-J-RT',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.47, ancho: 2.29, alto: 2.34 },
    peso: 7620,
    capacidad: { carga: 227, alturaMaxima: 15.87, alcanceHorizontal: 7.65 },
    notas: 'Con jib, rough terrain',
  },
  {
    modelo: 'Z-45/25-RT',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.47, ancho: 2.29, alto: 2.34 },
    peso: 7484,
    capacidad: { carga: 227, alturaMaxima: 15.87, alcanceHorizontal: 7.65 },
    notas: 'Rough terrain',
  },
  {
    modelo: 'Z-60-FE',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 8.31, ancho: 2.49, alto: 2.59 },
    peso: 11113,
    capacidad: { carga: 227, alturaMaxima: 20.16, alcanceHorizontal: 11.35 },
    notas: 'Fuel-Electric híbrido',
  },
  {
    modelo: 'Z-60/34',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 8.31, ancho: 2.49, alto: 2.59 },
    peso: 10886,
    capacidad: { carga: 227, alturaMaxima: 20.16, alcanceHorizontal: 10.36 },
  },
  {
    modelo: 'Z-60/37-DC',
    marca: 'GENIE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 8.31, ancho: 2.49, alto: 2.59 },
    peso: 11500,
    capacidad: { carga: 227, alturaMaxima: 20.16, alcanceHorizontal: 11.35 },
    notas: 'Versión DC',
  },

  // ═══════════════════════════════════════════════════════════════
  // HAULOTTE
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: 'COMPACT-12',
    marca: 'HAULOTTE',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.48, ancho: 1.20, alto: 2.28 },
    peso: 2750,
    capacidad: { carga: 350, alturaMaxima: 12.0 },
  },
  {
    modelo: 'HA16-RTJ',
    marca: 'HAULOTTE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 6.68, ancho: 2.30, alto: 2.24 },
    peso: 6700,
    capacidad: { carga: 230, alturaMaxima: 16.0, alcanceHorizontal: 8.80 },
    notas: 'Rough terrain diesel',
  },
  {
    modelo: 'HA20-RTJ',
    marca: 'HAULOTTE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.33, ancho: 2.30, alto: 2.54 },
    peso: 8800,
    capacidad: { carga: 230, alturaMaxima: 20.0, alcanceHorizontal: 12.0 },
    notas: 'Rough terrain diesel',
  },
  {
    modelo: 'HA26-RTJ-O',
    marca: 'HAULOTTE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 9.82, ancho: 2.49, alto: 2.77 },
    peso: 14500,
    capacidad: { carga: 230, alturaMaxima: 26.0, alcanceHorizontal: 17.20 },
    notas: 'Rough terrain diesel - Gran altura',
  },
  {
    modelo: 'HB86-TJ',
    marca: 'HAULOTTE',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 9.90, ancho: 2.49, alto: 2.91 },
    peso: 15500,
    capacidad: { carga: 230, alturaMaxima: 26.40, alcanceHorizontal: 21.0 },
    notas: 'Brazo telescópico articulado',
  },
  {
    modelo: 'OPTIMUM-8',
    marca: 'HAULOTTE',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.48, ancho: 0.81, alto: 2.27 },
    peso: 1800,
    capacidad: { carga: 230, alturaMaxima: 8.0 },
    notas: 'Compacta - ancho reducido',
  },
  {
    modelo: 'STAR-10',
    marca: 'HAULOTTE',
    categoria: 'plataforma_personal',
    dimensiones: { largo: 1.40, ancho: 0.80, alto: 2.00 },
    peso: 980,
    capacidad: { carga: 200, alturaMaxima: 10.0 },
    notas: 'Plataforma vertical de mástil',
  },

  // ═══════════════════════════════════════════════════════════════
  // JLG
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: '1250AJP',
    marca: 'JLG',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 11.89, ancho: 2.49, alto: 3.02 },
    peso: 20412,
    capacidad: { carga: 230, alturaMaxima: 38.10, alcanceHorizontal: 17.37 },
    notas: 'Articulado de gran altura',
  },
  {
    modelo: '3614-RS',
    marca: 'JLG',
    categoria: 'telehandler',
    dimensiones: { largo: 4.65, ancho: 2.03, alto: 2.05 },
    peso: 5670,
    capacidad: { carga: 1600, alturaMaxima: 10.97, alcanceHorizontal: 5.79 },
  },
  {
    modelo: '4069-LE',
    marca: 'JLG',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.49, ancho: 1.75, alto: 2.87 },
    peso: 4309,
    capacidad: { carga: 350, alturaMaxima: 14.02 },
    notas: 'Eléctrica - plataforma ancha',
  },
  {
    modelo: '520AJ-HC3',
    marca: 'JLG',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.09, ancho: 2.34, alto: 2.23 },
    peso: 7620,
    capacidad: { carga: 340, alturaMaxima: 17.83, alcanceHorizontal: 9.50 },
    notas: 'High Capacity - 340kg en canasta',
  },
  {
    modelo: '600S',
    marca: 'JLG',
    categoria: 'brazo_telescopico',
    dimensiones: { largo: 9.83, ancho: 2.44, alto: 2.69 },
    peso: 10569,
    capacidad: { carga: 227, alturaMaxima: 20.29, alcanceHorizontal: 16.76 },
  },
  {
    modelo: '800A',
    marca: 'JLG',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 10.36, ancho: 2.44, alto: 2.90 },
    peso: 15422,
    capacidad: { carga: 227, alturaMaxima: 26.21, alcanceHorizontal: 17.68 },
  },
  {
    modelo: '800AJ',
    marca: 'JLG',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 10.36, ancho: 2.44, alto: 2.90 },
    peso: 15876,
    capacidad: { carga: 227, alturaMaxima: 26.21, alcanceHorizontal: 17.68 },
    notas: 'Versión con jib',
  },
  {
    modelo: '860SJ',
    marca: 'JLG',
    categoria: 'brazo_telescopico',
    dimensiones: { largo: 10.87, ancho: 2.49, alto: 2.90 },
    peso: 15195,
    capacidad: { carga: 227, alturaMaxima: 28.21, alcanceHorizontal: 22.86 },
  },
  {
    modelo: 'E300AJP',
    marca: 'JLG',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 5.11, ancho: 1.50, alto: 2.00 },
    peso: 4763,
    capacidad: { carga: 227, alturaMaxima: 11.14, alcanceHorizontal: 5.03 },
    notas: 'Eléctrico compacto',
  },
  {
    modelo: 'E400AJPN',
    marca: 'JLG',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 5.59, ancho: 1.80, alto: 2.06 },
    peso: 6350,
    capacidad: { carga: 227, alturaMaxima: 14.19, alcanceHorizontal: 6.86 },
    notas: 'Eléctrico - bajo peso',
  },
  {
    modelo: 'E450AJ',
    marca: 'JLG',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 6.15, ancho: 1.80, alto: 2.11 },
    peso: 7076,
    capacidad: { carga: 227, alturaMaxima: 15.72, alcanceHorizontal: 7.62 },
    notas: 'Eléctrico',
  },
  {
    modelo: 'E600J',
    marca: 'JLG',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.92, ancho: 2.29, alto: 2.44 },
    peso: 10433,
    capacidad: { carga: 227, alturaMaxima: 20.29, alcanceHorizontal: 11.58 },
    notas: 'Eléctrico de gran altura',
  },
  {
    modelo: 'M600JP',
    marca: 'JLG',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.92, ancho: 2.29, alto: 2.44 },
    peso: 10660,
    capacidad: { carga: 227, alturaMaxima: 20.29, alcanceHorizontal: 11.58 },
    notas: 'Híbrido M-Series',
  },
  {
    modelo: 'R4045',
    marca: 'JLG',
    categoria: 'tijera_diesel',
    dimensiones: { largo: 3.28, ancho: 1.75, alto: 2.77 },
    peso: 5443,
    capacidad: { carga: 363, alturaMaxima: 14.02 },
    notas: 'Rough terrain',
  },

  // ═══════════════════════════════════════════════════════════════
  // MANITOU
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: 'MT-X-625',
    marca: 'MANITOU',
    categoria: 'telehandler',
    dimensiones: { largo: 4.25, ancho: 1.92, alto: 2.03 },
    peso: 5200,
    capacidad: { carga: 2500, alturaMaxima: 5.85, alcanceHorizontal: 3.50 },
    notas: 'Compacto',
  },
  {
    modelo: 'MT-X-1440',
    marca: 'MANITOU',
    categoria: 'telehandler',
    dimensiones: { largo: 5.62, ancho: 2.35, alto: 2.49 },
    peso: 10500,
    capacidad: { carga: 4000, alturaMaxima: 13.50, alcanceHorizontal: 10.0 },
  },
  {
    modelo: 'MT-X-1840',
    marca: 'MANITOU',
    categoria: 'telehandler',
    dimensiones: { largo: 6.27, ancho: 2.50, alto: 2.65 },
    peso: 14500,
    capacidad: { carga: 4000, alturaMaxima: 17.55, alcanceHorizontal: 14.0 },
  },
  {
    modelo: 'MXT-1740',
    marca: 'MANITOU',
    categoria: 'telehandler',
    dimensiones: { largo: 6.10, ancho: 2.50, alto: 2.60 },
    peso: 13500,
    capacidad: { carga: 4000, alturaMaxima: 16.70, alcanceHorizontal: 13.0 },
    notas: 'Gran capacidad',
  },

  // ═══════════════════════════════════════════════════════════════
  // MITSUBISHI
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: 'FG25N',
    marca: 'MITSUBISHI',
    categoria: 'montacargas',
    dimensiones: { largo: 2.62, ancho: 1.07, alto: 2.09 },
    peso: 3500,
    capacidad: { carga: 2500, alturaMaxima: 4.0 },
    notas: 'Montacargas a gasolina/GLP',
  },

  // ═══════════════════════════════════════════════════════════════
  // SANY
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: 'SPA14AC',
    marca: 'SANY',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.48, ancho: 1.22, alto: 2.50 },
    peso: 3150,
    capacidad: { carga: 320, alturaMaxima: 14.0 },
  },

  // ═══════════════════════════════════════════════════════════════
  // SKYTRAK
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: '6042',
    marca: 'SKYTRAK',
    categoria: 'telehandler',
    dimensiones: { largo: 5.28, ancho: 2.41, alto: 2.31 },
    peso: 7711,
    capacidad: { carga: 2722, alturaMaxima: 12.80, alcanceHorizontal: 9.14 },
  },

  // ═══════════════════════════════════════════════════════════════
  // TOYOTA
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: '52-8FDF25',
    marca: 'TOYOTA',
    categoria: 'montacargas',
    dimensiones: { largo: 2.75, ancho: 1.15, alto: 2.15 },
    peso: 3700,
    capacidad: { carga: 2500, alturaMaxima: 4.5 },
    notas: 'Montacargas diesel',
  },

  // ═══════════════════════════════════════════════════════════════
  // ZOOMLION
  // ═══════════════════════════════════════════════════════════════
  {
    modelo: 'ZA10RJE',
    marca: 'ZOOMLION',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 4.55, ancho: 1.50, alto: 1.99 },
    peso: 4100,
    capacidad: { carga: 230, alturaMaxima: 10.0, alcanceHorizontal: 4.80 },
    notas: 'Eléctrico compacto',
  },
  {
    modelo: 'ZA14J',
    marca: 'ZOOMLION',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 5.20, ancho: 1.75, alto: 2.05 },
    peso: 5600,
    capacidad: { carga: 230, alturaMaxima: 14.0, alcanceHorizontal: 7.50 },
  },
  {
    modelo: 'ZA14JE-LI',
    marca: 'ZOOMLION',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 5.20, ancho: 1.75, alto: 2.05 },
    peso: 5400,
    capacidad: { carga: 230, alturaMaxima: 14.0, alcanceHorizontal: 7.50 },
    notas: 'Eléctrico con batería de litio',
  },
  {
    modelo: 'ZA14NJE-LI',
    marca: 'ZOOMLION',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 4.96, ancho: 1.75, alto: 2.05 },
    peso: 5300,
    capacidad: { carga: 230, alturaMaxima: 14.0, alcanceHorizontal: 7.50 },
    notas: 'Eléctrico narrow - ancho reducido',
  },
  {
    modelo: 'ZA20J',
    marca: 'ZOOMLION',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.00, ancho: 2.30, alto: 2.45 },
    peso: 8800,
    capacidad: { carga: 230, alturaMaxima: 20.0, alcanceHorizontal: 11.0 },
  },
  {
    modelo: 'ZA20JERT-LI',
    marca: 'ZOOMLION',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 7.00, ancho: 2.30, alto: 2.45 },
    peso: 9200,
    capacidad: { carga: 230, alturaMaxima: 20.0, alcanceHorizontal: 11.0 },
    notas: 'Eléctrico rough terrain litio',
  },
  {
    modelo: 'ZA24J',
    marca: 'ZOOMLION',
    categoria: 'brazo_articulado',
    dimensiones: { largo: 8.50, ancho: 2.45, alto: 2.65 },
    peso: 12500,
    capacidad: { carga: 230, alturaMaxima: 24.0, alcanceHorizontal: 14.0 },
  },
  {
    modelo: 'ZS0812AC-LI',
    marca: 'ZOOMLION',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.48, ancho: 0.81, alto: 2.20 },
    peso: 1850,
    capacidad: { carga: 230, alturaMaxima: 8.0 },
    notas: 'Litio - ancho reducido',
  },
  {
    modelo: 'ZS1012AC-LI',
    marca: 'ZOOMLION',
    categoria: 'tijera_electrica',
    dimensiones: { largo: 2.48, ancho: 1.15, alto: 2.30 },
    peso: 2600,
    capacidad: { carga: 320, alturaMaxima: 10.0 },
    notas: 'Litio',
  },
  {
    modelo: 'ZT42J',
    marca: 'ZOOMLION',
    categoria: 'brazo_telescopico',
    dimensiones: { largo: 10.50, ancho: 2.49, alto: 2.85 },
    peso: 15500,
    capacidad: { carga: 450, alturaMaxima: 42.0, alcanceHorizontal: 21.0 },
    notas: 'Brazo telescópico de gran altura',
  },
];

/**
 * Funciones de utilidad para el catálogo
 */

/**
 * Busca un equipo por modelo
 */
export function buscarEquipoPorModelo(modelo: string): EquipoSpec | undefined {
  return CATALOGO_EQUIPOS.find(
    e => e.modelo.toLowerCase() === modelo.toLowerCase()
  );
}

/**
 * Filtra equipos por marca
 */
export function obtenerEquiposPorMarca(marca: MarcaEquipo): EquipoSpec[] {
  return CATALOGO_EQUIPOS.filter(e => e.marca === marca);
}

/**
 * Filtra equipos por categoría
 */
export function obtenerEquiposPorCategoria(categoria: CategoriaEquipo): EquipoSpec[] {
  return CATALOGO_EQUIPOS.filter(e => e.categoria === categoria);
}

/**
 * Obtiene equipos que caben en las dimensiones especificadas
 */
export function obtenerEquiposQueCaben(
  largoMax: number,
  anchoMax: number,
  altoMax: number
): EquipoSpec[] {
  return CATALOGO_EQUIPOS.filter(
    e =>
      e.dimensiones.largo <= largoMax &&
      e.dimensiones.ancho <= anchoMax &&
      e.dimensiones.alto <= altoMax
  );
}

/**
 * Obtiene equipos que no exceden el peso máximo
 */
export function obtenerEquiposPorPesoMax(pesoMaxKg: number): EquipoSpec[] {
  return CATALOGO_EQUIPOS.filter(e => e.peso <= pesoMaxKg);
}

/**
 * Obtiene opciones para select de modelos
 */
export function obtenerModelosSelect(): { value: string; label: string; marca: string }[] {
  return CATALOGO_EQUIPOS.map(e => ({
    value: e.modelo,
    label: `${e.modelo} (${e.marca})`,
    marca: e.marca,
  }));
}

/**
 * Resumen de categorías para UI
 */
export const CATEGORIAS_EQUIPO: { value: CategoriaEquipo; label: string }[] = [
  { value: 'tijera_electrica', label: 'Tijera Eléctrica' },
  { value: 'tijera_diesel', label: 'Tijera Diesel/RT' },
  { value: 'brazo_articulado', label: 'Brazo Articulado' },
  { value: 'brazo_telescopico', label: 'Brazo Telescópico' },
  { value: 'telehandler', label: 'Telehandler' },
  { value: 'montacargas', label: 'Montacargas' },
  { value: 'plataforma_personal', label: 'Plataforma Personal' },
  { value: 'otro', label: 'Otro' },
];

/**
 * Lista de marcas para UI
 */
export const MARCAS_EQUIPO: MarcaEquipo[] = [
  'DINGLI',
  'FRONTEQ',
  'GENIE',
  'HAULOTTE',
  'JLG',
  'MANITOU',
  'MITSUBISHI',
  'SANY',
  'SKYTRAK',
  'TOYOTA',
  'ZOOMLION',
];
