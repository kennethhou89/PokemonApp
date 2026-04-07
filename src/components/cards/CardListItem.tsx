import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CollectionItemWithCard } from '@/types/card'
import { CardImage } from './CardImage'
import { ConditionBadge } from './ConditionBadge'
import { PriceDisplay } from './PriceDisplay'
import { useDeleteCollectionItem } from '@/hooks/useCollection'

interface CardListItemProps {
  item: CollectionItemWithCard
}

export function CardListItem({ item }: CardListItemProps) {
  const navigate = useNavigate()
  const deleteItem = useDeleteCollectionItem()
  const [swipeX, setSwipeX] = useState(0)
  const startX = useRef(0)
  const isDragging = useRef(false)

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    isDragging.current = true
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return
    const dx = e.touches[0].clientX - startX.current
    if (dx < 0) setSwipeX(Math.max(dx, -80))
  }

  function handleTouchEnd() {
    isDragging.current = false
    if (swipeX < -60) {
      // keep revealed
    } else {
      setSwipeX(0)
    }
  }

  return (
    <div className="relative overflow-hidden border-b-2 border-black">
      {/* Delete button behind */}
      <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-black">
        <button
          onClick={() => {
            if (confirm('Remove this card from your collection?')) {
              deleteItem.mutate(item.id)
            }
          }}
          className="text-primary text-xs font-head font-bold"
        >
          Delete
        </button>
      </div>

      {/* Card row */}
      <div
        className="relative bg-white flex items-center gap-3 px-4 py-3 cursor-pointer transition-transform"
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (swipeX === 0) navigate(`/card/${item.id}`)
          else setSwipeX(0)
        }}
      >
        <div className="flex-shrink-0 border-2 border-black">
          <CardImage
            src={item.card.image_small}
            alt={item.card.name}
            className="w-12 h-16"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-head font-bold text-black text-sm truncate">{item.card.name}</div>
          <div className="text-xs text-gray-500 truncate">{item.card.set_name} · #{item.card.number}</div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {item.graded ? (
              <span className="text-[9px] bg-black text-primary font-bold px-1.5 py-0.5 uppercase tracking-wide">
                {item.grading_company} {item.grade}
              </span>
            ) : (
              <ConditionBadge condition={item.condition} />
            )}
            {item.foil && (
              <span className="text-[9px] bg-black text-white font-bold px-1.5 py-0.5 uppercase tracking-wide">Foil</span>
            )}
            <span className="text-[10px] text-gray-400 font-medium">×{item.quantity}</span>
          </div>
        </div>
        <PriceDisplay
          price={item.price}
          condition={item.condition}
          quantity={item.quantity}
          showTotal
          graded={item.graded}
          grade={item.grade}
        />
      </div>
    </div>
  )
}
