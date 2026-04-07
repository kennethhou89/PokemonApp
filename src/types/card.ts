export type Condition =
  | 'mint'
  | 'near_mint'
  | 'lightly_played'
  | 'moderately_played'
  | 'heavily_played'
  | 'damaged'

export type GradingCompany = 'PSA' | 'BGS' | 'CGC'

export const GRADING_COMPANIES: GradingCompany[] = ['PSA', 'BGS', 'CGC']

export const GRADE_OPTIONS = [10, 9.5, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const

export const CONDITION_LABELS: Record<Condition, string> = {
  mint: 'Mint',
  near_mint: 'Near Mint',
  lightly_played: 'Lightly Played',
  moderately_played: 'Moderately Played',
  heavily_played: 'Heavily Played',
  damaged: 'Damaged',
}

export const CONDITION_MULTIPLIERS: Record<Condition, number> = {
  mint: 1.0,
  near_mint: 0.9,
  lightly_played: 0.75,
  moderately_played: 0.6,
  heavily_played: 0.4,
  damaged: 0.25,
}

export const CONDITION_COLORS: Record<Condition, string> = {
  mint: 'bg-emerald-100 text-emerald-800',
  near_mint: 'bg-green-100 text-green-800',
  lightly_played: 'bg-yellow-100 text-yellow-800',
  moderately_played: 'bg-orange-100 text-orange-800',
  heavily_played: 'bg-red-100 text-red-800',
  damaged: 'bg-gray-100 text-gray-800',
}

export interface Card {
  id: string
  name: string
  set_id: string
  set_name: string
  number: string
  rarity: string | null
  supertype: string | null
  subtypes: string[] | null
  image_small: string | null
  image_large: string | null
  hp: string | null
  last_fetched: string
}

export interface Price {
  card_id: string
  market: number | null
  low: number | null
  mid: number | null
  high: number | null
  updated_at: string
  // Graded prices from PriceCharting
  grade_7: number | null
  grade_8: number | null
  grade_9: number | null
  grade_9_5: number | null
  grade_10: number | null
  pricecharting_id: string | null
}

export interface CollectionItem {
  id: string
  user_id: string
  card_id: string
  condition: Condition
  quantity: number
  foil: boolean
  notes: string | null
  added_at: string
  updated_at: string
  // Grading
  graded: boolean
  grading_company: GradingCompany | null
  grade: number | null
  cert_number: string | null
  // Pricing
  cost: number | null           // what the user paid
  price_override: number | null // manual market price (replaces API when set)
  // Photos
  user_photos: string[]         // storage paths in card-photos bucket
  // Lot
  lot_id: string | null
}

export interface CollectionItemWithCard extends CollectionItem {
  card: Card
  price: Price | null
}

export function estimatedValue(
  price: Price | null,
  condition: Condition,
  graded = false,
  grade: number | null = null,
  priceOverride: number | null = null
): number | null {
  // Manual override replaces API market price, same multiplier logic
  const market = priceOverride ?? price?.market ?? null
  if (graded && grade !== null) {
    // For graded + override: use override directly (it IS the graded value)
    if (priceOverride != null) return priceOverride
    return gradedValue(price, grade)
  }
  if (!market) return null
  return market * CONDITION_MULTIPLIERS[condition]
}

export function gradedValue(price: Price | null, grade: number): number | null {
  if (!price) return null
  if (grade === 10 && price.grade_10) return price.grade_10
  if (grade === 9.5 && price.grade_9_5) return price.grade_9_5
  if (grade >= 9 && price.grade_9) return price.grade_9
  if (grade >= 8 && price.grade_8) return price.grade_8
  if (grade >= 7 && price.grade_7) return price.grade_7
  // Fallback: use market price with rough multiplier
  if (!price.market) return null
  if (grade === 10) return price.market * 3
  if (grade >= 9) return price.market * 1.5
  if (grade >= 8) return price.market * 1.2
  return price.market
}
