import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Command,
  Search,
  Plus,
  Star,
  Clock,
  GitBranch,
  ChevronRight,
  Filter,
  X,
  TriangleAlert,
  Play,
  Layers,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { AppHeader, HeaderButton } from '@/components/ui/AppHeader';
import type { Session, SessionHealth } from '@/types/session';

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode;
  tone?: 'neutral' | 'subtle';
}

function Badge({ children, tone = 'neutral' }: BadgeProps) {
  const tones: Record<string, string> = {
    neutral: 'bg-white/5 text-white/75 ring-white/10',
    subtle: 'bg-white/5 text-white/60 ring-white/10',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1',
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}


function HealthPill({ health }: { health: SessionHealth }) {
  const icon =
    health === 'Error' ? (
      <TriangleAlert className="h-3.5 w-3.5" />
    ) : health === 'Running' ? (
      <Play className="h-3.5 w-3.5" />
    ) : (
      <Layers className="h-3.5 w-3.5" />
    );

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/70 ring-1 ring-white/10">
      {icon}
      {health}
    </span>
  );
}

interface SessionCardProps {
  session: Session;
  onOpen: (id: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  isLastActive?: boolean;
  isFocused?: boolean;
}

function SessionCard({ session: s, onOpen, onPin, onDelete, isLastActive, isFocused }: SessionCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(s.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(s.id);
        }
      }}
      className={cn(
        "group w-full rounded-3xl bg-white/5 p-4 text-left ring-1 ring-white/10 transition hover:bg-white/10 cursor-pointer",
        isFocused && "ring-2 ring-blue-500 outline-none"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 truncate text-sm font-semibold text-white">
              {s.title}
            </div>
            {s.health !== 'Clean' && <HealthPill health={s.health} />}
            {isLastActive && (
              <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 text-xs rounded-full ring-1 ring-blue-500/30">
                Last active
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/55">
            <Badge tone="subtle">{s.repo}</Badge>
            <span className="text-white/35">•</span>
            <span className="inline-flex items-center gap-1">
              <GitBranch className="h-3.5 w-3.5" />
              <span className="truncate">{s.branch}</span>
            </span>
            <span className="text-white/35">•</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {s.lastActive}
            </span>
          </div>

          <div className="mt-3 inline-flex items-center gap-2">
            {s.mode === 'Direct' && <Badge>{s.mode} Mode</Badge>}
            {s.pinned && <Badge>Pinned</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(s.id);
            }}
            className="rounded-2xl bg-white/5 px-3 py-2 text-white/60 ring-1 ring-white/10 transition hover:bg-red-500/20 hover:text-red-400 hover:ring-red-500/30 opacity-0 group-hover:opacity-100 duration-200 touch:opacity-100"
            aria-label="Delete session"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPin(s.id);
            }}
            className={cn(
              'rounded-2xl px-3 py-2 ring-1 transition',
              s.pinned
                ? 'bg-white text-black ring-white hover:opacity-90'
                : 'bg-white/5 text-white ring-white/10 hover:bg-white/10'
            )}
            aria-label={s.pinned ? 'Unpin' : 'Pin'}
          >
            <Star className={cn('h-4 w-4', s.pinned ? 'fill-black' : '')} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface SheetProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

function Sheet({ title, children, onClose }: SheetProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: 18, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 18, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="absolute right-0 top-0 h-full w-full max-w-md overflow-hidden bg-[#0b0f16] p-5 ring-1 ring-white/10"
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-white">{title}</div>
          <button
            onClick={onClose}
            className="rounded-2xl bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10 transition hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </motion.div>
    </div>
  );
}

interface ToastProps {
  message: string;
  onUndo?: () => void;
}

