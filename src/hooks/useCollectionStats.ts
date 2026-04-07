import { useMemo } from 'react'
import type { CollectionItemWithCard } from '@/types/card'
import { estimatedValue } from '@/types/card'

export function useCollectionStats(items: CollectionItemWithCard[]) {
  return useMemo(() => {
    let totalCards = 0
    let totalValue = 0
    const bySet: Record<string, { name: string; value: number; count: number }> = {}
    const conditionCount: Record<string, number> = {}

    for (const item of items) {
      totalCards += item.quantity
      const val = estimatedValue(item.price, item.condition, item.graded, item.grade, item.price_override) ?? 0
      const itemValue = val * item.quantity
      totalValue += itemValue

      const setId = item.card.set_id
      if (!bySet[setId]) bySet[setId] = { name: item.card.set_name, value: 0, count: 0 }
      bySet[setId].value += itemValue
      bySet[setId].count += item.quantity

      conditionCount[item.condition] = (conditionCount[item.condition] ?? 0) + item.quantity
    }

    const bySetArray = Object.entries(bySet)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    const topCards = [...items]
      .sort((a, b) => {
        const av = (estimatedValue(a.price, a.condition, a.graded, a.grade, a.price_override) ?? 0) * a.quantity
        const bv = (estimatedValue(b.price, b.condition, b.graded, b.grade, b.price_override) ?? 0) * b.quantity
        return bv - av
      })
      .slice(0, 10)

    const conditionData = Object.entries(conditionCount).map(([name, value]) => ({ name, value }))

    return {
      totalCards,
      totalUniqueCards: items.length,
      totalValue,
      bySet: bySetArray,
      topCards,
      conditionData,
    }
  }, [items])
}
