import type { TCGCard, TCGSearchResponse, TCGSet } from '@/types/api'

const BASE_URL = 'https://api.pokemontcg.io/v2'
const API_KEY = import.meta.env.VITE_POKEMON_TCG_API_KEY as string | undefined

function headers(): HeadersInit {
  return API_KEY ? { 'X-Api-Key': API_KEY } : {}
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: headers() })
  if (!res.ok) throw new Error(`Pokemon TCG API error: ${res.status}`)
  return res.json() as Promise<T>
}

function buildSearchQuery(input: string): string {
  const tokens = input.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 1) {
    return `name:"${tokens[0]}*"`
  }
  return tokens.map((t) => `name:${t}*`).join(' ')
}

export async function searchCards(query: string, page = 1): Promise<TCGSearchResponse> {
  const q = encodeURIComponent(buildSearchQuery(query))
  return request<TCGSearchResponse>(`/cards?q=${q}&page=${page}&pageSize=20&orderBy=name`)
}

export async function searchBySet(setId: string, page = 1): Promise<TCGSearchResponse> {
  const q = encodeURIComponent(`set.id:${setId}`)
  return request<TCGSearchResponse>(`/cards?q=${q}&page=${page}&pageSize=36&orderBy=number`)
}

export async function getCard(id: string): Promise<TCGCard> {
  const res = await request<{ data: TCGCard }>(`/cards/${id}`)
  return res.data
}

export async function getCardsByIds(ids: string[]): Promise<TCGCard[]> {
  if (ids.length === 0) return []
  const q = encodeURIComponent(`id:${ids.join(' OR id:')}`)
  const res = await request<TCGSearchResponse>(`/cards?q=${q}&pageSize=${ids.length}`)
  return res.data
}

export async function searchByNameAndNumber(name: string, number: string): Promise<TCGSearchResponse> {
  const firstName = name.trim().split(/[\s-]/)[0].toLowerCase()
  const cardNum = number.split('/')[0] // handle "100/108" format
  const q = encodeURIComponent(`name:${firstName}* number:${cardNum}`)
  return request<TCGSearchResponse>(`/cards?q=${q}&pageSize=10&orderBy=releaseDate`)
}

export async function getSets(): Promise<TCGSet[]> {
  const res = await request<{ data: TCGSet[] }>('/sets?orderBy=-releaseDate')
  return res.data
}

export function extractBestPrice(card: TCGCard): {
  market: number | null
  low: number | null
  mid: number | null
  high: number | null
} {
  const prices = card.tcgplayer?.prices
  if (!prices) return { market: null, low: null, mid: null, high: null }
  const variant =
    prices.holofoil ??
    prices.normal ??
    prices['1stEditionHolofoil'] ??
    prices['1stEditionNormal'] ??
    prices.reverseHolofoil

  if (!variant) return { market: null, low: null, mid: null, high: null }
  return {
    market: variant.market ?? null,
    low: variant.low ?? null,
    mid: variant.mid ?? null,
    high: variant.high ?? null,
  }
}
