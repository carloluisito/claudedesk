import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Command,
  Search,
  Plus,
  SplitSquareVertical,
  GitBranch,
  Files,
  Play,
  Rocket,
  Mic,
  Paperclip,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  Wand2,
  Terminal,
  ArrowLeft,
  Copy,
  Bookmark,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type {
  TimelineItem,
  TimelineItemKind,
  TimelineItemStatus,
  Message,
  SessionTab,
  FileChange,
} from '@/types/terminal';
import type { SessionMode } from '@/types/session';

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70 ring-1 ring-white/10">
      {children}
    </span>
  );
}

interface TopBarProps {
  onBack: () => void;
  onNewSession: () => void;
  onOpenPalette: () => void;
  onSearch: () => void;
  onSplit: () => void;
}

function TopBar({ onBack, onNewSession, onOpenPalette, onSearch, onSplit }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-2xl bg-white/5 p-2 text-white ring-1 ring-white/10 transition hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative">
          <div className="h-10 w-10 rounded-2xl bg-white/10 ring-1 ring-white/15" />
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-white">
              ClaudeDesk
            </span>
            <Badge>Terminal</Badge>
          </div>
          <div className="text-xs text-white/55">
            Session tabs, execution visibility, safe shipping
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onSearch}
          className="group hidden items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm text-white/80 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white sm:inline-flex"
        >
          <Search className="h-4 w-4" />
          Search
          <span className="ml-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/60 ring-1 ring-white/10">
            Ctrl Shift F
          </span>
        </button>
        <button
          onClick={onOpenPalette}
          className="group inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm text-white/80 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
        >
          <Command className="h-4 w-4" />
          <span className="hidden sm:inline">Commands</span>
          <span className="ml-1 hidden rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/60 ring-1 ring-white/10 sm:inline">
            Ctrl K
          </span>
        </button>
        <button
          onClick={onSplit}
          className="hidden items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm text-white/80 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white sm:inline-flex"
        >
          <SplitSquareVertical className="h-4 w-4" />
          Split
        </button>
        <button
          onClick={onNewSession}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New</span>
        </button>
      </div>
    </div>
  );
}

interface TabStripProps {
  tabs: SessionTab[];
  activeId: string;
  onSelect: (id: string) => void;
}

