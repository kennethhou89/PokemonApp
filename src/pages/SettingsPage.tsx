import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useCollection } from '@/hooks/useCollection'
import { useQueryClient } from '@tanstack/react-query'
import { refreshPrices } from '@/lib/price-service'
import { PageHeader } from '@/components/layout/PageHeader'
import { estimatedValue, CONDITION_LABELS } from '@/types/card'
import { useCurrency } from '@/contexts/CurrencyContext'

export function SettingsPage() {
  const { data: items = [] } = useCollection()
  const queryClient = useQueryClient()
  const { currency, setCurrency } = useCurrency()
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')

  async function handleRefreshPrices() {
    setRefreshing(true)
    setRefreshMsg('')
    const ids = [...new Set(items.map((i) => i.card_id))]
    await refreshPrices(ids)
    void queryClient.invalidateQueries({ queryKey: ['collection'] })
    setRefreshing(false)
    setRefreshMsg(`Refreshed prices for ${ids.length} cards`)
    setTimeout(() => setRefreshMsg(''), 3000)
  }

  function handleExportCSV() {
    const headers = ['Name', 'Set', 'Number', 'Condition', 'Foil', 'Quantity', 'Notes', 'Market Price', 'Est. Value', 'Cost', 'P&L']
    const rows = items.map((item) => {
      const val = estimatedValue(item.price, item.condition, item.graded, item.grade, item.price_override)
      const pl = val != null && item.cost != null ? (val - item.cost).toFixed(2) : ''
      return [
        item.card.name,
        item.card.set_name,
        item.card.number,
        CONDITION_LABELS[item.condition],
        item.foil ? 'Yes' : 'No',
        item.quantity,
        item.notes ?? '',
        (item.price_override ?? item.price?.market)?.toFixed(2) ?? '',
        (val ?? '').toString(),
        item.cost?.toFixed(2) ?? '',
        pl,
      ]
    })
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pokemon-collection-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="px-4 py-4 flex flex-col gap-3">

        {/* Currency */}
        <div className="border-2 border-black shadow-[4px_4px_0px_#000] px-4 py-4 flex items-center justify-between bg-white">
          <div>
            <div className="font-head font-bold text-black text-sm">Display Currency</div>
            <div className="text-xs text-gray-500 font-sans">Prices sourced in USD, converted on display</div>
          </div>
          <div className="flex border-2 border-black overflow-hidden">
            {(['USD', 'CAD'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 text-xs font-head font-bold transition-colors border-r-2 last:border-r-0 border-black ${
                  currency === c ? 'bg-primary text-black' : 'bg-white text-gray-500'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => void handleRefreshPrices()}
          disabled={refreshing}
          className="border-2 border-black shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all bg-white w-full flex items-center gap-3 px-4 py-4 disabled:opacity-60"
        >
          <div className="w-9 h-9 border-2 border-black bg-primary flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <div className="font-head font-bold text-black text-sm">Refresh Prices</div>
            <div className="text-xs text-gray-500 font-sans">Update market prices for all cards</div>
          </div>
          {refreshing && <div className="w-4 h-4 border-2 border-black border-t-primary rounded-full animate-spin" />}
        </button>
        {refreshMsg && <p className="text-xs text-black font-head font-bold px-1">{refreshMsg}</p>}

        <button
          onClick={handleExportCSV}
          className="border-2 border-black shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all bg-white w-full flex items-center gap-3 px-4 py-4"
        >
          <div className="w-9 h-9 border-2 border-black bg-white flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <div className="font-head font-bold text-black text-sm">Export to CSV</div>
            <div className="text-xs text-gray-500 font-sans">{items.length} cards in collection</div>
          </div>
        </button>

        <button
          onClick={() => void handleSignOut()}
          className="border-2 border-black shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all bg-white w-full flex items-center gap-3 px-4 py-4 mt-2"
        >
          <div className="w-9 h-9 border-2 border-black bg-black flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <div className="font-head font-bold text-black text-sm">Sign Out</div>
          </div>
        </button>

        <p className="text-[10px] text-gray-400 text-center mt-2 px-4 font-sans">
          Prices sourced from Pokemon TCG API · Updated every 24 hours
        </p>
      </div>
    </>
  )
}
