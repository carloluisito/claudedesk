/**
 * AgentConfigModal - Modal for viewing agent details and selecting for prompt binding
 */

import { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, MessageSquare, Cpu, User, Package, Pencil } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Agent } from '../../types/agents';

interface AgentConfigModalProps {
  isOpen: boolean;
  agent: Agent | null;
  onClose: () => void;
  onSelect: (agent: Agent) => void;
  onEdit?: (agent: Agent) => void;
}

const MODEL_BADGES: Record<Agent['model'], { label: string; className: string }> = {
  opus: {
    label: 'opus',
    className: 'bg-orange-500/20 text-orange-400 ring-orange-500/30',
  },
  sonnet: {
    label: 'sonnet',
    className: 'bg-purple-500/20 text-purple-400 ring-purple-500/30',
  },
  haiku: {
    label: 'haiku',
    className: 'bg-cyan-500/20 text-cyan-400 ring-cyan-500/30',
  },
  inherit: {
    label: 'inherit',
    className: 'bg-gray-500/20 text-gray-400 ring-gray-500/30',
  },
};

export function AgentConfigModal({ isOpen, agent, onClose, onSelect, onEdit }: AgentConfigModalProps) {
  const prefersReduced = useReducedMotion();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!agent) return null;

  const modelBadge = MODEL_BADGES[agent.model] || MODEL_BADGES.inherit;

  const handleSelect = () => {
    onSelect(agent);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-lg rounded-t-3xl bg-[#0b0f16] p-5 ring-1 ring-white/10 sm:rounded-3xl sm:m-4 max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, y: prefersReduced ? 0 : 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReduced ? 0 : 100 }}
            transition={{ duration: prefersReduced ? 0 : 0.25, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ring-1',
                      modelBadge.className
                    )}
                  >
                    <Cpu className="h-3 w-3" />
                    {modelBadge.label}
                  </div>
                  <div
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ring-1',
                      agent.source === 'user'
                        ? 'bg-blue-500/20 text-blue-400 ring-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30'
                    )}
                  >
                    {agent.source === 'user' ? (
                      <User className="h-3 w-3" />
                    ) : (
                      <Package className="h-3 w-3" />
                    )}
                    {agent.source === 'user' ? 'user' : 'built-in'}
                  </div>
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  {agent.name}
                </h2>
                {agent.description && (
                  <p className="mt-1 text-sm text-white/50">{agent.description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="ml-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-white/60" />
              </button>
            </div>

            {/* Info message */}
            <div className="mb-6 p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
              <p className="text-sm text-white/50 text-center">
                Select this agent to use with your next message. The agent will handle your prompt
                with its specialized capabilities.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl bg-white/5 py-3 text-sm text-white/70 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              {agent.source === 'user' && onEdit && (
                <button
                  onClick={() => onEdit(agent)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium bg-white/5 text-white/70 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              )}
              <button
                onClick={handleSelect}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Use Agent
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
