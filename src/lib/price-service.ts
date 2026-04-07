import { supabase } from '@/lib/supabase'
import { getCardsByIds, extractBestPrice } from '@/lib/pokemon-tcg-api'
import { fetchGradedPrices, isPricechartingEnabled } from '@/lib/pricecharting-api'
import type { Price } from '@/types/card'

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24 hours

export function isPriceStale(price: Price | null): boolean {
  if (!price) return true
  return Date.now() - new Date(price.updated_at).getTime() > STALE_THRESHOLD_MS
}

export async function refreshPrices(cardIds: string[]): Promise<void> {
  if (cardIds.length === 0) return

  const BATCH_SIZE = 50
  for (let i = 0; i < cardIds.length; i += BATCH_SIZE) {
    const batch = cardIds.slice(i, i + BATCH_SIZE)
    const cards = await getCardsByIds(batch)

    const priceRows = cards.map((card) => {
      const p = extractBestPrice(card)
      return {
        card_id: card.id,
        market: p.market,
        low: p.low,
        mid: p.mid,
        high: p.high,
        updated_at: new Date().toISOString(),
      }
    })

    if (priceRows.length > 0) {
      await supabase.from('prices').upsert(priceRows, { onConflict: 'card_id' })
    }
  }
}

// Fetch graded prices for a single card from PriceCharting and store in the prices row
export async function refreshGradedPrice(cardId: string, cardName: string, setName: string): Promise<void> {
  if (!isPricechartingEnabled()) return

  const gradedPrices = await fetchGradedPrices(cardName, setName)
  if (!gradedPrices) return

  await supabase.from('prices').upsert(
    {
      card_id: cardId,
      ...gradedPrices,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'card_id' }
  )
}
