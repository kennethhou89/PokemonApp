// PSA Public API — cert lookup
// Token: free registration at https://www.psacard.com/publicapi
// Rate limit: 100 calls/day (free tier)

export interface PSACert {
  CertNumber: string
  Year: string
  Brand: string
  Category: string
  CardNumber: string      // e.g. "4/102" or "4"
  Subject: string         // card name, e.g. "Charizard"
  Variety: string         // e.g. "Holo" or ""
  GradeDescription: string // e.g. "GEM MT 10" or "NM-MT 8"
  CardGrade: string        // e.g. "GEM MT 10", "NM-MT 8", "EX-MT 6"
  IsDualCert: boolean
  IsPSADNA: boolean
  SpecNumber: string
  LabelType: string
  TotalPopulation: number
  TotalPopulationWithQualifier: number
  PopulationHigher: number
}

interface PSACertResponse {
  PSACert: PSACert | null
}

export function isPSAEnabled(): boolean {
  return !!import.meta.env.VITE_PSA_API_TOKEN
}

// In dev: Vite proxies /api/psa → https://api.psacard.com/publicapi (avoids CORS)
// In prod: Vercel serverless function at /api/psa proxies server-side
function psaUrl(path: string): string {
  return `/api/psa${path}`
}

export async function lookupPSACert(certNumber: string): Promise<PSACert | null> {
  if (!isPSAEnabled()) {
    throw new Error('PSA API token not configured — add VITE_PSA_API_TOKEN to .env')
  }

  // Strip spaces/dashes — PSA cert numbers are numeric
  const cleaned = certNumber.trim().replace(/[\s-]/g, '')
  if (!cleaned) throw new Error('Enter a valid PSA cert number')

  const res = await fetch(psaUrl(`/cert/GetByCertNumber/${cleaned}`), {
    headers: { Accept: 'application/json' },
  })

  if (res.status === 204) throw new Error('Cert number is required')
  if (res.status === 401) throw new Error('Invalid PSA API token — check VITE_PSA_API_TOKEN')
  if (res.status === 404) throw new Error('not_found')
  if (!res.ok) throw new Error('lookup_failed')

  const data: PSACertResponse = await res.json()

  if (!data.PSACert) return null

  return data.PSACert
}

export interface PSACertImages {
  frontUrl: string | null
  backUrl: string | null
}

/** Fetch the slab photo(s) for a cert. Never throws — returns nulls on any failure. */
export async function getCertImages(certNumber: string): Promise<PSACertImages> {
  const cleaned = certNumber.trim().replace(/[\s-]/g, '')
  try {
    const res = await fetch(psaUrl(`/cert/GetImagesByCertNumber/${cleaned}`), {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return { frontUrl: null, backUrl: null }
    const data = await res.json()

    // Shape 1: object with named URL fields
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const front = data.FrontImageURL ?? data.frontImageUrl ?? null
      const back = data.BackImageURL ?? data.backImageUrl ?? null
      if (front || back) return { frontUrl: front, backUrl: back }
    }
    // Shape 2: array of { ImageURL, IsFrontImage } or { ImageURL, ImageSide }
    if (Array.isArray(data)) {
      const front = data.find((i: { IsFrontImage?: boolean; ImageSide?: string }) =>
        i.IsFrontImage === true || i.ImageSide?.toLowerCase() === 'front'
      )
      const back = data.find((i: { IsFrontImage?: boolean; ImageSide?: string }) =>
        i.IsFrontImage === false || i.ImageSide?.toLowerCase() === 'back'
      )
      return { frontUrl: front?.ImageURL ?? null, backUrl: back?.ImageURL ?? null }
    }
    return { frontUrl: null, backUrl: null }
  } catch {
    return { frontUrl: null, backUrl: null }
  }
}

/**
 * Parse PSA grade string to number.
 * CardGrade comes as e.g. "GEM MT 10", "NM-MT 8", "EX-MT 6", "MINT 9" — extract trailing number.
 * Returns null for non-numeric grades like "Auth".
 */
export function parsePSAGrade(cardGrade: string): number | null {
  const match = /(\d+(?:\.\d+)?)$/.exec(cardGrade.trim())
  if (!match) return null
  const n = parseFloat(match[1])
  return isNaN(n) ? null : n
}
