/**
 * AgentCard - Individual agent card with pin, model badge, edit/delete actions
 */

import { Star, Cpu, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Agent } from '../../types/agents';

interface AgentCardProps {
  agent: Agent;
  onSelect: (agent: Agent) => void;
  onTogglePin: (agentId: string) => void;
  onEdit?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
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

export function AgentCard({ agent, onSelect, onTogglePin, onEdit, onDelete }: AgentCardProps) {
  const modelBadge = MODEL_BADGES[agent.model] || MODEL_BADGES.inherit;
  const isUserAgent = agent.source === 'user';

  return (
    <div
      className="rounded-3xl bg-white/5 p-3 ring-1 ring-white/10 hover:bg-white/10 transition-colors cursor-pointer group relative"
      onClick={() => onSelect(agent)}
    >
      {/* Header: Pin button and Model badge */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(agent.id);
          }}
          className={cn(
            'inline-flex items-center justify-center h-7 w-7 rounded-xl transition-colors',
            agent.isPinned
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
          )}
          aria-label={agent.isPinned ? 'Unpin agent' : 'Pin agent'}
        >
          <Star className={cn('h-4 w-4', agent.isPinned && 'fill-current')} />
        </button>

        <div className="flex items-center gap-1.5">
          {/* Edit/Delete - hover-revealed for user agents */}
          {isUserAgent && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(agent);
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white/5 text-white/40 ring-1 ring-white/10 hover:bg-blue-500/20 hover:text-blue-400 hover:ring-blue-500/30 transition-colors"
                  aria-label="Edit agent"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(agent);
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white/5 text-white/40 ring-1 ring-white/10 hover:bg-red-500/20 hover:text-red-400 hover:ring-red-500/30 transition-colors"
                  aria-label="Delete agent"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ring-1',
              modelBadge.className
            )}
          >
            <Cpu className="h-3 w-3" />
            {modelBadge.label}
          </div>
        </div>
      </div>

      {/* Name */}
      <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-white/90">
        {agent.name}
      </h3>

      {/* Description (1 line truncated) */}
      {agent.description && (
        <p className="text-xs text-white/50 truncate">{agent.description}</p>
      )}
    </div>
  );
}
