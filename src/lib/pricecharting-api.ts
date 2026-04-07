// PriceCharting API — graded card prices (PSA/BGS/CGC)
// API key required: https://www.pricecharting.com/pricecharting-pro
// Prices are returned in cents (e.g. 1732 = $17.32)

const BASE_URL = 'https://www.pricecharting.com/api'
const API_KEY = import.meta.env.VITE_PRICECHARTING_API_KEY as string | undefined

export function isPricechartingEnabled(): boolean {
  return Boolean(API_KEY)
}

export interface PricechartingProduct {
  id: string
  'product-name': string
  'console-name': string
  'loose-price': number       // ungraded (cents)
  'grade-7-price': number
  'grade-8-price': number
  'grade-9-price': number
  'grade-9.5-price': number
  'grade-10-price': number
  status: 'success' | 'error'
}

function centsToUsd(cents: number | undefined): number | null {
  if (!cents || cents <= 0) return null
  return cents / 100
}

export interface GradedPrices {
  pricecharting_id: string
  grade_7: number | null
  grade_8: number | null
  grade_9: number | null
  grade_9_5: number | null
  grade_10: number | null
}

export async function searchPricechartingCard(
  cardName: string,
  setName: string
): Promise<PricechartingProduct | null> {
  if (!API_KEY) return null

  const query = encodeURIComponent(`${cardName} ${setName}`)
  const res = await fetch(
    `${BASE_URL}/products?q=${query}&t=${API_KEY}`,
    { headers: { Accept: 'application/json' } }
  )
  if (!res.ok) return null

  const data = await res.json() as { products?: PricechartingProduct[] }
  const products = data.products ?? []

  // Find best match: prefer exact card name match
  const match = products.find(
    (p) => p['product-name'].toLowerCase().includes(cardName.toLowerCase())
  ) ?? products[0]

  return match ?? null
}

export async function getPricechartingById(id: string): Promise<GradedPrices | null> {
  if (!API_KEY) return null

  const res = await fetch(
    `${BASE_URL}/product?id=${id}&t=${API_KEY}`,
    { headers: { Accept: 'application/json' } }
  )
  if (!res.ok) return null

  const data = await res.json() as PricechartingProduct
  if (data.status !== 'success') return null

  return {
    pricecharting_id: data.id,
    grade_7: centsToUsd(data['grade-7-price']),
    grade_8: centsToUsd(data['grade-8-price']),
    grade_9: centsToUsd(data['grade-9-price']),
    grade_9_5: centsToUsd(data['grade-9.5-price']),
    grade_10: centsToUsd(data['grade-10-price']),
  }
}

export async function fetchGradedPrices(
  cardName: string,
  setName: string
): Promise<GradedPrices | null> {
  if (!API_KEY) return null

  const product = await searchPricechartingCard(cardName, setName)
  if (!product) return null

  return {
    pricecharting_id: product.id,
    grade_7: centsToUsd(product['grade-7-price']),
    grade_8: centsToUsd(product['grade-8-price']),
    grade_9: centsToUsd(product['grade-9-price']),
    grade_9_5: centsToUsd(product['grade-9.5-price']),
    grade_10: centsToUsd(product['grade-10-price']),
  }
}
