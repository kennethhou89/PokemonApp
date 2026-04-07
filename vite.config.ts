import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Pokemon Card Inventory',
          short_name: 'PokeCards',
          description: 'Track and value your Pokemon card collection',
          theme_color: '#ef4444',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/images\.pokemontcg\.io\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'pokemon-images',
                expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
              },
            },
          ],
        },
      }),
      // PSA proxy middleware — runs on Node.js server side, avoids browser CORS.
      // Token is read from .env here and never exposed to the browser.
      {
        name: 'psa-proxy',
        configureServer(server) {
          server.middlewares.use('/api/psa', async (req, res) => {
            const token = env.VITE_PSA_API_TOKEN
            if (!token) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'VITE_PSA_API_TOKEN not set in .env' }))
              return
            }
            try {
              const psaUrl = `https://api.psacard.com/publicapi${req.url ?? ''}`
              const upstream = await fetch(psaUrl, {
                headers: {
                  Authorization: `bearer ${token}`,
                  Accept: 'application/json',
                },
              })
              const body = await upstream.text()
              res.writeHead(upstream.status, { 'Content-Type': 'application/json' })
              res.end(body)
            } catch (e) {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: String(e) }))
            }
          })
        },
      },
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
  }
})
