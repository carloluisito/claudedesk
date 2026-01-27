import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Settings, Search } from 'lucide-react';
import { cn } from '../../lib/cn';
import { ThemeToggle } from '../ui/ThemeToggle';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  backTo?: string;
  rightContent?: React.ReactNode;
  className?: string;
}

export function Header({
  title,
  showBack = false,
  backTo,
  rightContent,
  className,
}: HeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/40"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5 text-zinc-700 dark:text-zinc-200" />
          </button>
        )}
        {title && (
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {rightContent}
      </div>
    </header>
  );
}

interface HeaderBrandProps {
  className?: string;
}

export function HeaderBrand({ className }: HeaderBrandProps) {
  const navigate = useNavigate();

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/60 px-3 py-1.5 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          ClaudeDesk
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/40 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800/60"
          aria-label="Search"
        >
          <Search className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/40 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800/60"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
        </button>
      </div>
    </div>
  );
}
