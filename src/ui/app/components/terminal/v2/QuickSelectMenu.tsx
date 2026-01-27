import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { Bot, Check, ArrowRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Agent } from '../../../types/agents';

interface QuickSelectMenuProps {
  isOpen: boolean;
  onClose: () => void;
  recentAgents: Agent[];
  onSelectAgent: (agent: Agent | null) => void;
  onBrowseAll: () => void;
  selectedAgent: Agent | null;
  disabled?: boolean;
}

export function QuickSelectMenu({
  isOpen,
  onClose,
  recentAgents,
  onSelectAgent,
  onBrowseAll,
  selectedAgent,
  disabled = false,
}: QuickSelectMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Reset focused index when menu opens
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;

    const maxIndex = recentAgents.length; // +1 for "Auto-detect" option (index -1 handled separately)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev < maxIndex - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > -1 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex === -1) {
          // Auto-detect option
          onSelectAgent(null);
          onClose();
        } else if (focusedIndex < recentAgents.length) {
          onSelectAgent(recentAgents[focusedIndex]);
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  const handleSelectAutoDetect = () => {
    onSelectAgent(null);
    onClose();
  };

  const handleSelectAgent = (agent: Agent) => {
    onSelectAgent(agent);
    onClose();
  };

  const handleBrowseAll = () => {
    onBrowseAll();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} tabIndex={-1}>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 bottom-full z-50 mb-2 w-72 max-h-80 overflow-y-auto rounded-2xl bg-zinc-900/95 ring-1 ring-white/10 backdrop-blur-xl"
        >
          {/* Auto-detect option */}
          <button
            onClick={handleSelectAutoDetect}
            disabled={disabled}
            className={`flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors ${
              focusedIndex === -1 ? 'bg-white/10' : 'hover:bg-white/5'
            } ${!selectedAgent ? 'bg-blue-500/10' : ''} disabled:opacity-50`}
          >
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-400" />
              <div>
                <div className="text-sm font-medium text-white">Auto-detect (recommended)</div>
              </div>
            </div>
            {!selectedAgent && <Check className="h-4 w-4 text-blue-400" />}
          </button>

          {/* Divider */}
          {recentAgents.length > 0 && (
            <div className="border-t border-white/10">
              <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white/40">
                Recent
              </div>
            </div>
          )}

          {/* Recent agents */}
          {recentAgents.map((agent, idx) => {
            const isFocused = focusedIndex === idx;
            const isSelected = selectedAgent?.id === agent.id;

            return (
              <button
                key={agent.id}
                onClick={() => handleSelectAgent(agent)}
                disabled={disabled}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                  isFocused ? 'bg-white/10' : 'hover:bg-white/5'
                } ${isSelected ? 'bg-purple-500/10' : ''} disabled:opacity-50`}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: agent.color ? `${agent.color}20` : 'rgba(139, 92, 246, 0.2)',
                  }}
                >
                  <Bot
                    className="h-3.5 w-3.5"
                    style={{ color: agent.color || '#8B5CF6' }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-white">{agent.name}</span>
                    <Clock className="h-3 w-3 text-white/30 shrink-0" />
                  </div>
                  {agent.description && (
                    <p className="truncate text-xs text-white/50">{agent.description}</p>
                  )}
                </div>
                {isSelected && <Check className="h-4 w-4 text-purple-400 shrink-0" />}
              </button>
            );
          })}

          {/* Browse all option */}
          <div className="border-t border-white/10">
            <button
              onClick={handleBrowseAll}
              disabled={disabled}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              <span className="text-sm text-white/70">Browse all agents</span>
              <ArrowRight className="h-4 w-4 text-white/40" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
