import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CollectionItemWithCard } from '@/types/card'

export interface LotRow {
  id: string
  user_id: string
  name: string
  total_paid: number | null
  created_at: string
  card_count: number
  card_images: string[]
}

export interface LotDetail {
  id: string
  name: string
  total_paid: number | null
  created_at: string
  items: CollectionItemWithCard[]
}

async function getCurrentUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error('Not authenticated')
  return session.user.id
}

export function useLots() {
  return useQuery({
    queryKey: ['lots'],
    queryFn: async (): Promise<LotRow[]> => {
      const userId = await getCurrentUserId()

      // Fetch lots
      const { data: lots, error } = await supabase
        .from('lots')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!lots || lots.length === 0) return []

      // Get card data per lot (counts + images)
      const lotIds = lots.map(l => l.id as string)
      const { data: items } = await supabase
        .from('collection_items')
        .select('lot_id, card:cards(image_small)')
        .in('lot_id', lotIds)

      const countMap = new Map<string, number>()
      const imageMap = new Map<string, string[]>()
      ;(items ?? []).forEach(row => {
        const lid = row.lot_id as string
        countMap.set(lid, (countMap.get(lid) ?? 0) + 1)
        const img = (row.card as unknown as { image_small: string | null } | null)?.image_small
        if (img) {
          const imgs = imageMap.get(lid) ?? []
          if (imgs.length < 6) imgs.push(img)
          imageMap.set(lid, imgs)
        }
      })

      return lots.map(lot => ({
        id: lot.id as string,
        user_id: lot.user_id as string,
        name: lot.name as string,
        total_paid: lot.total_paid as number | null,
        created_at: lot.created_at as string,
        card_count: countMap.get(lot.id as string) ?? 0,
        card_images: imageMap.get(lot.id as string) ?? [],
      }))
    },
  })
}

export function useLotDetail(lotId: string | undefined) {
  return useQuery({
    queryKey: ['lot', lotId],
    enabled: !!lotId,
    queryFn: async (): Promise<LotDetail | null> => {
      if (!lotId) return null

      const { data: lot, error: lotError } = await supabase
        .from('lots')
        .select('*')
        .eq('id', lotId)
        .maybeSingle()

      if (lotError) throw lotError
      if (!lot) return null

      const { data: items, error: itemsError } = await supabase
        .from('collection_items')
        .select('*, card:cards(*)')
        .eq('lot_id', lotId)
        .order('added_at', { ascending: true })

      if (itemsError) throw itemsError

      // Fetch prices for these cards
      const cardIds = [...new Set((items ?? []).map(i => i.card_id as string))]
      const { data: prices } = cardIds.length > 0
        ? await supabase.from('prices').select('*').in('card_id', cardIds)
        : { data: [] }

      const priceMap = new Map((prices ?? []).map(p => [p.card_id as string, p]))

      return {
        id: lot.id as string,
        name: lot.name as string,
        total_paid: lot.total_paid as number | null,
        created_at: lot.created_at as string,
        items: (items ?? []).map(item => ({
          ...item,
          price: priceMap.get(item.card_id as string) ?? null,
        })) as CollectionItemWithCard[],
      }
    },
  })
}

export function useCreateLot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, totalPaid }: { name: string; totalPaid: number | null }): Promise<string> => {
      const userId = await getCurrentUserId()

      const { data, error } = await supabase
        .from('lots')
        .insert({ user_id: userId, name, total_paid: totalPaid })
        .select('id')
        .single()

      if (error) throw error
      return data.id as string
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lots'] })
    },
  })
}

export function useUpdateLot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ lotId, updates }: { lotId: string; updates: Partial<{ name: string; total_paid: number | null }> }) => {
      const { error } = await supabase
        .from('lots')
        .update(updates)
        .eq('id', lotId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lots'] })
    },
  })
}

export function useDeleteLot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lotId: string) => {
      const { error } = await supabase.from('lots').delete().eq('id', lotId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lots'] })
      void queryClient.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}
