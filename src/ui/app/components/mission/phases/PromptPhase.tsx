/**
 * PromptPhase - Conversation and prompting interface
 *
 * Displays the chat interface with Claude, including messages,
 * tool activity timeline, and the composer for input.
 */
import { useRef, useState, useEffect, useCallback, RefObject, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, Bug, Code2, BookOpen } from 'lucide-react';
import { ContextSplitBanner } from '../../terminal/ContextSplitBanner';
import { useTerminalStore } from '../../../store/terminalStore';
import { RepositoryContextHeader } from './RepositoryContextHeader';
import { SuggestedPromptCard } from './SuggestedPromptCard';
import { PhaseIndicatorStrip } from './PhaseIndicatorStrip';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  timestamp?: string;
}

interface ToolActivity {
  id: string;
  tool: string;
  description?: string;
  status: 'running' | 'completed' | 'error';
  duration?: number;
}

interface PromptPhaseProps {
  messages: Message[];
  toolActivities: ToolActivity[];
  currentActivity?: ToolActivity;
  isRunning: boolean;
  isEmpty: boolean;
  renderMessage: (message: Message, index: number) => React.ReactNode;
  messagesEndRef: RefObject<HTMLDivElement>;
  composer: React.ReactNode;
  onExport?: () => void;
  // Repository context for empty state
  repoName?: string;
  branchName?: string;
  onSuggestedPromptClick?: (promptText: string) => void;
}

export function PromptPhase({
  messages,
  toolActivities,
  currentActivity,
  isRunning,
  isEmpty,
  renderMessage,
  messagesEndRef,
  composer,
  onExport,
  repoName,
  branchName,
  onSuggestedPromptClick,
}: PromptPhaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Context split banner support — hooks must be called before any early returns
  const { sessions, activeSessionId, switchSession } = useTerminalStore();
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId),
    [sessions, activeSessionId]
  );
  const contextPct = activeSession?.contextState?.contextUtilizationPercent;
  const showSplit = activeSession?.splitSuggested || (contextPct != null && contextPct >= 85);

  const handleSwitchSession = useCallback((newSessionId: string) => {
    switchSession(newSessionId);
  }, [switchSession]);

  // Auto-scroll to bottom when new messages/activity arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isRunning, currentActivity, autoScroll]);

  // Track scroll position to toggle auto-scroll
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

  const handlePromptClick = useCallback((promptText: string) => {
    onSuggestedPromptClick?.(promptText);
  }, [onSuggestedPromptClick]);

  if (isEmpty) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl space-y-6"
          >
            {/* Repository Context Header (if repo attached) */}
            {repoName && branchName && (
              <RepositoryContextHeader
                repoName={repoName}
                branchName={branchName}
              />
            )}

            {/* Hero Section */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500/20 via-amber-500/20 to-yellow-500/10 ring-1 ring-white/10">
                <Sparkles className="h-10 w-10 text-orange-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                What should we build?
              </h2>
              <p className="text-sm text-white/60 leading-relaxed max-w-lg mx-auto">
                {repoName
                  ? "I can help you build features, fix bugs, refactor code, or explore your codebase."
                  : "Let's brainstorm and plan. We can add a repository later when you're ready to build."}
              </p>
            </div>

            {/* Suggested Prompts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SuggestedPromptCard
                title="Fix a bug"
                description="Describe the issue and I'll help debug and fix it"
                icon={Bug}
                promptText="I need help fixing a bug: "
                theme="red"
                onClick={handlePromptClick}
              />
              <SuggestedPromptCard
                title="Build a feature"
                description="Tell me what you want to add and I'll implement it"
                icon={Sparkles}
                promptText="Let's build a new feature: "
                theme="blue"
                onClick={handlePromptClick}
              />
              <SuggestedPromptCard
                title="Refactor code"
                description="Point to code that needs improvement"
                icon={Code2}
                promptText="I'd like to refactor "
                theme="emerald"
                onClick={handlePromptClick}
              />
              <SuggestedPromptCard
                title="Explain codebase"
                description="Ask about how something works"
                icon={BookOpen}
                promptText="Can you explain "
                theme="purple"
                onClick={handlePromptClick}
              />
            </div>

            {/* Phase Indicator Strip */}
            <div className="flex justify-center">
              <PhaseIndicatorStrip currentPhase="prompt" />
            </div>
          </motion.div>
        </div>

        {/* Composer at bottom */}
        <div className="w-full px-4 pb-4">{composer}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Context split banner */}
      {showSplit && activeSessionId && (
        <ContextSplitBanner
          sessionId={activeSessionId}
          utilizationPercent={contextPct ?? 85}
          onSwitchSession={handleSwitchSession}
        />
      )}

      {/* Messages area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 space-y-1"
      >
        <div className="w-full px-4">
          {messages.map((message, index) => {
            const isLatest = index === messages.length - 1;
            return isLatest ? (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {renderMessage(message, index)}
              </motion.div>
            ) : (
              <div key={message.id}>
                {renderMessage(message, index)}
              </div>
            );
          })}

          {/* Scroll anchor — activity status is shown inline in MessageItem */}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={handleScrollToBottom}
            className="absolute bottom-20 right-6 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-sm hover:bg-white/20 transition-colors"
            title="Scroll to bottom"
          >
            <ChevronDown className="h-4 w-4 text-white/70" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Composer */}
      <div className="w-full px-4 pb-4 pt-2 border-t border-white/5">{composer}</div>
    </div>
  );
}
