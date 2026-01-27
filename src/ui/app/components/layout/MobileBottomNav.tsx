import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Terminal, Settings, WifiOff } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { haptics } from '../../lib/haptics';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: typeof Home;
  matchPaths?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', path: '/', icon: Home },
  { id: 'terminal', label: 'Terminal', path: '/terminal', icon: Terminal },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, matchPaths: ['/settings'] },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();

  const isActive = (item: NavItem) => {
    if (item.path === location.pathname) return true;
    if (item.matchPaths) {
      return item.matchPaths.some((p) => location.pathname.startsWith(p));
    }
    return false;
  };

  const handleNavClick = (item: NavItem) => {
    haptics.light();
    navigate(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sm:hidden">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-1.5 bg-yellow-500/10 py-1 text-xs text-yellow-500">
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
        </div>
      )}

      <div className="flex items-center justify-around pb-safe pt-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={cn(
                'relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1 transition-colors',
                active
                  ? 'text-blue-500 dark:text-blue-400'
                  : 'text-zinc-500 dark:text-zinc-400 active:text-zinc-700 dark:active:text-zinc-300'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>
                {item.label}
              </span>
              {/* Active indicator */}
              {active && (
                <div className="absolute -bottom-1 h-0.5 w-6 rounded-full bg-blue-500 dark:bg-blue-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
