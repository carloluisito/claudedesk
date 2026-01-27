/**
 * NewSessionModal.tsx - Shared modal for creating new sessions
 * Used by both Home.tsx and Terminal.tsx for consistency
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Folder,
  Check,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface Workspace {
  id: string;
  name: string;
  rootPath: string;
}

interface Repo {
  id: string;
  path: string;
  workspaceId?: string;
}

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSession: () => Promise<void>;

  // Workspaces and repos
  workspaces: Workspace[];
  repos: Repo[];
  isLoadingAppData: boolean;

  // Workspace selection
  selectedWorkspaceId: string;
  onWorkspaceChange: (workspaceId: string) => void;

  // Repo selection
  selectedRepoIds: string[];
  onToggleRepoSelection: (repoId: string) => void;
  repoSearch: string;
  onRepoSearchChange: (search: string) => void;
  highlightedRepoIndex: number;
  onHighlightedRepoIndexChange: (index: number) => void;
  filteredRepos: Repo[];
  reposByWorkspace: Record<string, Repo[]>;

  // Inline repo creation
  showCreateRepoForm: boolean;
  onShowCreateRepoForm: (show: boolean) => void;
  newRepoName: string;
  onNewRepoNameChange: (name: string) => void;
  createRepoWorkspaceId: string;
  onCreateRepoWorkspaceIdChange: (workspaceId: string) => void;
  isCreatingRepo: boolean;
  createRepoError: string | null;
  onCreateRepoInline: () => Promise<void>;

  // Worktree options
  worktreeMode: boolean;
  onWorktreeModeChange: (enabled: boolean) => void;
  worktreeAction: 'create' | 'existing';
  onWorktreeActionChange: (action: 'create' | 'existing') => void;
  worktreeBranch: string;
  onWorktreeBranchChange: (branch: string) => void;
  worktreeBaseBranch: string;
  onWorktreeBaseBranchChange: (branch: string) => void;
  availableBranches: string[];
  loadingBranches: boolean;
  mainBranch: string;
  existingWorktrees: Array<{ path: string; branch: string; isMain?: boolean }>;
  selectedWorktreePath: string;
  onSelectedWorktreePathChange: (path: string) => void;
  loadingWorktrees: boolean;
}

export function NewSessionModal({
  isOpen,
  onClose,
  onCreateSession,
  workspaces,
  repos,
  isLoadingAppData,
  selectedWorkspaceId,
  onWorkspaceChange,
  selectedRepoIds,
  onToggleRepoSelection,
  repoSearch,
  onRepoSearchChange,
  highlightedRepoIndex,
  onHighlightedRepoIndexChange,
  filteredRepos,
  reposByWorkspace,
  showCreateRepoForm,
  onShowCreateRepoForm,
  newRepoName,
  onNewRepoNameChange,
  createRepoWorkspaceId,
  onCreateRepoWorkspaceIdChange,
  isCreatingRepo,
  createRepoError,
  onCreateRepoInline,
  worktreeMode,
  onWorktreeModeChange,
  worktreeAction,
  onWorktreeActionChange,
  worktreeBranch,
  onWorktreeBranchChange,
  worktreeBaseBranch,
  onWorktreeBaseBranchChange,
  availableBranches,
  loadingBranches,
  mainBranch,
  existingWorktrees,
  selectedWorktreePath,
  onSelectedWorktreePathChange,
  loadingWorktrees,
}: NewSessionModalProps) {
  // Apply search filter to repos
  const searchedRepos = filteredRepos.filter((r) => {
    if (!repoSearch) return true;
    const lower = repoSearch.toLowerCase();
    return (
      r.id.toLowerCase().includes(lower) || r.path.toLowerCase().includes(lower)
    );
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-3xl border border-white/10 bg-[#0d1117] p-6 ring-1 ring-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">New Session</h2>

        {/* Workspace selector */}
        <div className="mb-4">
          <label className="block text-xs text-white/50 mb-1">Workspace</label>
          {isLoadingAppData ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-white/50 rounded-2xl bg-white/5 ring-1 ring-white/10">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading workspaces...
            </div>
          ) : workspaces.length > 0 ? (
            <select
              value={selectedWorkspaceId}
              onChange={(e) => {
                onWorkspaceChange(e.target.value);
                // Clear selections when changing workspace
                selectedRepoIds.forEach(id => onToggleRepoSelection(id));
              }}
              className="w-full rounded-2xl bg-zinc-800 px-4 py-3 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <option value="" className="bg-zinc-800 text-white">
                All Workspaces
              </option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id} className="bg-zinc-800 text-white">
                  {ws.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-4 py-3 text-sm text-white/50 rounded-2xl bg-white/5 ring-1 ring-white/10">
              No workspaces found. Add one in Settings.
            </div>
          )}
        </div>

        {/* Search repos */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={repoSearch}
            onChange={(e) => {
              onRepoSearchChange(e.target.value);
              onHighlightedRepoIndexChange(0);
            }}
            placeholder="Search repositories..."
            className="w-full rounded-2xl bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
            autoFocus
          />
        </div>

        {/* Repo list */}
        <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
          {searchedRepos.length > 0 ? (
            // Show grouped by workspace when "All Workspaces" selected
            !selectedWorkspaceId ? (
              // Grouped view
              Object.entries(reposByWorkspace).map(([wsId, wsRepos]) => {
                const workspace = workspaces.find(w => w.id === wsId);
                const reposToShow = wsRepos.filter(r =>
                  !repoSearch ||
                  r.id.toLowerCase().includes(repoSearch.toLowerCase()) ||
                  r.path.toLowerCase().includes(repoSearch.toLowerCase())
                );
                if (reposToShow.length === 0) return null;
                return (
                  <div key={wsId}>
                    <p className="text-xs text-white/40 uppercase tracking-wider px-1 py-1 mb-1">
                      {workspace?.name || 'Unknown'}
                    </p>
                    {reposToShow.map((repo) => (
                      <button
                        key={repo.id}
                        onClick={() => onToggleRepoSelection(repo.id)}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-2xl p-3 text-left ring-1 transition mb-1',
                          selectedRepoIds.includes(repo.id)
                            ? 'bg-blue-600 text-white ring-blue-500'
                            : 'bg-white/5 text-white/80 ring-white/10 hover:bg-white/10'
                        )}
                      >
                        <Folder className="h-5 w-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{repo.id}</p>
                          <p className="text-xs opacity-70 truncate">{repo.path}</p>
                        </div>
                        {selectedRepoIds.includes(repo.id) && <Check className="h-5 w-5" />}
                      </button>
                    ))}
                  </div>
                );
              })
            ) : (
              // Flat view for specific workspace
              searchedRepos.map((repo, index) => (
                <button
                  key={repo.id}
                  onClick={() => onToggleRepoSelection(repo.id)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-2xl p-3 text-left ring-1 transition',
                    selectedRepoIds.includes(repo.id)
                      ? 'bg-blue-600 text-white ring-blue-500'
                      : index === highlightedRepoIndex
                      ? 'bg-white/10 text-white ring-white/20'
                      : 'bg-white/5 text-white/80 ring-white/10 hover:bg-white/10'
                  )}
                >
                  <Folder className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{repo.id}</p>
                    <p className="text-xs opacity-70 truncate">{repo.path}</p>
                  </div>
                  {selectedRepoIds.includes(repo.id) && <Check className="h-5 w-5" />}
                </button>
              ))
            )
          ) : (
            <div className="text-center py-8">
              <Folder className="h-8 w-8 mx-auto mb-2 text-white/30" />
              <p className="text-white/50">No repositories found</p>
              <p className="text-xs text-white/30 mt-1">
                {workspaces.length === 0
                  ? 'Add a workspace in Settings first'
                  : repoSearch
                  ? 'No repos match your search'
                  : 'No repos in this workspace'}
              </p>
            </div>
          )}

          {/* Create new repository button */}
          {workspaces.length > 0 && (
            <div className="pt-2">
              {!showCreateRepoForm ? (
                <button
                  onClick={() => onShowCreateRepoForm(true)}
                  className="w-full flex items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-dashed ring-white/20 text-white/60 hover:bg-white/5 hover:text-white/80 transition"
                >
                  <Plus className="h-5 w-5 flex-shrink-0" />
                  <span>Create new repository</span>
                </button>
              ) : (
                <div className="rounded-2xl p-4 ring-1 ring-white/20 bg-white/5 space-y-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Repository name</label>
                    <input
                      type="text"
                      value={newRepoName}
                      onChange={(e) => onNewRepoNameChange(e.target.value)}
                      placeholder="my-new-project"
                      className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                      autoFocus
                    />
                  </div>
                  {/* Show workspace selector only when "All Workspaces" is selected */}
                  {!selectedWorkspaceId && (
                    <div>
                      <label className="block text-xs text-white/50 mb-1">In workspace</label>
                      <select
                        value={createRepoWorkspaceId}
                        onChange={(e) => onCreateRepoWorkspaceIdChange(e.target.value)}
                        className="w-full rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                      >
                        {workspaces.map((ws) => (
                          <option key={ws.id} value={ws.id} className="bg-zinc-800 text-white">
                            {ws.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {createRepoError && (
                    <p className="text-xs text-red-400">{createRepoError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onShowCreateRepoForm(false);
                        onNewRepoNameChange('');
                      }}
                      className="flex-1 px-3 py-2 rounded-xl text-sm text-white/70 hover:bg-white/10 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onCreateRepoInline}
                      disabled={isCreatingRepo || !newRepoName.trim()}
                      className="flex-1 px-3 py-2 rounded-xl text-sm bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                      {isCreatingRepo && <Loader2 className="h-4 w-4 animate-spin" />}
                      Create
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Worktree options */}
        <div className="border-t border-white/10 pt-4 mb-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={worktreeMode}
              onChange={(e) => onWorktreeModeChange(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500"
            />
            <span className="text-sm text-white/70">Use worktree (isolated branch)</span>
          </label>
          {worktreeMode && (
            <div className="mt-3 space-y-3 pl-7">
              {/* Worktree action tabs */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onWorktreeActionChange('create')}
                  className={cn(
                    'flex-1 rounded-xl px-3 py-2 text-sm font-medium transition',
                    worktreeAction === 'create'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  )}
                >
                  Create new
                </button>
                <button
                  type="button"
                  onClick={() => onWorktreeActionChange('existing')}
                  className={cn(
                    'flex-1 rounded-xl px-3 py-2 text-sm font-medium transition',
                    worktreeAction === 'existing'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  )}
                >
                  Use existing
                </button>
              </div>

              {/* Create new worktree form */}
              {worktreeAction === 'create' && (
                <>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">New branch name</label>
                    <input
                      type="text"
                      value={worktreeBranch}
                      onChange={(e) => onWorktreeBranchChange(e.target.value)}
                      placeholder="e.g., feature/my-feature"
                      className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Base branch</label>
                    {loadingBranches ? (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-white/50">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading branches...
                      </div>
                    ) : (
                      <select
                        value={worktreeBaseBranch}
                        onChange={(e) => onWorktreeBaseBranchChange(e.target.value)}
                        className="w-full rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                      >
                        <option value="" className="bg-zinc-800 text-white">Select base branch...</option>
                        {availableBranches.map((branch) => (
                          <option key={branch} value={branch} className="bg-zinc-800 text-white">
                            {branch}{branch === mainBranch ? ' (default)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </>
              )}

              {/* Use existing worktree form */}
              {worktreeAction === 'existing' && (
                <>
                  {loadingWorktrees ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-white/50">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading worktrees...
                    </div>
                  ) : existingWorktrees.length > 0 ? (
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Select worktree</label>
                      <select
                        value={selectedWorktreePath}
                        onChange={(e) => onSelectedWorktreePathChange(e.target.value)}
                        className="w-full rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                      >
                        <option value="" className="bg-zinc-800 text-white">Select a worktree...</option>
                        {existingWorktrees.map((wt) => (
                          <option key={wt.path} value={wt.path} className="bg-zinc-800 text-white">
                            {wt.branch} - {wt.path.split(/[/\\]/).slice(-2).join('/')}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
                      <p className="text-xs text-amber-300">
                        No existing worktrees found for this repository. Use "Create new" to create one.
                      </p>
                    </div>
                  )}
                </>
              )}

              {selectedRepoIds.length > 1 && (
                <div className="p-3 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
                  <p className="text-xs text-blue-300">
                    <strong>Multi-repo worktree:</strong> The worktree branch will be created
                    for the primary repository ({repos.find(r => r.id === selectedRepoIds[0])?.id || selectedRepoIds[0]}). Other selected
                    repositories will share context but use their current branch.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-white/5 py-3 text-sm text-white/70 ring-1 ring-white/10 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={onCreateSession}
            disabled={
              selectedRepoIds.length === 0 ||
              (worktreeMode && worktreeAction === 'create' && !worktreeBranch) ||
              (worktreeMode && worktreeAction === 'existing' && !selectedWorktreePath)
            }
            className="flex-1 rounded-2xl bg-white py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Session
          </button>
        </div>
      </div>
    </div>
  );
}
