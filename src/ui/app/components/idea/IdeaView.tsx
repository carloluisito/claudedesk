/**
 * IdeaView - Main brainstorming interface
 *
 * Enhanced with editorial typography and creative atelier aesthetic.
 * Pure chat interface with purple accent color, no phase navigator.
 * Lighter background (#0a0d14), purple avatar ring for Claude.
 * Full-width layout matching PromptPhase.
 */
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useIdeaStore } from '../../store/ideaStore';
import { useAppStore } from '../../store/appStore';
import { IdeaTitleBar } from './IdeaTitleBar';
import { IdeaMessage } from './IdeaMessage';
import { IdeaComposer } from './IdeaComposer';
import { IdeaContextBanner } from './IdeaContextBanner';
import { ScrollToBottomFAB } from './ScrollToBottomFAB';
import { api } from '../../lib/api';

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
              <div className="absolute bottom-20 right-6 z-10">
                <ScrollToBottomFAB onClick={handleScrollToBottom} />
              </div>
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
