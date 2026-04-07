import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { usePriceRefresh } from '@/hooks/usePriceRefresh'

export function AppShell() {
  usePriceRefresh()
  const { pathname } = useLocation()
  const hideNav = pathname.startsWith('/add-lot') || pathname.startsWith('/lot/')

  return (
    <div className="flex flex-col h-full">
      <main className={`flex-1 overflow-y-auto ${hideNav ? 'pb-0' : 'pb-20'}`}>
        <Outlet />
      </main>
      {!hideNav && <BottomNav />}
    </div>
  )
}
