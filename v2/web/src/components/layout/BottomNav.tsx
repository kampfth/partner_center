import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Shield, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/graphics', label: 'Graphics', icon: BarChart3 },
  { path: '/balance', label: 'Balance', icon: Wallet },
  { path: '/admin', label: 'Admin', icon: Shield },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 backdrop-blur-xl md:hidden pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path) && item.path !== '/';
          const isDashboardActive = item.path === '/' && location.pathname === '/';
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[56px] touch-target transition-all duration-150',
                (isActive || isDashboardActive)
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={(isActive || isDashboardActive) ? 2 : 1.5}
              />
              <span className={cn(
                'text-[10px] font-medium',
                (isActive || isDashboardActive) && 'font-semibold'
              )}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
