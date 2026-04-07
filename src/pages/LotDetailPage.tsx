import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLot, type LotItem } from '@/contexts/LotContext'
import { useLotDetail } from '@/hooks/useLots'
import { LotBrowseModal } from '@/components/lot/LotBrowseModal'
import { PageHeader } from '@/components/layout/PageHeader'
import { CardImage } from '@/components/cards/CardImage'
import { CONDITION_LABELS, CONDITION_MULTIPLIERS } from '@/types/card'
import type { Condition } from '@/types/card'
import { useCurrency } from '@/contexts/CurrencyContext'
import { extractBestPrice } from '@/lib/pokemon-tcg-api'
import { calculateLotCosts } from '@/lib/lot-calculator'
import { useAddCard, useDeleteCollectionItem } from '@/hooks/useCollection'
import { useCreateLot, useUpdateLot, useDeleteLot } from '@/hooks/useLots'
import { supabase } from '@/lib/supabase'
import type { TCGCard } from '@/types/api'
import type { CollectionItemWithCard } from '@/types/card'

// ── New lot page (no routeId) ────────────────────────────────────────────────
// Uses LotContext for in-memory state, saves to DB on browse modal close.

// ── Existing lot page (routeId) ──────────────────────────────────────────────
// Renders directly from useLotDetail DB query. No context hydration needed.
// Edits (condition, remove, total paid, rename) go directly to DB and refetch.

