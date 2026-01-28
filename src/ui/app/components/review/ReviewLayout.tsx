/**
 * ReviewLayout - Responsive 3-column layout for review screen
 *
 * Desktop: [File List 25%] [Diff 50%] [Summary 25%]
 * Tablet: [File List 30%] [Diff 70%] (Summary as overlay)
 * Mobile: Full-screen diff with file drawer
 */

import { type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ReviewLayoutProps {
  /** File list panel */
  fileList: ReactNode;
  /** Main diff viewer */
  diffViewer: ReactNode;
  /** Summary/action panel */
  summary: ReactNode;
  /** Whether to show summary panel inline (desktop) or as overlay (tablet) */
  summaryMode?: 'inline' | 'overlay';
  /** Whether summary is visible (for overlay mode) */
  summaryVisible?: boolean;
  /** Custom class names */
  className?: string;
}

export function ReviewLayout({
  fileList,
  diffViewer,
  summary,
  summaryMode = 'inline',
  summaryVisible = true,
  className,
}: ReviewLayoutProps) {
  return (
    <div className={cn('flex h-full overflow-hidden', className)}>
      {/* File list - hidden on mobile */}
      <div className="hidden sm:flex w-64 lg:w-72 flex-shrink-0 flex-col border-r border-white/10 bg-white/2">
        {fileList}
      </div>

      {/* Diff viewer - takes remaining space */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {diffViewer}
      </div>

      {/* Summary panel - different modes based on screen size */}
      {summaryMode === 'inline' ? (
        <div className="hidden lg:flex w-72 xl:w-80 flex-shrink-0 flex-col border-l border-white/10 bg-white/2">
          {summary}
        </div>
      ) : summaryVisible ? (
        <div className="fixed inset-y-0 right-0 z-40 w-80 flex-col border-l border-white/10 bg-[#0d1117] shadow-xl lg:hidden">
          {summary}
        </div>
      ) : null}
    </div>
  );
}

export type { ReviewLayoutProps };
