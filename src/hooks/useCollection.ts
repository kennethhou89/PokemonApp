import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CollectionItemWithCard, Condition, GradingCompany } from '@/types/card'

export function useCollection() {
  return useQuery({
    queryKey: ['collection'],
    queryFn: async (): Promise<CollectionItemWithCard[]> => {
      const { data: items, error } = await supabase
        .from('collection_items')
        .select('*, card:cards(*)')
        .order('added_at', { ascending: false })

      if (error) throw error
      if (!items || items.length === 0) return []

      const cardIds = [...new Set(items.map((i) => i.card_id as string))]
      const { data: prices } = await supabase
        .from('prices')
        .select('*')
        .in('card_id', cardIds)

      const priceMap = new Map((prices ?? []).map((p) => [p.card_id as string, p]))

      return items.map((item) => ({
        ...item,
        price: priceMap.get(item.card_id as string) ?? null,
      })) as CollectionItemWithCard[]
    },
  })
}

async function getCurrentUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error('Not authenticated — please sign in again')
  return session.user.id
}

export function useAddCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      cardId,
      condition,
      quantity,
      foil,
      notes,
      graded,
      grading_company,
      grade,
      cert_number,
      cost,
      price_override,
      lot_id,
      cardData,
    }: {
      cardId: string
      condition: Condition
      quantity: number
      foil: boolean
      notes: string
      graded: boolean
      grading_company: GradingCompany | null
      grade: number | null
      cert_number: string | null
      cost: number | null
      price_override: number | null
      lot_id?: string | null
      cardData: {
        id: string
        name: string
        set_id: string
        set_name: string
        number: string
        rarity?: string | null
        supertype?: string | null
        subtypes?: string[] | null
        image_small?: string | null
        image_large?: string | null
        hp?: string | null
      }
    }) => {
      // Upsert card metadata
      await supabase.from('cards').upsert(
        {
          id: cardData.id,
          name: cardData.name,
          set_id: cardData.set_id,
          set_name: cardData.set_name,
          number: cardData.number,
          rarity: cardData.rarity ?? null,
          supertype: cardData.supertype ?? null,
          subtypes: cardData.subtypes ?? null,
          image_small: cardData.image_small ?? null,
          image_large: cardData.image_large ?? null,
          hp: cardData.hp ?? null,
          last_fetched: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

      const userId = await getCurrentUserId()

      // Graded cards get their own row (no upsert merging by condition)
      if (graded) {
        const { data, error } = await supabase.from('collection_items').insert({
          user_id: userId,
          card_id: cardId,
          condition,
          quantity,
          foil,
          notes: notes || null,
          graded: true,
          grading_company,
          grade,
          cert_number: cert_number || null,
          cost: cost ?? null,
          price_override: price_override ?? null,
          lot_id: lot_id ?? null,
        }).select('id').single()
        if (error) throw error
        return data.id as string
      } else {
        // Ungraded: upsert by card+condition, increment qty
        const { data: existing } = await supabase
          .from('collection_items')
          .select('id, quantity, lot_id')
          .eq('user_id', userId)
          .eq('card_id', cardId)
          .eq('condition', condition)
          .eq('graded', false)
          .maybeSingle()

        if (existing) {
          const { error } = await supabase
            .from('collection_items')
            .update({
              quantity: existing.quantity + quantity,
              notes: notes || null,
              foil,
              cost: cost ?? null,
              price_override: price_override ?? null,
              lot_id: lot_id ?? existing.lot_id ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
          if (error) throw error
          return existing.id as string
        } else {
          const { data, error } = await supabase.from('collection_items').insert({
            user_id: userId,
            card_id: cardId,
            condition,
            quantity,
            foil,
            notes: notes || null,
            graded: false,
            cost: cost ?? null,
            price_override: price_override ?? null,
            lot_id: lot_id ?? null,
          }).select('id').single()
          if (error) throw error
          return data.id as string
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}

export function useUpdateCollectionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<{
        quantity: number
        condition: Condition
        notes: string
        foil: boolean
        graded: boolean
        grading_company: GradingCompany | null
        grade: number | null
        cert_number: string | null
        cost: number | null
        price_override: number | null
        user_photos: string[]
      }>
    }) => {
      const { error } = await supabase
        .from('collection_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}

export function useDeleteCollectionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('collection_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}
