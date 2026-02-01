/**
 * IdeaCard - Individual idea preview card for the sidebar
 *
 * States: ephemeral (dashed border), saved (solid), active (purple glow),
 * attached (repo badge), promoted (greyed out).
 */
import { motion } from 'framer-motion';
import {
  Lightbulb,
  FolderGit2,
  Rocket,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Idea } from '../../../../types';

interface IdeaCardProps {
  idea: Idea;
  isActive: boolean;
  onClick: () => void;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function IdeaCard({ idea, isActive, onClick }: IdeaCardProps) {
  const isPromoted = !!idea.promotedToSessionId || !!idea.promotedToRepoId;
  const isEphemeral = idea.status === 'ephemeral';
  const hasAttachedRepos = idea.attachedRepoIds && idea.attachedRepoIds.length > 0;
  const messageCount = idea.messages.filter(m => !m.isStreaming).length;

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl p-3 transition-all',
        isPromoted && 'opacity-60',
        isActive
          ? 'bg-purple-500/10 ring-1 ring-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
          : isEphemeral
            ? 'bg-white/[0.02] ring-1 ring-white/[0.06] border-dashed opacity-80 hover:opacity-100 hover:bg-white/[0.04]'
            : 'bg-white/[0.03] ring-1 ring-white/[0.08] hover:bg-white/[0.05]'
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-1.5">
        <Lightbulb className={cn(
          'h-3.5 w-3.5 mt-0.5 flex-shrink-0',
          isActive ? 'text-purple-400' : 'text-purple-400/60'
        )} />
        <span className={cn(
          'text-sm font-medium truncate flex-1',
          isActive ? 'text-white' : 'text-white/80'
        )}>
          {idea.title || 'Untitled Idea'}
        </span>
        {isEphemeral && (
          <span className="h-2 w-2 rounded-full bg-purple-400/60 flex-shrink-0 mt-1.5" />
        )}
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-3 text-[11px] text-white/40">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo(idea.lastActivityAt)}
        </span>
        {messageCount > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {messageCount}
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 mt-2">
        {hasAttachedRepos && (
          <span className="inline-flex items-center gap-1 text-[10px] text-white/40 bg-white/5 rounded px-1.5 py-0.5">
            <FolderGit2 className="h-2.5 w-2.5" />
            {idea.attachedRepoIds!.length} repo{idea.attachedRepoIds!.length > 1 ? 's' : ''}
          </span>
        )}
        {isPromoted && (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/60 bg-emerald-500/10 rounded px-1.5 py-0.5">
            <Rocket className="h-2.5 w-2.5" />
            Promoted
          </span>
        )}
      </div>
    </motion.button>
  );
}
