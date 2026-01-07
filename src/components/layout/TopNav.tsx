import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Shield, FileBarChart, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/admin', label: 'Admin', icon: Shield },
  { path: '/report', label: 'Report', icon: FileBarChart },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function TopNav() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container-mobile flex h-14 items-center">
        {/* Logo - minimal */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
            <span className="text-xs font-semibold text-background tracking-tight">EK</span>
          </div>
          <span className="text-base font-semibold text-foreground hidden sm:block">Partner</span>
        </div>

        {/* Desktop Navigation - minimal */}
        <nav className="hidden md:flex items-center gap-1 ml-8">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'text-foreground bg-secondary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Mobile: current page */}
        <div className="md:hidden ml-auto">
          <span className="text-sm font-medium text-muted-foreground">
            {navItems.find(item => item.path === location.pathname)?.label}
          </span>
        </div>
      </div>
    </header>
  );
}