/**
 * SidebarArea - Container for activity feed, changes drawer, and quick actions
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SidebarAreaProps {
  /** Action rail component */
  actionRail: ReactNode;
  /** Side panel content (activity + changes) */
  sidePanel: ReactNode;
  /** Custom class names */
  className?: string;
}

export function SidebarArea({ actionRail, sidePanel, className }: SidebarAreaProps) {
  return (
    <div className={cn('space-y-3 overflow-y-auto min-h-0', className)}>
      {actionRail}
      {sidePanel}
    </div>
  );
}

export type { SidebarAreaProps };
