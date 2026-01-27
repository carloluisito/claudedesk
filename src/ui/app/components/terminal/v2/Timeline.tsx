import { Files, Wand2, Terminal, Search, CheckCircle2, XCircle, Dot, Clock } from 'lucide-react';

export interface TimelineItem {
  id: string;
  kind: 'read' | 'edit' | 'bash' | 'web' | 'write' | 'search' | 'other';
  label: string;
  status: 'running' | 'ok' | 'error';
  ms: number;
}

interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  const iconFor = (kind: TimelineItem['kind']) => {
    switch (kind) {
      case 'read':
        return <Files className="h-4 w-4" />;
      case 'edit':
      case 'write':
        return <Wand2 className="h-4 w-4" />;
      case 'bash':
        return <Terminal className="h-4 w-4" />;
      case 'web':
      case 'search':
        return <Search className="h-4 w-4" />;
      default:
        return <Files className="h-4 w-4" />;
    }
  };

  const statusIcon = (status: TimelineItem['status']) => {
    if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    if (status === 'error') return <XCircle className="h-4 w-4 text-red-400" />;
    return <Dot className="h-5 w-5 text-yellow-400 animate-pulse" />;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (items.length === 0) {
    return (
      <div className="text-xs text-white/55 py-2">
        No tool activity yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10">
              {iconFor(item.kind)}
            </span>
            <span className="min-w-0 truncate text-white/80">{item.label}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/55">
            <span className="inline-flex items-center gap-1">{statusIcon(item.status)}</span>
            {item.status !== 'running' && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(item.ms)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
