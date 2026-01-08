import { Outlet } from 'react-router-dom'
import { TopNav } from './TopNav'
import { BottomNav } from './BottomNav'

export function AppShell() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className="flex-1 container-mobile py-4 sm:py-6 pb-20 md:pb-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
