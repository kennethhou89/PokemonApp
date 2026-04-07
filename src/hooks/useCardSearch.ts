import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchCards } from '@/lib/pokemon-tcg-api'
import type { TCGCard } from '@/types/api'

export function useCardSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    if (!query.trim()) {
      setDebouncedQuery('')
      return
    }
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  const isDebouncing = query.trim() !== debouncedQuery

  const result = useQuery<TCGCard[]>({
    queryKey: ['card-search', debouncedQuery],
    queryFn: async () => {
      const res = await searchCards(debouncedQuery)
      return res.data
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  })

  return {
    ...result,
    isLoading: result.isLoading || result.isFetching || isDebouncing,
  }
}
