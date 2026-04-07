export interface LotItemInput {
  marketValue: number | null
  quantity: number
}

/**
 * Calculates proportional cost per unit for each lot item.
 * Returns an array of per-unit costs (same length as input).
 * Items with no market value receive 0 cost.
 * If total market value is 0, cost is distributed evenly among all items.
 */
export function calculateLotCosts(items: LotItemInput[], totalPaid: number): number[] {
  const weighted = items.map((item) =>
    item.marketValue != null ? item.marketValue * item.quantity : 0
  )
  const totalMarket = weighted.reduce((sum, w) => sum + w, 0)

  if (totalMarket === 0) {
    // Distribute evenly by total quantity
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0)
    if (totalQty === 0) return items.map(() => 0)
    const costPerUnit = totalPaid / totalQty
    return items.map(() => costPerUnit)
  }

  return items.map((item, i) => {
    const share = weighted[i] / totalMarket
    const totalCostForItem = share * totalPaid
    return totalCostForItem / item.quantity
  })
}
