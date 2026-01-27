import { useState } from 'react';
import { Activity, FileCode } from 'lucide-react';
import { ActivityStatusWidget } from './ActivityStatusWidget';
import { ChangesPanel } from './ChangesPanel';
import { ChangedFile } from './ChangesCard';
import { ToolActivity } from '../../../store/terminalStore';
import { cn } from '../../../lib/cn';

interface SidePanelProps {
  toolActivities: ToolActivity[];
  isRunning: boolean;
  currentActivity?: string;
  onNavigate: () => void;
  changedFiles: ChangedFile[];
  onViewDiffs?: () => void;
  onFileClick?: (path: string) => void;
  // New props for ChangesPanel
  sessionId?: string;
  repoId?: string;
  isMultiRepo?: boolean;
  onNavigateToReview?: () => void;
}

type TabType = 'activity' | 'changes';

export function SidePanel({
  toolActivities,
  isRunning,
  currentActivity,
  onNavigate,
  changedFiles,
  onViewDiffs,
  onFileClick,
  sessionId,
  repoId,
  isMultiRepo,
  onNavigateToReview,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('activity');

  return (
    <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
      {/* Tab Strip */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('activity')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'activity'
              ? 'border-blue-500 text-blue-400 bg-white/5'
              : 'border-transparent text-white/50 hover:text-white/70 hover:bg-white/5'
          )}
        >
          <Activity className="h-4 w-4" />
          <span>Activity</span>
          {isRunning && (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('changes')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'changes'
              ? 'border-blue-500 text-blue-400 bg-white/5'
              : 'border-transparent text-white/50 hover:text-white/70 hover:bg-white/5'
          )}
        >
          <FileCode className="h-4 w-4" />
          <span>Changes</span>
          {changedFiles.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400">
              {changedFiles.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-3">
        {activeTab === 'activity' ? (
          <ActivityStatusWidget
            toolActivities={toolActivities}
            isRunning={isRunning}
            currentActivity={currentActivity}
            onNavigate={onNavigate}
          />
        ) : sessionId ? (
          <ChangesPanel
            sessionId={sessionId}
            repoId={repoId}
            isMultiRepo={isMultiRepo}
            changedFiles={changedFiles}
            onViewDiffs={onViewDiffs}
            onNavigateToFullScreen={onNavigateToReview}
          />
        ) : (
          // Fallback to showing just the files if no sessionId
          <div className="text-sm text-white/55">
            {changedFiles.length > 0 ? (
              <div className="space-y-2">
                {changedFiles.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => onFileClick?.(file.path)}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10',
                      onFileClick && 'cursor-pointer hover:bg-white/10'
                    )}
                  >
                    <div className="min-w-0 truncate text-white/80">{file.path}</div>
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs ring-1 ring-white/10">
                      {file.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2">No changes yet</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
