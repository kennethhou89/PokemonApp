import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { refreshPrices } from '@/lib/price-service'

export function usePriceRefresh() {
  const queryClient = useQueryClient()

  useEffect(() => {
    async function refresh() {
      // Get all card IDs in collection
      const { data: items } = await supabase
        .from('collection_items')
        .select('card_id')

      if (!items || items.length === 0) return

      const cardIds = [...new Set(items.map((i) => i.card_id as string))]

      // Fetch existing prices separately (no join needed)
      const { data: prices } = await supabase
        .from('prices')
        .select('card_id, updated_at')
        .in('card_id', cardIds)

      const updatedAtMap = new Map(
        (prices ?? []).map((p) => [p.card_id as string, p.updated_at as string | null])
      )

      const STALE_MS = 24 * 60 * 60 * 1000
      const staleIds = cardIds.filter((id) => {
        const updatedAt = updatedAtMap.get(id)
        if (!updatedAt) return true
        return Date.now() - new Date(updatedAt).getTime() > STALE_MS
      })

      if (staleIds.length > 0) {
        await refreshPrices(staleIds)
        void queryClient.invalidateQueries({ queryKey: ['collection'] })
      }
    }

    void refresh()

    const handleFocus = () => void refresh()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [queryClient])
}
