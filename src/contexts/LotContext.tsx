import { createContext, useContext, useState, useCallback } from 'react'
import type { TCGCard } from '@/types/api'
import type { Condition } from '@/types/card'

export interface LotCopy {
  id: string
  condition: Condition
}

export interface LotItem {
  card: TCGCard
  copies: LotCopy[]
}

function newCopy(): LotCopy {
  return { id: crypto.randomUUID(), condition: 'near_mint' }
}

interface LotContextValue {
  isActive: boolean
  lotId: string | null
  lotName: string
  items: LotItem[]
  startLot: () => void
  setLotId: (id: string) => void
  setLotName: (name: string) => void
  hydrate: (id: string, name: string, items: LotItem[]) => void
  addCard: (card: TCGCard) => void
  removeCard: (cardId: string) => void
  isInLot: (cardId: string) => boolean
  toggleCard: (card: TCGCard) => void
  addCopy: (cardId: string) => void
  removeCopy: (cardId: string, copyId: string) => void
  updateCopyCondition: (cardId: string, copyId: string, condition: Condition) => void
  setQuantity: (cardId: string, qty: number) => void
  clearLot: () => void
}

const LotContext = createContext<LotContextValue>({
  isActive: false,
  lotId: null,
  lotName: '',
  items: [],
  startLot: () => {},
  setLotId: () => {},
  setLotName: () => {},
  hydrate: () => {},
  addCard: () => {},
  removeCard: () => {},
  isInLot: () => false,
  toggleCard: () => {},
  addCopy: () => {},
  removeCopy: () => {},
  updateCopyCondition: () => {},
  setQuantity: () => {},
  clearLot: () => {},
})

export function LotProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [lotId, setLotIdState] = useState<string | null>(null)
  const [lotName, setLotNameState] = useState('')
  const [items, setItems] = useState<LotItem[]>([])

  const startLot = useCallback(() => {
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    setLotNameState(`Lot — ${date}`)
    setLotIdState(null)
    setItems([])
    setIsActive(true)
  }, [])

  const setLotId = useCallback((id: string) => { setLotIdState(id) }, [])
  const setLotName = useCallback((name: string) => { setLotNameState(name) }, [])

  const hydrate = useCallback((id: string, name: string, hydrateItems: LotItem[]) => {
    setIsActive(true)
    setLotIdState(id)
    setLotNameState(name)
    setItems(hydrateItems)
  }, [])

  const addCard = useCallback((card: TCGCard) => {
    setItems(prev => {
      if (prev.some(lc => lc.card.id === card.id)) return prev
      return [...prev, { card, copies: [newCopy()] }]
    })
  }, [])

  const removeCard = useCallback((cardId: string) => {
    setItems(prev => prev.filter(lc => lc.card.id !== cardId))
  }, [])

  const isInLot = useCallback((cardId: string) => {
    return items.some(lc => lc.card.id === cardId)
  }, [items])

  const toggleCard = useCallback((card: TCGCard) => {
    setItems(prev =>
      prev.some(lc => lc.card.id === card.id)
        ? prev.filter(lc => lc.card.id !== card.id)
        : [...prev, { card, copies: [newCopy()] }]
    )
  }, [])

  const addCopy = useCallback((cardId: string) => {
    setItems(prev => prev.map(lc =>
      lc.card.id === cardId ? { ...lc, copies: [...lc.copies, newCopy()] } : lc
    ))
  }, [])

  const removeCopy = useCallback((cardId: string, copyId: string) => {
    setItems(prev => {
      const updated = prev.map(lc => {
        if (lc.card.id !== cardId) return lc
        const copies = lc.copies.filter(c => c.id !== copyId)
        return { ...lc, copies }
      })
      // Remove card entirely if no copies left
      return updated.filter(lc => lc.copies.length > 0)
    })
  }, [])

  const updateCopyCondition = useCallback((cardId: string, copyId: string, condition: Condition) => {
    setItems(prev => prev.map(lc =>
      lc.card.id === cardId
        ? { ...lc, copies: lc.copies.map(c => c.id === copyId ? { ...c, condition } : c) }
        : lc
    ))
  }, [])

  const setQuantity = useCallback((cardId: string, qty: number) => {
    if (qty < 1) return
    setItems(prev => {
      const updated = prev.map(lc => {
        if (lc.card.id !== cardId) return lc
        const current = lc.copies.length
        if (qty === current) return lc
        if (qty > current) {
          const newCopies = Array.from({ length: qty - current }, () => newCopy())
          return { ...lc, copies: [...lc.copies, ...newCopies] }
        }
        // Remove from the end
        return { ...lc, copies: lc.copies.slice(0, qty) }
      })
      return updated.filter(lc => lc.copies.length > 0)
    })
  }, [])

  const clearLot = useCallback(() => {
    setIsActive(false)
    setLotIdState(null)
    setLotNameState('')
    setItems([])
  }, [])

  return (
    <LotContext.Provider value={{ isActive, lotId, lotName, items, startLot, setLotId, setLotName, hydrate, addCard, removeCard, isInLot, toggleCard, addCopy, removeCopy, updateCopyCondition, setQuantity, clearLot }}>
      {children}
    </LotContext.Provider>
  )
}

export function useLot() {
  return useContext(LotContext)
}
