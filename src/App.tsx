import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { LotProvider } from '@/contexts/LotContext'
import { AppShell } from '@/components/layout/AppShell'
import { AuthPage } from '@/pages/AuthPage'
import { CollectionPage } from '@/pages/CollectionPage'
import { AddCardPage } from '@/pages/AddCardPage'
import { LotDetailPage } from '@/pages/LotDetailPage'
import { CardDetailPage } from '@/pages/CardDetailPage'
import { StatsPage } from '@/pages/StatsPage'
import { SettingsPage } from '@/pages/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
})

function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    let initialized = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (initialized && (event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
        queryClient.removeQueries()
      }
      if (event === 'INITIAL_SESSION') {
        initialized = true
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <AuthPage />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
      <LotProvider>
      <BrowserRouter>
        <AuthGate>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<CollectionPage />} />
              <Route path="add" element={<AddCardPage />} />
              <Route path="add-lot" element={<LotDetailPage />} />
              <Route path="lot/:id" element={<LotDetailPage />} />
              <Route path="card/:id" element={<CardDetailPage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthGate>
      </BrowserRouter>
      </LotProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  )
}
