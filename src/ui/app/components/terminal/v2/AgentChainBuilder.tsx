/**
 * AgentChainBuilder - Multi-agent chain selection UI
 * Displays selected agents as an ordered horizontal chain with connectors
 */

import { useRef } from 'react';
import { Bot, X, ChevronRight, Trash2 } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import type { Agent } from '../../../types/agents';

interface AgentChainBuilderProps {
  selectedAgents: Agent[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (agentId: string) => void;
  onClearAll: () => void;
  maxChainLength: number;
  disabled?: boolean;
}

export function AgentChainBuilder({
  selectedAgents,
  onReorder,
  onRemove,
  onClearAll,
  maxChainLength,
  disabled = false,
}: AgentChainBuilderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (selectedAgents.length === 0) return null;

  const handleReorder = (newOrder: Agent[]) => {
    // Find what moved by comparing old vs new
    const oldIds = selectedAgents.map((a) => a.id);
    const newIds = newOrder.map((a) => a.id);
    // Find the agent that changed position
    for (let i = 0; i < oldIds.length; i++) {
      if (oldIds[i] !== newIds[i]) {
        const movedId = oldIds[i];
        const newIndex = newIds.indexOf(movedId);
        if (newIndex !== -1) {
          onReorder(i, newIndex);
        }
        break;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-1 px-2 pt-2 pb-1 overflow-x-auto scrollbar-none"
      role="region"
      aria-label="Selected agent chain"
    >
      {/* Chain label */}
      {selectedAgents.length >= 2 && (
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-widest text-white/30 mr-1">
          Chain {selectedAgents.length}/{maxChainLength}
        </span>
      )}

      {/* Agent chips with drag-to-reorder */}
      <Reorder.Group
        axis="x"
        values={selectedAgents}
        onReorder={handleReorder}
        className="flex items-center gap-0.5"
      >
        <AnimatePresence initial={false}>
          {selectedAgents.map((agent, idx) => (
            <Reorder.Item
              key={agent.id}
              value={agent}
              dragListener={!disabled && selectedAgents.length > 1}
              className="flex items-center gap-0.5"
            >
              {/* Connector arrow (between chips) */}
              {idx > 0 && (
                <ChainConnector
                  fromColor={selectedAgents[idx - 1].color}
                  toColor={agent.color}
                />
              )}

              {/* Agent chip */}
              <ChainedAgentChip
                agent={agent}
                position={idx + 1}
                totalInChain={selectedAgents.length}
                onRemove={() => onRemove(agent.id)}
                disabled={disabled}
              />
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* Clear all button */}
      {selectedAgents.length >= 2 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={onClearAll}
          disabled={disabled}
          className="ml-1 shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          aria-label="Clear all agents from chain"
        >
          <Trash2 className="h-2.5 w-2.5" />
          Clear
        </motion.button>
      )}
    </div>
  );
}

// --- Sub-components ---

interface ChainConnectorProps {
  fromColor?: string;
  toColor?: string;
}

function ChainConnector({ fromColor, toColor }: ChainConnectorProps) {
  const from = fromColor || '#3B82F6';
  const to = toColor || '#3B82F6';

  return (
    <div className="flex shrink-0 items-center px-0.5" aria-hidden="true">
      <div
        className="h-[2px] w-3 rounded-full"
        style={{
          background: `linear-gradient(to right, ${from}60, ${to}60)`,
        }}
      />
      <ChevronRight
        className="h-3 w-3 -ml-1"
        style={{ color: `${to}80` }}
      />
    </div>
  );
}

interface ChainedAgentChipProps {
  agent: Agent;
  position: number;
  totalInChain: number;
  onRemove: () => void;
  disabled?: boolean;
}

function ChainedAgentChip({
  agent,
  position,
  totalInChain,
  onRemove,
  disabled = false,
}: ChainedAgentChipProps) {
  const color = agent.color || '#3B82F6';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.15 }}
      className="group inline-flex items-center gap-1 rounded-full py-1 pl-2 pr-1 cursor-grab active:cursor-grabbing"
      style={{
        backgroundColor: `${color}15`,
        border: `1px solid ${color}30`,
      }}
      aria-label={`Agent ${position} of ${totalInChain}: @${agent.name}`}
      title={agent.description || `@${agent.name} - Drag to reorder`}
    >
      <Bot className="h-3 w-3 shrink-0" style={{ color }} />
      <span
        className="text-xs font-medium max-w-[120px] truncate"
        style={{ color }}
      >
        @{agent.name}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        disabled={disabled}
        className="rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 disabled:opacity-50"
        style={{ color }}
        aria-label={`Remove @${agent.name} from chain`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </motion.div>
  );
}
