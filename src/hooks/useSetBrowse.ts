import { useQuery } from '@tanstack/react-query'
import { getSets, searchBySet } from '@/lib/pokemon-tcg-api'
import type { TCGCard, TCGSet } from '@/types/api'

export function useSets() {
  return useQuery<TCGSet[]>({
    queryKey: ['sets'],
    queryFn: getSets,
    staleTime: 30 * 60 * 1000, // 30 minutes — sets rarely change
  })
}

export function useSetCards(setId: string | null) {
  return useQuery<TCGCard[]>({
    queryKey: ['set-cards', setId],
    queryFn: async () => {
      const res = await searchBySet(setId!)
      return res.data
    },
    enabled: setId !== null,
    staleTime: 5 * 60 * 1000,
  })
}
