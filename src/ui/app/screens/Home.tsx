import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Command,
  Sparkles,
  Plus,
  FolderOpen,
  Upload,
  ArrowRight,
  Keyboard,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { AppHeader, HeaderButton } from '@/components/ui/AppHeader';
import { useAppStore } from '@/store/appStore';
import { useTerminalStore } from '@/store/terminalStore';
import { api } from '@/lib/api';
import SessionDashboard from './SessionDashboard';
import type { Session, SessionMode } from '@/types/session';
import { NewSessionModal } from '@/components/terminal/NewSessionModal';

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function KeyHint({ keys }: { keys: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/70 ring-1 ring-white/10">
      <Keyboard className="h-3.5 w-3.5" />
      <span className="font-medium">{keys}</span>
    </span>
  );
}

interface HomeEmptyStateProps {
  onStart: () => void;
  onOpen: () => void;
  onImport: () => void;
}

function HomeEmptyState({ onStart, onOpen, onImport }: HomeEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto min-h-0">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full"
      >
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
            <Sparkles className="h-3.5 w-3.5" />
            Calm workspace · Fast feedback · Safe shipping
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Welcome to ClaudeDesk
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/60">
            Start a session on a repository. ClaudeDesk isolates context per
            session, shows every action, and keeps shipping deliberate.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Primary action card */}
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={onStart}
            className="group relative overflow-hidden rounded-3xl bg-white px-5 py-5 text-left text-black shadow-sm"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 to-black/5" />
            <div className="flex items-start justify-between">
              <div className="rounded-2xl bg-black/5 p-2">
                <Plus className="h-5 w-5" />
              </div>
              <ArrowRight className="h-5 w-5 opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-80" />
            </div>
            <div className="mt-4 text-base font-semibold">
              Start your first session
            </div>
            <div className="mt-1 text-sm text-black/60">
              Connect a repository and begin working.
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-black/60">
              <KeyHint keys="Ctrl K" />
              <span>Command palette anytime</span>
            </div>
          </motion.button>

          {/* Secondary action cards */}
          <button
            onClick={onOpen}
            className="group rounded-3xl bg-white/5 px-5 py-5 text-left text-white ring-1 ring-white/10 transition hover:bg-white/10"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-2xl bg-white/5 p-2 ring-1 ring-white/10">
                <FolderOpen className="h-5 w-5" />
              </div>
              <ArrowRight className="h-5 w-5 opacity-50 transition group-hover:translate-x-0.5" />
            </div>
            <div className="mt-4 text-base font-semibold">
              Open an existing session
            </div>
            <div className="mt-1 text-sm text-white/60">
              Pick up where you left off.
            </div>
          </button>

          <button
            onClick={onImport}
            className="group rounded-3xl bg-white/5 px-5 py-5 text-left text-white ring-1 ring-white/10 transition hover:bg-white/10"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-2xl bg-white/5 p-2 ring-1 ring-white/10">
                <Upload className="h-5 w-5" />
              </div>
              <ArrowRight className="h-5 w-5 opacity-50 transition group-hover:translate-x-0.5" />
            </div>
            <div className="mt-4 text-base font-semibold">
              Import a conversation
            </div>
            <div className="mt-1 text-sm text-white/60">
              Markdown, JSON, or plain text.
            </div>
          </button>
        </div>

        {/* Feature badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-xs text-white/55">
          <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
            Plan Mode by default
          </span>
          <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
            Auditable execution
          </span>
          <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
            Review diffs before Ship
          </span>
        </div>

        <div className="mt-6 text-center text-xs text-white/45">
          Tip: Press{' '}
          <span className="font-semibold text-white/65">Ctrl+K</span> to open
          commands.
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast notification
// ─────────────────────────────────────────────────────────────────────────────

function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="fixed bottom-6 right-6 z-[60] rounded-2xl bg-white/10 px-4 py-3 text-sm text-white ring-1 ring-white/15 backdrop-blur"
    >
      {message}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Convert terminal sessions to dashboard sessions
// ─────────────────────────────────────────────────────────────────────────────

function formatLastActive(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function terminalSessionToDashboardSession(terminalSession: ReturnType<typeof useTerminalStore.getState>['sessions'][0]): Session {
  return {
    id: terminalSession.id,
    title: terminalSession.repoId || 'Untitled Session',
    repo: terminalSession.repoId || 'local',
    branch: terminalSession.worktree?.branchName || 'main',
    lastActive: formatLastActive(new Date(terminalSession.lastActivityAt)),
    mode: terminalSession.mode === 'plan' ? 'Plan' : 'Direct',
    health: terminalSession.status === 'running' ? 'Running' :
            terminalSession.status === 'error' ? 'Error' : 'Clean',
    pinned: terminalSession.isBookmarked,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Home Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();
  const { sessions: terminalSessions, loadSessions, closeSession, switchSession, updateSession, createSession } = useTerminalStore();
  const { repos, workspaces, token, loadData, isLoading: isLoadingAppData } = useAppStore();
  const [showNewSession, setShowNewSession] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const hasLoadedSessions = useRef(false);
  const hasLoadedData = useRef(false);

  // New Session Modal state
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);
  const [repoSearch, setRepoSearch] = useState('');
  const [highlightedRepoIndex, setHighlightedRepoIndex] = useState(0);
  const [showCreateRepoForm, setShowCreateRepoForm] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [createRepoWorkspaceId, setCreateRepoWorkspaceId] = useState<string>('');
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [createRepoError, setCreateRepoError] = useState<string | null>(null);

  // Worktree state
  const [worktreeMode, setWorktreeMode] = useState(false);
  const [worktreeAction, setWorktreeAction] = useState<'create' | 'existing'>('create');
  const [worktreeBranch, setWorktreeBranch] = useState('');
  const [worktreeBaseBranch, setWorktreeBaseBranch] = useState('');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [mainBranch, setMainBranch] = useState<string>('main');
  const [existingWorktrees, setExistingWorktrees] = useState<Array<{ path: string; branch: string; isMain?: boolean }>>([]);
  const [selectedWorktreePath, setSelectedWorktreePath] = useState('');
  const [loadingWorktrees, setLoadingWorktrees] = useState(false);

  // Load sessions on mount (with StrictMode protection)
  useEffect(() => {
    if (hasLoadedSessions.current) return;
    hasLoadedSessions.current = true;
    loadSessions();
  }, [loadSessions]);

  // Load app data on mount
  useEffect(() => {
    if (hasLoadedData.current) return;
    hasLoadedData.current = true;
    loadData();
  }, [loadData]);

  // Set default createRepoWorkspaceId when workspaces load
  useEffect(() => {
    if (workspaces.length > 0 && !createRepoWorkspaceId) {
      setCreateRepoWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, createRepoWorkspaceId]);

  // Filter repos based on selected workspace
  const filteredRepos = useMemo(() => {
    if (!selectedWorkspaceId) {
      return repos;
    }
    return repos.filter((repo) => repo.workspaceId === selectedWorkspaceId);
  }, [repos, selectedWorkspaceId]);

  // Group repos by workspace (for "All Workspaces" view)
  const reposByWorkspace = useMemo(() => {
    const grouped: Record<string, typeof repos> = {};
    repos.forEach((repo) => {
      const wsId = repo.workspaceId || 'unknown';
      if (!grouped[wsId]) {
        grouped[wsId] = [];
      }
      grouped[wsId].push(repo);
    });
    return grouped;
  }, [repos]);

  // Fetch branches for a repository
  const fetchBranchesForRepo = useCallback(async (repoId: string) => {
    setLoadingBranches(true);
    try {
      const data = await api<{
        branches: string[];
        mainBranch: string;
      }>('GET', `/terminal/repos/${repoId}/branches?fetch=true`);
      setAvailableBranches(data.branches);
      setMainBranch(data.mainBranch || 'main');
      if (!worktreeBaseBranch) {
        setWorktreeBaseBranch(data.mainBranch || 'main');
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      setAvailableBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  }, [worktreeBaseBranch]);

  // Fetch existing worktrees for a repository
  const fetchWorktreesForRepo = useCallback(async (repoId: string) => {
    setLoadingWorktrees(true);
    try {
      const data = await api<Array<{ path: string; branch: string; isMain?: boolean }>>(
        'GET',
        `/terminal/repos/${repoId}/worktrees`
      );
      const worktreesOnly = (data || []).filter((wt) => !wt.isMain);
      setExistingWorktrees(worktreesOnly);
      if (worktreesOnly.length > 0) {
        setSelectedWorktreePath(worktreesOnly[0].path);
      } else {
        setSelectedWorktreePath('');
      }
    } catch (error) {
      console.error('Failed to fetch worktrees:', error);
      setExistingWorktrees([]);
      setSelectedWorktreePath('');
    } finally {
      setLoadingWorktrees(false);
    }
  }, []);

  // Auto-fetch branches when worktree mode is enabled and repos are selected
  useEffect(() => {
    if (worktreeMode && selectedRepoIds.length >= 1) {
      fetchBranchesForRepo(selectedRepoIds[0]);
      fetchWorktreesForRepo(selectedRepoIds[0]);
    } else {
      setAvailableBranches([]);
      setWorktreeBaseBranch('');
      setExistingWorktrees([]);
      setSelectedWorktreePath('');
      setWorktreeAction('create');
    }
  }, [worktreeMode, selectedRepoIds, fetchBranchesForRepo, fetchWorktreesForRepo]);

  // Handle inline create repo
  const handleCreateRepoInline = useCallback(async () => {
    const targetWorkspaceId = selectedWorkspaceId || createRepoWorkspaceId;
    if (!newRepoName.trim() || !targetWorkspaceId) return;

    setIsCreatingRepo(true);
    setCreateRepoError(null);

    try {
      const response = await fetch(`/api/workspaces/${targetWorkspaceId}/repos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ repoName: newRepoName.trim() }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create repository');
      }

      await loadData({ forceRefresh: true });
      setNewRepoName('');
      setShowCreateRepoForm(false);
      setIsCreatingRepo(false);
    } catch (err) {
      setCreateRepoError(err instanceof Error ? err.message : 'Failed to create repository');
      setIsCreatingRepo(false);
    }
  }, [newRepoName, selectedWorkspaceId, createRepoWorkspaceId, token, loadData]);

  // Handle create session
  const handleCreateSession = useCallback(async () => {
    if (selectedRepoIds.length === 0) return;

    let options: { worktreeMode: boolean; branch?: string; baseBranch?: string; existingWorktreePath?: string } | undefined;

    if (worktreeMode) {
      if (worktreeAction === 'existing' && selectedWorktreePath) {
        options = {
          worktreeMode: true,
          existingWorktreePath: selectedWorktreePath,
        };
      } else if (worktreeAction === 'create' && worktreeBranch) {
        options = {
          worktreeMode: true,
          branch: worktreeBranch,
          ...(worktreeBaseBranch ? { baseBranch: worktreeBaseBranch } : {}),
        };
      }
    }

    await createSession(
      selectedRepoIds.length === 1 ? selectedRepoIds[0] : selectedRepoIds,
      options
    );

    // Clean up modal state
    setShowNewSession(false);
    setSelectedRepoIds([]);
    setRepoSearch('');
    setWorktreeMode(false);
    setWorktreeAction('create');
    setWorktreeBranch('');
    setWorktreeBaseBranch('');
    setAvailableBranches([]);
    setExistingWorktrees([]);
    setSelectedWorktreePath('');

    // Navigate to terminal page to view the new session
    navigate('/terminal');
  }, [selectedRepoIds, worktreeMode, worktreeAction, worktreeBranch, worktreeBaseBranch, selectedWorktreePath, createSession, navigate]);

  // Toggle repo selection
  const toggleRepoSelection = useCallback((repoId: string) => {
    setSelectedRepoIds((prev) =>
      prev.includes(repoId) ? prev.filter((id) => id !== repoId) : [...prev, repoId]
    );
  }, []);

  // Convert terminal sessions to dashboard format
  const sessions = useMemo(() =>
    terminalSessions.map(terminalSessionToDashboardSession),
    [terminalSessions]
  );

  const fireToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  // Global keyboard shortcuts (only for empty state)
  useEffect(() => {
    if (sessions.length > 0) return; // Dashboard has its own shortcuts

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        fireToast('Command palette (coming soon)');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowNewSession(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessions.length]);

  const handleOpenSession = () => {
    navigate('/terminal');
  };

  const handleImport = () => {
    fireToast('Import feature coming soon');
  };

  const handleSessionsChange = (updatedSessions: Session[]) => {
    // Update pinned status for sessions
    updatedSessions.forEach((session) => {
      const original = sessions.find((s) => s.id === session.id);
      if (original && original.pinned !== session.pinned) {
        updateSession(session.id, { isBookmarked: session.pinned });
      }
    });
  };

  const handleDeleteSession = (id: string) => {
    // Permanently delete the session
    closeSession(id);
  };

  const handleOpenSessionFromDashboard = (session: Session) => {
    // Switch to this session in the store
    switchSession(session.id);
    navigate('/terminal');
  };

  // Show dashboard if there are sessions
  if (sessions.length > 0) {
    return (
      <>
        <SessionDashboard
          sessions={sessions}
          onSessionsChange={handleSessionsChange}
          onNewSession={() => {
            // Set default workspace if not selected
            if (!selectedWorkspaceId && workspaces.length > 0) {
              setSelectedWorkspaceId(workspaces[0].id);
            }
            setShowNewSession(true);
          }}
          onOpenSession={handleOpenSessionFromDashboard}
          onDeleteSession={handleDeleteSession}
        />
        <NewSessionModal
          isOpen={showNewSession}
          onClose={() => setShowNewSession(false)}
          onCreateSession={handleCreateSession}
          workspaces={workspaces}
          repos={repos}
          isLoadingAppData={isLoadingAppData}
          selectedWorkspaceId={selectedWorkspaceId}
          onWorkspaceChange={setSelectedWorkspaceId}
          selectedRepoIds={selectedRepoIds}
          onToggleRepoSelection={toggleRepoSelection}
          repoSearch={repoSearch}
          onRepoSearchChange={setRepoSearch}
          highlightedRepoIndex={highlightedRepoIndex}
          onHighlightedRepoIndexChange={setHighlightedRepoIndex}
          filteredRepos={filteredRepos}
          reposByWorkspace={reposByWorkspace}
          showCreateRepoForm={showCreateRepoForm}
          onShowCreateRepoForm={setShowCreateRepoForm}
          newRepoName={newRepoName}
          onNewRepoNameChange={setNewRepoName}
          createRepoWorkspaceId={createRepoWorkspaceId}
          onCreateRepoWorkspaceIdChange={setCreateRepoWorkspaceId}
          isCreatingRepo={isCreatingRepo}
          createRepoError={createRepoError}
          onCreateRepoInline={handleCreateRepoInline}
          worktreeMode={worktreeMode}
          onWorktreeModeChange={setWorktreeMode}
          worktreeAction={worktreeAction}
          onWorktreeActionChange={setWorktreeAction}
          worktreeBranch={worktreeBranch}
          onWorktreeBranchChange={setWorktreeBranch}
          worktreeBaseBranch={worktreeBaseBranch}
          onWorktreeBaseBranchChange={setWorktreeBaseBranch}
          availableBranches={availableBranches}
          loadingBranches={loadingBranches}
          mainBranch={mainBranch}
          existingWorktrees={existingWorktrees}
          selectedWorktreePath={selectedWorktreePath}
          onSelectedWorktreePathChange={setSelectedWorktreePath}
          loadingWorktrees={loadingWorktrees}
        />
      </>
    );
  }

  // Show empty state for new users
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#05070c] text-white">
      {/* Background texture */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent" />
        <div className="absolute -top-24 left-1/2 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col overflow-hidden min-h-0">
        <AppHeader
          subtitle="Your personal AI development desk"
          actions={
            <>
              <HeaderButton
                onClick={() => setShowNewSession(true)}
                icon={<Plus className="h-4 w-4" />}
                label="New"
                variant="primary"
              />
            </>
          }
        />

        <HomeEmptyState
          onStart={() => setShowNewSession(true)}
          onOpen={handleOpenSession}
          onImport={handleImport}
        />
      </div>

      <NewSessionModal
        isOpen={showNewSession}
        onClose={() => setShowNewSession(false)}
        onCreateSession={handleCreateSession}
        workspaces={workspaces}
        repos={repos}
        isLoadingAppData={isLoadingAppData}
        selectedWorkspaceId={selectedWorkspaceId}
        onWorkspaceChange={setSelectedWorkspaceId}
        selectedRepoIds={selectedRepoIds}
        onToggleRepoSelection={toggleRepoSelection}
        repoSearch={repoSearch}
        onRepoSearchChange={setRepoSearch}
        highlightedRepoIndex={highlightedRepoIndex}
        onHighlightedRepoIndexChange={setHighlightedRepoIndex}
        filteredRepos={filteredRepos}
        reposByWorkspace={reposByWorkspace}
        showCreateRepoForm={showCreateRepoForm}
        onShowCreateRepoForm={setShowCreateRepoForm}
        newRepoName={newRepoName}
        onNewRepoNameChange={setNewRepoName}
        createRepoWorkspaceId={createRepoWorkspaceId}
        onCreateRepoWorkspaceIdChange={setCreateRepoWorkspaceId}
        isCreatingRepo={isCreatingRepo}
        createRepoError={createRepoError}
        onCreateRepoInline={handleCreateRepoInline}
        worktreeMode={worktreeMode}
        onWorktreeModeChange={setWorktreeMode}
        worktreeAction={worktreeAction}
        onWorktreeActionChange={setWorktreeAction}
        worktreeBranch={worktreeBranch}
        onWorktreeBranchChange={setWorktreeBranch}
        worktreeBaseBranch={worktreeBaseBranch}
        onWorktreeBaseBranchChange={setWorktreeBaseBranch}
        availableBranches={availableBranches}
        loadingBranches={loadingBranches}
        mainBranch={mainBranch}
        existingWorktrees={existingWorktrees}
        selectedWorktreePath={selectedWorktreePath}
        onSelectedWorktreePathChange={setSelectedWorktreePath}
        loadingWorktrees={loadingWorktrees}
      />

      <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>
    </div>
  );
}
