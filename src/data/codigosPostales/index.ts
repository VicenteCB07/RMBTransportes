/**
 * Índice de códigos postales locales
 * Datos oficiales de SEPOMEX para toda la República Mexicana (32 estados)
 */

// Importar todos los estados
import aguascalientesData from './aguascalientes.json';
import bajacaliforniaData from './baja_california.json';
import bajacaliforniasurData from './baja_california_sur.json';
import campecheData from './campeche.json';
import chiapasData from './chiapas.json';
import chihuahuaData from './chihuahua.json';
import cdmxData from './cdmx.json';
import coahuilaData from './coahuila.json';
import colimaData from './colima.json';
import durangoData from './durango.json';
import edomexData from './edomex.json';
import guanajuatoData from './guanajuato.json';
import guerreroData from './guerrero.json';
import hidalgoData from './hidalgo.json';
import jaliscoData from './jalisco.json';
import michoacanData from './michoacan.json';
import morelosData from './morelos.json';
import nayaritData from './nayarit.json';
import nuevoleonData from './nuevo_leon.json';
import oaxacaData from './oaxaca.json';
import pueblaData from './puebla.json';
import queretaroData from './queretaro.json';
import quintanarooData from './quintana_roo.json';
import sanluispotosiData from './san_luis_potosi.json';
import sinaloaData from './sinaloa.json';
import sonoraData from './sonora.json';
import tabascoData from './tabasco.json';
import tamaulipasData from './tamaulipas.json';
import tlaxcalaData from './tlaxcala.json';
import veracruzData from './veracruz.json';
import yucatanData from './yucatan.json';
import zacatecasData from './zacatecas.json';

export interface CPData {
  municipio: string;
  colonias: string[];
}

export interface EstadoData {
  [cp: string]: CPData;
}

// Mapeo de estado a datos (32 entidades federativas)
const estadosData: Record<string, EstadoData> = {
  'Aguascalientes': aguascalientesData as EstadoData,
  'Baja California': bajacaliforniaData as EstadoData,
  'Baja California Sur': bajacaliforniasurData as EstadoData,
  'Campeche': campecheData as EstadoData,
  'Chiapas': chiapasData as EstadoData,
  'Chihuahua': chihuahuaData as EstadoData,
  'Ciudad de México': cdmxData as EstadoData,
  'Coahuila': coahuilaData as EstadoData,
  'Colima': colimaData as EstadoData,
  'Durango': durangoData as EstadoData,
  'Estado de México': edomexData as EstadoData,
  'Guanajuato': guanajuatoData as EstadoData,
  'Guerrero': guerreroData as EstadoData,
  'Hidalgo': hidalgoData as EstadoData,
  'Jalisco': jaliscoData as EstadoData,
  'Michoacán': michoacanData as EstadoData,
  'Morelos': morelosData as EstadoData,
  'Nayarit': nayaritData as EstadoData,
  'Nuevo León': nuevoleonData as EstadoData,
  'Oaxaca': oaxacaData as EstadoData,
  'Puebla': pueblaData as EstadoData,
  'Querétaro': queretaroData as EstadoData,
  'Quintana Roo': quintanarooData as EstadoData,
  'San Luis Potosí': sanluispotosiData as EstadoData,
  'Sinaloa': sinaloaData as EstadoData,
  'Sonora': sonoraData as EstadoData,
  'Tabasco': tabascoData as EstadoData,
  'Tamaulipas': tamaulipasData as EstadoData,
  'Tlaxcala': tlaxcalaData as EstadoData,
  'Veracruz': veracruzData as EstadoData,
  'Yucatán': yucatanData as EstadoData,
  'Zacatecas': zacatecasData as EstadoData,
};

// Índice combinado de todos los CPs
const todosLosCPs: EstadoData = {
  ...aguascalientesData,
  ...bajacaliforniaData,
  ...bajacaliforniasurData,
  ...campecheData,
  ...chiapasData,
  ...chihuahuaData,
  ...cdmxData,
  ...coahuilaData,
  ...colimaData,
  ...durangoData,
  ...edomexData,
  ...guanajuatoData,
  ...guerreroData,
  ...hidalgoData,
  ...jaliscoData,
  ...michoacanData,
  ...morelosData,
  ...nayaritData,
  ...nuevoleonData,
  ...oaxacaData,
  ...pueblaData,
  ...queretaroData,
  ...quintanarooData,
  ...sanluispotosiData,
  ...sinaloaData,
  ...sonoraData,
  ...tabascoData,
  ...tamaulipasData,
  ...tlaxcalaData,
  ...veracruzData,
  ...yucatanData,
  ...zacatecasData,
} as EstadoData;

/**
 * Busca un código postal en los datos locales
 * @param cp Código postal (5 dígitos)
 * @returns Datos del CP o null si no existe
 */
export function buscarCPLocal(cp: string): (CPData & { estado: string }) | null {
  const cpLimpio = cp.replace(/\D/g, '').padStart(5, '0');

  // Buscar en cada estado
  for (const [estado, data] of Object.entries(estadosData)) {
    if (data[cpLimpio]) {
      return {
        ...data[cpLimpio],
        estado,
      };
    }
  }

  return null;
}

/**
 * Verifica si un CP existe en los datos locales
 */
export function existeCPLocal(cp: string): boolean {
  const cpLimpio = cp.replace(/\D/g, '').padStart(5, '0');
  return cpLimpio in todosLosCPs;
}

/**
 * Obtiene todos los CPs de un estado
 */
export function obtenerCPsPorEstado(estado: string): EstadoData | null {
  return estadosData[estado] || null;
}

/**
 * Obtiene todos los municipios de un estado
 */
export function obtenerMunicipiosPorEstado(estado: string): string[] {
  const data = estadosData[estado];
  if (!data) return [];

  const municipios = new Set<string>();
  for (const cp of Object.values(data)) {
    municipios.add(cp.municipio);
  }

  return Array.from(municipios).sort();
}

/**
 * Busca CPs por municipio
 */
export function buscarCPsPorMunicipio(municipio: string): Array<{ cp: string; colonias: string[] }> {
  const resultados: Array<{ cp: string; colonias: string[] }> = [];

  for (const [cp, data] of Object.entries(todosLosCPs)) {
    if (data.municipio.toLowerCase().includes(municipio.toLowerCase())) {
      resultados.push({ cp, colonias: data.colonias });
    }
  }

  return resultados.sort((a, b) => a.cp.localeCompare(b.cp));
}

// Estadísticas
export const estadisticasCP = {
  estados: Object.keys(estadosData),
  totalCPs: Object.keys(todosLosCPs).length,
  totalColonias: Object.values(todosLosCPs).reduce((sum, cp) => sum + cp.colonias.length, 0),
  porEstado: Object.entries(estadosData).map(([estado, data]) => ({
    estado,
    cps: Object.keys(data).length,
    colonias: Object.values(data).reduce((sum, cp) => sum + cp.colonias.length, 0),
  })),
};

export { todosLosCPs, estadosData };