export function LotDetailPage() {
  const { id: routeId } = useParams<{ id: string }>()

  return routeId
    ? <ExistingLotView lotId={routeId} />
    : <NewLotView />
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NEW LOT VIEW — uses LotContext
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function NewLotView() {
  const navigate = useNavigate()
  const lot = useLot()
  const addCard = useAddCard()
  const createLot = useCreateLot()
  const updateLot = useUpdateLot()
  const deleteLot = useDeleteLot()
  const deleteItem = useDeleteCollectionItem()

  const [browseOpen, setBrowseOpen] = useState(false)
  const [totalPaid, setTotalPaid] = useState('')
  const [editingPaid, setEditingPaid] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedCardIds, setSavedCardIds] = useState<Map<string, string>>(new Map())
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const totalPaidNum = parseFloat(totalPaid) || 0
  const paidInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!lot.isActive) lot.startLot()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const creatingRef = useRef(false)

  useEffect(() => {
    if (lot.isActive && !lot.lotId && lot.lotName && !creatingRef.current) {
      creatingRef.current = true
      createLot.mutateAsync({ name: lot.lotName, totalPaid: null })
        .then(id => lot.setLotId(id))
        .catch(() => { creatingRef.current = false })
    }
  }, [lot.isActive, lot.lotId, lot.lotName]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalCards = useMemo(() =>
    lot.items.reduce((sum, item) => sum + (item.copies?.length ?? 0), 0),
    [lot.items]
  )

  const flatCopies = useMemo(() =>
    lot.items.flatMap(({ card, copies = [] }) =>
      copies.map(copy => {
        const price = extractBestPrice(card)
        const marketValue = price.market != null ? price.market * CONDITION_MULTIPLIERS[copy.condition] : null
        return { card, copy, marketValue }
      })
    ),
    [lot.items]
  )

  const totalMarket = useMemo(() =>
    flatCopies.reduce((sum, { marketValue }) => sum + (marketValue ?? 0), 0),
    [flatCopies]
  )

  const costs = useMemo(() => {
    if (totalPaidNum <= 0) return flatCopies.map(() => null as number | null)
    return calculateLotCosts(
      flatCopies.map(({ marketValue }) => ({ marketValue, quantity: 1 })),
      totalPaidNum
    ) as (number | null)[]
  }, [flatCopies, totalPaidNum])

  const costByCopyId = useMemo(() => {
    const map = new Map<string, number | null>()
    let idx = 0
    for (const { copies = [] } of lot.items) {
      for (const copy of copies) {
        map.set(copy.id, costs[idx] ?? null)
        idx++
      }
    }
    return map
  }, [lot.items, costs])

  function cardTotalMarket(cardId: string): number {
    return flatCopies.filter(fc => fc.card.id === cardId).reduce((s, fc) => s + (fc.marketValue ?? 0), 0)
  }
  function cardTotalCost(cardId: string): number | null {
    const item = lot.items.find(lc => lc.card.id === cardId)
    if (!item) return null
    let total = 0; let any = false
    for (const copy of item.copies ?? []) { const c = costByCopyId.get(copy.id); if (c != null) { total += c; any = true } }
    return any ? total : null
  }

  const handleBrowseClose = useCallback(async () => {
    setBrowseOpen(false)
    if (!lot.lotId || lot.items.length === 0) return
    const unsaved = lot.items.flatMap(({ card, copies = [] }) =>
      copies.filter(copy => !savedCardIds.has(copy.id)).map(copy => ({ card, copy }))
    )
    if (unsaved.length === 0) return
    setSaving(true)
    try {
      for (const { card, copy } of unsaved) {
        const itemId = await addCard.mutateAsync({
          cardId: card.id, condition: copy.condition, quantity: 1, foil: false, notes: '',
          graded: false, grading_company: null, grade: null, cert_number: null,
          cost: null, price_override: null, lot_id: lot.lotId,
          cardData: { id: card.id, name: card.name, set_id: card.set.id, set_name: card.set.name,
            number: card.number, rarity: card.rarity ?? null, supertype: card.supertype ?? null,
            subtypes: card.subtypes ?? null, image_small: card.images.small ?? null,
            image_large: card.images.large ?? null, hp: card.hp ?? null },
        })
        setSavedCardIds(prev => new Map(prev).set(copy.id, itemId))
      }
    } catch { /* retry next close */ } finally { setSaving(false) }
  }, [lot.lotId, lot.items, savedCardIds, addCard])

  function handlePaidBlur() {
    setEditingPaid(false)
    if (lot.lotId) updateLot.mutate({ lotId: lot.lotId, updates: { total_paid: totalPaidNum > 0 ? totalPaidNum : null } })
  }

  async function handleRemoveCard(cardId: string) {
    const item = lot.items.find(lc => lc.card.id === cardId)
    if (item) for (const copy of item.copies ?? []) {
      const itemId = savedCardIds.get(copy.id)
      if (itemId) { await deleteItem.mutateAsync(itemId); setSavedCardIds(prev => { const n = new Map(prev); n.delete(copy.id); return n }) }
    }
    lot.removeCard(cardId)
  }

  async function handleRemoveCopy(cardId: string, copyId: string) {
    const itemId = savedCardIds.get(copyId)
    if (itemId) { await deleteItem.mutateAsync(itemId); setSavedCardIds(prev => { const n = new Map(prev); n.delete(copyId); return n }) }
    lot.removeCopy(cardId, copyId)
  }

  async function handleCopyConditionChange(cardId: string, copyId: string, condition: Condition) {
    lot.updateCopyCondition(cardId, copyId, condition)
    const itemId = savedCardIds.get(copyId)
    if (itemId) await supabase.from('collection_items').update({ condition, updated_at: new Date().toISOString() }).eq('id', itemId)
  }

  function handleRename() {
    const name = renameValue.trim(); if (!name) return
    lot.setLotName(name); setRenaming(false); setMenuOpen(false)
    if (lot.lotId) updateLot.mutate({ lotId: lot.lotId, updates: { name } })
  }

  async function handleDeleteLot() {
    if (lot.lotId) await deleteLot.mutateAsync(lot.lotId)
    lot.clearLot(); navigate('/')
  }

  function toggleExpanded(cardId: string) {
    setExpandedCards(prev => { const n = new Set(prev); if (n.has(cardId)) n.delete(cardId); else n.add(cardId); return n })
  }

  return (
    <LotPageShell
      title={lot.lotName || 'New Lot'}
      subtitle={totalCards > 0 ? `${totalCards} card${totalCards !== 1 ? 's' : ''}` : undefined}
      items={lot.items}
      totalMarket={totalMarket}
      totalPaid={totalPaid}
      totalPaidNum={totalPaidNum}
      editingPaid={editingPaid}
      paidInputRef={paidInputRef}
      setTotalPaid={setTotalPaid}
      setEditingPaid={setEditingPaid}
      onPaidBlur={handlePaidBlur}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      renaming={renaming}
      setRenaming={setRenaming}
      renameValue={renameValue}
      setRenameValue={setRenameValue}
      onRename={handleRename}
      onDelete={handleDeleteLot}
      lotName={lot.lotName}
      expandedCards={expandedCards}
      toggleExpanded={toggleExpanded}
      costByCopyId={costByCopyId}
      cardTotalMarket={cardTotalMarket}
      cardTotalCost={cardTotalCost}
      savedCardIds={savedCardIds}
      saving={saving}
      onRemoveCard={handleRemoveCard}
      onRemoveCopy={handleRemoveCopy}
      onCopyConditionChange={handleCopyConditionChange}
      onAddCopy={(cardId) => lot.addCopy(cardId)}
      onSetQuantity={(cardId, qty) => lot.setQuantity(cardId, qty)}
      browseOpen={browseOpen}
      setBrowseOpen={setBrowseOpen}
      onBrowseClose={() => void handleBrowseClose()}
    />
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXISTING LOT VIEW — renders directly from DB, no context hydration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ExistingLotView({ lotId }: { lotId: string }) {
  const navigate = useNavigate()
  const lot = useLot()
  const { data: dbLot, isLoading, isError, refetch } = useLotDetail(lotId)
  const updateLot = useUpdateLot()
  const deleteLot = useDeleteLot()
  const deleteItem = useDeleteCollectionItem()

  const [browseOpen, setBrowseOpen] = useState(false)
  const [totalPaid, setTotalPaid] = useState('')
  const [editingPaid, setEditingPaid] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [paidInit, setPaidInit] = useState(false)

  const paidInputRef = useRef<HTMLInputElement>(null)

  // Init totalPaid from DB once
  useEffect(() => {
    if (dbLot && !paidInit) {
      if (dbLot.total_paid != null) setTotalPaid(String(dbLot.total_paid))
      setPaidInit(true)
    }
  }, [dbLot, paidInit])

  // Hydrate context for the browse modal (so isInLot works)
  useEffect(() => {
    if (dbLot && !lot.isActive) {
      const items: LotItem[] = []
      const cardMap = new Map<string, LotItem>()
      for (const item of dbLot.items) {
        const cardId = item.card_id as string
        if (!cardMap.has(cardId)) {
          const tcgCard: TCGCard = {
            id: cardId, name: item.card.name, number: item.card.number,
            set: { id: item.card.set_id, name: item.card.set_name, series: '', printedTotal: 0, releaseDate: '', images: { symbol: '', logo: '' }, total: 0 },
            images: { small: item.card.image_small ?? '', large: item.card.image_large ?? '' },
            supertype: item.card.supertype ?? '', subtypes: item.card.subtypes ?? undefined,
            rarity: item.card.rarity ?? undefined, hp: item.card.hp ?? undefined,
            tcgplayer: undefined,
          }
          const lotItem: LotItem = { card: tcgCard, copies: [] }
          cardMap.set(cardId, lotItem)
          items.push(lotItem)
        }
        cardMap.get(cardId)!.copies.push({ id: item.id, condition: item.condition as Condition })
      }
      lot.hydrate(dbLot.id, dbLot.name, items)
    }
  }, [dbLot]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPaidNum = parseFloat(totalPaid) || 0

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
        </div>
      </>
    )
  }

  if (!dbLot || isError) {
    return (
      <>
        <PageHeader title="Lot Not Found" />
        <div className="flex flex-col items-center py-20 px-8 text-center">
          <p className="font-head font-bold text-lg text-black mb-1">Lot not found</p>
          <p className="text-sm text-gray-500 font-sans mb-6">This lot may have been deleted.</p>
          <button onClick={() => navigate('/')} className="px-6 py-2.5 border-2 border-black bg-primary font-head font-bold text-sm shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all">
            Back to Collection
          </button>
        </div>
      </>
    )
  }

  // Build display data from DB
  const dbItems = dbLot.items.filter(item => item.card) // skip items with missing card data
  const cardGroups = new Map<string, { card: CollectionItemWithCard['card']; copies: Array<{ id: string; condition: Condition; cost: number | null }> }>()
  for (const item of dbItems) {
    const cid = item.card_id as string
    if (!cardGroups.has(cid)) cardGroups.set(cid, { card: item.card, copies: [] })
    cardGroups.get(cid)!.copies.push({ id: item.id, condition: item.condition as Condition, cost: item.cost != null ? Number(item.cost) : null })
  }

  const lotItems: LotItem[] = Array.from(cardGroups.entries()).map(([, { card, copies }]) => ({
    card: {
      id: card.id ?? '', name: card.name, number: card.number,
      set: { id: card.set_id, name: card.set_name, series: '', printedTotal: 0, releaseDate: '', images: { symbol: '', logo: '' }, total: 0 },
      images: { small: card.image_small ?? '', large: card.image_large ?? '' },
      supertype: card.supertype ?? undefined, subtypes: card.subtypes ?? undefined,
      rarity: card.rarity ?? undefined, hp: card.hp ?? undefined,
      tcgplayer: undefined,
    } as TCGCard,
    copies: copies.map(c => ({ id: c.id, condition: c.condition })),
  }))

  const totalCards = dbItems.length

  const flatCopies = dbItems.map(item => {
    const mv = item.price?.market != null ? Number(item.price.market) * CONDITION_MULTIPLIERS[item.condition as Condition] : null
    return { cardId: item.card_id as string, itemId: item.id, condition: item.condition as Condition, marketValue: mv, cost: item.cost != null ? Number(item.cost) : null }
  })

  const totalMarket = flatCopies.reduce((s, fc) => s + (fc.marketValue ?? 0), 0)

  const recalcCosts = totalPaidNum > 0
    ? calculateLotCosts(flatCopies.map(fc => ({ marketValue: fc.marketValue, quantity: 1 })), totalPaidNum)
    : flatCopies.map(() => null)

  // Build costByCopyId (using DB item IDs as copy IDs)
  const costByCopyId = new Map<string, number | null>()
  flatCopies.forEach((fc, i) => costByCopyId.set(fc.itemId, recalcCosts[i] ?? fc.cost))

  // savedCardIds: for existing lots, copy.id IS the DB item ID
  const savedCardIds = new Map<string, string>()
  for (const item of dbItems) savedCardIds.set(item.id, item.id)

  function cardTotalMarket(cardId: string): number {
    return flatCopies.filter(fc => fc.cardId === cardId).reduce((s, fc) => s + (fc.marketValue ?? 0), 0)
  }
  function cardTotalCost(cardId: string): number | null {
    const group = cardGroups.get(cardId)
    if (!group) return null
    let total = 0; let any = false
    for (const copy of group.copies) {
      const c = costByCopyId.get(copy.id)
      if (c != null) { total += c; any = true }
    }
    return any ? total : null
  }

  function handlePaidBlur() {
    setEditingPaid(false)
    updateLot.mutate({ lotId, updates: { total_paid: totalPaidNum > 0 ? totalPaidNum : null } })
  }

  async function handleRemoveCard(cardId: string) {
    const group = cardGroups.get(cardId)
    if (group) for (const copy of group.copies) await deleteItem.mutateAsync(copy.id)
    lot.removeCard(cardId)
    void refetch()
  }

  async function handleRemoveCopy(cardId: string, copyId: string) {
    await deleteItem.mutateAsync(copyId)
    lot.removeCopy(cardId, copyId)
    void refetch()
  }

  async function handleCopyConditionChange(cardId: string, copyId: string, condition: Condition) {
    await supabase.from('collection_items').update({ condition, updated_at: new Date().toISOString() }).eq('id', copyId)
    lot.updateCopyCondition(cardId, copyId, condition)
    void refetch()
  }

  function handleRename() {
    const name = renameValue.trim(); if (!name) return
    setRenaming(false); setMenuOpen(false)
    lot.setLotName(name)
    updateLot.mutate({ lotId, updates: { name } }, { onSuccess: () => void refetch() })
  }

  async function handleDeleteLot() {
    await deleteLot.mutateAsync(lotId)
    lot.clearLot(); navigate('/')
  }

  function toggleExpanded(cardId: string) {
    setExpandedCards(prev => { const n = new Set(prev); if (n.has(cardId)) n.delete(cardId); else n.add(cardId); return n })
  }

  // Handle browse modal close — save new cards from context to DB
  async function handleBrowseClose() {
    setBrowseOpen(false)
    // Find cards in context that aren't in DB yet
    const existingCardIds = new Set(dbItems.map(i => i.card_id as string))
    const newItems = lot.items.filter(li => !existingCardIds.has(li.card.id))
    if (newItems.length === 0) { void refetch(); return }

    for (const { card, copies = [] } of newItems) {
      for (const copy of copies) {
        await supabase.from('cards').upsert({
          id: card.id, name: card.name, set_id: card.set.id, set_name: card.set.name,
          number: card.number, rarity: card.rarity ?? null, supertype: card.supertype ?? null,
          subtypes: card.subtypes ?? null, image_small: card.images.small ?? null,
          image_large: card.images.large ?? null, hp: card.hp ?? null,
          last_fetched: new Date().toISOString(),
        }, { onConflict: 'id' })

        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) break
        await supabase.from('collection_items').insert({
          user_id: session.user.id, card_id: card.id, condition: copy.condition,
          quantity: 1, foil: false, graded: false, cost: null, price_override: null, lot_id: lotId,
        })
      }
    }
    void refetch()
  }

  return (
    <LotPageShell
      title={dbLot.name}
      subtitle={totalCards > 0 ? `${totalCards} card${totalCards !== 1 ? 's' : ''}` : undefined}
      items={lotItems}
      totalMarket={totalMarket}
      totalPaid={totalPaid}
      totalPaidNum={totalPaidNum}
      editingPaid={editingPaid}
      paidInputRef={paidInputRef}
      setTotalPaid={setTotalPaid}
      setEditingPaid={setEditingPaid}
      onPaidBlur={handlePaidBlur}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      renaming={renaming}
      setRenaming={setRenaming}
      renameValue={renameValue}
      setRenameValue={setRenameValue}
      onRename={handleRename}
      onDelete={handleDeleteLot}
      lotName={dbLot.name}
      expandedCards={expandedCards}
      toggleExpanded={toggleExpanded}
      costByCopyId={costByCopyId}
      cardTotalMarket={cardTotalMarket}
      cardTotalCost={cardTotalCost}
      savedCardIds={savedCardIds}
      saving={false}
      onRemoveCard={handleRemoveCard}
      onRemoveCopy={handleRemoveCopy}
      onCopyConditionChange={handleCopyConditionChange}
      onAddCopy={async (cardId) => {
        // Add a new copy to DB directly
        const group = cardGroups.get(cardId)
        if (!group) return
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return
        await supabase.from('collection_items').insert({
          user_id: session.user.id, card_id: cardId, condition: 'near_mint',
          quantity: 1, foil: false, graded: false, cost: null, price_override: null, lot_id: lotId,
        })
        lot.addCopy(cardId)
        void refetch()
      }}
      onSetQuantity={async (cardId, qty) => {
        const group = cardGroups.get(cardId)
        if (!group) return
        const current = group.copies.length
        if (qty > current) {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.user) return
          for (let i = current; i < qty; i++) {
            await supabase.from('collection_items').insert({
              user_id: session.user.id, card_id: cardId, condition: 'near_mint',
              quantity: 1, foil: false, graded: false, cost: null, price_override: null, lot_id: lotId,
            })
          }
        } else if (qty < current) {
          for (let i = current - 1; i >= qty; i--) {
            await deleteItem.mutateAsync(group.copies[i].id)
          }
        }
        void refetch()
      }}
      browseOpen={browseOpen}
      setBrowseOpen={setBrowseOpen}
      onBrowseClose={() => void handleBrowseClose()}
    />
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED SHELL — renders the lot UI given data from either source
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface LotPageShellProps {
  title: string
  subtitle?: string
  items: LotItem[]
  totalMarket: number
  totalPaid: string
  totalPaidNum: number
  editingPaid: boolean
  paidInputRef: React.RefObject<HTMLInputElement | null>
  setTotalPaid: (v: string) => void
  setEditingPaid: (v: boolean) => void
  onPaidBlur: () => void
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
  renaming: boolean
  setRenaming: (v: boolean) => void
  renameValue: string
  setRenameValue: (v: string) => void
  onRename: () => void
  onDelete: () => void
  lotName: string
  expandedCards: Set<string>
  toggleExpanded: (cardId: string) => void
  costByCopyId: Map<string, number | null>
  cardTotalMarket: (cardId: string) => number
  cardTotalCost: (cardId: string) => number | null
  savedCardIds: Map<string, string>
  saving: boolean
  onRemoveCard: (cardId: string) => void
  onRemoveCopy: (cardId: string, copyId: string) => void
  onCopyConditionChange: (cardId: string, copyId: string, condition: Condition) => void
  onAddCopy: (cardId: string) => void
  onSetQuantity: (cardId: string, qty: number) => void
  browseOpen: boolean
  setBrowseOpen: (v: boolean) => void
  onBrowseClose: () => void
}

function LotPageShell(props: LotPageShellProps) {
  const {
    title, subtitle, items, totalMarket, totalPaid, totalPaidNum, editingPaid, paidInputRef,
    setTotalPaid, setEditingPaid, onPaidBlur, menuOpen, setMenuOpen, renaming, setRenaming,
    renameValue, setRenameValue, onRename, onDelete, lotName, expandedCards, toggleExpanded,
    costByCopyId, cardTotalMarket, cardTotalCost, savedCardIds, saving,
    onRemoveCard, onRemoveCopy, onCopyConditionChange, onAddCopy, onSetQuantity,
    browseOpen, setBrowseOpen, onBrowseClose,
  } = props

  const navigate = useNavigate()
  const { fmt } = useCurrency()

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        left={
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center active:opacity-70 flex-shrink-0">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        }
        right={
          <div className="relative">
            <button onClick={() => { setMenuOpen(!menuOpen); setRenaming(false) }} className="w-8 h-8 flex items-center justify-center active:opacity-70">
              <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setMenuOpen(false); setRenaming(false) }} />
                <div className="absolute right-0 top-10 z-50 bg-white border-2 border-black shadow-[3px_3px_0px_#000] w-[260px]">
                  {renaming ? (
                    <div className="p-3">
                      <label className="text-[10px] font-head font-bold text-gray-500 uppercase tracking-wide">Lot Name</label>
                      <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') onRename() }} placeholder="Lot name"
                        className="w-full border-2 border-black px-3 py-2 text-sm font-sans focus:outline-none mt-1 shadow-[2px_2px_0px_#000] focus:shadow-none" />
                      <button onClick={onRename} className="mt-2 w-full py-2 bg-primary border-2 border-black font-head font-bold text-sm shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all">Save</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => { setRenaming(true); setRenameValue(lotName) }}
                        className="w-full text-left px-4 py-2.5 text-sm font-head font-bold hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100">Rename</button>
                      <button onClick={() => void onDelete()}
                        className="w-full text-left px-4 py-2.5 text-sm font-head font-bold text-red-500 hover:bg-red-50 active:bg-red-100">Delete Lot</button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        }
      />

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-20 px-8 text-center">
          <div className="w-16 h-16 border-2 border-black bg-primary flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="font-head font-bold text-lg text-black mb-1">No cards yet</p>
          <p className="text-sm text-gray-500 font-sans mb-6">Search or browse sets to add cards to your lot.</p>
          <button onClick={() => setBrowseOpen(true)}
            className="px-6 py-3 border-2 border-black bg-primary font-head font-bold text-sm shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all">
            Add Cards
          </button>
        </div>
      ) : (
        <>
          {/* Market total + Amount paid */}
          <div className="flex border-b-2 border-black">
            <div className="flex-1 px-4 py-3 border-r-2 border-black">
              <div className="text-[10px] font-head font-bold text-gray-500 uppercase tracking-wide">Market Total</div>
              <div className="font-head font-bold text-lg text-black mt-0.5">{totalMarket > 0 ? fmt(totalMarket) : '—'}</div>
            </div>
            <div className="flex-1 px-4 py-3">
              <div className="text-[10px] font-head font-bold text-gray-500 uppercase tracking-wide">Amount Paid</div>
              {editingPaid ? (
                <div className="relative mt-0.5">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-head font-bold text-black">$</span>
                  <input ref={paidInputRef} type="number" inputMode="decimal" value={totalPaid}
                    onChange={(e) => setTotalPaid(e.target.value)} onBlur={onPaidBlur}
                    onKeyDown={(e) => { if (e.key === 'Enter') paidInputRef.current?.blur() }} autoFocus
                    className="w-full pl-4 text-lg font-head font-bold text-black bg-transparent border-b-2 border-black focus:outline-none py-0" />
                </div>
              ) : (
                <button onClick={() => setEditingPaid(true)} className="flex items-center gap-1.5 mt-0.5 active:opacity-70">
                  <span className="font-head font-bold text-lg text-black">{totalPaidNum > 0 ? fmt(totalPaidNum) : '—'}</span>
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {totalPaidNum > 0 && totalMarket > 0 && (
            <div className="px-4 py-1.5 bg-gray-50 border-b-2 border-black flex items-center justify-between text-xs font-sans">
              <span className="text-gray-500">{totalPaidNum < totalMarket ? 'You saved' : 'You overpaid'}</span>
              <span className={totalPaidNum < totalMarket ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{fmt(Math.abs(totalMarket - totalPaidNum))}</span>
            </div>
          )}

          {saving && <div className="px-4 py-2 bg-primary/30 border-b-2 border-black text-xs font-sans text-center">Saving cards...</div>}

          {/* Card list */}
          <div className="pb-24">
            {items.map(({ card, copies = [] }) => {
              const qty = copies.length
              const expanded = expandedCards.has(card.id) && qty > 1
              const market = cardTotalMarket(card.id)
              const cost = cardTotalCost(card.id)
              const itemId = savedCardIds.get(copies[0]?.id)

              return (
                <div key={card.id} className="border-b-2 border-black bg-white">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => itemId && navigate(`/card/${itemId}`)}
                      className={`w-10 h-14 flex-shrink-0 border-2 border-black ${itemId ? 'active:opacity-70' : 'opacity-70'}`}>
                      <CardImage src={card.images.small} alt={card.name} className="w-full h-full" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => itemId && navigate(`/card/${itemId}`)} className="text-left w-full">
                        <div className="font-head font-bold text-sm text-black truncate">{card.name}</div>
                        <div className="text-xs text-gray-500 font-sans">#{card.number} · {card.set.name}</div>
                      </button>
                      <div className="flex items-center gap-2 mt-1">
                        {qty === 1 && (
                          <select value={copies[0].condition}
                            onChange={(e) => onCopyConditionChange(card.id, copies[0].id, e.target.value as Condition)}
                            className="text-xs border border-gray-200 px-1 py-0.5 font-sans bg-white">
                            {(Object.keys(CONDITION_LABELS) as Condition[]).map(c => <option key={c} value={c}>{CONDITION_LABELS[c]}</option>)}
                          </select>
                        )}
                        {qty > 1 && (
                          <button onClick={() => toggleExpanded(card.id)} className="text-xs text-blue-500 font-sans font-medium active:opacity-70">
                            {expanded ? 'Hide copies' : `${qty} copies — tap to edit`}
                          </button>
                        )}
                        <div className="flex items-center border border-gray-200">
                          <button onClick={() => qty === 1 ? void onRemoveCard(card.id) : onSetQuantity(card.id, qty - 1)}
                            className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-600 active:bg-gray-100">{qty === 1 ? '×' : '−'}</button>
                          <span className="w-6 h-6 flex items-center justify-center text-xs font-bold font-sans border-x border-gray-200">{qty}</span>
                          <button onClick={() => onAddCopy(card.id)}
                            className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-600 active:bg-gray-100">+</button>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {cost != null ? (
                        <><div className="text-sm font-head font-bold text-black">{fmt(cost)}</div>
                        {market > 0 && <div className="text-xs text-gray-400 font-sans line-through">{fmt(market)}</div>}</>
                      ) : market > 0 && <div className="text-sm text-gray-400 font-sans">{fmt(market)}</div>}
                    </div>
                  </div>

                  {expanded && (
                    <div className="bg-gray-50 border-t border-gray-200">
                      {copies.map((copy, i) => {
                        const copyCost = costByCopyId.get(copy.id)
                        return (
                          <div key={copy.id} className="flex items-center gap-3 px-4 py-2 pl-16 border-b border-gray-100 last:border-b-0">
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-xs text-gray-400 font-sans w-5">#{i + 1}</span>
                              <select value={copy.condition} onChange={(e) => onCopyConditionChange(card.id, copy.id, e.target.value as Condition)}
                                className="text-xs border border-gray-200 px-1 py-0.5 font-sans bg-white">
                                {(Object.keys(CONDITION_LABELS) as Condition[]).map(c => <option key={c} value={c}>{CONDITION_LABELS[c]}</option>)}
                              </select>
                            </div>
                            <div className="text-right flex-shrink-0 mr-1">
                              {copyCost != null ? <span className="text-xs font-bold text-black">{fmt(copyCost)}</span> : null}
                            </div>
                            <button onClick={() => void onRemoveCopy(card.id, copy.id)} className="w-5 h-5 flex items-center justify-center text-gray-400 active:text-red-500">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* FAB */}
      {items.length > 0 && !browseOpen && (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <button onClick={() => setBrowseOpen(true)}
            className="px-5 py-3 border-2 border-black bg-primary font-head font-bold text-sm shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all">
            + Add Cards
          </button>
        </div>
      )}

      {browseOpen && <LotBrowseModal onClose={onBrowseClose} onRemoveCard={onRemoveCard} />}
    </>
  )
}
