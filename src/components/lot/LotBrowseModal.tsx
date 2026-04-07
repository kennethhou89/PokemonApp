import { useState, useMemo, useRef, useEffect } from 'react'
import { useCardSearch } from '@/hooks/useCardSearch'
import { useSets, useSetCards } from '@/hooks/useSetBrowse'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import { useLot } from '@/contexts/LotContext'
import { GridCardSkeleton } from '@/components/cards/CardGridCell'
import { CardResultRow } from '@/components/cards/CardResultRow'
import { SetLogoCard, SetLogoCardSkeleton } from '@/components/cards/SetLogoCard'
import { SetGridTile, SetGridTileSkeleton } from '@/components/cards/SetGridTile'
import { CardImage } from '@/components/cards/CardImage'
import { extractBestPrice } from '@/lib/pokemon-tcg-api'
import { useCurrency } from '@/contexts/CurrencyContext'
import type { TCGCard, TCGSet } from '@/types/api'

interface LotBrowseModalProps {
  onClose: () => void
  onRemoveCard?: (cardId: string) => void
}

// Grid cell with lot quantity stepper overlay
function LotGridCell({ card, inLot, quantity, onAdd, onIncrement, onDecrement }: {
  card: TCGCard
  inLot: boolean
  quantity: number
  onAdd: () => void
  onIncrement: () => void
  onDecrement: () => void
}) {
  const { fmt } = useCurrency()
  const { market } = extractBestPrice(card)
  const price = market != null ? fmt(market) : null

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={inLot ? undefined : onAdd}
        className={`relative w-full ${!inLot ? 'active:opacity-70' : ''}`}
      >
        <CardImage
          src={card.images.small}
          alt={card.name}
          className={`w-full aspect-[2.5/3.5] rounded-xl shadow-sm ${inLot ? 'ring-2 ring-black ring-offset-1' : ''}`}
        />
        {price && !inLot && (
          <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
            {price}
          </span>
        )}
        {inLot && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-2">
            <div className="flex items-center border-2 border-black bg-white shadow-[2px_2px_0px_#000]">
              <button
                onClick={(e) => { e.stopPropagation(); onDecrement() }}
                className="w-8 h-8 flex items-center justify-center font-bold text-sm active:bg-gray-100"
              >
                {quantity === 1 ? '×' : '−'}
              </button>
              <span className="w-7 h-8 flex items-center justify-center text-sm font-bold font-sans border-x-2 border-black bg-primary">
                {quantity}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onIncrement() }}
                className="w-8 h-8 flex items-center justify-center font-bold text-sm active:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>
        )}
      </button>
      <div className="mt-1 text-xs text-gray-800 font-medium text-center leading-tight line-clamp-1 w-full">
        {card.name}
      </div>
    </div>
  )
}

