/**
 * RepoGrid - Visual grid for repository selection
 */

import { useState, useMemo } from 'react';
import { Search, GitBranch, Check, Loader2, FolderGit } from 'lucide-react';
import { cn } from '../../lib/cn';
import { VStack, HStack } from '../../design-system/primitives/Stack';
import { Text } from '../../design-system/primitives/Text';

interface Repo {
  id: string;
  name: string;
  path: string;
  workspaceId: string;
}

interface RepoGridProps {
  repos: Repo[];
  selectedIds: string[];
  onToggle: (repoId: string) => void;
  isLoading?: boolean;
  multiSelect?: boolean;
}

export function RepoGrid({
  repos,
  selectedIds,
  onToggle,
  isLoading = false,
  multiSelect = true,
}: RepoGridProps) {
  const [search, setSearch] = useState('');

  // Filter repos by search
  const filteredRepos = useMemo(() => {
    if (!search.trim()) return repos;
    const lower = search.toLowerCase();
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        r.path.toLowerCase().includes(lower)
    );
  }, [repos, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 text-white/40 animate-spin" />
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <VStack gap={3} align="center" className="py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
          <FolderGit className="h-6 w-6 text-white/40" />
        </div>
        <Text variant="bodySm" color="tertiary" align="center">
          No repositories found.
          <br />
          Add a repository in the workspace settings.
        </Text>
      </VStack>
    );
  }

  return (
    <VStack gap={3}>
      {/* Search */}
      {repos.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories..."
            className={cn(
              'w-full rounded-xl bg-white/5 py-2.5 pl-10 pr-4 text-sm',
              'text-white placeholder-white/40',
              'ring-1 ring-white/10 focus:ring-white/20 focus:outline-none'
            )}
          />
        </div>
      )}

      {/* Multi-select hint */}
      {multiSelect && (
        <Text variant="bodyXs" color="muted">
          Select one or more repositories to work with
        </Text>
      )}

      {/* Repo grid */}
      <div className="grid gap-2 grid-cols-2 max-h-[300px] overflow-y-auto">
        {filteredRepos.map((repo) => {
          const isSelected = selectedIds.includes(repo.id);
          return (
            <button
              key={repo.id}
              onClick={() => onToggle(repo.id)}
              className={cn(
                'flex items-start gap-2 rounded-xl p-3 text-left transition-all',
                'ring-1',
                isSelected
                  ? 'bg-blue-500/10 ring-blue-500/30'
                  : 'bg-white/5 ring-white/10 hover:bg-white/10'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0',
                  isSelected ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/50'
                )}
              >
                {isSelected ? <Check className="h-4 w-4" /> : <GitBranch className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <Text
                  variant="bodySm"
                  color={isSelected ? 'primary' : 'secondary'}
                  truncate="truncate"
                >
                  {repo.name}
                </Text>
                <Text variant="bodyXs" color="muted" truncate="truncate">
                  {repo.path}
                </Text>
              </div>
            </button>
          );
        })}
      </div>

      {/* No results */}
      {filteredRepos.length === 0 && search && (
        <Text variant="bodySm" color="tertiary" align="center" className="py-4">
          No repositories match "{search}"
        </Text>
      )}
    </VStack>
  );
}

export type { RepoGridProps };
