/**
 * TerminalLayout - Main grid/responsive layout structure for Terminal
 *
 * Orchestrates the overall layout of the terminal screen:
 * - TopBar with navigation
 * - Tab strip for sessions
 * - Main content area with conversation + sidebar
 * - Mobile-specific patterns
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { BackgroundTexture } from '../../ui/BackgroundTexture';

interface TerminalLayoutProps {
  /** Top bar component */
  topBar: ReactNode;
  /** Session tabs component */
  tabs: ReactNode;
  /** Main content area (conversation + composer) */
  mainContent: ReactNode;
  /** Sidebar content (activity + changes) */
  sidebarContent?: ReactNode;
  /** Status strip for mobile (bottom bar) */
  statusStrip?: ReactNode;
  /** Whether split view is active */
  isSplitView?: boolean;
  /** Split view content */
  splitContent?: ReactNode;
  /** Alert banners (quota, remote access, etc.) */
  alertBanners?: ReactNode;
  /** Floating toasts */
  toasts?: ReactNode;
  /** Overlay modals */
  overlays?: ReactNode;
  /** Custom class names */
  className?: string;
}

export function TerminalLayout({
  topBar,
  tabs,
  mainContent,
  sidebarContent,
  statusStrip,
  isSplitView = false,
  splitContent,
  alertBanners,
  toasts,
  overlays,
  className,
}: TerminalLayoutProps) {
  return (
    <div className={cn('h-screen flex flex-col overflow-hidden bg-[#05070c] text-white', className)}>
      {/* Background texture */}
      <BackgroundTexture />

      {/* Alert banners (stacked at top) */}
      {alertBanners}

      {/* Toast notifications */}
      {toasts}

      {/* Main content wrapper */}
      <div className="relative flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Top bar */}
        {topBar}

        {/* Session tabs */}
        {tabs}

        {/* Main content area with responsive grid */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 w-full px-6 pt-5">
          {isSplitView ? (
            // Split view: two columns
            <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden min-h-0">
              <div className="overflow-hidden min-h-0">{mainContent}</div>
              <div className="overflow-hidden min-h-0">{splitContent}</div>
            </div>
          ) : (
            // Normal view: main + sidebar
            <div className="flex-1 grid gap-4 sm:grid-cols-12 overflow-hidden min-h-0">
              {/* Main content: full width on mobile, 8 cols on tablet+ */}
              <div className="col-span-12 sm:col-span-8 flex flex-col min-h-0">
                {mainContent}
              </div>

              {/* Sidebar: hidden on mobile, 4 cols on tablet+ */}
              {sidebarContent && (
                <div className="hidden sm:block sm:col-span-4 space-y-3 overflow-y-auto min-h-0">
                  {sidebarContent}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile status strip (bottom bar) */}
      {statusStrip}

      {/* Modal overlays */}
      {overlays}
    </div>
  );
}

/**
 * TerminalEmpty - Shown when no session is active
 */
interface TerminalEmptyProps {
  onCreateSession: () => void;
}

export function TerminalEmpty({ onCreateSession }: TerminalEmptyProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-white/50">
      <div className="h-12 w-12 mb-4 opacity-50 rounded-xl bg-white/5 flex items-center justify-center ring-1 ring-white/10">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-lg font-medium">No session active</p>
      <p className="text-sm mt-1">Create a new session to get started</p>
      <button
        onClick={onCreateSession}
        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Session
      </button>
    </div>
  );
}

export type { TerminalLayoutProps, TerminalEmptyProps };
