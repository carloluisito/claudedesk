import { useState, useEffect, useRef, useMemo } from 'react';
import { Trash2, RefreshCw, ArrowDown, Loader2 } from 'lucide-react';
import { GlassCard, GlassPanelHeader } from '../ui/GlassCard';
import { cn } from '../../lib/cn';

interface RuntimeLogsCardProps {
  logs: string;
  isLoading?: boolean;
  isConnected?: boolean;
  onClear: () => void;
  onRefresh: () => void;
}

// Parse log line and return styled spans
function LogLine({ line }: { line: string }) {
  const lowerLine = line.toLowerCase();

  // Determine line type for coloring
  let colorClass = 'text-white/70'; // default info
  if (lowerLine.includes('[error]') || lowerLine.includes('error:') || lowerLine.includes('failed')) {
    colorClass = 'text-red-400';
  } else if (lowerLine.includes('[warn]') || lowerLine.includes('warning:')) {
    colorClass = 'text-yellow-400';
  } else if (lowerLine.includes('[debug]')) {
    colorClass = 'text-white/40';
  }

  return <div className={colorClass}>{line}</div>;
}

export function RuntimeLogsCard({
  logs,
  isLoading = false,
  isConnected = true,
  onClear,
  onRefresh,
}: RuntimeLogsCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Split logs into lines
  const logLines = useMemo(() => {
    if (!logs) return [];
    return logs.split('\n').filter((line) => line.trim());
  }, [logs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Track scroll position to toggle auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Enable auto-scroll if within 50px of bottom
    const shouldAutoScroll = distanceFromBottom < 50;
    setAutoScroll(shouldAutoScroll);

    // Show scroll button if more than 100px from bottom
    setShowScrollButton(distanceFromBottom > 100);
  };

  const handleScrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setAutoScroll(true);
      setShowScrollButton(false);
    }
  };

  return (
    <GlassCard padding="lg" className="flex flex-col h-full">
      <GlassPanelHeader
        title="Runtime Logs"
        right={
          <div className="flex items-center gap-2">
            {autoScroll && (
              <span className="text-xs text-white/50">Auto-scroll enabled</span>
            )}
            {!isConnected && (
              <span className="text-xs text-yellow-400">Disconnected</span>
            )}
            <button
              onClick={onClear}
              className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition"
              title="Clear logs"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition disabled:opacity-50"
              title="Refresh logs"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </button>
          </div>
        }
      />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative mt-4 flex-1 min-h-[320px] max-h-[500px] overflow-auto rounded-2xl bg-black/40 p-3 font-mono text-xs ring-1 ring-white/10"
      >
        {isLoading && logLines.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : logLines.length > 0 ? (
          <div className="space-y-0.5">
            {logLines.map((line, i) => (
              <LogLine key={i} line={line} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-white/40">
            No logs yet
          </div>
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={handleScrollToBottom}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur px-3 py-1.5 text-xs text-white ring-1 ring-white/20 hover:bg-white/20 transition shadow-lg"
          >
            <ArrowDown className="h-3 w-3" />
            Latest
          </button>
        )}
      </div>

      {/* Status bar */}
      <div className="mt-2 flex items-center justify-between text-xs text-white/40">
        <span>{logLines.length} lines</span>
        {isLoading && <span className="text-white/50">Streaming...</span>}
      </div>
    </GlassCard>
  );
}
