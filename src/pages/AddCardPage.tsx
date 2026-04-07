import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCardSearch } from '@/hooks/useCardSearch'
import { useSets, useSetCards } from '@/hooks/useSetBrowse'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import { AddCardSheet, type AddCardSheetPrefill } from '@/components/collection/AddCardSheet'
import { LotSheet } from '@/components/lot/LotSheet'
import { CardImage } from '@/components/cards/CardImage'
import { CardGridCell, GridCardSkeleton } from '@/components/cards/CardGridCell'
import { CardResultRow } from '@/components/cards/CardResultRow'
import { SetLogoCard, SetLogoCardSkeleton } from '@/components/cards/SetLogoCard'
import { SetGridTile, SetGridTileSkeleton } from '@/components/cards/SetGridTile'
import { PageHeader } from '@/components/layout/PageHeader'
import { extractBestPrice, searchByNameAndNumber } from '@/lib/pokemon-tcg-api'
import { lookupPSACert, getCertImages, parsePSAGrade, isPSAEnabled, type PSACert, type PSACertImages } from '@/lib/psa-api'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useLot } from '@/contexts/LotContext'
import { useAddCard } from '@/hooks/useCollection'
import type { Condition } from '@/types/card'
import { CONDITION_LABELS } from '@/types/card'
import type { TCGCard, TCGSet } from '@/types/api'

const CONDITIONS: Condition[] = ['mint', 'near_mint', 'lightly_played', 'moderately_played', 'heavily_played', 'damaged']


