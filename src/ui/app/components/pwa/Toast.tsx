import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Toast as ToastType, ToastType as ToastVariant } from '../../hooks/useToast';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const TOAST_ICONS: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const TOAST_STYLES: Record<ToastVariant, string> = {
  success: 'bg-emerald-500/10 ring-emerald-500/30 text-emerald-300',
  error: 'bg-red-500/10 ring-red-500/30 text-red-300',
  info: 'bg-blue-500/10 ring-blue-500/30 text-blue-300',
  warning: 'bg-amber-500/10 ring-amber-500/30 text-amber-300',
};

const ICON_STYLES: Record<ToastVariant, string> = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  warning: 'text-amber-400',
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = TOAST_ICONS[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl ring-1 shadow-lg',
        'min-w-[280px] max-w-md',
        TOAST_STYLES[toast.type]
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', ICON_STYLES[toast.type])} aria-hidden="true" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className={cn(
          'p-1 rounded-lg transition-colors shrink-0',
          'hover:bg-white/10 text-current opacity-60 hover:opacity-100'
        )}
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </motion.div>
  );
}