function Toast({ message, onUndo }: ToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="fixed bottom-6 right-6 z-[60] rounded-2xl bg-white/10 px-4 py-3 text-sm text-white ring-1 ring-white/15 backdrop-blur flex items-center gap-3"
    >
      <span>{message}</span>
      {onUndo && (
        <button
          onClick={onUndo}
          className="rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition"
        >
          Undo
        </button>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────

interface SessionDashboardProps {
  sessions: Session[];
  onSessionsChange: (sessions: Session[]) => void;
  onNewSession: () => void;
  onOpenSession?: (session: Session) => void;
  onDeleteSession?: (id: string) => void;
}

export default function SessionDashboard({
  sessions,
  onSessionsChange,
  onNewSession,
  onOpenSession,
  onDeleteSession,
}: SessionDashboardProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Pinned'>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [modeFilter, setModeFilter] = useState<'Plan' | 'Direct' | null>(null);
  const [healthFilter, setHealthFilter] = useState<SessionHealth | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastUndo, setToastUndo] = useState<(() => void) | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

  // Filter out pending deletion from displayed sessions
  const visibleSessions = useMemo(() =>
    pendingDeleteId ? sessions.filter(s => s.id !== pendingDeleteId) : sessions,
    [sessions, pendingDeleteId]
  );

  const pinnedCount = visibleSessions.filter((s) => s.pinned).length;

  const filtered = useMemo(() => {
    let base = activeTab === 'Pinned' ? visibleSessions.filter((s) => s.pinned) : visibleSessions;

    // Apply mode filter
    if (modeFilter) {
      base = base.filter((s) => s.mode === modeFilter);
    }

    // Apply health filter
    if (healthFilter) {
      base = base.filter((s) => s.health === healthFilter);
    }

    // Apply search query
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((s) =>
      [s.title, s.repo, s.branch, s.mode, s.health, s.lastActive].some((v) =>
        v.toLowerCase().includes(q)
      )
    );
  }, [visibleSessions, query, activeTab, modeFilter, healthFilter]);

  const fireToast = (message: string, onUndo?: () => void) => {
    setToast(message);
    setToastUndo(() => onUndo || null);
    const timer = setTimeout(() => {
      setToast(null);
      setToastUndo(null);
    }, 5000);

    // Store timer for cleanup
    if (undoTimer) clearTimeout(undoTimer);
    setUndoTimer(timer);
  };

  const handlePin = (id: string) => {
    onSessionsChange(
      sessions.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
    );
  };

  const handleOpenSession = (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;

    // Update lastActive timestamp
    onSessionsChange(
      sessions.map((s) =>
        s.id === id ? { ...s, lastActive: 'Just now' } : s
      )
    );

    // Use callback if provided, otherwise navigate directly
    if (onOpenSession) {
      onOpenSession(session);
    } else {
      navigate('/terminal', {
        state: {
          sessionId: session.id,
          repo: session.repo,
          sessionName: session.title,
          mode: session.mode,
          branch: session.branch,
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;

    // Clear any existing undo timer
    if (undoTimer) {
      clearTimeout(undoTimer);
    }

    // Mark as pending deletion (hides from UI immediately)
    setPendingDeleteId(id);

    // Create timer for permanent deletion
    const timer = setTimeout(() => {
      // After 5 seconds, permanently delete
      setPendingDeleteId(null);
      setToast(null);
      setToastUndo(null);
      // Call the actual delete callback
      if (onDeleteSession) {
        onDeleteSession(id);
      }
    }, 5000);

    setUndoTimer(timer);

    // Show toast with undo
    setToast(`Deleted "${session.title}"`);
    setToastUndo(() => () => {
      // Undo: cancel deletion and restore visibility
      clearTimeout(timer);
      setPendingDeleteId(null);
      setUndoTimer(null);
      setToast(null);
      setToastUndo(null);
    });
  };

  const handleResetFilters = () => {
    setQuery('');
    setActiveTab('All');
    setModeFilter(null);
    setHealthFilter(null);
    setShowFilters(false);
    fireToast('Filters reset');
  };

  // Global keyboard shortcuts including navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        fireToast('Command palette (coming soon)');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        onNewSession();
        return;
      }

      // Navigation (only when not in input field)
      const activeElement = document.activeElement;
      const isInInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

      if (!isInInput && filtered.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev === -1 ? 0 : Math.min(prev + 1, filtered.length - 1);
            return next;
          });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < filtered.length) {
          e.preventDefault();
          handleOpenSession(filtered[focusedIndex].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewSession, filtered, focusedIndex]);

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
          subtitle="Resume work across sessions"
          actions={
            <>
              <HeaderButton
                onClick={onNewSession}
                icon={<Plus className="h-4 w-4" />}
                label="New"
                variant="primary"
              />
            </>
          }
        />

        <div className="flex-1 flex flex-col overflow-hidden min-h-0 w-full px-6">
          {/* Header row */}
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-[360px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search sessions, repos, branches..."
                  className="w-full rounded-2xl bg-white/5 py-2 pl-10 pr-3 text-sm text-white placeholder:text-white/35 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {sessions.length >= 5 && (
                <button
                  onClick={() => setShowFilters(true)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ring-1 transition',
                    modeFilter || healthFilter
                      ? 'bg-white text-black ring-white'
                      : 'bg-white/5 text-white/80 ring-white/10 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {(modeFilter || healthFilter) && (
                    <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-xs">
                      {(modeFilter ? 1 : 0) + (healthFilter ? 1 : 0)}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex items-center gap-2">
            <button
              onClick={() => setActiveTab('All')}
              className={cn(
                'rounded-2xl px-3 py-1.5 text-sm ring-1 transition',
                activeTab === 'All'
                  ? 'bg-white text-black ring-white'
                  : 'bg-white/5 text-white/80 ring-white/10 hover:bg-white/10'
              )}
            >
              All
            </button>
            {pinnedCount > 0 && (
              <button
                onClick={() => setActiveTab('Pinned')}
                className={cn(
                  'rounded-2xl px-3 py-1.5 text-sm ring-1 transition',
                  activeTab === 'Pinned'
                    ? 'bg-white text-black ring-white'
                    : 'bg-white/5 text-white/80 ring-white/10 hover:bg-white/10'
                )}
              >
                Pinned
                <span
                  className={cn(
                    'ml-2 rounded-full px-2 py-0.5 text-xs',
                    activeTab === 'Pinned' ? 'bg-black/10' : 'bg-white/10'
                  )}
                >
                  {pinnedCount}
                </span>
              </button>
            )}
          </div>

          {/* Session list */}
          <div className="mt-4 flex-1 overflow-y-auto min-h-0 grid gap-3 content-start pb-4">
            {filtered.length === 0 ? (
              <div className="rounded-3xl bg-white/5 p-6 text-sm text-white/70 ring-1 ring-white/10">
                No sessions found.
              </div>
            ) : (
              filtered.map((s, index) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onOpen={handleOpenSession}
                  onPin={handlePin}
                  onDelete={handleDelete}
                  isLastActive={index === 0}
                  isFocused={focusedIndex === index}
                />
              ))
            )}
          </div>
        </div>

        {/* Filter sheet */}
        <AnimatePresence>
          {showFilters && (
            <Sheet title="Filters" onClose={() => setShowFilters(false)}>
              <div className="space-y-4">
                <div className="text-xs text-white/60">
                  Filter sessions by mode and health status.
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-white/70">Mode</div>
                  <div className="flex gap-2">
                    {(['Plan', 'Direct'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setModeFilter(modeFilter === m ? null : m)}
                        className={cn(
                          'rounded-2xl px-3 py-2 text-sm ring-1 transition',
                          modeFilter === m
                            ? 'bg-white text-black ring-white'
                            : 'bg-white/5 text-white ring-white/10 hover:bg-white/10'
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-white/70">Health</div>
                  <div className="flex flex-wrap gap-2">
                    {(['Clean', 'Changes', 'Running', 'Error'] as const).map(
                      (h) => (
                        <button
                          key={h}
                          onClick={() =>
                            setHealthFilter(healthFilter === h ? null : h)
                          }
                          className={cn(
                            'rounded-2xl px-3 py-2 text-sm ring-1 transition',
                            healthFilter === h
                              ? 'bg-white text-black ring-white'
                              : 'bg-white/5 text-white ring-white/10 hover:bg-white/10'
                          )}
                        >
                          {h}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleResetFilters}
                    className="w-full rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </Sheet>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && <Toast message={toast} onUndo={toastUndo || undefined} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