// ── Main page ─────────────────────────────────────────────────────────────────
export function AddCardPage() {
  // Search mode
  const [query, setQuery] = useState('')
  const [selectedSet, setSelectedSet] = useState<TCGSet | null>(null)
  const [setSearch, setSetSearch] = useState<string | null>(null)

  // Cert lookup mode
  const [certMode, setCertMode] = useState(false)
  const [certInput, setCertInput] = useState('')
  const [certLoading, setCertLoading] = useState(false)
  const [certError, setCertError] = useState('')
  const [certInfo, setCertInfo] = useState<PSACert | null>(null)
  const [certImages, setCertImages] = useState<PSACertImages | null>(null)
  const [certMatches, setCertMatches] = useState<TCGCard[]>([])

  // History
  const searchHistory = useSearchHistory('recentSearches')
  const certHistory = useSearchHistory('recentCerts', 6)

  // Shared
  const [selectedCard, setSelectedCard] = useState<TCGCard | null>(null)
  const [selectedPrefill, setSelectedPrefill] = useState<AddCardSheetPrefill | undefined>()
  const [addedMessage, setAddedMessage] = useState('')

  const lot = useLot()
  const navigate = useNavigate()

  // Batch select
  const [selectMode, setSelectMode] = useState(false)
  const [selectedCards, setSelectedCards] = useState<Map<string, { card: TCGCard; quantity: number }>>(new Map())
  const [batchCondition, setBatchCondition] = useState<Condition>('near_mint')
  const [batchAdding, setBatchAdding] = useState(false)
  const [batchError, setBatchError] = useState('')
  const [lotSheetOpen, setLotSheetOpen] = useState(false)
  const addCard = useAddCard()

  const { fmt } = useCurrency()
  const searching = !certMode && query.length >= 2

  const { data: searchResults = [], isLoading: searchLoading } = useCardSearch(query)
  const { data: sets = [], isLoading: setsLoading } = useSets()
  const { data: setCards = [], isLoading: setCardsLoading } = useSetCards(selectedSet?.id ?? null)
  const filteredSetCards = setSearch
    ? setCards.filter((c) => c.name.toLowerCase().includes(setSearch.toLowerCase()))
    : setCards

  // Group sets by series (newest first)
  const recentSets = sets.slice(0, 8)
  const seriesGroups = sets.reduce<{ series: string; sets: TCGSet[] }[]>((acc, set) => {
    const existing = acc.find((g) => g.series === set.series)
    if (existing) existing.sets.push(set)
    else acc.push({ series: set.series, sets: [set] })
    return acc
  }, [])

  // ── Cert lookup ────────────────────────────────────────────────────────────
  function buildCertPrefill(cert: PSACert): AddCardSheetPrefill {
    return {
      graded: true,
      gradingCompany: 'PSA',
      grade: parsePSAGrade(cert.CardGrade) ?? 9,
      certNumber: cert.CertNumber,
    }
  }

  async function handleCertLookup(overrideInput?: string) {
    const input = overrideInput ?? certInput
    if (!input.trim()) return
    if (overrideInput) setCertInput(overrideInput)
    setCertError('')
    setCertInfo(null)
    setCertImages(null)
    setCertMatches([])
    setCertLoading(true)
    try {
      const cert = await lookupPSACert(input)
      if (!cert) {
        setCertError(`No PSA cert found for #${certInput.trim()}`)
        return
      }
      setCertInfo(cert)
      certHistory.push(input)
      const firstName = cert.Subject.split(/[\s-]/)[0]
      const [images, tcgRes] = await Promise.all([
        getCertImages(cert.CertNumber),
        searchByNameAndNumber(firstName, cert.CardNumber),
      ])
      setCertImages(images)
      setCertMatches(tcgRes.data)
    } catch (e) {
      setCertError(e instanceof Error ? e.message : 'Lookup failed')
    } finally {
      setCertLoading(false)
    }
  }

  function exitCertMode() {
    setCertMode(false)
    setCertInput('')
    setCertError('')
    setCertInfo(null)
    setCertImages(null)
    setCertMatches([])
  }

  function openSet(set: TCGSet) {
    setSelectedSet(set)
    setSetSearch(null)
    setQuery('')
  }

  function closeSet() {
    setSelectedSet(null)
    setSetSearch(null)
    setSelectMode(false)
    setSelectedCards(new Map())
  }

  function toggleCardSelection(card: TCGCard) {
    setSelectedCards(prev => {
      const next = new Map(prev)
      if (next.has(card.id)) next.delete(card.id)
      else next.set(card.id, { card, quantity: 1 })
      return next
    })
  }

  function setBatchQuantity(cardId: string, qty: number) {
    if (qty < 1) {
      setSelectedCards(prev => { const next = new Map(prev); next.delete(cardId); return next })
      return
    }
    setSelectedCards(prev => {
      const next = new Map(prev)
      const entry = next.get(cardId)
      if (entry) next.set(cardId, { ...entry, quantity: qty })
      return next
    })
  }

  async function handleBatchAdd() {
    setBatchAdding(true)
    setBatchError('')
    const entries = Array.from(selectedCards.values())
    try {
      await Promise.all(entries.map(({ card, quantity }) =>
        addCard.mutateAsync({
          cardId: card.id,
          condition: batchCondition,
          quantity,
          foil: false,
          notes: '',
          graded: false,
          grading_company: null,
          grade: null,
          cert_number: null,
          cost: null,
          price_override: null,
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
      ))
      const count = entries.reduce((sum, e) => sum + e.quantity, 0)
      setSelectedCards(new Map())
      setSelectMode(false)
      setAddedMessage(`${count} card${count !== 1 ? 's' : ''} added!`)
      setTimeout(() => setAddedMessage(''), 3000)
    } catch (e) {
      setBatchError(e instanceof Error ? e.message : 'Failed to add cards')
    } finally {
      setBatchAdding(false)
    }
  }

  // ── Add success ────────────────────────────────────────────────────────────
  function handleAdded() {
    const name = selectedCard?.name ?? 'Card'
    setSelectedCard(null)
    setSelectedPrefill(undefined)
    setAddedMessage(`${name} added!`)
    setTimeout(() => setAddedMessage(''), 2500)
  }

  return (
    <>
      {!selectedSet && <PageHeader
        title="Add Card"
      />}

      {/* ── Toolbar — hidden in set detail view ─────────────────── */}
      {!selectedSet && <div className="px-4 pt-3 pb-2 flex gap-2 bg-white sticky top-14 z-20 border-b-2 border-black">
        {certMode ? (
          <>
            <button
              onClick={exitCertMode}
              className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <input
              type="number" inputMode="numeric" placeholder="PSA cert number..."
              value={certInput}
              onChange={(e) => setCertInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCertLookup() }}
              autoFocus
              className="flex-1 border-2 border-black px-4 py-2 text-sm focus:outline-none shadow-[2px_2px_0px_#000] focus:shadow-none transition-shadow font-sans"
            />
            <button
              onClick={() => void handleCertLookup()}
              disabled={certLoading || !certInput.trim()}
              className="px-4 h-10 border-2 border-black bg-white font-head font-bold text-sm shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-40 flex-shrink-0"
            >
              {certLoading ? '…' : 'Look up'}
            </button>
          </>
        ) : (
          <>
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search" placeholder="Search by card name..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedSet(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter' && query.trim()) searchHistory.push(query) }}
                className="w-full border-2 border-black pl-9 pr-4 py-2 text-sm focus:outline-none shadow-[2px_2px_0px_#000] focus:shadow-none transition-shadow font-sans"
              />
            </div>
          </>
        )}
      </div>}

      {/* Success toast */}
      {addedMessage && (
        <div className="mx-4 mt-2 px-4 py-2.5 bg-primary border-2 border-black shadow-[3px_3px_0px_#000] font-head font-bold text-black text-sm text-center">
          {addedMessage}
        </div>
      )}

      {/* ── Cert / search / browse content ───────────────────────── */}
      {certMode ? (
        <div>
          {/* Error */}
          {certError && (
            <div className="flex flex-col items-center py-14 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              {certError === 'not_found' ? (
                <>
                  <p className="text-base font-semibold text-gray-700">Cert not found</p>
                  <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
                    Double-check the number on the PSA label — it's usually 8–9 digits.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-gray-700">Something went wrong</p>
                  <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
                    Couldn't reach PSA right now. Try again in a moment.
                  </p>
                </>
              )}
              <button
                onClick={() => { setCertError(''); setCertInput('') }}
                className="mt-4 text-sm font-medium text-blue-500 active:opacity-70"
              >
                Try again
              </button>
            </div>
          )}

          {/* Loading */}
          {certLoading && (
            <div className="flex flex-col items-center py-12 text-sm text-gray-400 gap-2">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              Looking up cert #{certInput}…
            </div>
          )}

          {/* Cert result */}
          {!certLoading && certInfo && (() => {
            const singleMatch = certMatches.length === 1 ? certMatches[0] : null
            const matchPrice = singleMatch ? extractBestPrice(singleMatch) : null
            return (
              <div className="pb-8">

                {/* Case B: 2+ matches — pick printing first */}
                {certMatches.length > 1 && (
                  <div className="mt-3 mb-1">
                    <p className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Which printing?</p>
                    <div className="flex gap-3 px-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                      {certMatches.map((card) => {
                        const { market: cardMarket } = extractBestPrice(card)
                        const price = cardMarket != null ? fmt(cardMarket) : null
                        return (
                          <button
                            key={card.id}
                            onClick={() => {
                              setSelectedCard(card)
                              setSelectedPrefill(buildCertPrefill(certInfo))
                            }}
                            className="flex-shrink-0 w-20 flex flex-col items-center active:opacity-70"
                          >
                            <div className="relative w-full">
                              <CardImage src={card.images.small} alt={card.name} className="w-full aspect-[2.5/3.5] rounded-lg shadow-sm" />
                              {price && (
                                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1 py-0.5 rounded backdrop-blur-sm">
                                  {price}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-[10px] text-gray-600 text-center leading-tight line-clamp-2 w-full">{card.set.name}</div>
                            <div className="text-[9px] text-gray-400">#{card.number}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Hero image — PSA slab photo if available, else TCG card art */}
                {singleMatch && (
                  <div className="pt-4 pb-2">
                    {certImages?.frontUrl ? (
                      <div className="flex gap-3 justify-center px-4">
                        <img
                          src={certImages.frontUrl}
                          alt="PSA slab front"
                          className="h-64 w-auto object-contain rounded-xl shadow-lg"
                        />
                        {certImages.backUrl && (
                          <img
                            src={certImages.backUrl}
                            alt="PSA slab back"
                            className="h-64 w-auto object-contain rounded-xl shadow-lg"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="px-10">
                        <CardImage
                          src={singleMatch.images.small}
                          alt={singleMatch.name}
                          className="w-full aspect-[2.5/3.5] rounded-2xl shadow-lg"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Card identity */}
                {singleMatch && (
                  <div className="px-4 pt-1 text-center">
                    <div className="font-bold text-gray-900 text-base leading-tight">{singleMatch.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{singleMatch.set.name} · #{singleMatch.number}{singleMatch.rarity ? ` · ${singleMatch.rarity}` : ''}</div>
                  </div>
                )}

                {/* Price — hero number */}
                {singleMatch && (
                  <div className="px-4 pt-4 pb-1 text-center">
                    {matchPrice?.market != null ? (
                      <>
                        <div className="text-3xl font-bold text-gray-900">{fmt(matchPrice.market)}</div>
                        <div className="text-xs text-gray-400 mt-0.5">TCGPlayer market price (USD source)</div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-400">No price data</div>
                    )}
                  </div>
                )}

                {/* Grade + pop stats */}
                <div className="px-4 pt-3 flex items-center justify-center gap-3 flex-wrap">
                  <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                    PSA {certInfo.CardGrade}
                  </span>
                  {certInfo.TotalPopulation > 0 && (
                    <>
                      <span className="text-xs text-gray-500">
                        Pop <span className="font-semibold text-gray-700">{certInfo.TotalPopulation.toLocaleString()}</span>
                      </span>
                      <span className="text-xs text-gray-500">
                        Pop Higher <span className="font-semibold text-gray-700">{certInfo.PopulationHigher.toLocaleString()}</span>
                      </span>
                    </>
                  )}
                </div>

                {/* Cert detail row */}
                <div className="px-4 pt-3 flex items-center justify-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-400">Cert #{certInfo.CertNumber}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{certInfo.Year}{certInfo.Brand ? ` ${certInfo.Brand}` : ''}</span>
                </div>

                {/* Case C: 0 matches */}
                {certMatches.length === 0 && (
                  <div className="mx-4 mt-4 px-4 py-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                    <p className="text-sm text-yellow-700 font-medium">Couldn't auto-match this card</p>
                    <p className="text-xs text-yellow-600 mt-0.5 mb-2">Try searching by name instead</p>
                    <button
                      onClick={() => {
                        const name = certInfo.Subject.split(/[\s-]/)[0]
                        exitCertMode()
                        setQuery(name)
                      }}
                      className="text-xs font-semibold text-blue-600 underline"
                    >
                      Search for "{certInfo.Subject.split(/[\s-]/)[0]}"
                    </button>
                  </div>
                )}

                {/* Add to Collection CTA */}
                {singleMatch && (
                  <div className="px-4 pt-5">
                    <button
                      onClick={() => {
                        setSelectedCard(singleMatch)
                        setSelectedPrefill(buildCertPrefill(certInfo))
                      }}
                      className="w-full bg-primary border-2 border-black font-head font-bold py-3.5 text-base shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                    >
                      Add to Collection
                    </button>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Cert history */}
          {!certLoading && !certInfo && !certError && certHistory.history.length > 0 && (
            <div className="px-4 pt-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Recent</p>
              {certHistory.history.map((cert) => (
                <div key={cert} className="flex items-center gap-2 py-2.5 border-b border-gray-50">
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <button
                    className="flex-1 text-left text-sm text-gray-700 font-mono"
                    onClick={() => void handleCertLookup(cert)}
                  >
                    {cert}
                  </button>
                  <button onClick={() => certHistory.remove(cert)} className="text-gray-300 text-lg leading-none px-1">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!certLoading && !certInfo && !certError && certHistory.history.length === 0 && (
            <div className="flex flex-col items-center py-14 px-6 text-center">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700">Enter a PSA cert number</p>
              <p className="text-xs text-gray-400 mt-1">The 8-digit number printed on the PSA label. Card details and grade will be filled in automatically.</p>
            </div>
          )}
        </div>

      /* ── Search results ─────────────────────────────────────── */
      ) : searching ? (
        searchLoading ? (
          <div className="flex flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <div className="w-12 h-16 bg-gray-200 rounded animate-pulse" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
                  <div className="h-2 bg-gray-200 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : searchResults.length === 0 ? (
          <div className="flex flex-col items-center py-16 px-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-700">No results for "{query}"</p>
            <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
              Try a shorter name, check the spelling, or browse by series below.
            </p>
            <button
              onClick={() => setQuery('')}
              className="mt-4 text-sm font-medium text-blue-500 active:opacity-70"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div>
            {searchResults.map((card) => (
              <CardResultRow
                key={card.id}
                card={card}
                onClick={() => setSelectedCard(card)}
              />
            ))}
          </div>
        )

      /* ── Browse: cards in a set ──────────────────────────────── */
      ) : selectedSet ? (
        <>
          {/* Sticky floating nav — overlaid on the hero */}
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
              <div className="pointer-events-auto flex gap-2">
                <button
                  onClick={() => { setSelectMode(s => !s); setSelectedCards(new Map()) }}
                  className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center active:opacity-70 ${selectMode ? 'bg-red-500' : 'bg-white'}`}
                >
                  {selectMode ? (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setSetSearch('')}
                  className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center active:opacity-70"
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
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
                <button onClick={() => setSetSearch(null)} className="text-xs font-semibold text-blue-500 flex-shrink-0">
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Full-width hero — pulled up behind the floating nav */}
          <div className="-mt-[52px] w-full bg-gray-50 flex items-center justify-center px-12" style={{ paddingTop: '72px', paddingBottom: '28px' }}>
            <img src={selectedSet.images.logo} alt={selectedSet.name} className="w-full max-h-36 object-contain" />
          </div>

          {/* Card count + set info */}
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
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-600">No cards match "{setSearch}"</p>
              <button onClick={() => setSetSearch('')} className="mt-3 text-sm text-blue-500 font-medium">Clear</button>
            </div>
          ) : (
            <div className="grid grid-auto-cards gap-3 px-4 pt-1 pb-4">
              {filteredSetCards.map((card) => {
                const entry = selectedCards.get(card.id)
                return selectMode && entry ? (
                  <div key={card.id} className="flex flex-col items-center">
                    <div className="relative w-full">
                      <CardImage
                        src={card.images.small}
                        alt={card.name}
                        className="w-full aspect-[2.5/3.5] rounded-xl shadow-sm ring-2 ring-black ring-offset-1"
                      />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-2">
                        <div className="flex items-center border-2 border-black bg-white shadow-[2px_2px_0px_#000]">
                          <button
                            onClick={() => setBatchQuantity(card.id, entry.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center font-bold text-sm active:bg-gray-100"
                          >
                            {entry.quantity === 1 ? '×' : '−'}
                          </button>
                          <span className="w-7 h-8 flex items-center justify-center text-sm font-bold font-sans border-x-2 border-black bg-primary">
                            {entry.quantity}
                          </span>
                          <button
                            onClick={() => setBatchQuantity(card.id, entry.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center font-bold text-sm active:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-800 font-medium text-center leading-tight line-clamp-1 w-full">
                      {card.name}
                    </div>
                  </div>
                ) : (
                  <CardGridCell
                    key={card.id}
                    card={card}
                    onClick={() => { if (!selectMode) setSelectedCard(card) }}
                    selectable={selectMode}
                    selected={false}
                    onToggle={() => toggleCardSelection(card)}
                  />
                )
              })}
            </div>
          )}
        </>

      /* ── Browse: discovery home ──────────────────────────────── */
      ) : (
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
                  <button
                    className="flex-1 text-left text-sm text-gray-700"
                    onClick={() => setQuery(term)}
                  >
                    {term}
                  </button>
                  <button onClick={() => searchHistory.remove(term)} className="text-gray-300 text-lg leading-none px-1">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick actions — hidden when browsing for a lot */}
          <div className="px-4 pt-3 pb-1 flex flex-col gap-2">
            <button
              onClick={() => { lot.startLot(); navigate('/add-lot') }}
              className="w-full flex items-center gap-3 px-4 py-3 border-2 border-black bg-white shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all text-left"
            >
              <div className="w-9 h-9 border-2 border-black bg-primary flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-head font-bold text-sm text-black">Create Lot</div>
                <div className="text-xs text-gray-500 font-sans">Search cards from any set, enter total paid</div>
              </div>
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {isPSAEnabled() && (
              <button
                onClick={() => { setCertMode(true); setQuery(''); setSelectedSet(null) }}
                className="w-full flex items-center gap-3 px-4 py-3 border-2 border-black bg-white shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all text-left"
              >
                <div className="w-9 h-9 border-2 border-black bg-white flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-head font-bold text-sm text-black">PSA Cert Lookup</div>
                  <div className="text-xs text-gray-500 font-sans">Look up a graded card by cert number</div>
                </div>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* New Releases carousel */}
          <div className="pt-4 pb-2">
            <p className="px-4 mb-2 text-[10px] font-head font-bold text-gray-500 uppercase tracking-widest">New Releases</p>
            <div className="flex px-4 py-0.5 overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
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

          {/* PSA cert lookup entry point — show even if not configured */}
          {!isPSAEnabled() && (
            <div className="mx-4 mb-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-600">PSA Cert Lookup</div>
                <div className="text-[10px] text-gray-400">Add VITE_PSA_API_TOKEN to .env to enable</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Batch action bar */}
      {selectedCards.size > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-black px-4 pt-3"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <div className="flex gap-2 mb-3 flex-wrap">
            {CONDITIONS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setBatchCondition(c)}
                className={`px-3 py-1.5 text-sm font-head font-bold border-2 border-black transition-all shadow-[2px_2px_0px_#000] active:shadow-none ${
                  batchCondition === c ? 'bg-primary' : 'bg-white'
                }`}
              >
                {CONDITION_LABELS[c]}
              </button>
            ))}
          </div>
          {batchError && (
            <div className="mb-2 text-sm font-head font-bold text-black">{batchError}</div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => void handleBatchAdd()}
              disabled={batchAdding}
              className="flex-1 bg-primary border-2 border-black font-head font-bold py-3 text-base shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-60"
            >
              {batchAdding ? 'Adding…' : (() => { const total = Array.from(selectedCards.values()).reduce((s, e) => s + e.quantity, 0); return `Add ${total} card${total !== 1 ? 's' : ''}` })()}
            </button>
            <button
              onClick={() => setLotSheetOpen(true)}
              disabled={batchAdding}
              className="border-2 border-black bg-white font-head font-bold py-3 px-4 text-sm shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-60 flex-shrink-0"
            >
              Add as Lot
            </button>
          </div>
        </div>
      )}

      {/* Overlays */}
      {selectedCard && (
        <AddCardSheet
          card={selectedCard}
          prefill={selectedPrefill}
          onClose={() => { setSelectedCard(null); setSelectedPrefill(undefined) }}
          onAdded={handleAdded}
        />
      )}
      {lotSheetOpen && (
        <LotSheet
          items={Array.from(selectedCards.values()).map(({ card }) => ({ card, condition: batchCondition }))}
          onConditionChange={() => {}}
          onClose={() => setLotSheetOpen(false)}
          onSuccess={() => {
            const count = Array.from(selectedCards.values()).reduce((s, e) => s + e.quantity, 0)
            setLotSheetOpen(false)
            setSelectedCards(new Map())
            setSelectMode(false)
            setAddedMessage(`${count} card${count !== 1 ? 's' : ''} added as lot!`)
            setTimeout(() => setAddedMessage(''), 3000)
          }}
        />
      )}
    </>
  )
}
