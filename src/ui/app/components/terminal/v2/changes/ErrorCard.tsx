/**
 * ErrorCard - Ship error state display
 *
 * Shown when a ship operation fails with:
 * - Red alert icon in circular badge
 * - "Ship Failed" heading
 * - Error message from the server
 * - "Dismiss" button to return to collapsed state
 * - "Retry" button to return to form and try again
 *
 * Common errors:
 * - Network failures
 * - Git conflicts
 * - Authentication issues
 * - Missing commit message
 */
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface ErrorCardProps {
  error: string;
  onRetry: () => void;
  onDismiss: () => void;
}

export function ErrorCard({ error, onRetry, onDismiss }: ErrorCardProps) {
  return (
    <div className="flex flex-col items-center py-6">
      {/* Error icon */}
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 ring-1 ring-red-500/30 mb-4">
        <AlertCircle className="h-7 w-7 text-red-400" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-2">
        Ship Failed
      </h3>

      {/* Error message */}
      <p className="text-sm text-red-400 text-center max-w-xs mb-6">
        {error}
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onDismiss}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 text-sm text-white/70 ring-1 ring-white/10 hover:bg-white/10"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
          Dismiss
        </button>
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-sm font-medium text-white hover:bg-purple-700"
          aria-label="Retry"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    </div>
  );
}
