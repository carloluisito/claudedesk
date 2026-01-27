import { ReactNode } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TunnelStatusIndicator } from '../remote-access/TunnelStatusIndicator';

interface AppHeaderProps {
  /** Subtitle text below the title */
  subtitle?: string;
  /** Right-side action buttons */
  actions?: ReactNode;
  /** Show back button - can be true for default behavior, or a path string */
  backTo?: boolean | string;
  /** Additional className for the header container */
  className?: string;
  /** Hide the settings icon (use on Settings page itself) */
  hideSettings?: boolean;
}

export function AppHeader({
  subtitle,
  actions,
  backTo,
  className,
  hideSettings,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  const handleBack = () => {
    if (typeof backTo === 'string') {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <>
      {/* Fixed header */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-40 bg-[#05070c]/80 backdrop-blur-xl border-b border-white/5 pt-[env(safe-area-inset-top)]',
          className
        )}
      >
        <div className="flex items-center justify-between px-3 py-2 sm:px-6 sm:py-4">
          {/* Left side - Logo and title */}
          <div className="flex items-center gap-3">
            {backTo && (
              <button
                onClick={handleBack}
                className="rounded-2xl bg-white/5 p-2.5 sm:p-2 text-white ring-1 ring-white/10 transition hover:bg-white/10 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}

            {/* Clickable logo - navigates to home */}
            <Link
              to="/"
              className={cn(
                'relative block transition',
                isHome ? 'cursor-default' : 'hover:opacity-80'
              )}
              aria-label="Go to home"
            >
              <img
                src="/icons/logo.png"
                alt="ClaudeDesk"
                className="h-10 w-10 sm:h-16 sm:w-16 rounded-2xl"
              />
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent" />
            </Link>

            <div className="leading-tight">
              <span className="hidden sm:inline text-sm font-semibold tracking-tight text-white">
                ClaudeDesk
              </span>
              {subtitle && (
                <div className="hidden sm:block text-xs text-white/55">{subtitle}</div>
              )}
            </div>
          </div>

          {/* Right side - Dynamic actions + Tunnel Status + Settings */}
          <div className="flex items-center gap-2">
            {actions}
            <TunnelStatusIndicator />
            {!hideSettings && (
              <button
                onClick={() => navigate('/settings')}
                className="rounded-2xl bg-white/5 p-2.5 sm:p-2 text-white/70 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </header>
      {/* Spacer to reserve header height - includes safe area */}
      <div className="header-spacer" />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Common action button components for consistency
// ─────────────────────────────────────────────────────────────────────────────

interface HeaderButtonProps {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  shortcut?: string;
  hideLabel?: boolean;
  variant?: 'ghost' | 'primary';
  active?: boolean;
}

export function HeaderButton({
  onClick,
  icon,
  label,
  shortcut,
  hideLabel = false,
  variant = 'ghost',
  active = false,
}: HeaderButtonProps) {
  if (variant === 'primary') {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 sm:px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
      >
        {icon}
        {!hideLabel && <span className="hidden sm:inline">{label}</span>}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm ring-1 transition min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0',
        active
          ? 'bg-white/10 text-white ring-white/20'
          : 'bg-white/5 text-white/80 ring-white/10 hover:bg-white/10 hover:text-white'
      )}
    >
      {icon}
      {!hideLabel && <span className="hidden sm:inline">{label}</span>}
      {shortcut && (
        <span className="ml-1 hidden rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/60 ring-1 ring-white/10 sm:inline">
          {shortcut}
        </span>
      )}
    </button>
  );
}
