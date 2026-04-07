// Supabase Edge Function — PSA API proxy
// Forwards requests to api.psacard.com server-side, avoiding browser CORS restrictions.
//
// Deploy: supabase functions deploy psa-proxy
// Set secret: supabase secrets set PSA_API_TOKEN=your_token_here

const PSA_BASE = 'https://api.psacard.com/publicapi'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const token = Deno.env.get('PSA_API_TOKEN')
    if (!token) {
      return new Response(JSON.stringify({ error: 'PSA_API_TOKEN not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Strip the function prefix from the path, forward the rest to PSA
    const url = new URL(req.url)
    // Path will be like /psa-proxy/cert/GetByCertNumber/12345678
    // We want: /cert/GetByCertNumber/12345678
    const psaPath = url.pathname.replace(/^\/functions\/v1\/psa-proxy/, '')

    const psaRes = await fetch(`${PSA_BASE}${psaPath}${url.search}`, {
      method: req.method,
      headers: {
        Authorization: `bearer ${token}`,
        Accept: 'application/json',
      },
    })

    const body = await psaRes.text()

    return new Response(body, {
      status: psaRes.status,
      headers: {
        ...corsHeaders,
        'Content-Type': psaRes.headers.get('Content-Type') ?? 'application/json',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
