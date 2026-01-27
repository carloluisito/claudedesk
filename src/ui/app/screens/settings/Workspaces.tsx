import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Plus, Folder, Trash2, Edit2, Github, Gitlab, Link, Unlink, Check, AlertCircle, FolderOpen, Search, Info, ShieldCheck } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { GitHubConnectModal } from '../../components/settings/GitHubConnectModal';
import { GitLabConnectModal } from '../../components/settings/GitLabConnectModal';
import { DirectoryPicker } from '../../components/settings/DirectoryPicker';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';

interface Workspace {
  id: string;
  name: string;
  scanPath: string;
  github: {
    username: string;
    tokenScope: string;
    connected: boolean;
  } | null;
  gitlab: {
    username: string;
    tokenScope: string;
    connected: boolean;
  } | null;
  claudePermissionMode?: 'autonomous' | 'read-only' | null;
  createdAt: string;
  updatedAt?: string;
}

interface PathValidationResult {
  valid: boolean;
  error?: string;
}

export default function Workspaces() {
  const prefersReduced = useReducedMotion();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);
  const [connectingWorkspace, setConnectingWorkspace] = useState<Workspace | null>(null);
  const [connectingGitLabWorkspace, setConnectingGitLabWorkspace] = useState<Workspace | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPath, setFormPath] = useState('');
  const [formError, setFormError] = useState('');
  const [pathError, setPathError] = useState('');
  const [saving, setSaving] = useState(false);
  const [validatingPath, setValidatingPath] = useState(false);

  // Directory picker state
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);

  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Global permission mode (for display purposes)
  const [globalPermissionMode, setGlobalPermissionMode] = useState<'autonomous' | 'read-only'>('autonomous');

  useEffect(() => {
    loadWorkspaces();
    loadGlobalPermissionMode();
  }, []);

  const loadGlobalPermissionMode = async () => {
    try {
      const settings = await api<{ permissionMode: 'autonomous' | 'read-only' }>('GET', '/settings/claude');
      setGlobalPermissionMode(settings.permissionMode);
    } catch (error) {
      console.error('Failed to load global permission mode:', error);
    }
  };

  const loadWorkspaces = async () => {
    try {
      const data = await api<Workspace[]>('GET', '/workspaces');
      setWorkspaces(data);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter workspaces based on search query
  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return workspaces;
    const query = searchQuery.toLowerCase();
    return workspaces.filter(
      (ws) =>
        ws.name.toLowerCase().includes(query) ||
        ws.scanPath.toLowerCase().includes(query)
    );
  }, [workspaces, searchQuery]);

  // Validate path on blur
  const validatePath = useCallback(async (path: string, excludeWorkspaceId?: string) => {
    if (!path.trim()) {
      setPathError('');
      return;
    }

    setValidatingPath(true);
    setPathError('');

    try {
      const result = await api<PathValidationResult>('POST', '/settings/validate-path', {
        path: path.trim(),
        excludeWorkspaceId,
      });

      if (!result.valid && result.error) {
        setPathError(result.error);
      }
    } catch (error) {
      // API error, don't show validation error
      console.error('Path validation failed:', error);
    } finally {
      setValidatingPath(false);
    }
  }, []);

  // Browse for folder
  const handleBrowseFolder = useCallback(() => {
    setShowDirectoryPicker(true);
  }, []);

  // Handle directory selection from picker
  const handleDirectorySelect = useCallback((path: string) => {
    setFormPath(path);
    setFormError('');
    // Validate the selected path
    validatePath(path, editingWorkspace?.id);
  }, [editingWorkspace?.id, validatePath]);

  const handleCreate = async () => {
    if (!formName.trim() || !formPath.trim()) {
      setFormError('Name and path are required');
      return;
    }

    if (pathError) {
      setFormError('Please fix the path error before continuing');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      await api('POST', '/workspaces', {
        name: formName.trim(),
        scanPath: formPath.trim(),
      });
      await loadWorkspaces();
      setShowAddModal(false);
      setFormName('');
      setFormPath('');
      setPathError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create workspace';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingWorkspace) return;
    if (!formName.trim() || !formPath.trim()) {
      setFormError('Name and path are required');
      return;
    }

    if (pathError) {
      setFormError('Please fix the path error before continuing');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      await api('PUT', `/workspaces/${editingWorkspace.id}`, {
        name: formName.trim(),
        scanPath: formPath.trim(),
      });
      await loadWorkspaces();
      setEditingWorkspace(null);
      setFormName('');
      setFormPath('');
      setPathError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update workspace';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingWorkspace) return;

    try {
      await api('DELETE', `/workspaces/${deletingWorkspace.id}`);
      await loadWorkspaces();
      setDeletingWorkspace(null);
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    }
  };

  const handleDisconnectGitHub = async (workspace: Workspace) => {
    try {
      await api('DELETE', `/workspaces/${workspace.id}/github/disconnect`);
      await loadWorkspaces();
    } catch (error) {
      console.error('Failed to disconnect GitHub:', error);
    }
  };

  const handleDisconnectGitLab = async (workspace: Workspace) => {
    try {
      await api('DELETE', `/workspaces/${workspace.id}/gitlab/disconnect`);
      await loadWorkspaces();
    } catch (error) {
      console.error('Failed to disconnect GitLab:', error);
    }
  };

  const handlePermissionModeChange = async (workspace: Workspace, mode: 'autonomous' | 'read-only' | null) => {
    try {
      await api('PUT', `/workspaces/${workspace.id}`, {
        claudePermissionMode: mode,
      });
      await loadWorkspaces();
    } catch (error) {
      console.error('Failed to update permission mode:', error);
    }
  };

  const openEditModal = (workspace: Workspace) => {
    setFormName(workspace.name);
    setFormPath(workspace.scanPath);
    setFormError('');
    setPathError('');
    setEditingWorkspace(workspace);
  };

  const openAddModal = () => {
    setFormName('');
    setFormPath('');
    setFormError('');
    setPathError('');
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info box about GitHub/GitLab mutual exclusivity */}
      <div className="flex items-start gap-3 rounded-2xl bg-blue-500/10 px-4 py-3 ring-1 ring-blue-500/20">
        <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-300">
            Each workspace can connect to either GitHub or GitLab, but not both at the same time.
          </p>
          <p className="text-xs text-blue-400/70 mt-1">
            To switch providers, disconnect the current one first.
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-white/50 flex-shrink-0">
          {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'} configured
        </p>

        {/* Search input (only show when >= 4 workspaces) */}
        {workspaces.length >= 4 && (
          <div className="flex-1 max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workspaces..."
                className="w-full rounded-xl bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:ring-white/20 focus:outline-none"
              />
            </div>
          </div>
        )}

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Workspace
        </button>
      </div>

      {/* Workspace List */}
      {workspaces.length === 0 ? (
        <div className="rounded-3xl bg-white/5 p-6 text-center ring-1 ring-white/10">
          <Folder className="mx-auto mb-3 h-12 w-12 text-white/30" />
          <p className="text-sm text-white/70">No workspaces yet</p>
          <p className="mt-1 text-xs text-white/50">
            Add a workspace to organize your repositories by folder
          </p>
        </div>
      ) : filteredWorkspaces.length === 0 ? (
        <div className="rounded-3xl bg-white/5 p-6 text-center ring-1 ring-white/10">
          <Search className="mx-auto mb-3 h-12 w-12 text-white/30" />
          <p className="text-sm text-white/70">No matching workspaces</p>
          <p className="mt-1 text-xs text-white/50">
            Try a different search term
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {filteredWorkspaces.map((workspace) => (
              <motion.div
                key={workspace.id}
                layout
                initial={prefersReduced ? {} : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <div className="group rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 transition hover:bg-white/[0.07]">
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                          <Folder className="h-5 w-5 text-white/60" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-white truncate">{workspace.name}</h3>
                          <p className="text-xs text-white/50 truncate">
                            {workspace.scanPath}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditModal(workspace)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 transition hover:bg-white/10 hover:text-white/70"
                          title="Edit workspace"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingWorkspace(workspace)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 transition hover:bg-red-500/20 hover:text-red-400"
                          title="Delete workspace"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* GitHub Connection Row */}
                    <div className="rounded-2xl bg-white/5 px-3 py-2.5 ring-1 ring-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Github className="h-4 w-4 text-white/40" />
                          {workspace.github?.connected ? (
                            <>
                              <span className="text-sm text-white/70">
                                Connected as <span className="font-medium text-white">{workspace.github.username}</span>
                              </span>
                              <Check className="h-4 w-4 text-emerald-400" />
                            </>
                          ) : (
                            <span className="text-sm text-white/40">Not connected</span>
                          )}
                        </div>

                        {workspace.github?.connected ? (
                          <button
                            onClick={() => handleDisconnectGitHub(workspace)}
                            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-white/40 transition hover:bg-white/10 hover:text-white/60"
                          >
                            <Unlink className="h-3.5 w-3.5" />
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => setConnectingWorkspace(workspace)}
                            disabled={!!workspace.gitlab?.connected}
                            title={workspace.gitlab?.connected ? 'Disconnect GitLab first' : undefined}
                            className={cn(
                              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition",
                              workspace.gitlab?.connected
                                ? "bg-white/5 text-white/20 cursor-not-allowed"
                                : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80"
                            )}
                          >
                            <Link className="h-3.5 w-3.5" />
                            Connect GitHub
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-white/35 mt-1.5 ml-6">
                        {workspace.github?.connected
                          ? 'Push, pull, and PRs work without SSH keys or GitHub CLI'
                          : 'Connect to enable push, pull, and PRs without SSH keys'}
                      </p>
                    </div>

                    {/* GitLab Connection Row */}
                    <div className="rounded-2xl bg-white/5 px-3 py-2.5 ring-1 ring-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Gitlab className="h-4 w-4 text-orange-500/70" />
                          {workspace.gitlab?.connected ? (
                            <>
                              <span className="text-sm text-white/70">
                                Connected as <span className="font-medium text-white">{workspace.gitlab.username}</span>
                              </span>
                              <Check className="h-4 w-4 text-emerald-400" />
                            </>
                          ) : (
                            <span className="text-sm text-white/40">Not connected</span>
                          )}
                        </div>

                        {workspace.gitlab?.connected ? (
                          <button
                            onClick={() => handleDisconnectGitLab(workspace)}
                            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-white/40 transition hover:bg-white/10 hover:text-white/60"
                          >
                            <Unlink className="h-3.5 w-3.5" />
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => setConnectingGitLabWorkspace(workspace)}
                            disabled={!!workspace.github?.connected}
                            title={workspace.github?.connected ? 'Disconnect GitHub first' : undefined}
                            className={cn(
                              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition",
                              workspace.github?.connected
                                ? "bg-white/5 text-white/20 cursor-not-allowed"
                                : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80"
                            )}
                          >
                            <Link className="h-3.5 w-3.5" />
                            Connect GitLab
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-white/35 mt-1.5 ml-6">
                        {workspace.gitlab?.connected
                          ? 'Push, pull, and MRs work without SSH keys or GitLab CLI'
                          : 'Connect to enable push, pull, and MRs without SSH keys'}
                      </p>
                    </div>

                    {/* Permission Mode Override Row */}
                    <div className="rounded-2xl bg-white/5 px-3 py-2.5 ring-1 ring-white/5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <ShieldCheck className={cn(
                              "h-4 w-4 flex-shrink-0",
                              workspace.claudePermissionMode === 'autonomous'
                                ? "text-amber-400"
                                : workspace.claudePermissionMode === 'read-only'
                                ? "text-emerald-400"
                                : "text-white/40"
                            )} />
                            <label className="text-sm text-white/60">Permission Mode</label>
                          </div>
                          <select
                            value={workspace.claudePermissionMode || 'default'}
                            onChange={(e) => {
                              const value = e.target.value;
                              handlePermissionModeChange(
                                workspace,
                                value === 'default' ? null : (value as 'autonomous' | 'read-only')
                              );
                            }}
                            className="rounded-xl bg-white/10 px-3 py-1.5 text-xs text-white ring-1 ring-white/10 focus:ring-white/20 focus:outline-none"
                          >
                            <option value="default" className="bg-zinc-800 text-white">Use Global Default</option>
                            <option value="autonomous" className="bg-zinc-800 text-white">Autonomous</option>
                            <option value="read-only" className="bg-zinc-800 text-white">Read-Only</option>
                          </select>
                        </div>
                        <p className="text-xs text-white/35 ml-6">
                          {workspace.claudePermissionMode === null || workspace.claudePermissionMode === undefined ? (
                            <>Currently using: <span className={cn(
                              "font-medium",
                              globalPermissionMode === 'autonomous' ? "text-amber-400/70" : "text-emerald-400/70"
                            )}>{globalPermissionMode === 'autonomous' ? 'Autonomous' : 'Read-Only'}</span> (global default)</>
                          ) : (
                            <>Workspace override: <span className={cn(
                              "font-medium",
                              workspace.claudePermissionMode === 'autonomous' ? "text-amber-400/70" : "text-emerald-400/70"
                            )}>{workspace.claudePermissionMode === 'autonomous' ? 'Autonomous' : 'Read-Only'}</span></>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Workspace Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="New Workspace"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-white/60">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Work, Personal"
              className="w-full rounded-2xl bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:ring-white/20 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/60">Folder Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formPath}
                onChange={(e) => {
                  setFormPath(e.target.value);
                  setPathError('');
                }}
                onBlur={() => validatePath(formPath)}
                placeholder="e.g., C:\Users\username\repos\work"
                className={cn(
                  "flex-1 rounded-2xl bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/35 ring-1 focus:outline-none",
                  pathError
                    ? "ring-red-500/50 focus:ring-red-500/70"
                    : "ring-white/10 focus:ring-white/20"
                )}
              />
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/10 transition hover:bg-white/15 hover:text-white/90"
                title="Browse for folder"
              >
                <FolderOpen className="h-4 w-4" />
                Browse
              </button>
            </div>
            {pathError ? (
              <p className="text-xs text-red-400">{pathError}</p>
            ) : (
              <p className="text-xs text-white/40">
                Repositories inside this folder will use this workspace&apos;s OAuth connection for git operations
              </p>
            )}
            {validatingPath && (
              <p className="text-xs text-white/40">Validating path...</p>
            )}
          </div>

          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/20">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowAddModal(false)}
              disabled={saving}
              className="flex-1 rounded-2xl bg-white/5 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !!pathError}
              className="flex-1 rounded-2xl bg-white py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Workspace Modal */}
      <Modal
        isOpen={!!editingWorkspace}
        onClose={() => setEditingWorkspace(null)}
        title="Edit Workspace"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-white/60">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full rounded-2xl bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:ring-white/20 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/60">Folder Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formPath}
                onChange={(e) => {
                  setFormPath(e.target.value);
                  setPathError('');
                }}
                onBlur={() => validatePath(formPath, editingWorkspace?.id)}
                className={cn(
                  "flex-1 rounded-2xl bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/35 ring-1 focus:outline-none",
                  pathError
                    ? "ring-red-500/50 focus:ring-red-500/70"
                    : "ring-white/10 focus:ring-white/20"
                )}
              />
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/10 transition hover:bg-white/15 hover:text-white/90"
                title="Browse for folder"
              >
                <FolderOpen className="h-4 w-4" />
                Browse
              </button>
            </div>
            {pathError && (
              <p className="text-xs text-red-400">{pathError}</p>
            )}
            {validatingPath && (
              <p className="text-xs text-white/40">Validating path...</p>
            )}
          </div>

          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/20">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setEditingWorkspace(null)}
              disabled={saving}
              className="flex-1 rounded-2xl bg-white/5 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={saving || !!pathError}
              className="flex-1 rounded-2xl bg-white py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingWorkspace}
        onClose={() => setDeletingWorkspace(null)}
        title="Delete Workspace"
      >
        {deletingWorkspace && (
          <div className="space-y-4">
            <p className="text-sm text-white/60">
              Are you sure you want to delete{' '}
              <span className="font-medium text-white">{deletingWorkspace.name}</span>?
            </p>
            <p className="text-xs text-white/40">
              This will remove the workspace and its GitHub connection. Your files will not be deleted.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingWorkspace(null)}
                className="flex-1 rounded-2xl bg-white/5 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/10 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-2xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* GitHub Connect Modal */}
      <GitHubConnectModal
        workspace={connectingWorkspace}
        onClose={() => setConnectingWorkspace(null)}
        onSuccess={() => {
          setConnectingWorkspace(null);
          loadWorkspaces();
        }}
      />

      {/* GitLab Connect Modal */}
      <GitLabConnectModal
        workspace={connectingGitLabWorkspace}
        onClose={() => setConnectingGitLabWorkspace(null)}
        onSuccess={() => {
          setConnectingGitLabWorkspace(null);
          loadWorkspaces();
        }}
      />

      {/* Directory Picker Modal */}
      <DirectoryPicker
        isOpen={showDirectoryPicker}
        onClose={() => setShowDirectoryPicker(false)}
        onSelect={handleDirectorySelect}
        initialPath={formPath || undefined}
      />
    </div>
  );
}
