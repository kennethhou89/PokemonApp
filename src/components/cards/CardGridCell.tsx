import { CardImage } from '@/components/cards/CardImage'
import { extractBestPrice } from '@/lib/pokemon-tcg-api'
import { useCurrency } from '@/contexts/CurrencyContext'
import type { TCGCard } from '@/types/api'

export function CardGridCell({ card, onClick, selectable, selected, onToggle, inLot }: {
  card: TCGCard; onClick: () => void
  selectable?: boolean; selected?: boolean; onToggle?: () => void
  inLot?: boolean
}) {
  const { fmt } = useCurrency()
  const { market } = extractBestPrice(card)
  const price = market != null ? fmt(market) : null
  const handleClick = selectable ? (onToggle ?? onClick) : onClick
  return (
    <button onClick={handleClick} className="flex flex-col items-center active:opacity-70">
      <div className="relative w-full">
        <CardImage
          src={card.images.small}
          alt={card.name}
          className={`w-full aspect-[2.5/3.5] rounded-xl shadow-sm transition-opacity ${selectable && !selected ? 'opacity-40' : ''}`}
        />
        {price && !selectable && !inLot && (
          <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
            {price}
          </span>
        )}
        {selectable && selected && (
          <div className="absolute inset-0 rounded-xl bg-red-500/20 border-2 border-red-500 flex items-start justify-end p-1.5">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
        {selectable && !selected && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 border-2 border-white/80 rounded-full bg-black/20" />
        )}
        {inLot && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-black rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <div className="mt-1 text-xs text-gray-800 font-medium text-center leading-tight line-clamp-1 w-full">
        {card.name}
      </div>
    </button>
  )
}

export function GridCardSkeleton() {
  return <div className="aspect-[2.5/3.5] bg-gray-200 rounded-xl animate-pulse w-full" />
}
