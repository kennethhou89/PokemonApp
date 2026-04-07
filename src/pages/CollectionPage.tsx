import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCollection } from '@/hooks/useCollection'
import { useLots, type LotRow } from '@/hooks/useLots'
import { useLot } from '@/contexts/LotContext'
import { useUIStore } from '@/store/uiStore'
import { CardListItem } from '@/components/cards/CardListItem'
import { CardImage } from '@/components/cards/CardImage'
import { ConditionBadge } from '@/components/cards/ConditionBadge'
import { FilterDrawer } from '@/components/collection/FilterDrawer'
import { PageHeader } from '@/components/layout/PageHeader'
import { estimatedValue } from '@/types/card'
import { useCurrency } from '@/contexts/CurrencyContext'
import type { CollectionItemWithCard } from '@/types/card'


type ViewMode = 'list' | 'grid'

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function CardGridItem({ item }: { item: CollectionItemWithCard }) {
  const navigate = useNavigate()
  const { fmt: fmtCurrency } = useCurrency()
  const value = estimatedValue(item.price, item.condition, item.graded, item.grade, item.price_override)
  return (
    <button
      onClick={() => navigate(`/card/${item.id}`)}
      className="flex flex-col bg-white border-2 border-black shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all text-left w-full overflow-hidden rounded-[8px]"
    >
      {/* Art area — natural card aspect ratio, full width */}
      <div className="w-full bg-gray-100 border-b-2 border-black">
        <CardImage src={item.card.image_small} alt={item.card.name} className="w-full aspect-[5/7] object-contain" />
      </div>
      {/* Info area */}
      <div className="p-2 flex flex-col gap-0.5">
        <div className="text-[9px] text-gray-400 font-sans">#{item.card.number}</div>
        <div className="font-head text-sm font-bold text-black leading-tight truncate">{item.card.name}</div>
        <div className="text-[9px] text-gray-500 truncate">{item.card.set_name}</div>
        <div className="flex items-center justify-between mt-1 gap-1">
          {item.graded ? (
            <span className="text-[9px] bg-black text-primary font-bold px-1.5 py-0.5 uppercase tracking-wide">
              {item.grading_company} {item.grade}
            </span>
          ) : (
            <ConditionBadge condition={item.condition} size="sm" />
          )}
          {value != null && (
            <span className="text-[9px] font-bold text-black">{fmtCurrency(value)}</span>
          )}
        </div>
      </div>
    </button>
  )
}

