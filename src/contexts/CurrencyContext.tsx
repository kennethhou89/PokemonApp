import { createContext, useContext, useState, useEffect } from 'react'
import { type Currency, getStoredCurrency, setStoredCurrency, fetchCADRate } from '@/lib/currency'

interface CurrencyContextValue {
  currency: Currency
  cadRate: number
  setCurrency: (c: Currency) => void
  fmt: (usdAmount: number | null | undefined) => string
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'USD',
  cadRate: 1.38,
  setCurrency: () => {},
  fmt: (n) => (n != null ? `USD $${n.toFixed(2)}` : '—'),
})

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(getStoredCurrency)
  const [cadRate, setCadRate] = useState(1.38)

  useEffect(() => {
    void fetchCADRate().then(setCadRate)
  }, [])

  useEffect(() => {
    function handler() { setCurrencyState(getStoredCurrency()) }
    window.addEventListener('currency-change', handler)
    return () => window.removeEventListener('currency-change', handler)
  }, [])

  function setCurrency(c: Currency) {
    setStoredCurrency(c)
    setCurrencyState(c)
  }

  function fmt(usdAmount: number | null | undefined): string {
    if (usdAmount == null) return '—'
    const amount = currency === 'CAD' ? usdAmount * cadRate : usdAmount
    return `${currency} $${amount.toFixed(2)}`
  }

  return (
    <CurrencyContext.Provider value={{ currency, cadRate, setCurrency, fmt }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
