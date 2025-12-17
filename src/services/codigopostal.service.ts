/**
 * Servicio para consulta de Códigos Postales de México
 * Usa la API pública de SEPOMEX via copomex.com
 */

export interface DatosCp {
  codigoPostal: string;
  estado: string;
  municipio: string;
  colonias: string[];
}

// Cache para evitar llamadas repetidas
const cache = new Map<string, DatosCp>();

/**
 * Consulta los datos de un código postal mexicano
 * Retorna estado, municipio y lista de colonias
 */
export async function consultarCodigoPostal(cp: string): Promise<DatosCp | null> {
  // Validar formato de CP (5 dígitos)
  const cpLimpio = cp.replace(/\D/g, '');
  if (cpLimpio.length !== 5) {
    return null;
  }

  // Revisar cache
  if (cache.has(cpLimpio)) {
    return cache.get(cpLimpio)!;
  }

  try {
    // Usar API pública de códigos postales mexicanos
    const response = await fetch(`https://api.copomex.com/query/info_cp/${cpLimpio}?token=pruebas`);

    if (!response.ok) {
      // Intentar con API alternativa
      return await consultarApiAlternativa(cpLimpio);
    }

    const data = await response.json();

    if (data.error || !data.response) {
      return await consultarApiAlternativa(cpLimpio);
    }

    // La API retorna un array de colonias
    const colonias: string[] = [];
    let estado = '';
    let municipio = '';

    if (Array.isArray(data.response)) {
      data.response.forEach((item: { asentamiento: string; estado: string; municipio: string }) => {
        if (item.asentamiento) colonias.push(item.asentamiento);
        if (!estado && item.estado) estado = item.estado;
        if (!municipio && item.municipio) municipio = item.municipio;
      });
    }

    if (!estado) {
      return await consultarApiAlternativa(cpLimpio);
    }

    const resultado: DatosCp = {
      codigoPostal: cpLimpio,
      estado,
      municipio,
      colonias: [...new Set(colonias)].sort(), // Eliminar duplicados y ordenar
    };

    cache.set(cpLimpio, resultado);
    return resultado;

  } catch (error) {
    console.warn('Error consultando API principal, intentando alternativa:', error);
    return await consultarApiAlternativa(cpLimpio);
  }
}

/**
 * API alternativa usando datos locales o servicio de respaldo
 */
async function consultarApiAlternativa(cp: string): Promise<DatosCp | null> {
  try {
    // Usar el API de Zippopotam (gratis, sin token)
    const response = await fetch(`https://api.zippopotam.us/mx/${cp}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      return null;
    }

    const colonias = data.places.map((p: { 'place name': string }) => p['place name']);
    const estado = data.places[0].state || '';
    // Zippopotam no tiene municipio, usar el primer lugar
    const municipio = data.places[0]['state abbreviation'] || '';

    const resultado: DatosCp = {
      codigoPostal: cp,
      estado: normalizarEstado(estado),
      municipio: municipio,
      colonias: ([...new Set(colonias)] as string[]).sort(),
    };

    cache.set(cp, resultado);
    return resultado;

  } catch (error) {
    console.error('Error en API alternativa:', error);
    return null;
  }
}

/**
 * Normaliza nombres de estados a formato estándar
 */
function normalizarEstado(estado: string): string {
  const normalizaciones: Record<string, string> = {
    'Mexico': 'Estado de México',
    'Distrito Federal': 'Ciudad de México',
    'CDMX': 'Ciudad de México',
    'Coahuila de Zaragoza': 'Coahuila',
    'Michoacan de Ocampo': 'Michoacán',
    'Michoacán de Ocampo': 'Michoacán',
    'Veracruz de Ignacio de la Llave': 'Veracruz',
    'Veracruz-Llave': 'Veracruz',
  };

  return normalizaciones[estado] || estado;
}

/**
 * Lista de estados de México para selects
 */
export const ESTADOS_MEXICO = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
];
