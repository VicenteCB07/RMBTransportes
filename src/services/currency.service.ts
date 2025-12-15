/**
 * Servicio de conversión de divisas
 * Obtiene tasas de cambio actualizadas USD/MXN
 */

export type Currency = 'MXN' | 'USD'

interface ExchangeRateResponse {
  mxn: number
}

const DEFAULT_EXCHANGE_RATE = 18.0
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutos

let cachedRate: number | null = null
let cacheTimestamp: number | null = null

/**
 * Obtiene la tasa de cambio USD a MXN
 * Usa múltiples APIs con fallback
 */
export async function getExchangeRate(): Promise<number> {
  // Verificar cache
  if (cachedRate && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedRate
  }

  try {
    // API primaria: fawazahmed0/currency-api
    const primaryResponse = await fetch(
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
      { signal: AbortSignal.timeout(5000) }
    )

    if (primaryResponse.ok) {
      const data = await primaryResponse.json()
      const rate = data.usd?.mxn
      if (rate && typeof rate === 'number') {
        cachedRate = rate
        cacheTimestamp = Date.now()
        return rate
      }
    }
  } catch (error) {
    console.warn('Primary exchange rate API failed, trying fallback...')
  }

  try {
    // API de respaldo: exchangerate-api
    const fallbackResponse = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { signal: AbortSignal.timeout(5000) }
    )

    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json()
      const rate = data.rates?.MXN
      if (rate && typeof rate === 'number') {
        cachedRate = rate
        cacheTimestamp = Date.now()
        return rate
      }
    }
  } catch (error) {
    console.warn('Fallback exchange rate API failed, using default rate')
  }

  // Usar tasa por defecto
  return DEFAULT_EXCHANGE_RATE
}

/**
 * Convierte USD a MXN
 */
export async function convertUSDtoMXN(amountUSD: number): Promise<number> {
  const rate = await getExchangeRate()
  return amountUSD * rate
}

/**
 * Convierte MXN a USD
 */
export async function convertMXNtoUSD(amountMXN: number): Promise<number> {
  const rate = await getExchangeRate()
  return amountMXN / rate
}

/**
 * Convierte cualquier monto a MXN
 */
export async function toMXN(amount: number, currency: Currency): Promise<number> {
  if (currency === 'MXN') return amount
  return await convertUSDtoMXN(amount)
}

/**
 * Formatea un monto como moneda
 */
export function formatCurrency(amount: number, currency: Currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formatea un monto sin símbolo de moneda
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Parsea un string de moneda a número
 */
export function parseCurrency(value: string): number {
  // Remover símbolos de moneda y separadores de miles
  const cleanValue = value.replace(/[^0-9.-]/g, '')
  return parseFloat(cleanValue) || 0
}
