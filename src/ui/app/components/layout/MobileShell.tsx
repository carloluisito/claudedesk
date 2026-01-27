import { cn } from '../../lib/cn';

interface MobileShellProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileShell({ children, className }: MobileShellProps) {
  return (
    <div
      className={cn(
        'mx-auto min-h-screen w-full max-w-md px-5 pb-6 pt-6',
        className
      )}
    >
      {children}
    </div>
  );
}
