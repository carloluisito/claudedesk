import { Rocket, XCircle, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface PreShipActionsProps {
  onCommitAndCreatePR: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function PreShipActions({
  onCommitAndCreatePR,
  onCancel,
  isLoading = false,
  disabled = false,
}: PreShipActionsProps) {
  return (
    <div className="space-y-3">
      <button
        onClick={onCommitAndCreatePR}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex w-full items-center justify-between rounded-3xl px-4 py-3 text-left ring-1 transition',
          disabled || isLoading
            ? 'bg-white/20 text-white/40 ring-white/10 cursor-not-allowed'
            : 'bg-white text-black ring-white hover:opacity-90'
        )}
      >
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Rocket className="h-4 w-4" />
          )}
          <div>
            <div className="text-sm font-semibold">
              {isLoading ? 'Shipping...' : 'Commit & Create PR'}
            </div>
            <div className="text-xs opacity-70">Final confirmation required</div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 opacity-60" />
      </button>

      <button
        onClick={onCancel}
        disabled={isLoading}
        className="inline-flex w-full items-center justify-between rounded-3xl bg-white/5 px-4 py-3 text-sm text-white ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
      >
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4" />
          Cancel
        </div>
      </button>
    </div>
  );
}
