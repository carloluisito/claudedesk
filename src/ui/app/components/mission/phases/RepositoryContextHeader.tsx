import React from 'react';
import { FolderGit2, GitBranch } from 'lucide-react';

interface RepositoryContextHeaderProps {
  repoName: string;
  branchName: string;
}

export function RepositoryContextHeader({
  repoName,
  branchName,
}: RepositoryContextHeaderProps) {
  return (
    <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-400/20 flex-shrink-0">
          <FolderGit2 className="h-5 w-5 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-white/90 font-medium text-sm truncate">
            {repoName}
          </h3>
          <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
            <GitBranch className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{branchName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
