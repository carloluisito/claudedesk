import { useState, memo } from 'react';
import {
  FileText,
  Pencil,
  FilePlus,
  Terminal,
  Search,
  FileSearch,
  Globe,
  CircleDot,
  Loader2,
  ChevronDown,
  ListTodo,
  Bot,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { ToolActivity } from '../../store/terminalStore';
import { sanitizeSensitiveData } from '../../lib/sanitize';

// Tool configuration with icons and colors
const TOOL_CONFIG: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
  Read: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  Edit: { icon: Pencil, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  Write: { icon: FilePlus, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  Bash: { icon: Terminal, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  Glob: { icon: Search, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  Grep: { icon: FileSearch, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  WebFetch: { icon: Globe, color: 'text-teal-400', bg: 'bg-teal-500/10' },
  WebSearch: { icon: Globe, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  Task: { icon: Bot, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  TodoWrite: { icon: ListTodo, color: 'text-lime-400', bg: 'bg-lime-500/10' },
};

const DEFAULT_CONFIG = { icon: CircleDot, color: 'text-white/50', bg: 'bg-white/5' };

// Format human-readable descriptions based on tool, target, and status
function formatDescription(tool: string, target: string, status: 'running' | 'complete' | 'error'): string {
  // SEC-03: Sanitize target before display
  const sanitizedTarget = sanitizeSensitiveData(target);
  const isRunning = status === 'running';

  switch (tool) {
    case 'Read':
      return isRunning ? `Reading ${sanitizedTarget}...` : `Read ${sanitizedTarget}`;
    case 'Edit':
      return isRunning ? `Editing ${sanitizedTarget}...` : `Edited ${sanitizedTarget}`;
    case 'Write':
      return isRunning ? `Writing ${sanitizedTarget}...` : `Wrote ${sanitizedTarget}`;
    case 'Bash': {
      // Show command preview for running, generic for complete
      const cmdPreview = sanitizedTarget.length > 30 ? sanitizedTarget.slice(0, 30) + '...' : sanitizedTarget;
      return isRunning ? `Running: ${cmdPreview}` : 'Ran command';
    }
    case 'Glob':
      return isRunning ? `Searching for ${sanitizedTarget}...` : 'Found files';
    case 'Grep': {
      // Extract pattern from target if possible
      const patternPreview = sanitizedTarget.length > 20 ? sanitizedTarget.slice(0, 20) + '...' : sanitizedTarget;
      return isRunning ? `Searching for '${patternPreview}'...` : 'Searched';
    }
    case 'WebFetch': {
      // Extract domain from URL
      try {
        const url = new URL(sanitizedTarget);
        return isRunning ? `Fetching ${url.hostname}...` : 'Fetched URL';
      } catch {
        return isRunning ? `Fetching URL...` : 'Fetched URL';
      }
    }
    case 'WebSearch':
      return isRunning ? 'Searching web...' : 'Searched web';
    case 'Task': {
      // Target format: "agent-name: description" or just "description"
      const colonIndex = sanitizedTarget.indexOf(':');
      if (colonIndex > 0) {
        const agentName = sanitizedTarget.slice(0, colonIndex).trim();
        const taskDesc = sanitizedTarget.slice(colonIndex + 1).trim();
        const shortDesc = taskDesc.length > 30 ? taskDesc.slice(0, 30) + '...' : taskDesc;
        return isRunning
          ? `Agent ${agentName}: ${shortDesc}`
          : `Agent ${agentName} completed`;
      }
      return isRunning ? 'Running task...' : 'Task completed';
    }
    case 'TodoWrite':
      return isRunning ? 'Updating tasks...' : 'Updated tasks';
    default:
      // Fallback: use tool name with target
      return isRunning ? `${tool} ${sanitizedTarget}...` : `${tool} ${sanitizedTarget}`;
  }
}

interface ToolActivityItemProps {
  activity: ToolActivity;
  isNested?: boolean;  // When true, use smaller styling for nested items inside AgentActivityGroup
}

export const ToolActivityItem = memo(function ToolActivityItem({ activity, isNested = false }: ToolActivityItemProps) {
  const [showOutput, setShowOutput] = useState(activity.status === 'error'); // Auto-expand errors
  const [copied, setCopied] = useState(false);
  const config = TOOL_CONFIG[activity.tool] || DEFAULT_CONFIG;
  const Icon = config.icon;

  const handleCopyError = async () => {
    if (activity.error) {
      try {
        await navigator.clipboard.writeText(activity.error);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <div className={cn(
      'rounded-xl ring-1',
      isNested ? 'px-2 py-1' : 'px-2.5 py-1.5',
      activity.status === 'error'
        ? 'bg-red-500/10 ring-red-500/20'
        : isNested
          ? 'bg-white/[0.03] ring-white/5'
          : 'bg-white/5 ring-white/10'
    )}>
      <div className="flex items-center gap-2">
        {/* Status icon */}
        {activity.status === 'running' ? (
          <Loader2 className={cn(isNested ? 'h-3 w-3' : 'h-3.5 w-3.5', 'animate-spin', config.color)} />
        ) : activity.status === 'error' ? (
          <AlertTriangle className={cn(isNested ? 'h-3 w-3' : 'h-3.5 w-3.5', 'text-red-400')} />
        ) : (
          <Icon className={cn(isNested ? 'h-3 w-3' : 'h-3.5 w-3.5', config.color)} />
        )}

        {/* Human-readable description */}
        <span
          className={cn(
            'font-medium truncate flex-1',
            isNested ? 'text-[11px]' : 'text-xs',
            activity.status === 'error'
              ? 'text-red-300'
              : activity.status === 'complete'
                ? 'text-white/50'
                : 'text-white/80'
          )}
          title={activity.target || activity.tool}
        >
          {formatDescription(activity.tool, activity.target, activity.status)}
        </span>

        {/* Duration for completed activities */}
        {activity.status === 'complete' && activity.timestamp && activity.completedAt && (
          <span className={cn(isNested ? 'text-[9px]' : 'text-[10px]', 'text-white/40')}>
            {Math.round((new Date(activity.completedAt).getTime() - new Date(activity.timestamp).getTime()) / 1000)}s
          </span>
        )}

        {/* Expand button for output (if we have it) */}
        {activity.error && (
          <button
            onClick={() => setShowOutput(!showOutput)}
            className="ml-auto p-0.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronDown className={cn(
              'h-3 w-3 text-white/40 transition-transform',
              showOutput && 'rotate-180'
            )} />
          </button>
        )}
      </div>

      {/* Expandable error section with improved UI */}
      {showOutput && activity.error && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="h-3 w-3 text-red-400" />
            <span className="text-red-300 font-medium">Error occurred</span>
            <button
              onClick={handleCopyError}
              className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-[10px] ring-1 ring-white/10 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy error
                </>
              )}
            </button>
          </div>
          <pre className="text-xs bg-black/30 rounded-xl p-2.5 max-h-32 overflow-auto text-red-400 ring-1 ring-red-500/20">
            {sanitizeSensitiveData(activity.error)}
          </pre>
          <p className="text-[10px] text-white/40">
            Tip: You can ask Claude to retry this operation or investigate the error.
          </p>
        </div>
      )}
    </div>
  );
});
