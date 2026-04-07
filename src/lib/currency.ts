export type Currency = 'USD' | 'CAD'

const CURRENCY_KEY = 'preferredCurrency'
const RATE_CACHE_KEY = 'usdCadRate'
const RATE_TTL_MS = 60 * 60 * 1000 // 1 hour

export function getStoredCurrency(): Currency {
  return (localStorage.getItem(CURRENCY_KEY) as Currency) ?? 'USD'
}

export function setStoredCurrency(c: Currency) {
  localStorage.setItem(CURRENCY_KEY, c)
  window.dispatchEvent(new Event('currency-change'))
}

export async function fetchCADRate(): Promise<number> {
  try {
    const cached = localStorage.getItem(RATE_CACHE_KEY)
    if (cached) {
      const { rate, ts } = JSON.parse(cached) as { rate: number; ts: number }
      if (Date.now() - ts < RATE_TTL_MS) return rate
    }
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    const data = await res.json() as { rates: Record<string, number> }
    const rate = data.rates.CAD ?? 1.38
    localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({ rate, ts: Date.now() }))
    return rate
  } catch {
    return 1.38
  }
}
