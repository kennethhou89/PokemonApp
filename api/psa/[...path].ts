import type { VercelRequest, VercelResponse } from '@vercel/node'

const PSA_BASE = 'https://api.psacard.com/publicapi'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const token = process.env.PSA_API_TOKEN
  if (!token) {
    return res.status(500).json({ error: 'PSA_API_TOKEN not configured' })
  }

  // req.query.path is the catch-all segments, e.g. ["cert","GetByCertNumber","134870673"]
  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path]
  const psaPath = '/' + segments.join('/')

  try {
    const upstream = await fetch(`${PSA_BASE}${psaPath}`, {
      headers: {
        Authorization: `bearer ${token}`,
        Accept: 'application/json',
      },
    })
    const body = await upstream.text()
    res.status(upstream.status).setHeader('Content-Type', 'application/json').end(body)
  } catch (e) {
    res.status(502).json({ error: String(e) })
  }
}
