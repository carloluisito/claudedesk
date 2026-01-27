/**
 * AgentsPanel - Slideout panel for viewing and managing agents
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Star,
  User,
  Package,
  Bot,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { useAgents } from '../../hooks/useAgents';
import { AgentCard } from './AgentCard';
import { AgentConfigModal } from './AgentConfigModal';
import { AgentExecutionList } from './AgentExecutionStatus';
import type { Agent } from '../../types/agents';

interface AgentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAgent: (agent: Agent) => void;
  repoId?: string;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  iconClassName?: string;
}

function CollapsibleSection({
  title,
  icon: Icon,
  count,
  isOpen,
  onToggle,
  children,
  iconClassName,
}: CollapsibleSectionProps) {
  const prefersReduced = useReducedMotion();

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 text-left group"
      >
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', iconClassName || 'text-white/50')} />
          <span className="text-sm font-medium text-white/80">{title}</span>
          <span className="text-xs text-white/40">({count})</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/60" />
        ) : (
          <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white/60" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-3 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AgentsPanel({ isOpen, onClose, onSelectAgent, repoId }: AgentsPanelProps) {
  const prefersReduced = useReducedMotion();
  const {
    pinnedAgents,
    userAgents,
    builtinAgents,
    executions,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    refresh,
    togglePin,
    cancelExecution,
    rerunExecution,
  } = useAgents({ repoId });

  // Section collapse states
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [userOpen, setUserOpen] = useState(true);
  const [builtinOpen, setBuiltinOpen] = useState(true);

  // Config modal state
  const [selectedAgentForModal, setSelectedAgentForModal] = useState<Agent | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Refreshing state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle agent card click - open modal to show details
  const handleAgentClick = useCallback((agent: Agent) => {
    setSelectedAgentForModal(agent);
    setShowConfigModal(true);
  }, []);

  // Handle agent selection from modal - pass to parent and close panel
  const handleAgentSelect = useCallback(
    (agent: Agent) => {
      onSelectAgent(agent);
      setShowConfigModal(false);
      setSelectedAgentForModal(null);
      onClose();
    },
    [onSelectAgent, onClose]
  );

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  // Handle dismiss execution
  const handleDismissExecution = useCallback((executionId: string) => {
    // For now, just filter it out locally (could persist this)
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !showConfigModal) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, showConfigModal, onClose]);

  // Active executions (running or pending)
  const activeExecutions = executions.filter(
    (e) => e.status === 'running' || e.status === 'pending'
  );

  // Recent executions (completed or failed)
  const recentExecutions = executions
    .filter((e) => e.status === 'completed' || e.status === 'failed')
    .slice(0, 3);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReduced ? 0 : 0.2 }}
              onClick={onClose}
            />

            {/* Panel */}
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#0b0f16] ring-1 ring-white/10 flex flex-col"
              style={{ width: '448px', maxWidth: '100vw' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={
                prefersReduced
                  ? { duration: 0 }
                  : { type: 'spring', damping: 30, stiffness: 300 }
              }
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <button
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-white/60" />
                </button>

                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-white/60" />
                  <h2 className="text-lg font-semibold text-white">Agents</h2>
                </div>

                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-50"
                  aria-label="Refresh"
                >
                  <RefreshCw
                    className={cn('h-5 w-5 text-white/60', isRefreshing && 'animate-spin')}
                  />
                </button>
              </div>

              {/* Search */}
              <div className="px-5 py-3 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search agents by name or tags..."
                    className="w-full rounded-xl bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* Loading state */}
                {loading && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-white/40 animate-spin mb-3" />
                    <p className="text-sm text-white/50">Loading agents...</p>
                  </div>
                )}

                {/* Error state */}
                {error && !loading && (
                  <div className="rounded-2xl bg-red-500/10 ring-1 ring-red-500/30 p-4 text-center">
                    <p className="text-sm text-red-400 mb-2">{error}</p>
                    <button
                      onClick={handleRefresh}
                      className="text-sm text-red-300 hover:text-red-200 underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {/* Active Executions */}
                {activeExecutions.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                      Running
                    </h3>
                    <AgentExecutionList
                      executions={activeExecutions}
                      onCancel={cancelExecution}
                    />
                  </div>
                )}

                {/* Recent Executions */}
                {recentExecutions.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                      Recent
                    </h3>
                    <AgentExecutionList
                      executions={recentExecutions}
                      onRerun={(id) => rerunExecution(id, {}, repoId || '')}
                      onDismiss={handleDismissExecution}
                    />
                  </div>
                )}

                {/* Agent sections */}
                {!loading && !error && (
                  <div className="space-y-2">
                    {/* Pinned Agents */}
                    {pinnedAgents.length > 0 && (
                      <CollapsibleSection
                        title="Pinned"
                        icon={Star}
                        iconClassName="text-amber-400"
                        count={pinnedAgents.length}
                        isOpen={pinnedOpen}
                        onToggle={() => setPinnedOpen(!pinnedOpen)}
                      >
                        {pinnedAgents.map((agent) => (
                          <AgentCard
                            key={agent.id}
                            agent={agent}
                            onSelect={handleAgentClick}
                            onTogglePin={togglePin}
                          />
                        ))}
                      </CollapsibleSection>
                    )}

                    {/* User Agents */}
                    {userAgents.length > 0 && (
                      <CollapsibleSection
                        title="User Agents"
                        icon={User}
                        count={userAgents.length}
                        isOpen={userOpen}
                        onToggle={() => setUserOpen(!userOpen)}
                      >
                        {userAgents.map((agent) => (
                          <AgentCard
                            key={agent.id}
                            agent={agent}
                            onSelect={handleAgentClick}
                            onTogglePin={togglePin}
                          />
                        ))}
                      </CollapsibleSection>
                    )}

                    {/* Built-in Agents */}
                    {builtinAgents.length > 0 && (
                      <CollapsibleSection
                        title="Built-in Agents"
                        icon={Package}
                        count={builtinAgents.length}
                        isOpen={builtinOpen}
                        onToggle={() => setBuiltinOpen(!builtinOpen)}
                      >
                        {builtinAgents.map((agent) => (
                          <AgentCard
                            key={agent.id}
                            agent={agent}
                            onSelect={handleAgentClick}
                            onTogglePin={togglePin}
                          />
                        ))}
                      </CollapsibleSection>
                    )}

                    {/* Empty state */}
                    {pinnedAgents.length === 0 &&
                      userAgents.length === 0 &&
                      builtinAgents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Bot className="h-12 w-12 text-white/20 mb-4" />
                          <p className="text-sm text-white/50 mb-1">No agents found</p>
                          <p className="text-xs text-white/30">
                            {searchQuery
                              ? 'Try a different search term'
                              : 'Configure agents in your project settings'}
                          </p>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Config Modal */}
      <AgentConfigModal
        isOpen={showConfigModal}
        agent={selectedAgentForModal}
        onClose={() => {
          setShowConfigModal(false);
          setSelectedAgentForModal(null);
        }}
        onSelect={handleAgentSelect}
      />
    </>
  );
}
