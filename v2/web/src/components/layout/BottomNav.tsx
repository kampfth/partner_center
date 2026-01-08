import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Upload,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/groups', label: 'Groups', icon: FolderTree },
  { path: '/imports', label: 'Imports', icon: Upload },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 backdrop-blur-xl md:hidden pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[52px] touch-target transition-all duration-150',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isActive && 'font-semibold'
                )}
              >
                {item.label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
