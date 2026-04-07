# Setup Guide

## 1. Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account + new project
2. In the Supabase dashboard → **SQL Editor**, paste and run the contents of `supabase/migrations/001_initial_schema.sql`
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

## 2. Pokemon TCG API (optional but recommended)

1. Go to [pokemontcg.io](https://pokemontcg.io) and sign up for a free API key
2. Copy the key → `VITE_POKEMON_TCG_API_KEY`
   - Without a key it still works, but is rate-limited to 20k requests/day (shared)

## 3. Local development

```bash
cp .env.example .env
# Fill in the values from steps 1 and 2
npm install
npm run dev
```

Visit `http://localhost:5173` and sign in with a magic link email.

## 4. Deploy to Vercel (free)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo
3. In **Environment Variables**, add the three `VITE_*` values from your `.env`
4. Deploy — Vercel gives you a URL like `https://pokecards-xyz.vercel.app`
5. Share that URL with your friend. On mobile Chrome they'll see "Add to Home Screen" to install it like a native app.

## Notes

- Supabase free tier **pauses after 1 week of inactivity**. To prevent this, upgrade to Supabase Pro ($25/mo) or set up a weekly GitHub Actions cron that pings the project URL.
- Prices auto-refresh every 24 hours when the app is opened. You can also manually refresh from Settings.
- The barcode scanner uses your phone's camera to pre-fill a card search (works best with booster pack barcodes).
