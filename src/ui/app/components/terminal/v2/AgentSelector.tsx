import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Bot, Search, Pin, Clock, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Agent } from '../../../types/agents';

interface AgentSelectorProps {
  agents: Agent[];
  pinnedAgents: Agent[];
  recentAgents: Agent[];
  userAgents: Agent[];
  builtinAgents: Agent[];
  selectedAgent: Agent | null;
  onSelect: (agent: Agent | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  disabled?: boolean;
}

export function AgentSelector({
  agents,
  pinnedAgents,
  recentAgents,
  userAgents,
  builtinAgents,
  selectedAgent,
  onSelect,
  searchQuery,
  onSearchChange,
  disabled = false,
}: AgentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Build flat list of agents for keyboard navigation
  const flatAgentList = [
    ...recentAgents,
    ...pinnedAgents.filter((a) => !recentAgents.some((r) => r.id === a.id)),
    ...userAgents.filter((a) => !recentAgents.some((r) => r.id === a.id) && !pinnedAgents.some((p) => p.id === a.id)),
    ...builtinAgents.filter((a) => !recentAgents.some((r) => r.id === a.id) && !pinnedAgents.some((p) => p.id === a.id)),
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Reset focused index when search changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, flatAgentList.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < flatAgentList.length) {
          onSelect(flatAgentList[focusedIndex]);
          setIsOpen(false);
          onSearchChange('');
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        onSearchChange('');
        break;
    }
  };

  const handleAgentClick = (agent: Agent) => {
    onSelect(agent);
    setIsOpen(false);
    onSearchChange('');
  };

  const renderAgentItem = (agent: Agent, index: number, showRecent = false) => {
    const isFocused = index === focusedIndex;
    return (
      <button
        key={agent.id}
        onClick={() => handleAgentClick(agent)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
          isFocused ? 'bg-white/10' : 'hover:bg-white/5'
        } ${selectedAgent?.id === agent.id ? 'ring-1 ring-blue-400/50' : ''}`}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: agent.color ? `${agent.color}20` : 'rgba(59, 130, 246, 0.2)' }}
        >
          <Bot
            className="h-4 w-4"
            style={{ color: agent.color || '#3B82F6' }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-white">{agent.name}</span>
            {showRecent && <Clock className="h-3 w-3 text-white/40" />}
            {agent.isPinned && <Pin className="h-3 w-3 text-amber-400" />}
          </div>
          {agent.description && (
            <p className="truncate text-xs text-white/50">{agent.description}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/50 ring-1 ring-white/10">
          {agent.model}
        </span>
      </button>
    );
  };

  // Filter agents based on search
  const filteredRecentAgents = searchQuery
    ? recentAgents.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentAgents;

  const filteredPinnedAgents = searchQuery
    ? pinnedAgents.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : pinnedAgents;

  const filteredUserAgents = searchQuery
    ? userAgents.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : userAgents;

  const filteredBuiltinAgents = searchQuery
    ? builtinAgents.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : builtinAgents;

  let globalIndex = 0;

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
      >
        <Bot className="h-4 w-4" />
        <span className="font-medium">Agent</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl bg-zinc-900/95 ring-1 ring-white/10 backdrop-blur-xl"
          >
            {/* Search */}
            <div className="border-b border-white/10 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search agents..."
                  className="w-full rounded-xl bg-white/5 py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
            </div>

            {/* Agent List */}
            <div className="max-h-80 overflow-y-auto p-2">
              {/* No Agent Option */}
              <button
                onClick={() => {
                  onSelect(null);
                  setIsOpen(false);
                  onSearchChange('');
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/5 ${
                  !selectedAgent ? 'ring-1 ring-blue-400/50' : ''
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <X className="h-4 w-4 text-white/60" />
                </div>
                <span className="text-sm text-white/70">No agent (use default)</span>
              </button>

              {/* Recent Agents */}
              {filteredRecentAgents.length > 0 && (
                <div className="mt-2">
                  <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white/40">
                    Recent
                  </div>
                  {filteredRecentAgents.map((agent) =>
                    renderAgentItem(agent, globalIndex++, true)
                  )}
                </div>
              )}

              {/* Pinned Agents */}
              {filteredPinnedAgents.filter(
                (a) => !filteredRecentAgents.some((r) => r.id === a.id)
              ).length > 0 && (
                <div className="mt-2">
                  <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white/40">
                    Pinned
                  </div>
                  {filteredPinnedAgents
                    .filter((a) => !filteredRecentAgents.some((r) => r.id === a.id))
                    .map((agent) => renderAgentItem(agent, globalIndex++))}
                </div>
              )}

              {/* User Agents */}
              {filteredUserAgents.filter(
                (a) =>
                  !filteredRecentAgents.some((r) => r.id === a.id) &&
                  !filteredPinnedAgents.some((p) => p.id === a.id)
              ).length > 0 && (
                <div className="mt-2">
                  <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white/40">
                    Your Agents
                  </div>
                  {filteredUserAgents
                    .filter(
                      (a) =>
                        !filteredRecentAgents.some((r) => r.id === a.id) &&
                        !filteredPinnedAgents.some((p) => p.id === a.id)
                    )
                    .map((agent) => renderAgentItem(agent, globalIndex++))}
                </div>
              )}

              {/* Built-in Agents */}
              {filteredBuiltinAgents.filter(
                (a) =>
                  !filteredRecentAgents.some((r) => r.id === a.id) &&
                  !filteredPinnedAgents.some((p) => p.id === a.id)
              ).length > 0 && (
                <div className="mt-2">
                  <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white/40">
                    Built-in
                  </div>
                  {filteredBuiltinAgents
                    .filter(
                      (a) =>
                        !filteredRecentAgents.some((r) => r.id === a.id) &&
                        !filteredPinnedAgents.some((p) => p.id === a.id)
                    )
                    .map((agent) => renderAgentItem(agent, globalIndex++))}
                </div>
              )}

              {/* Empty State */}
              {globalIndex === 0 && searchQuery && (
                <div className="py-8 text-center text-sm text-white/50">
                  No agents found matching &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Selected Agent Chip - displayed in the composer
interface AgentChipProps {
  agent: Agent;
  onRemove: () => void;
}

export function AgentChip({ agent, onRemove }: AgentChipProps) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-1 text-blue-400">
      <Bot className="h-3 w-3" />
      <span className="text-xs font-medium">@{agent.name}</span>
      <button
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-blue-500/30"
        aria-label={`Remove ${agent.name} agent`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