function TabStrip({ tabs, activeId, onSelect }: TabStripProps) {
  return (
    <div className="w-full px-6">
      <div className="rounded-3xl bg-white/5 p-2 ring-1 ring-white/10">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {tabs.map((t) => {
            const active = t.id === activeId;
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className={cn(
                  'flex min-w-[240px] items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left ring-1 transition',
                  active
                    ? 'bg-white text-black ring-white'
                    : 'bg-white/5 text-white ring-white/10 hover:bg-white/10'
                )}
              >
                <div className="min-w-0">
                  <div
                    className={cn(
                      'truncate text-sm font-semibold',
                      active ? 'text-black' : 'text-white'
                    )}
                  >
                    {t.name}
                  </div>
                  <div
                    className={cn(
                      'mt-0.5 flex items-center gap-2 text-xs',
                      active ? 'text-black/60' : 'text-white/55'
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Terminal className="h-3.5 w-3.5" />
                      {t.repo}
                    </span>
                    <span className={active ? 'text-black/35' : 'text-white/35'}>
                      •
                    </span>
                    <span className="inline-flex items-center gap-1 truncate">
                      <GitBranch className="h-3.5 w-3.5" />
                      <span className="truncate">{t.branch}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {t.dirtyFiles > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-xs ring-1',
                        active
                          ? 'bg-black/5 text-black ring-black/10'
                          : 'bg-white/5 text-white/70 ring-white/10'
                      )}
                    >
                      <span className="font-semibold">{t.dirtyFiles}</span>
                      <span className="ml-1">changes</span>
                    </span>
                  )}
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 opacity-60',
                      active ? 'text-black/60' : 'text-white/60'
                    )}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface PanelHeaderProps {
  title: string;
  right?: React.ReactNode;
}

function PanelHeader({ title, right }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm font-semibold text-white">{title}</div>
      {right}
    </div>
  );
}

interface ModeToggleProps {
  mode: SessionMode;
  onToggle: () => void;
}

function ModeToggle({ mode, onToggle }: ModeToggleProps) {
  const isPlan = mode === 'Plan';
  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10 transition hover:bg-white/10"
    >
      {isPlan ? <Shield className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
      <span className="font-medium">{mode} Mode</span>
      <span className="hidden rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/60 ring-1 ring-white/10 sm:inline">
        Ctrl Shift P
      </span>
    </button>
  );
}

interface QuotaChipProps {
  label: string;
  pct: number;
}

function QuotaChip({ label, pct }: QuotaChipProps) {
  const clampedPct = Math.max(0, Math.min(100, pct));
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10">
      <span className="text-xs text-white/60">{label}</span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-white/60 transition-all"
          style={{ width: `${clampedPct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-white/75">{pct}%</span>
    </div>
  );
}

interface TimelineProps {
  items: TimelineItem[];
}

function Timeline({ items }: TimelineProps) {
  const iconFor = (k: TimelineItemKind) => {
    switch (k) {
      case 'read':
        return <Files className="h-4 w-4" />;
      case 'edit':
        return <Wand2 className="h-4 w-4" />;
      case 'bash':
        return <Terminal className="h-4 w-4" />;
      case 'web':
        return <Search className="h-4 w-4" />;
      default:
        return <Files className="h-4 w-4" />;
    }
  };

  const statusIcon = (s: TimelineItemStatus) => {
    if (s === 'ok') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    if (s === 'error') return <XCircle className="h-4 w-4 text-red-400" />;
    return <Loader2 className="h-4 w-4 animate-spin text-white/60" />;
  };

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div
          key={it.id}
          className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10">
              {iconFor(it.kind)}
            </span>
            <span className="min-w-0 truncate text-white/80">{it.label}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/55">
            <span className="inline-flex items-center gap-1">
              {statusIcon(it.status)}
            </span>
            {it.status !== 'running' && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {(it.ms / 1000).toFixed(2)}s
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  onCopy: () => void;
}

function MessageBubble({ message: m, onCopy }: MessageBubbleProps) {
  const isUser = m.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[84%] rounded-3xl px-4 py-3 ring-1',
          isUser
            ? 'bg-white text-black ring-white'
            : 'bg-white/5 text-white ring-white/10'
        )}
      >
        {m.meta && (
          <div className={cn('text-xs', isUser ? 'text-black/60' : 'text-white/55')}>
            {m.meta}
          </div>
        )}
        <pre
          className={cn(
            'mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed',
            isUser ? 'text-black' : 'text-white/85'
          )}
        >
          {m.text}
        </pre>
        <div
          className={cn(
            'mt-3 flex items-center gap-2 text-xs',
            isUser ? 'text-black/60' : 'text-white/55'
          )}
        >
          <button
            onClick={onCopy}
            className={cn(
              'inline-flex items-center gap-1 rounded-2xl px-2 py-1 ring-1 transition',
              isUser
                ? 'bg-black/5 ring-black/10 hover:bg-black/10'
                : 'bg-white/5 ring-white/10 hover:bg-white/10'
            )}
          >
            <Copy className="h-3 w-3" />
            Copy
          </button>
          <button
            className={cn(
              'inline-flex items-center gap-1 rounded-2xl px-2 py-1 ring-1 transition',
              isUser
                ? 'bg-black/5 ring-black/10 hover:bg-black/10'
                : 'bg-white/5 ring-white/10 hover:bg-white/10'
            )}
          >
            <Bookmark className="h-3 w-3" />
            Bookmark
          </button>
          {!isUser && (
            <button className="inline-flex items-center gap-1 rounded-2xl bg-white/5 px-2 py-1 ring-1 ring-white/10 transition hover:bg-white/10">
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ComposerProps {
  onSend: (text: string) => void;
  mode: SessionMode;
  onToggleMode: () => void;
}

function Composer({ onSend, mode, onToggleMode }: ComposerProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        onSend(text);
        setText('');
      }
    }
  };

  return (
    <div className="rounded-3xl bg-white/5 p-3 ring-1 ring-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ModeToggle mode={mode} onToggle={onToggleMode} />
        <div className="hidden items-center gap-2 sm:flex">
          <QuotaChip label="5h" pct={38} />
          <QuotaChip label="7d" pct={61} />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Claude..."
            className="min-h-[90px] w-full resize-none rounded-2xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-white/45">
            <span>Enter to send · Shift+Enter for newline</span>
            <span className="hidden sm:inline">Attachments supported</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            className="rounded-2xl bg-white/5 p-3 text-white ring-1 ring-white/10 transition hover:bg-white/10"
            aria-label="Attach"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            className="rounded-2xl bg-white/5 p-3 text-white ring-1 ring-white/10 transition hover:bg-white/10"
            aria-label="Voice"
          >
            <Mic className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              if (text.trim()) {
                onSend(text);
                setText('');
              }
            }}
            className="rounded-2xl bg-white p-3 text-black ring-1 ring-white transition hover:opacity-90"
            aria-label="Send"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ChangesCardProps {
  changes: FileChange[];
  onViewDiffs: () => void;
}

function ChangesCard({ changes, onViewDiffs }: ChangesCardProps) {
  return (
    <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
      <PanelHeader
        title="Changes"
        right={
          <button
            onClick={onViewDiffs}
            className="rounded-2xl bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10 transition hover:bg-white/10"
          >
            View all diffs
          </button>
        }
      />
      <div className="mt-3 space-y-2">
        {changes.map((x) => (
          <div
            key={x.path}
            className="flex items-center justify-between gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          >
            <div className="min-w-0 truncate text-white/80">{x.path}</div>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/60 ring-1 ring-white/10">
              {x.status}
            </span>
          </div>
        ))}
        {changes.length === 0 && (
          <div className="text-sm text-white/55">No changes yet.</div>
        )}
      </div>
    </div>
  );
}

interface ActionRailProps {
  onRun: () => void;
  onShip: () => void;
}

function ActionRail({ onRun, onShip }: ActionRailProps) {
  return (
    <div className="grid gap-3">
      <button
        onClick={onRun}
        className="group inline-flex items-center justify-between rounded-3xl bg-white/5 px-4 py-3 text-left text-white ring-1 ring-white/10 transition hover:bg-white/10"
      >
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          <div>
            <div className="text-sm font-semibold">Run</div>
            <div className="text-xs text-white/55">Preview logs and ports</div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 opacity-60 transition group-hover:translate-x-0.5" />
      </button>

      <button
        onClick={onShip}
        className="group inline-flex items-center justify-between rounded-3xl bg-white px-4 py-3 text-left text-black ring-1 ring-white transition hover:opacity-90"
      >
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          <div>
            <div className="text-sm font-semibold">Ship</div>
            <div className="text-xs text-black/60">Commit and create PR</div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 opacity-60 transition group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

interface SidePanelProps {
  timeline: TimelineItem[];
  changes: FileChange[];
  timelineOpen: boolean;
  onToggleTimeline: () => void;
  onViewDiffs: () => void;
}

function SidePanel({
  timeline,
  changes,
  timelineOpen,
  onToggleTimeline,
  onViewDiffs,
}: SidePanelProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
        <PanelHeader
          title="Execution"
          right={
            <button
              onClick={onToggleTimeline}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              {timelineOpen ? (
                <>
                  Collapse <ChevronDown className="h-4 w-4" />
                </>
              ) : (
                <>
                  Expand <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          }
        />

        <AnimatePresence initial={false}>
          {timelineOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 overflow-hidden"
            >
              <Timeline items={timeline} />
            </motion.div>
          )}
        </AnimatePresence>

        {!timelineOpen && (
          <div className="mt-3 text-xs text-white/55">
            Timeline hidden. Expand to inspect tool activity.
          </div>
        )}
      </div>

      <ChangesCard changes={changes} onViewDiffs={onViewDiffs} />
    </div>
  );
}

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
// Main Terminal Workspace
// ─────────────────────────────────────────────────────────────────────────────

export default function TerminalWorkspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    sessionId?: string;
    repo?: string;
    sessionName?: string;
    mode?: SessionMode;
    branch?: string;
  } | null;

  // Session tabs
  const [tabs, setTabs] = useState<SessionTab[]>(() => {
    const initialTab: SessionTab = {
      id: state?.sessionId || `t${Date.now()}`,
      name: state?.sessionName || 'New Session',
      repo: state?.repo || 'local',
      branch: state?.branch || 'main',
      dirtyFiles: 0,
    };
    return [initialTab];
  });
  const [activeId, setActiveId] = useState(tabs[0].id);

  // Mode
  const [mode, setMode] = useState<SessionMode>(state?.mode || 'Plan');

  // Messages - always start empty
  const [messages, setMessages] = useState<Message[]>([]);

  // Timeline - always start empty
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [timelineOpen, setTimelineOpen] = useState(true);

  // Changes - always start empty
  const [changes, setChanges] = useState<FileChange[]>([]);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeId) || tabs[0],
    [tabs, activeId]
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fireToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: `m${Date.now()}`,
      role: 'user',
      text,
      meta: `${mode} Mode`,
    };
    setMessages((prev) => [...prev, newMessage]);

    // Simulate assistant thinking and response
    setTimeout(() => {
      // Add a timeline item for "thinking"
      const thinkingItem: TimelineItem = {
        id: `t${Date.now()}`,
        kind: 'read',
        label: 'Analyzing request...',
        status: 'running',
        ms: 0,
      };
      setTimeline((prev) => [...prev, thinkingItem]);

      // Simulate response after a delay
      setTimeout(() => {
        // Update timeline item to complete
        setTimeline((prev) =>
          prev.map((t) =>
            t.id === thinkingItem.id ? { ...t, status: 'ok' as const, ms: 1200 } : t
          )
        );

        // Add assistant response
        const response: Message = {
          id: `m${Date.now()}`,
          role: 'assistant',
          text: mode === 'Plan'
            ? `I'll analyze your request and create a plan.\n\nBefore I proceed, I'd like to understand:\n1. What's the scope of changes you're comfortable with?\n2. Are there any files or areas I should avoid modifying?\n\nOnce you confirm, I'll outline the steps I'll take.`
            : `I'll start working on this right away.\n\nProcessing your request...`,
          meta: mode === 'Plan' ? 'Waiting for approval' : 'Working',
        };
        setMessages((prev) => [...prev, response]);
      }, 1200);
    }, 500);

    // Update dirty files count
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeId ? { ...t, dirtyFiles: t.dirtyFiles + 1 } : t
      )
    );
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    fireToast('Copied to clipboard');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        fireToast('Command palette (coming soon)');
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setMode((m) => (m === 'Plan' ? 'Direct' : 'Plan'));
        fireToast(`Switched to ${mode === 'Plan' ? 'Direct' : 'Plan'} Mode`);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        fireToast('Search (coming soon)');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  return (
    <div className="min-h-screen bg-[#05070c] text-white">
      {/* Background texture */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent" />
        <div className="absolute -top-24 left-1/2 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative">
        <TopBar
          onBack={() => navigate('/')}
          onNewSession={() => fireToast('New session')}
          onOpenPalette={() => fireToast('Command palette (coming soon)')}
          onSearch={() => fireToast('Search (coming soon)')}
          onSplit={() => fireToast('Split view (coming soon)')}
        />

        <TabStrip tabs={tabs} activeId={activeId} onSelect={setActiveId} />

        <div className="w-full px-6 pb-14 pt-5">
          {/* Workspace header */}
          <div className="flex flex-col gap-3 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-white">
                {activeTab.name}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/55">
                <span className="inline-flex items-center gap-1">
                  <Terminal className="h-3.5 w-3.5" />
                  {activeTab.repo}
                </span>
                <span className="text-white/35">•</span>
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="h-3.5 w-3.5" />
                  {activeTab.branch}
                </span>
                <span className="text-white/35">•</span>
                <span className="inline-flex items-center gap-1">
                  <Files className="h-3.5 w-3.5" />
                  {activeTab.dirtyFiles} changes
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ModeToggle
                mode={mode}
                onToggle={() => setMode((m) => (m === 'Plan' ? 'Direct' : 'Plan'))}
              />
              <button className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10 transition hover:bg-white/10">
                <Search className="h-4 w-4" />
                Jump to
              </button>
            </div>
          </div>

          {/* Main layout */}
          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            {/* Conversation */}
            <div className="lg:col-span-8">
              <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
                <PanelHeader
                  title="Conversation"
                  right={
                    <div className="flex items-center gap-2">
                      <button className="rounded-2xl bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10 transition hover:bg-white/10">
                        Export
                      </button>
                      <button className="rounded-2xl bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10 transition hover:bg-white/10">
                        Bookmark
                      </button>
                    </div>
                  }
                />

                <div className="mt-4 max-h-[400px] space-y-3 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                        <Terminal className="h-8 w-8 text-white/40" />
                      </div>
                      <p className="mt-4 text-sm text-white/60">
                        Start a conversation with Claude
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        Type a message below to begin
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        onCopy={() => handleCopyMessage(m.text)}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="mt-4">
                  <Composer
                    mode={mode}
                    onToggleMode={() =>
                      setMode((m) => (m === 'Plan' ? 'Direct' : 'Plan'))
                    }
                    onSend={handleSendMessage}
                  />
                </div>
              </div>
            </div>

            {/* Right rail */}
            <div className="space-y-3 lg:col-span-4">
              <ActionRail
                onRun={() => fireToast('Run (coming soon)')}
                onShip={() => fireToast('Ship (coming soon)')}
              />
              <SidePanel
                timeline={timeline}
                changes={changes}
                timelineOpen={timelineOpen}
                onToggleTimeline={() => setTimelineOpen((v) => !v)}
                onViewDiffs={() => fireToast('View diffs (coming soon)')}
              />
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-white/45">
            Tip: ClaudeDesk shows every tool action. Trust comes from visibility.
          </div>
        </div>

        <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>
      </div>
    </div>
  );
}