function LotCard({ lot, onClick }: { lot: LotRow; onClick: () => void }) {
  const { fmt: fmtCurrency } = useCurrency()
  const date = new Date(lot.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 border-b-2 border-black bg-white active:bg-gray-50 text-left"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-head font-bold text-sm text-black truncate">{lot.name}</div>
          <div className="text-xs text-gray-500 font-sans">{date} · {lot.card_count} card{lot.card_count !== 1 ? 's' : ''}</div>
        </div>
        {lot.total_paid != null && (
          <div className="text-sm font-head font-bold text-black flex-shrink-0">{fmtCurrency(lot.total_paid)}</div>
        )}
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      {/* Card thumbnails */}
      {lot.card_images.length > 0 && (
        <div className="flex mt-2 gap-1">
          {lot.card_images.map((img, i) => (
            <div key={i} className="w-9 h-[50px] border border-black/20 rounded overflow-hidden bg-gray-100 flex-shrink-0">
              <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      )}
    </button>
  )
}

export function CollectionPage() {
  const navigate = useNavigate()
  const lot = useLot()
  const { data: items = [], isLoading } = useCollection()
  const { data: lots = [], isLoading: lotsLoading } = useLots()

  function handleCreateLot() {
    lot.startLot()
    navigate('/add-lot')
  }
  const filters = useUIStore(s => s.filters)
  const setSearch = useUIStore(s => s.setSearch)
  const tab = useUIStore(s => s.collectionTab)
  const setTab = useUIStore(s => s.setCollectionTab)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('collectionView') as ViewMode) ?? 'list'
  )

  function toggleView(mode: ViewMode) {
    setViewMode(mode)
    localStorage.setItem('collectionView', mode)
  }

  const sets = useMemo(() => {
    const seen = new Map<string, string>()
    items.forEach((item) => seen.set(item.card.set_id, item.card.set_name))
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  const filtered = useMemo(() => {
    let result = items as CollectionItemWithCard[]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((i) => i.card.name.toLowerCase().includes(q) || i.card.set_name.toLowerCase().includes(q))
    }
    if (filters.conditions.length > 0) {
      result = result.filter((i) => filters.conditions.includes(i.condition))
    }
    if (filters.setId) {
      result = result.filter((i) => i.card.set_id === filters.setId)
    }

    result = [...result].sort((a, b) => {
      let cmp = 0
      if (filters.sortBy === 'name') cmp = a.card.name.localeCompare(b.card.name)
      else if (filters.sortBy === 'value') {
        const av = estimatedValue(a.price, a.condition, a.graded, a.grade, a.price_override) ?? 0
        const bv = estimatedValue(b.price, b.condition, b.graded, b.grade, b.price_override) ?? 0
        cmp = av - bv
      } else if (filters.sortBy === 'quantity') cmp = a.quantity - b.quantity
      else cmp = new Date(a.added_at).getTime() - new Date(b.added_at).getTime()
      return filters.sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [items, filters])

  const totalValue = useMemo(() => {
    return items.reduce((sum, item) => sum + (estimatedValue(item.price, item.condition, item.graded, item.grade, item.price_override) ?? 0) * item.quantity, 0)
  }, [items])

  const activeFilterCount = (filters.conditions.length > 0 ? 1 : 0) + (filters.setId ? 1 : 0)

  return (
    <>
      <PageHeader title="My Collection" />

      {/* Tab bar */}
      <div className="flex border-b-2 border-black">
        <button
          onClick={() => setTab('cards')}
          className={`flex-1 py-2.5 text-sm font-head font-bold text-center transition-colors ${tab === 'cards' ? 'bg-black text-primary' : 'bg-white text-black'}`}
        >
          All Cards
        </button>
        <button
          onClick={() => setTab('lots')}
          className={`flex-1 py-2.5 text-sm font-head font-bold text-center border-l-2 border-black transition-colors ${tab === 'lots' ? 'bg-black text-primary' : 'bg-white text-black'}`}
        >
          By Lot
        </button>
      </div>

      {tab === 'lots' ? (
        /* ── Lots tab ───────────────────────────────────────────── */
        lotsLoading ? (
          <div className="flex flex-col gap-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <div className="w-10 h-10 bg-gray-200 animate-pulse" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
                  <div className="h-2 bg-gray-200 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : lots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 border-2 border-black bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="font-head text-lg font-bold text-black mb-1">No lots yet</h3>
            <p className="text-sm text-gray-500 font-sans mb-6">Add cards as a lot to track your purchases.</p>
            <button
              onClick={handleCreateLot}
              className="px-6 py-3 border-2 border-black bg-primary font-head font-bold text-sm shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              + Create Lot
            </button>
          </div>
        ) : (
          <>
            <div>
              {lots.map((l) => (
                <LotCard key={l.id} lot={l} onClick={() => navigate(`/lot/${l.id}`)} />
              ))}
            </div>
            {/* FAB */}
            <button
              onClick={handleCreateLot}
              className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-primary border-2 border-black shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center"
            >
              <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </>
        )
      ) : (
      <>
      {/* Stat strip + view controls */}
      <div className="flex items-center gap-2 px-3 py-2 bg-primary border-b-2 border-black overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {items.length > 0 && <>
          <div className="flex-shrink-0 border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]">
            <span className="font-head font-bold text-sm text-black">{items.length}</span>
            <span className="text-[10px] text-gray-500 ml-1 font-sans">cards</span>
          </div>
          <div className="flex-shrink-0 border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]">
            <span className="font-head font-bold text-sm text-black">{fmt(totalValue)}</span>
            <span className="text-[10px] text-gray-500 ml-1 font-sans">value</span>
          </div>
          <div className="flex-shrink-0 border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]">
            <span className="font-head font-bold text-sm text-black">{sets.length}</span>
            <span className="text-[10px] text-gray-500 ml-1 font-sans">sets</span>
          </div>
        </>}
        {/* Spacer */}
        <div className="flex-1" />
        {/* View toggle */}
        <div className="flex flex-shrink-0 border-2 border-black overflow-hidden shadow-[2px_2px_0px_#000]">
          <button
            onClick={() => toggleView('list')}
            className={`p-1.5 border-r-2 border-black transition-colors ${viewMode === 'list' ? 'bg-black' : 'bg-white'}`}
          >
            <svg className={`w-4 h-4 ${viewMode === 'list' ? 'text-primary' : 'text-black'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => toggleView('grid')}
            className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-black' : 'bg-white'}`}
          >
            <svg className={`w-4 h-4 ${viewMode === 'grid' ? 'text-primary' : 'text-black'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
        {/* Filter */}
        <button
          onClick={() => setShowFilters(true)}
          className={`relative flex-shrink-0 p-1.5 border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all ${activeFilterCount > 0 ? 'bg-black' : 'bg-white'}`}
        >
          <svg className={`w-4 h-4 ${activeFilterCount > 0 ? 'text-primary' : 'text-black'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary border border-black text-black text-[9px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search cards..."
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-2 border-black rounded pl-9 pr-4 py-2 text-sm shadow-md focus:outline-none focus:shadow-none transition-shadow"
          />
        </div>
      </div>

      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3 px-4 pt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="w-full aspect-[2.5/3.5] bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-2.5 bg-gray-200 rounded w-3/4 mt-2 animate-pulse" />
                <div className="h-2 bg-gray-200 rounded w-1/2 mt-1 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <div className="w-12 h-16 bg-gray-200 rounded animate-pulse" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
                  <div className="h-2 bg-gray-200 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-24 h-24 border-2 border-black shadow-[4px_4px_0px_#000] bg-gray-100 flex items-center justify-center mb-4">
            {/* Pokeball */}
            <svg viewBox="0 0 100 100" className="w-14 h-14">
              <circle cx="50" cy="50" r="46" fill="white" stroke="black" strokeWidth="4"/>
              <path d="M4 50 A46 46 0 0 1 96 50" fill="#ef4444"/>
              <rect x="4" y="46" width="92" height="8" fill="black"/>
              <circle cx="50" cy="50" r="12" fill="white" stroke="black" strokeWidth="4"/>
              <circle cx="50" cy="50" r="6" fill="white" stroke="black" strokeWidth="3"/>
            </svg>
          </div>
          <h3 className="font-head text-xl font-bold text-black mb-1">
            {items.length === 0 ? 'No cards yet' : 'No cards match'}
          </h3>
          <p className="text-sm text-gray-500 font-sans">
            {items.length === 0
              ? 'Tap the + tab below to add your first card'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 px-4 pt-2 pb-6">
          {filtered.map((item) => (
            <CardGridItem key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div>
          {filtered.map((item) => (
            <CardListItem key={item.id} item={item} />
          ))}
        </div>
      )}

      {showFilters && <FilterDrawer sets={sets} onClose={() => setShowFilters(false)} />}
      </>
      )}
    </>
  )
}