export function LotBrowseModal({ onClose, onRemoveCard }: LotBrowseModalProps) {
  const lot = useLot()
  const searchHistory = useSearchHistory('recentSearches')
  const trayRef = useRef<HTMLDivElement>(null)

  // Browse state
  const [query, setQuery] = useState('')
  const [selectedSet, setSelectedSet] = useState<TCGSet | null>(null)
  const [setSearch, setSetSearch] = useState<string | null>(null)

  const searching = query.length >= 2
  const { data: searchResults = [], isLoading: searchLoading } = useCardSearch(query)
  const { data: sets = [], isLoading: setsLoading } = useSets()
  const { data: setCards = [], isLoading: setCardsLoading } = useSetCards(selectedSet?.id ?? null)

  const filteredSetCards = setSearch
    ? setCards.filter((c) => c.name.toLowerCase().includes(setSearch.toLowerCase()))
    : setCards

  const recentSets = sets.slice(0, 8)
  const seriesGroups = useMemo(() =>
    sets.reduce<{ series: string; sets: TCGSet[] }[]>((acc, set) => {
      const existing = acc.find((g) => g.series === set.series)
      if (existing) existing.sets.push(set)
      else acc.push({ series: set.series, sets: [set] })
      return acc
    }, []),
    [sets]
  )

  const totalCards = useMemo(() =>
    lot.items.reduce((sum, item) => sum + (item.copies?.length ?? 0), 0),
    [lot.items]
  )

  // Auto-scroll tray to end when items change
  useEffect(() => {
    if (trayRef.current) {
      trayRef.current.scrollLeft = trayRef.current.scrollWidth
    }
  }, [lot.items.length])

  function openSet(set: TCGSet) {
    setSelectedSet(set)
    setSetSearch(null)
    setQuery('')
  }

  function closeSet() {
    setSelectedSet(null)
    setSetSearch(null)
  }

  function getItemQuantity(cardId: string): number {
    return lot.items.find(lc => lc.card.id === cardId)?.copies?.length ?? 0
  }

  // Bottom tray height for padding
  const bottomPadding = lot.items.length > 0 ? 'pb-40' : 'pb-20'

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b-2 border-black flex-shrink-0 bg-primary">
        <h1 className="font-head text-lg font-bold text-black">Add Cards</h1>
        <button
          onClick={onClose}
          className="font-head font-bold text-sm text-black active:opacity-70 px-3 py-1.5 border-2 border-black bg-white shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          Done{totalCards > 0 ? ` (${totalCards})` : ''}
        </button>
      </div>

      {/* Search bar */}
      {!selectedSet && (
        <div className="px-4 pt-3 pb-2 flex gap-2 bg-white border-b-2 border-black flex-shrink-0">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search by card name..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedSet(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter' && query.trim()) searchHistory.push(query) }}
              autoFocus
              className="w-full border-2 border-black pl-9 pr-4 py-2 text-sm focus:outline-none shadow-[2px_2px_0px_#000] focus:shadow-none transition-shadow font-sans"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${bottomPadding}`}>
        {searching ? (
          /* ── Search results ───────────────────────────────────── */
          searchLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center py-14 px-8 text-center">
              <p className="text-base font-semibold text-gray-700">No results for "{query}"</p>
              <p className="text-sm text-gray-400 mt-1.5">Try a shorter name or browse by set below.</p>
              <button onClick={() => setQuery('')} className="mt-4 text-sm font-medium text-blue-500">Clear search</button>
            </div>
          ) : (
            <div>
              {searchResults.map((card) => (
                <CardResultRow
                  key={card.id}
                  card={card}
                  inLot={lot.isInLot(card.id)}
                  onClick={() => lot.toggleCard(card)}
                />
              ))}
            </div>
          )

        ) : selectedSet ? (
          /* ── Set detail ───────────────────────────────────────── */
          <>
            {/* Floating nav */}
            <div className="sticky top-0 z-20 flex justify-between items-start px-3 pt-3 pointer-events-none gap-2">
              <button
                onClick={closeSet}
                className="pointer-events-auto w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center active:opacity-70 flex-shrink-0"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {setSearch === null ? (
                <button
                  onClick={() => setSetSearch('')}
                  className="pointer-events-auto w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center active:opacity-70"
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              ) : (
                <div className="pointer-events-auto flex items-center gap-2 bg-white rounded-2xl shadow-md px-3 py-2 flex-1">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    autoFocus
                    type="search"
                    value={setSearch}
                    onChange={(e) => setSetSearch(e.target.value)}
                    placeholder={`Search ${selectedSet.name}…`}
                    className="flex-1 text-sm focus:outline-none bg-transparent"
                  />
                  <button onClick={() => setSetSearch(null)} className="text-xs font-semibold text-blue-500 flex-shrink-0">Cancel</button>
                </div>
              )}
            </div>

            {/* Set hero */}
            <div className="-mt-[52px] w-full bg-gray-50 flex items-center justify-center px-12" style={{ paddingTop: '72px', paddingBottom: '28px' }}>
              <img src={selectedSet.images.logo} alt={selectedSet.name} className="w-full max-h-36 object-contain" />
            </div>

            {/* Card count */}
            <div className="px-4 pb-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">{selectedSet.releaseDate?.slice(0, 4)} · {selectedSet.series}</span>
              <span className="text-xs text-gray-400">
                {setSearch && filteredSetCards.length !== setCards.length
                  ? `${filteredSetCards.length} of ${setCards.length}`
                  : `${selectedSet.total} cards`}
              </span>
            </div>

            {/* Cards grid */}
            {setCardsLoading ? (
              <div className="grid grid-auto-cards gap-3 px-4 pt-1 pb-4">
                {Array.from({ length: 8 }).map((_, i) => <GridCardSkeleton key={i} />)}
              </div>
            ) : filteredSetCards.length === 0 ? (
              <div className="flex flex-col items-center py-16 px-8 text-center">
                <p className="text-sm font-semibold text-gray-600">No cards match "{setSearch}"</p>
                <button onClick={() => setSetSearch('')} className="mt-3 text-sm text-blue-500 font-medium">Clear</button>
              </div>
            ) : (
              <div className="grid grid-auto-cards gap-3 px-4 pt-1 pb-4">
                {filteredSetCards.map((card) => {
                  const inLot = lot.isInLot(card.id)
                  const qty = getItemQuantity(card.id)
                  return (
                    <LotGridCell
                      key={card.id}
                      card={card}
                      inLot={inLot}
                      quantity={qty}
                      onAdd={() => lot.addCard(card)}
                      onIncrement={() => lot.addCopy(card.id)}
                      onDecrement={() => qty === 1 ? lot.removeCard(card.id) : lot.setQuantity(card.id, qty - 1)}
                    />
                  )
                })}
              </div>
            )}
          </>

        ) : (
          /* ── Discovery home ──────────────────────────────────── */
          <>
            {/* Search history */}
            {searchHistory.history.length > 0 && (
              <div className="px-4 pt-3 pb-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Recent searches</p>
                {searchHistory.history.map((term) => (
                  <div key={term} className="flex items-center gap-2 py-2.5 border-b border-gray-50">
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <button className="flex-1 text-left text-sm text-gray-700" onClick={() => setQuery(term)}>{term}</button>
                    <button onClick={() => searchHistory.remove(term)} className="text-gray-300 text-lg leading-none px-1">×</button>
                  </div>
                ))}
              </div>
            )}

            {/* New Releases */}
            <div className="pt-4 pb-2">
              <p className="px-4 mb-2 text-[10px] font-head font-bold text-gray-500 uppercase tracking-widest">New Releases</p>
              <div className="flex gap-3 px-4 overflow-x-auto snap-x snap-mandatory pb-1" style={{ scrollbarWidth: 'none' }}>
                {setsLoading
                  ? Array.from({ length: 6 }).map((_, i) => <SetLogoCardSkeleton key={i} />)
                  : recentSets.map((set) => (
                      <SetLogoCard key={set.id} set={set} onClick={() => openSet(set)} />
                    ))}
              </div>
            </div>

            {/* Browse by Series */}
            <div className="pb-6">
              <p className="px-4 pt-3 pb-2 text-xs font-head font-bold text-gray-500 uppercase tracking-widest">Browse by Series</p>
              {setsLoading ? (
                <div className="grid grid-auto-tiles mx-4">
                  {Array.from({ length: 8 }).map((_, i) => <SetGridTileSkeleton key={i} />)}
                </div>
              ) : (
                seriesGroups.map(({ series, sets: groupSets }) => (
                  <div key={series} className="mb-4">
                    <p className="px-4 pb-1.5 text-[10px] font-head font-bold text-gray-400 uppercase tracking-widest">{series}</p>
                    <div className="grid grid-auto-tiles mx-4">
                      {groupSets.map((set) => (
                        <SetGridTile key={set.id} set={set} onClick={() => openSet(set)} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom tray + Done button */}
      {lot.items.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-black"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Card tray */}
          <div
            ref={trayRef}
            className="flex items-end px-3 pt-3 pb-2 overflow-x-auto gap-1.5"
            style={{ scrollbarWidth: 'none' }}
          >
            {lot.items.map(({ card, copies = [] }) => {
              const qty = copies.length
              return (
              <div key={card.id} className="flex-shrink-0 relative">
                {/* Stacked copies for quantity > 1 */}
                {qty > 1 && (
                  <>
                    <div className="absolute -top-1 left-1 w-11 h-[62px] border border-black/20 rounded-md bg-gray-200" />
                    {qty > 2 && (
                      <div className="absolute -top-2 left-2 w-11 h-[62px] border border-black/10 rounded-md bg-gray-100" />
                    )}
                  </>
                )}
                <div className="relative w-11 h-[62px] border-2 border-black rounded-md overflow-hidden shadow-sm bg-white">
                  <CardImage src={card.images.small} alt={card.name} className="w-full h-full object-cover" />
                  {qty > 1 && (
                    <div className="absolute bottom-0 right-0 bg-black text-primary text-[9px] font-bold px-1 py-0.5 leading-none">
                      ×{qty}
                    </div>
                  )}
                </div>
                {/* Remove button */}
                <button
                  onClick={() => onRemoveCard ? onRemoveCard(card.id) : lot.removeCard(card.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black rounded-full flex items-center justify-center"
                >
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              )
            })}
          </div>

          {/* Done button */}
          <div className="px-4 pb-3">
            <button
              onClick={onClose}
              className="w-full bg-primary border-2 border-black font-head font-bold py-3 text-base shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
            >
              Done — {totalCards} card{totalCards !== 1 ? 's' : ''} selected
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
