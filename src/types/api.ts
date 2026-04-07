export interface TCGCardPriceVariant {
  low: number | null
  mid: number | null
  high: number | null
  market: number | null
  directLow: number | null
}

export interface TCGCard {
  id: string
  name: string
  supertype: string
  subtypes?: string[]
  hp?: string
  number: string
  rarity?: string
  set: {
    id: string
    name: string
    series: string
    printedTotal: number
    total: number
    releaseDate: string
    images: { symbol: string; logo: string }
  }
  images: { small: string; large: string }
  tcgplayer?: {
    url: string
    updatedAt: string
    prices?: {
      normal?: TCGCardPriceVariant
      holofoil?: TCGCardPriceVariant
      reverseHolofoil?: TCGCardPriceVariant
      '1stEditionHolofoil'?: TCGCardPriceVariant
      '1stEditionNormal'?: TCGCardPriceVariant
    }
  }
}

export interface TCGSearchResponse {
  data: TCGCard[]
  page: number
  pageSize: number
  count: number
  totalCount: number
}

export interface TCGSet {
  id: string
  name: string
  series: string
  printedTotal: number
  total: number
  releaseDate: string
  images: { symbol: string; logo: string }
}
