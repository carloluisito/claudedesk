/**
 * IdeaComposer - Refined input interface for brainstorming
 *
 * Features:
 * - Gradient background with layered depth
 * - Larger action buttons with better touch targets
 * - Enhanced focus states with purple rings
 * - Dynamic ring color based on content state
 * - Streaming indicator with animated dot
 * - Context gauge integration
 * - Accessibility features
 */
import { useEffect } from 'react';
import { Loader2, Send, Square } from 'lucide-react';
import { cn } from '../../lib/cn';
import { ContextGauge } from '../terminal/ContextGauge';
import type { ContextState } from '../../../../types';

interface IdeaComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  isRunning: boolean;
  contextState?: ContextState;
  onSummarize?: () => void;
}

export function IdeaComposer({
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

  const hasContent = value.trim().length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Input container */}
      <div
        className={cn(
          'relative flex items-end gap-2.5 rounded-2xl px-5 py-3.5 transition-all duration-200',
          'bg-gradient-to-br from-white/[0.05] via-white/[0.03] to-white/[0.02]',
          'ring-1 backdrop-blur-sm',
          isRunning
            ? 'ring-purple-500/30'
            : hasContent
            ? 'ring-purple-500/25 focus-within:ring-purple-500/40 focus-within:shadow-lg focus-within:shadow-purple-500/10'
            : 'ring-purple-500/15 focus-within:ring-purple-500/30'
        )}
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your idea or question..."
          aria-label="Type your idea or question"
          className="flex-1 bg-transparent text-white/90 text-[15px] leading-[1.6] placeholder-white/30 resize-none outline-none min-h-[24px] max-h-[200px]"
          rows={1}
          disabled={isRunning}
        />

        {/* Action button */}
        {isRunning ? (
          <button
            onClick={onStop}
            aria-label="Stop generation"
            className={cn(
              'flex-shrink-0 flex items-center justify-center rounded-lg transition-all duration-200',
              'h-10 w-10 sm:h-9 sm:w-9',
              'bg-gradient-to-br from-red-500/15 to-red-600/10 text-red-400',
              'ring-1 ring-red-500/30',
              'hover:bg-red-500/20 hover:ring-red-500/40 hover:shadow-lg hover:shadow-red-500/10',
              'active:scale-95'
            )}
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!hasContent}
            aria-label="Send message"
            aria-disabled={!hasContent}
            className={cn(
              'flex-shrink-0 flex items-center justify-center rounded-lg transition-all duration-200',
              'h-10 w-10 sm:h-9 sm:w-9',
              hasContent
                ? [
                    'bg-gradient-to-br from-purple-500/20 via-purple-500/15 to-purple-600/20',
                    'text-purple-300 ring-1 ring-purple-500/30',
                    'hover:from-purple-500/25 hover:via-purple-500/20 hover:to-purple-600/25',
                    'hover:ring-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10',
                    'active:scale-95'
                  ]
                : 'bg-white/[0.02] text-white/20 ring-1 ring-white/5 cursor-not-allowed opacity-50'
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Helper row */}
      <div className="flex items-center justify-between mt-2.5 px-2">
        {/* Left side - Streaming indicator or hint */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <span className="flex items-center gap-1.5 text-[11px] text-purple-400/70">
              <div className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
              Claude is thinking...
            </span>
          ) : (
            <span
              className={cn(
                'text-[11px] transition-colors duration-200',
                hasContent ? 'text-white/30' : 'text-white/20'
              )}
            >
              Ctrl+Enter to send
            </span>
          )}
        </div>

        {/* Right side - Context gauge */}
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="flex items-center gap-1.5 text-[10px] text-purple-400/50">
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
