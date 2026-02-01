/**
 * IdeaView - Main brainstorming interface
 *
 * Pure chat interface with purple accent color, no phase navigator.
 * Lighter background (#0a0d14), purple avatar ring for Claude.
 * Full-width layout matching PromptPhase.
 */
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  ChevronDown,
  Loader2,
  Send,
  Square,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { cn } from '../../lib/cn';
import { useIdeaStore } from '../../store/ideaStore';
import { useAppStore } from '../../store/appStore';
import { IdeaTitleBar } from './IdeaTitleBar';
import { ContextGauge } from '../terminal/ContextGauge';
import { api } from '../../lib/api';
import type { IdeaChatMessage } from '../../../../types';

interface IdeaViewProps {
  onOpenAttachModal: () => void;
  onOpenPromoteModal: () => void;
}

export function IdeaView({ onOpenAttachModal, onOpenPromoteModal }: IdeaViewProps) {
  const {
    ideas,
    activeIdeaId,
    sendMessage,
    cancelOperation,
    saveIdea,
    updateIdeaTitle,
    detachFromRepo,
    fetchContextState,
  } = useIdeaStore();

  const { repos } = useAppStore();

  const activeIdea = useMemo(
    () => ideas.find((i) => i.id === activeIdeaId),
    [ideas, activeIdeaId]
  );

  const [input, setInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Auto-focus input when view opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeIdeaId]);

  // Fetch context state when idea changes or messages update
  useEffect(() => {
    if (activeIdeaId && activeIdea && activeIdea.messages.length > 0) {
      fetchContextState(activeIdeaId);
    }
  }, [activeIdeaId, fetchContextState, activeIdea?.messages?.length]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [activeIdea?.messages, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setAutoScroll(distanceFromBottom < 50);
    setShowScrollButton(distanceFromBottom > 100);
  }, []);

  const handleScrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setAutoScroll(true);
      setShowScrollButton(false);
    }
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !activeIdeaId) return;
    sendMessage(trimmed);
    setInput('');
  }, [input, activeIdeaId, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleSave = useCallback(() => {
    if (activeIdeaId) saveIdea(activeIdeaId);
  }, [activeIdeaId, saveIdea]);

  const handleUpdateTitle = useCallback(
    (title: string) => {
      if (activeIdeaId) updateIdeaTitle(activeIdeaId, title);
    },
    [activeIdeaId, updateIdeaTitle]
  );

  const handleDetach = useCallback(
    (repoId: string) => {
      if (activeIdeaId) detachFromRepo(activeIdeaId, repoId);
    },
    [activeIdeaId, detachFromRepo]
  );

  const handleSummarize = useCallback(async () => {
    if (!activeIdeaId) return;
    try {
      await api('POST', `/ideas/${activeIdeaId}/context/summarize`);
    } catch (error) {
      console.error('[IdeaView] Failed to trigger summarization:', error);
    }
  }, [activeIdeaId]);

  // Build repo name map
  const repoNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const repo of repos) {
      map[repo.id] = repo.id.split('/').pop() || repo.id;
    }
    return map;
  }, [repos]);

  if (!activeIdea) return null;

  const isRunning = activeIdea.chatStatus === 'running';
  const isEmpty = activeIdea.messages.length === 0;
  const contextPct = activeIdea.contextState?.contextUtilizationPercent;
  const showSplit = activeIdea.splitSuggested || (contextPct != null && contextPct >= 85);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0d14]">
      {/* Background texture — purple tint */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/[0.02] via-transparent to-transparent" />
        <div className="absolute -top-32 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      {/* Title bar */}
      <IdeaTitleBar
        idea={activeIdea}
        onUpdateTitle={handleUpdateTitle}
        onSave={handleSave}
        onAttach={onOpenAttachModal}
        onDetach={handleDetach}
        onPromote={onOpenPromoteModal}
        repoNames={repoNames}
      />

      {/* Chat area */}
      {isEmpty ? (
        <div className="relative z-10 flex-1 flex flex-col">
          {/* Empty state */}
          <div className="flex-1 flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-md"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-600/20 ring-1 ring-purple-500/20">
                <Lightbulb className="h-8 w-8 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                What would you like to explore?
              </h2>
              <p className="text-sm text-white/50 leading-relaxed">
                No repo? No problem. Start brainstorming and let your ideas flow.
              </p>
            </motion.div>
          </div>

          {/* Composer at bottom */}
          <div className="w-full px-4 pb-4">
            <IdeaComposer
              value={input}
              onChange={setInput}
              onSend={handleSend}
              onStop={cancelOperation}
              onKeyDown={handleKeyDown}
              inputRef={inputRef}
              isRunning={isRunning}
              contextState={activeIdea.contextState}
              onSummarize={handleSummarize}
            />
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex flex-col min-h-0">
          {/* Context split banner */}
          {showSplit && activeIdeaId && (
            <IdeaContextBanner utilizationPercent={contextPct ?? 85} />
          )}

          {/* Messages */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto py-4 space-y-1"
            role="log"
            aria-live="polite"
          >
            <div className="w-full px-4">
              {activeIdea.messages.map((message, index) => {
                const isLatest = index === activeIdea.messages.length - 1;
                return isLatest ? (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <IdeaMessage message={message} />
                  </motion.div>
                ) : (
                  <div key={message.id}>
                    <IdeaMessage message={message} />
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Scroll to bottom */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleScrollToBottom}
                className="absolute bottom-20 right-6 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10 ring-1 ring-purple-500/20 backdrop-blur-sm hover:bg-purple-500/20 transition-colors"
              >
                <ChevronDown className="h-4 w-4 text-purple-300" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Composer */}
          <div className="w-full px-4 pb-4 pt-2 border-t border-purple-500/5">
            <IdeaComposer
              value={input}
              onChange={setInput}
              onSend={handleSend}
              onStop={cancelOperation}
              onKeyDown={handleKeyDown}
              inputRef={inputRef}
              isRunning={isRunning}
              contextState={activeIdea.contextState}
              onSummarize={handleSummarize}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── IdeaContextBanner ────────────────────────────────────────────────────

function IdeaContextBanner({ utilizationPercent }: { utilizationPercent: number }) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        role="alert"
        aria-live="polite"
        className={cn(
          'mx-6 mt-2 rounded-xl px-4 py-3 flex items-center gap-3 ring-1',
          'bg-amber-500/10 ring-amber-500/30 text-amber-300'
        )}
      >
        <p className="flex-1 text-sm">
          Context is {utilizationPercent}% full. Consider starting a new idea to keep responses sharp.
        </p>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1.5 rounded-lg transition-colors hover:bg-amber-500/20 text-amber-400 text-xs"
          aria-label="Dismiss alert"
        >
          Dismiss
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── IdeaMessage ──────────────────────────────────────────────────────────

function IdeaMessage({ message }: { message: IdeaChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3 py-3', isUser ? 'justify-end' : '')}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="h-7 w-7 rounded-full bg-purple-500/10 ring-2 ring-purple-500/30 flex items-center justify-center">
            <Lightbulb className="h-3.5 w-3.5 text-purple-400" />
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-purple-500/15 text-white/90 ring-1 ring-purple-500/20'
            : 'bg-white/[0.03] text-white/80 ring-1 ring-white/[0.06]'
        )}
      >
        {message.isStreaming && !message.content ? (
          <div className="flex items-center gap-2 text-purple-300/70">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">Thinking...</span>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-purple-400/70 animate-pulse ml-0.5 align-middle rounded-sm" />
            )}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="h-7 w-7 rounded-full bg-white/10 ring-1 ring-white/20 flex items-center justify-center">
            <span className="text-xs font-medium text-white/70">U</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── IdeaComposer ─────────────────────────────────────────────────────────

interface IdeaComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  isRunning: boolean;
  contextState?: import('../../../../types').ContextState;
  onSummarize?: () => void;
}

function IdeaComposer({
  value,
  onChange,
  onSend,
  onStop,
  onKeyDown,
  inputRef,
  isRunning,
  contextState,
  onSummarize,
}: IdeaComposerProps) {
  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [value, inputRef]);

  return (
    <div className="w-full">
      <div className="relative flex items-end gap-2 rounded-2xl bg-white/[0.04] ring-1 ring-purple-500/15 focus-within:ring-purple-500/30 transition-all px-4 py-3">
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your thoughts... Shift+Enter for new line"
          className="flex-1 bg-transparent text-white/90 text-sm placeholder-white/30 resize-none outline-none min-h-[24px] max-h-[200px]"
          rows={1}
          disabled={false}
        />

        {isRunning ? (
          <button
            onClick={onStop}
            className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            title="Stop generation"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!value.trim()}
            className={cn(
              'flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg transition-colors',
              value.trim()
                ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            )}
            title="Send (Ctrl+Enter)"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-1.5 px-1">
        <span className="text-[10px] text-white/20">
          {isRunning ? 'Claude is thinking...' : 'Ctrl+Enter to send'}
        </span>
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="flex items-center gap-1 text-[10px] text-purple-400/50">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              Streaming
            </span>
          )}
          <ContextGauge
            contextState={contextState ?? null}
            onSummarize={onSummarize}
          />
        </div>
      </div>
    </div>
  );
}
