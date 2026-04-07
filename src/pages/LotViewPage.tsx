import { useParams, useNavigate } from 'react-router-dom'
import { useLotDetail, useDeleteLot } from '@/hooks/useLots'
import { PageHeader } from '@/components/layout/PageHeader'
import { CardImage } from '@/components/cards/CardImage'
import { ConditionBadge } from '@/components/cards/ConditionBadge'
import { useCurrency } from '@/contexts/CurrencyContext'
import { estimatedValue } from '@/types/card'

export function LotViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: lot, isLoading } = useLotDetail(id)
  const deleteLot = useDeleteLot()
  const { fmt } = useCurrency()

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  if (!lot) {
    return (
      <>
        <PageHeader title="Lot Not Found" />
        <div className="flex flex-col items-center py-20 px-8 text-center">
          <p className="font-head font-bold text-lg text-black mb-1">Lot not found</p>
          <p className="text-sm text-gray-500 font-sans mb-6">This lot may have been deleted.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 border-2 border-black bg-primary font-head font-bold text-sm shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            Back to Collection
          </button>
        </div>
      </>
    )
  }

  const totalMarket = lot.items.reduce((sum, item) => {
    const val = estimatedValue(item.price, item.condition, item.graded, item.grade, item.price_override)
    return sum + (val ?? 0) * item.quantity
  }, 0)

  return (
    <>
      <PageHeader
        title={lot.name}
        left={
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center active:opacity-70 flex-shrink-0"
          >
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        }
      />

      {/* Summary strip */}
      <div className="flex items-center gap-2 px-3 py-2 bg-primary border-b-2 border-black overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="flex-shrink-0 border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]">
          <span className="font-head font-bold text-sm text-black">{lot.items.length}</span>
          <span className="text-[10px] text-gray-500 ml-1 font-sans">cards</span>
        </div>
        {lot.total_paid != null && (
          <div className="flex-shrink-0 border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]">
            <span className="font-head font-bold text-sm text-black">{fmt(Number(lot.total_paid))}</span>
            <span className="text-[10px] text-gray-500 ml-1 font-sans">paid</span>
          </div>
        )}
        <div className="flex-shrink-0 border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]">
          <span className="font-head font-bold text-sm text-black">{fmt(totalMarket)}</span>
          <span className="text-[10px] text-gray-500 ml-1 font-sans">market</span>
        </div>
        {lot.total_paid != null && totalMarket > 0 && (
          <div className="flex-shrink-0 border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]">
            <span className={`font-head font-bold text-sm ${Number(lot.total_paid) < totalMarket ? 'text-green-600' : 'text-red-500'}`}>
              {Number(lot.total_paid) < totalMarket ? 'Saved ' : 'Over '}
              {fmt(Math.abs(totalMarket - Number(lot.total_paid)))}
            </span>
          </div>
        )}
      </div>

      {/* Date */}
      <div className="px-4 py-2 text-xs text-gray-400 font-sans">
        {new Date(lot.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </div>

      {/* Card list */}
      <div>
        {lot.items.map((item) => {
          const value = estimatedValue(item.price, item.condition, item.graded, item.grade, item.price_override)
          const cost = item.cost != null ? Number(item.cost) : null

          return (
            <button
              key={item.id}
              onClick={() => navigate(`/card/${item.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b-2 border-black bg-white active:bg-gray-50 text-left"
            >
              <div className="w-10 h-14 flex-shrink-0 border-2 border-black">
                <CardImage src={item.card.image_small} alt={item.card.name} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-head font-bold text-sm text-black truncate">{item.card.name}</div>
                <div className="text-xs text-gray-500 font-sans">#{item.card.number} · {item.card.set_name}</div>
                <div className="mt-0.5">
                  {item.graded ? (
                    <span className="text-[9px] bg-black text-primary font-bold px-1.5 py-0.5 uppercase tracking-wide">
                      {item.grading_company} {item.grade}
                    </span>
                  ) : (
                    <ConditionBadge condition={item.condition} size="sm" />
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {cost != null && (
                  <div className="text-sm font-head font-bold text-black">{fmt(cost)}</div>
                )}
                {value != null && cost != null && (
                  <div className="text-xs text-gray-400 font-sans line-through">{fmt(value)}</div>
                )}
                {value != null && cost == null && (
                  <div className="text-sm text-gray-400 font-sans">{fmt(value)}</div>
                )}
              </div>
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )
        })}
      </div>

      {/* Delete lot button */}
      <div className="px-4 py-6">
        <button
          onClick={async () => {
            if (!id) return
            await deleteLot.mutateAsync(id)
            navigate('/')
          }}
          disabled={deleteLot.isPending}
          className="w-full py-2.5 border-2 border-red-500 text-red-500 font-head font-bold text-sm shadow-[2px_2px_0px_rgb(239,68,68)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50"
        >
          {deleteLot.isPending ? 'Deleting...' : 'Delete Lot'}
        </button>
        <p className="text-xs text-gray-400 font-sans text-center mt-2">Cards will remain in your collection.</p>
      </div>
    </>
  )
}
