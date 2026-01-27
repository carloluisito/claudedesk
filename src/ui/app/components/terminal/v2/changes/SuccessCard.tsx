/**
 * SuccessCard - Ship success state display
 *
 * Shown after a successful ship operation with:
 * - Green checkmark icon in circular badge
 * - "Changes Shipped!" heading
 * - Commit hash (truncated to 7 chars)
 * - "Pushed to remote" confirmation
 * - "View Pull Request" link if PR was created
 * - "Done" button to return to collapsed state
 *
 * Automatically refreshes the ship summary when dismissed.
 */
import { Check, ExternalLink } from 'lucide-react';

interface SuccessCardProps {
  committed: boolean;
  pushed: boolean;
  commitHash?: string;
  prUrl?: string;
  onDone: () => void;
}

export function SuccessCard({
  committed,
  pushed,
  commitHash,
  prUrl,
  onDone,
}: SuccessCardProps) {
  return (
    <div className="flex flex-col items-center py-6">
      {/* Success icon */}
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 ring-1 ring-green-500/30 mb-4">
        <Check className="h-7 w-7 text-green-400" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-2">
        Changes Shipped!
      </h3>

      {/* Details */}
      <div className="text-sm text-white/55 space-y-1 text-center">
        {committed && commitHash && (
          <p>
            Committed as{' '}
            <span className="font-mono text-white/70">
              {commitHash.substring(0, 7)}
            </span>
          </p>
        )}
        {pushed && <p>Pushed to remote</p>}
      </div>

      {/* PR Link */}
      {prUrl && (
        <a
          href={prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 mt-4 text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          View Pull Request
        </a>
      )}

      {/* Done button */}
      <button
        onClick={onDone}
        className="mt-6 px-6 py-2.5 rounded-xl bg-purple-600 text-sm font-medium text-white hover:bg-purple-700"
        aria-label="Close"
      >
        Done
      </button>
    </div>
  );
}
