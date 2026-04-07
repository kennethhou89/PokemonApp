import { CardImage } from '@/components/cards/CardImage'
import { extractBestPrice } from '@/lib/pokemon-tcg-api'
import { useCurrency } from '@/contexts/CurrencyContext'
import type { TCGCard } from '@/types/api'

export function CardResultRow({ card, onClick, inLot }: { card: TCGCard; onClick: () => void; inLot?: boolean }) {
  const { fmt } = useCurrency()
  const { market } = extractBestPrice(card)
  const price = market != null ? fmt(market) : null
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 border-b-2 border-black active:bg-gray-50 text-left ${inLot ? 'bg-primary/20' : 'bg-white'}`}
    >
      <div className="border-2 border-black flex-shrink-0">
        <CardImage src={card.images.small} alt={card.name} className="w-10 h-14" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-head font-bold text-black text-sm">{card.name}</div>
        <div className="text-xs text-gray-500 font-sans">{card.set.name} · #{card.number}</div>
        {card.rarity && <div className="text-xs text-gray-400 mt-0.5 font-sans">{card.rarity}</div>}
      </div>
      {price && <div className="font-head font-bold text-black text-sm flex-shrink-0">{price}</div>}
      {inLot ? (
        <div className="w-6 h-6 bg-black flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ) : (
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  )
}
