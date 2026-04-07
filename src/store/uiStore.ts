import { create } from 'zustand'
import type { Condition } from '@/types/card'

interface FilterState {
  search: string
  conditions: Condition[]
  setId: string | null
  sortBy: 'name' | 'value' | 'date_added' | 'quantity'
  sortDir: 'asc' | 'desc'
}

export type CollectionTab = 'cards' | 'lots'

interface UIStore {
  collectionTab: CollectionTab
  setCollectionTab: (tab: CollectionTab) => void
  filters: FilterState
  setSearch: (s: string) => void
  setConditions: (c: Condition[]) => void
  setSetId: (id: string | null) => void
  setSortBy: (s: FilterState['sortBy']) => void
  setSortDir: (d: FilterState['sortDir']) => void
  resetFilters: () => void
}

const defaultFilters: FilterState = {
  search: '',
  conditions: [],
  setId: null,
  sortBy: 'date_added',
  sortDir: 'desc',
}

export const useUIStore = create<UIStore>((set) => ({
  collectionTab: 'cards' as CollectionTab,
  setCollectionTab: (collectionTab) => set({ collectionTab }),
  filters: defaultFilters,
  setSearch: (search) => set((s) => ({ filters: { ...s.filters, search } })),
  setConditions: (conditions) => set((s) => ({ filters: { ...s.filters, conditions } })),
  setSetId: (setId) => set((s) => ({ filters: { ...s.filters, setId } })),
  setSortBy: (sortBy) => set((s) => ({ filters: { ...s.filters, sortBy } })),
  setSortDir: (sortDir) => set((s) => ({ filters: { ...s.filters, sortDir } })),
  resetFilters: () => set({ filters: defaultFilters }),
}))
