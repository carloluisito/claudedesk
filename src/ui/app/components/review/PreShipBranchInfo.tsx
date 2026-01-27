import { GitBranch, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface PreShipBranchInfoProps {
  sourceBranch: string;
  targetBranch: string;
  availableBranches?: string[];
  onTargetBranchChange: (branch: string) => void;
}

export function PreShipBranchInfo({
  sourceBranch,
  targetBranch,
  availableBranches = [],
  onTargetBranchChange,
}: PreShipBranchInfoProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter out source branch from available targets
  const targetOptions = availableBranches.filter((b) => b !== sourceBranch);

  return (
    <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <GitBranch className="h-4 w-4" />
        Branches
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-white/60">Source</div>
          <div className="mt-1 rounded-xl bg-black/30 px-3 py-2 ring-1 ring-white/10 text-white">
            {sourceBranch}
          </div>
        </div>
        <div className="relative">
          <div className="text-xs text-white/60">Target</div>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="mt-1 w-full flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 ring-1 ring-white/10 text-white hover:bg-black/40 transition"
          >
            <span>{targetBranch}</span>
            <ChevronDown className="h-4 w-4 text-white/50" />
          </button>
          {showDropdown && targetOptions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-[#0d1117] border border-white/10 shadow-lg z-10 max-h-40 overflow-y-auto">
              {targetOptions.map((branch) => (
                <button
                  key={branch}
                  onClick={() => {
                    onTargetBranchChange(branch);
                    setShowDropdown(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-white/80 hover:bg-white/10"
                >
                  <GitBranch className="h-3 w-3 text-white/40" />
                  {branch}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
