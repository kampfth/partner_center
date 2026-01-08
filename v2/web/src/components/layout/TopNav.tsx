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
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/groups', label: 'Groups', icon: FolderTree },
  { path: '/imports', label: 'Imports', icon: Upload },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
]

export function TopNav() {
  const location = useLocation()

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container-mobile flex h-14 items-center">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-bold text-primary-foreground tracking-tight">
              PC
            </span>
          </div>
          <span className="text-base font-semibold text-foreground hidden sm:block">
            Partner Center
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 ml-8">
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
                  'flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'text-foreground bg-secondary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* Mobile: current page name */}
        <div className="md:hidden ml-auto">
          <span className="text-sm font-medium text-muted-foreground">
            {navItems.find((item) =>
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)
            )?.label || 'Dashboard'}
          </span>
        </div>
      </div>
    </header>
  )
}
