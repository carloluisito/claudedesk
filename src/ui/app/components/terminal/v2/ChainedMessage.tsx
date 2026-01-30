/**
 * ChainedMessage - Renders segmented output from an agent chain
 * Each agent's output is visually separated with headers and dividers
 */

import { useState, useCallback } from 'react';
import { Bot, Check, X, ChevronDown, ChevronRight, Copy, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChainSegment } from '../../../types/agents';
import { ChainProgressIndicator } from './ChainProgressIndicator';

interface ChainedMessageProps {
  segments: ChainSegment[];
  chainStatus?: 'running' | 'completed' | 'partial' | 'cancelled';
  onCancel?: () => void;
  /** Render function for segment content (e.g., markdown renderer) */
  renderContent?: (content: string) => React.ReactNode;
}

export function ChainedMessage({
  segments,
  chainStatus,
  onCancel,
  renderContent,
}: ChainedMessageProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const completedCount = segments.filter((s) => s.status === 'completed').length;
  const isRunning = chainStatus === 'running';

  const copySegmentContent = useCallback(async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // clipboard API might not be available
    }
  }, []);

  const copyAllContent = useCallback(async () => {
    const allContent = segments
      .filter((s) => s.content)
      .map((s, i) => `--- @${s.agentName} (Step ${i + 1}) ---\n\n${s.content}`)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(allContent);
      setCopiedIndex(-1); // -1 means "all"
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // clipboard API might not be available
    }
  }, [segments]);

  if (!segments || segments.length === 0) return null;

  return (
    <div className="space-y-0">
      {/* Chain Summary Header */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors"
          aria-expanded={isExpanded}
          aria-controls="chain-segments-container"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span className="font-medium">
            Chain: {segments.map((s) => `@${s.agentName}`).join(' \u2192 ')}
          </span>
          <span className="text-white/30">
            {chainStatus === 'completed'
              ? `\u2022 ${segments.length} agents`
              : chainStatus === 'partial'
                ? `\u2022 ${completedCount} of ${segments.length} completed`
                : chainStatus === 'cancelled'
                  ? `\u2022 cancelled`
                  : `\u2022 running`}
          </span>
        </button>

        {/* Copy all button */}
        {completedCount > 0 && (
          <button
            onClick={copyAllContent}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
            aria-label="Copy entire chain output"
          >
            {copiedIndex === -1 ? (
              <Check className="h-2.5 w-2.5 text-emerald-400" />
            ) : (
              <Copy className="h-2.5 w-2.5" />
            )}
            Copy chain
          </button>
        )}
      </div>

      {/* Progress indicator during execution */}
      {isRunning && (
        <div className="mb-3">
          <ChainProgressIndicator
            segments={segments}
            onCancel={onCancel}
            chainStatus={chainStatus}
          />
        </div>
      )}

      {/* Segments */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="chain-segments-container"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-0 overflow-hidden"
          >
            {segments.map((segment, idx) => {
              // Skip pending segments that haven't started
              if (segment.status === 'pending' && !segment.content) return null;

              return (
                <div key={idx}>
                  {/* Segment Divider (between segments) */}
                  {idx > 0 && (
                    <SegmentDivider
                      fromAgent={segments[idx - 1]}
                      toAgent={segment}
                    />
                  )}

                  {/* Segment */}
                  <div
                    className="relative"
                    role="article"
                    aria-labelledby={`segment-header-${idx}`}
                  >
                    {/* Segment Header */}
                    <SegmentHeader
                      id={`segment-header-${idx}`}
                      segment={segment}
                      position={idx + 1}
                      totalSegments={segments.length}
                      onCopy={() => copySegmentContent(segment.content, idx)}
                      isCopied={copiedIndex === idx}
                    />

                    {/* Segment Content */}
                    <div className="pl-6 mt-1">
                      {segment.status === 'running' && !segment.content && (
                        <div className="flex items-center gap-2 py-2">
                          <Loader2 className="h-3 w-3 text-white/30 animate-spin" />
                          <span className="text-xs text-white/30">Generating...</span>
                        </div>
                      )}

                      {segment.content && (
                        <div className="text-sm text-white/80">
                          {renderContent ? renderContent(segment.content) : segment.content}
                        </div>
                      )}

                      {/* Error state */}
                      {segment.status === 'failed' && segment.error && (
                        <div className="mt-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2" role="alert">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                            <div className="text-xs">
                              <p className="text-red-400 font-medium">Error: {segment.error}</p>
                              {idx > 0 && (
                                <p className="text-white/40 mt-1">
                                  Output from @{segments[idx - 1].agentName} above is preserved.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cancelled state */}
                      {segment.status === 'cancelled' && (
                        <div className="mt-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                          <p className="text-xs text-white/40">Chain cancelled by user</p>
                          {idx > 0 && (
                            <p className="text-xs text-white/30 mt-0.5">
                              Output from @{segments[idx - 1].agentName} above is preserved.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Empty output completed */}
                      {segment.status === 'completed' && !segment.content && (
                        <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                          <p className="text-xs text-white/30 italic">
                            @{segment.agentName} completed with no output
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---

interface SegmentHeaderProps {
  id: string;
  segment: ChainSegment;
  position: number;
  totalSegments: number;
  onCopy: () => void;
  isCopied: boolean;
}

function SegmentHeader({ id, segment, position, totalSegments, onCopy, isCopied }: SegmentHeaderProps) {
  const color = '#3B82F6'; // Default blue; could be enhanced to pass agent color

  const statusIcon = {
    pending: null,
    running: <Loader2 className="h-3 w-3 animate-spin" style={{ color }} />,
    completed: <Check className="h-3 w-3 text-emerald-400" />,
    failed: <X className="h-3 w-3 text-red-400" />,
    cancelled: <X className="h-3 w-3 text-white/40" />,
  };

  return (
    <div id={id} className="flex items-center gap-2 group">
      {/* Agent icon */}
      <div
        className="flex h-5 w-5 items-center justify-center rounded-md"
        style={{ backgroundColor: `${color}20` }}
      >
        <Bot className="h-3 w-3" style={{ color }} />
      </div>

      {/* Agent name + step */}
      <span className="text-xs font-medium" style={{ color }}>
        {position}. @{segment.agentName}
      </span>

      {/* Status */}
      {statusIcon[segment.status]}

      {/* Step indicator */}
      <span className="text-[10px] text-white/20">
        Step {position} of {totalSegments}
      </span>

      {/* Copy button */}
      {segment.content && (
        <button
          onClick={onCopy}
          className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] text-white/30 hover:text-white/60 transition-all"
          aria-label={`Copy @${segment.agentName} output`}
        >
          {isCopied ? (
            <Check className="h-2.5 w-2.5 text-emerald-400" />
          ) : (
            <Copy className="h-2.5 w-2.5" />
          )}
        </button>
      )}
    </div>
  );
}

interface SegmentDividerProps {
  fromAgent: ChainSegment;
  toAgent: ChainSegment;
}

function SegmentDivider({ fromAgent, toAgent }: SegmentDividerProps) {
  return (
    <div className="flex items-center gap-2 py-3 px-6" aria-hidden="true">
      <div
        className="flex-1 h-px"
        style={{
          background: `linear-gradient(to right, #3B82F620, #3B82F608)`,
        }}
      />
      <ChevronDown className="h-3 w-3 text-white/10" />
      <div
        className="flex-1 h-px"
        style={{
          background: `linear-gradient(to left, #3B82F620, #3B82F608)`,
        }}
      />
      <span className="sr-only">Output from @{toAgent.agentName} follows</span>
    </div>
  );
}
