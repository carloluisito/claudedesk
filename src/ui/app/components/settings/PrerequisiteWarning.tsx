import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { PrerequisiteCheckResult } from '../../types/mcp-catalog';

interface PrerequisiteWarningProps {
  results: PrerequisiteCheckResult[];
  platform: string;
  onCheckAgain: () => void;
}

export function PrerequisiteWarning({ results, platform, onCheckAgain }: PrerequisiteWarningProps) {
  const failed = results.filter(r => !r.installed);

  if (failed.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-orange-500/10 ring-1 ring-orange-500/30 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-orange-400 mb-2">
            Missing Prerequisites
          </h4>
          <p className="text-xs text-white/70 mb-3">
            The following prerequisites are required but not installed:
          </p>
          <ul className="space-y-2 mb-4">
            {failed.map((result, idx) => (
              <li key={idx} className="text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className="font-medium text-white">{result.prerequisite.name}</span>
                    {result.error && (
                      <p className="text-white/50 mt-0.5">{result.error}</p>
                    )}
                  </div>
                  {result.prerequisite.installUrl[platform] && (
                    <a
                      href={result.prerequisite.installUrl[platform]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors flex-shrink-0"
                    >
                      <span className="text-xs font-medium">Install</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <button
            onClick={onCheckAgain}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Check Again
          </button>
        </div>
      </div>
    </div>
  );
}
