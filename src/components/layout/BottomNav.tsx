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

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 backdrop-blur-xl md:hidden pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[56px] touch-target transition-all duration-150',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span className={cn(
                'text-[10px] font-medium',
                isActive && 'font-semibold'
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