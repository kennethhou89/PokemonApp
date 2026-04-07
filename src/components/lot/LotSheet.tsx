import { useState, useMemo } from 'react'
import type { TCGCard } from '@/types/api'
import type { Condition } from '@/types/card'
import { CONDITION_MULTIPLIERS, CONDITION_LABELS } from '@/types/card'
import { extractBestPrice } from '@/lib/pokemon-tcg-api'
import { calculateLotCosts } from '@/lib/lot-calculator'
import { useAddCard } from '@/hooks/useCollection'
import { useCreateLot } from '@/hooks/useLots'
import { useCurrency } from '@/contexts/CurrencyContext'
import { CardImage } from '@/components/cards/CardImage'

interface LotSheetProps {
  items: { card: TCGCard; condition: Condition }[]
  lotName?: string
  onConditionChange: (cardId: string, condition: Condition) => void
  onClose: () => void
  onSuccess: () => void
}

export function LotSheet({ items, lotName, onConditionChange, onClose, onSuccess }: LotSheetProps) {
  const { fmt } = useCurrency()
  const addCard = useAddCard()
  const createLot = useCreateLot()
  const [localItems, setLocalItems] = useState(items)
  const [totalPaid, setTotalPaid] = useState('')
  const [adding, setAdding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const totalPaidNum = parseFloat(totalPaid) || 0

  function handleConditionChange(cardId: string, condition: Condition) {
    setLocalItems(prev => prev.map(lc => lc.card.id === cardId ? { ...lc, condition } : lc))
    onConditionChange(cardId, condition)
  }

  const cardsWithMarket = useMemo(() =>
    localItems.map(({ card, condition }) => {
      const price = extractBestPrice(card)
      const marketValue = price.market != null
        ? price.market * CONDITION_MULTIPLIERS[condition]
        : null
      return { card, condition, marketValue }
    }),
    [localItems]
  )

  const totalMarket = useMemo(() =>
    cardsWithMarket.reduce((sum, { marketValue }) => sum + (marketValue ?? 0), 0),
    [cardsWithMarket]
  )

  const costs = useMemo(() => {
    if (totalPaidNum <= 0) return cardsWithMarket.map(() => null as number | null)
    return calculateLotCosts(
      cardsWithMarket.map(({ marketValue }) => ({ marketValue, quantity: 1 })),
      totalPaidNum
    ) as (number | null)[]
  }, [cardsWithMarket, totalPaidNum])

  async function handleAdd() {
    setAdding(true)
    setError('')
    try {
      // Create lot row in DB if we have a lot name (i.e. this is a real lot, not batch select)
      let lotId: string | null = null
      if (lotName) {
        lotId = await createLot.mutateAsync({ name: lotName, totalPaid: totalPaidNum > 0 ? totalPaidNum : null })
      }

      for (let i = 0; i < localItems.length; i++) {
        const { card, condition } = localItems[i]
        await addCard.mutateAsync({
          cardId: card.id,
          condition,
          quantity: 1,
          foil: false,
          notes: '',
          graded: false,
          grading_company: null,
          grade: null,
          cert_number: null,
          cost: costs[i] ?? null,
          price_override: null,
          lot_id: lotId,
          cardData: {
            id: card.id,
            name: card.name,
            set_id: card.set.id,
            set_name: card.set.name,
            number: card.number,
            rarity: card.rarity ?? null,
            supertype: card.supertype ?? null,
            subtypes: card.subtypes ?? null,
            image_small: card.images.small ?? null,
            image_large: card.images.large ?? null,
            hp: card.hp ?? null,
          },
        })
        setProgress(i + 1)
      }
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add cards')
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={!adding ? onClose : undefined} />

      {/* Sheet */}
      <div className="relative bg-white border-t-2 border-black max-h-[85vh] flex flex-col shadow-[0_-4px_0px_#000]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black flex-shrink-0">
          <div>
            <div className="font-head font-bold text-base text-black">Add as Lot</div>
            <div className="text-xs text-gray-500 font-sans">{localItems.length} cards</div>
          </div>
          {!adding && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_#000] active:shadow-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Total paid input */}
        <div className="px-4 pt-3 pb-2 flex-shrink-0 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-sans text-gray-500">$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={totalPaid}
                onChange={(e) => setTotalPaid(e.target.value)}
                disabled={adding}
                autoFocus
                className="w-full border-2 border-black pl-7 pr-3 py-2.5 text-base font-bold focus:outline-none shadow-[2px_2px_0px_#000] focus:shadow-none transition-shadow font-sans disabled:opacity-50"
              />
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-gray-500 font-sans">Market total</div>
              <div className="text-sm font-head font-bold text-black">{totalMarket > 0 ? fmt(totalMarket) : '—'}</div>
            </div>
          </div>
          {totalPaidNum > 0 && totalMarket > 0 && (
            <div className="mt-1.5 flex items-center justify-between text-xs font-sans">
              <span className="text-gray-500">{totalPaidNum < totalMarket ? 'You saved' : 'You overpaid'}</span>
              <span className={totalPaidNum < totalMarket ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                {fmt(Math.abs(totalMarket - totalPaidNum))}
              </span>
            </div>
          )}
        </div>

        {/* Card list */}
        <div className="overflow-y-auto flex-1">
          {cardsWithMarket.map(({ card, condition, marketValue }, idx) => (
            <div key={card.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100">
              <div className="w-9 h-12 flex-shrink-0">
                <CardImage src={card.images.small} alt={card.name} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-head font-bold text-sm text-black truncate">{card.name}</div>
                <div className="text-xs text-gray-500 font-sans">#{card.number} · {card.set.name}</div>
                <select
                  value={condition}
                  onChange={(e) => handleConditionChange(card.id, e.target.value as Condition)}
                  disabled={adding}
                  className="mt-1 text-xs border border-gray-200 px-1 py-0.5 font-sans bg-white disabled:opacity-50"
                >
                  {(Object.keys(CONDITION_LABELS) as Condition[]).map(c => (
                    <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div className="text-right flex-shrink-0">
                {costs[idx] != null ? (
                  <>
                    <div className="text-sm font-head font-bold text-black">{fmt(costs[idx]!)}</div>
                    <div className="text-xs text-gray-400 font-sans line-through">{marketValue != null ? fmt(marketValue) : '—'}</div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400 font-sans">{marketValue != null ? fmt(marketValue) : '—'}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 p-3 border-2 border-red-500 bg-red-50 text-sm text-red-700 font-sans flex-shrink-0">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 pt-3 pb-4 border-t-2 border-black flex-shrink-0" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={adding || totalPaidNum <= 0}
            className="w-full h-12 border-2 border-black bg-primary font-head font-bold text-sm shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {adding
              ? `Adding ${progress} of ${localItems.length}...`
              : totalPaidNum > 0
                ? `Add ${localItems.length} Card${localItems.length !== 1 ? 's' : ''} as Lot`
                : 'Enter total price paid'}
          </button>
        </div>
      </div>
    </div>
  )
}
