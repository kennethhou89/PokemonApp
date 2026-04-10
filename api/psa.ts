const PSA_BASE = 'https://api.psacard.com/publicapi'

export async function GET(request: Request) {
  const token = process.env.PSA_API_TOKEN
  if (!token) {
    return Response.json({ error: 'PSA_API_TOKEN not configured' }, { status: 500 })
  }

  const url = new URL(request.url)
  const psaPath = url.searchParams.get('path')
  if (!psaPath) {
    return Response.json({ error: 'Missing path parameter' }, { status: 400 })
  }

  try {
    const upstream = await fetch(`${PSA_BASE}${psaPath}`, {
      headers: {
        Authorization: `bearer ${token}`,
        Accept: 'application/json',
      },
    })
    const body = await upstream.text()
    return new Response(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 })
  }
}
