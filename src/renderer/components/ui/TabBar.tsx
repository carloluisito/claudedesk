import { useState, useRef, useEffect } from 'react';
import { Tab, TabData } from './Tab';
import { NewSessionDialog } from './NewSessionDialog';
import { ContextMenu, ContextMenuPosition } from './ContextMenu';

import { Workspace } from '../../../shared/ipc-types';

interface TabBarProps {
  sessions: TabData[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCloseSession: (id: string) => void;
  onCreateSession: (name: string, workingDirectory: string, permissionMode: 'standard' | 'skip-permissions') => void;
  onRenameSession: (id: string, name: string) => void;
  onRestartSession: (id: string) => void;
  onDuplicateSession: (id: string) => void;
  isDialogOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
  workspaces?: Workspace[];
  onOpenSettings?: () => void;
  onOpenBudget?: () => void;
  onOpenHistory?: () => void;
  onOpenCheckpoints?: () => void;
  onCreateCheckpoint?: () => void;
  isSplitActive?: boolean;
  onToggleSplit?: () => void;
  visibleSessionIds?: string[];
  focusedSessionId?: string | null;
  onFocusPaneWithSession?: (sessionId: string) => void;
  onAssignSessionToFocusedPane?: (sessionId: string) => void;
  paneCount?: number;
  onSplitSession?: (sessionId: string, direction: 'horizontal' | 'vertical') => void;
}

export function TabBar({
  sessions,
  activeSessionId,
  onSelectSession,
  onCloseSession,
  onCreateSession,
  onRenameSession,
  onRestartSession,
  onDuplicateSession,
  isDialogOpen: externalDialogOpen,
  onDialogOpenChange,
  workspaces = [],
  onOpenSettings,
  onOpenBudget,
  onOpenHistory,
  onOpenCheckpoints,
  onCreateCheckpoint,
  isSplitActive = false,
  onToggleSplit,
  visibleSessionIds = [],
  focusedSessionId = null,
  onFocusPaneWithSession,
  onAssignSessionToFocusedPane,
  paneCount = 1,
  onSplitSession,
}: TabBarProps) {
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const [checkpointCounts, setCheckpointCounts] = useState<Record<string, number>>({});

  // Use external state if provided, otherwise use internal state
  const isDialogOpen = externalDialogOpen ?? internalDialogOpen;
  const setIsDialogOpen = (open: boolean) => {
    if (onDialogOpenChange) {
      onDialogOpenChange(open);
    } else {
      setInternalDialogOpen(open);
    }
  };
  const [contextMenu, setContextMenu] = useState<{
    sessionId: string;
    position: ContextMenuPosition;
  } | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [sessions]);

  // Load checkpoint counts for all sessions
  useEffect(() => {
    const loadCheckpointCounts = async () => {
      const counts: Record<string, number> = {};

      for (const session of sessions) {
        try {
          const count = await window.electronAPI.getCheckpointCount(session.id);
          counts[session.id] = count;
        } catch (err) {
          console.error(`Failed to load checkpoint count for session ${session.id}:`, err);
          counts[session.id] = 0;
        }
      }

      setCheckpointCounts(counts);
    };

    if (sessions.length > 0) {
      loadCheckpointCounts();
    }
  }, [sessions]);

  // Listen for checkpoint events to update counts
  useEffect(() => {
    const handleCheckpointCreated = async (checkpoint: any) => {
      setCheckpointCounts((prev) => ({
        ...prev,
        [checkpoint.sessionId]: (prev[checkpoint.sessionId] || 0) + 1,
      }));
    };

    const handleCheckpointDeleted = async () => {
      // Reload all counts when a checkpoint is deleted
      // (we don't know which session it belonged to from the event)
      const counts: Record<string, number> = {};
      for (const session of sessions) {
        try {
          const count = await window.electronAPI.getCheckpointCount(session.id);
          counts[session.id] = count;
        } catch (err) {
          counts[session.id] = 0;
        }
      }
      setCheckpointCounts(counts);
    };

    const unsubCreated = window.electronAPI.onCheckpointCreated(handleCheckpointCreated);
    const unsubDeleted = window.electronAPI.onCheckpointDeleted(handleCheckpointDeleted);

    return () => {
      unsubCreated();
      unsubDeleted();
    };
  }, [sessions]);

  const handleContextMenu = (sessionId: string, position: ContextMenuPosition) => {
    setContextMenu({ sessionId, position });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleContextAction = (action: string) => {
    if (!contextMenu) return;
    const { sessionId } = contextMenu;

    switch (action) {
      case 'rename':
        setEditingTabId(sessionId);
        break;
      case 'duplicate':
        onDuplicateSession(sessionId);
        break;
      case 'createCheckpoint':
        // First switch to this session, then trigger checkpoint dialog
        onSelectSession(sessionId);
        if (onCreateCheckpoint) {
          onCreateCheckpoint();
        }
        break;
      case 'viewCheckpoints':
        // First switch to this session, then open checkpoints panel
        onSelectSession(sessionId);
        if (onOpenCheckpoints) {
          onOpenCheckpoints();
        }
        break;
      case 'restart':
        onRestartSession(sessionId);
        break;
      case 'splitRight':
        if (onSplitSession) {
          onSplitSession(sessionId, 'horizontal');
        }
        break;
      case 'splitDown':
        if (onSplitSession) {
          onSplitSession(sessionId, 'vertical');
        }
        break;
      case 'close':
        onCloseSession(sessionId);
        break;
      case 'closeOthers':
        sessions.forEach(s => {
          if (s.id !== sessionId) onCloseSession(s.id);
        });
        break;
      case 'closeRight':
        const idx = sessions.findIndex(s => s.id === sessionId);
        sessions.slice(idx + 1).forEach(s => onCloseSession(s.id));
        break;
    }
    closeContextMenu();
  };

  const handleRename = (id: string, name: string) => {
    onRenameSession(id, name);
    setEditingTabId(null);
  };

  const contextSession = contextMenu ? sessions.find(s => s.id === contextMenu.sessionId) : null;
  const contextSessionIndex = contextMenu ? sessions.findIndex(s => s.id === contextMenu.sessionId) : -1;

  return (
    <>
      <div className="tab-bar">
        {/* New Session Button */}
        <button
          className="new-session-btn"
          onClick={() => setIsDialogOpen(true)}
          title="New session (Ctrl+T)"
          aria-label="New session"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7 1v12M1 7h12" strokeLinecap="round" />
          </svg>
        </button>

        {/* Scroll fade indicators */}
        <div className={`scroll-fade scroll-fade-left ${canScrollLeft ? 'visible' : ''}`} />
        <div className={`scroll-fade scroll-fade-right ${canScrollRight ? 'visible' : ''}`} />

        {/* Tabs container */}
        <div
          className="tabs-scroll-container"
          ref={scrollContainerRef}
          onScroll={checkScroll}
        >
          <div className="tabs-inner">
            {sessions.map((session, index) => {
              // Compute visibility state for split view
              let visibilityState: 'focused' | 'visible' | 'hidden' = 'hidden';
              if (isSplitActive && visibleSessionIds.includes(session.id)) {
                visibilityState = session.id === focusedSessionId ? 'focused' : 'visible';
              }

              // Handle tab selection with split view logic
              const handleTabSelect = () => {
                if (isSplitActive && onFocusPaneWithSession && onAssignSessionToFocusedPane) {
                  if (visibleSessionIds.includes(session.id)) {
                    // Session is visible, focus its pane
                    onFocusPaneWithSession(session.id);
                  } else {
                    // Session is not visible, assign to focused pane
                    onAssignSessionToFocusedPane(session.id);
                  }
                } else {
                  // No split view, use default behavior
                  onSelectSession(session.id);
                }
              };

              return (
                <Tab
                  key={session.id}
                  data={session}
                  isActive={session.id === activeSessionId}
                  isEditing={session.id === editingTabId}
                  index={index}
                  onSelect={handleTabSelect}
                  onClose={() => onCloseSession(session.id)}
                  onContextMenu={(pos) => handleContextMenu(session.id, pos)}
                  onRename={(name) => handleRename(session.id, name)}
                  onCancelEdit={() => setEditingTabId(null)}
                  visibilityState={visibilityState}
                  checkpointCount={checkpointCounts[session.id] || 0}
                />
              );
            })}
          </div>
        </div>

        {/* Session count indicator */}
        <div className="session-count">
          <span className="count-current">{sessions.length}</span>
          <span className="count-separator">/</span>
          <span className="count-max">10</span>
        </div>

        {/* Split toggle button */}
        {onToggleSplit && (
          <button
            className={`split-btn ${isSplitActive ? 'active' : ''}`}
            onClick={onToggleSplit}
            title={isSplitActive ? "Collapse Split View" : "Split View (Ctrl+\\)"}
            aria-label={isSplitActive ? "Collapse Split View" : "Split View"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
          </button>
        )}

        {/* History button */}
        {onOpenHistory && (
          <button
            className="history-btn"
            onClick={onOpenHistory}
            title="Session History (Ctrl+Shift+H)"
            aria-label="Session History"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
        )}

        {/* Budget button */}
        {onOpenBudget && (
          <button
            className="budget-btn"
            onClick={onOpenBudget}
            title="Usage Budget"
            aria-label="Usage Budget"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {/* Settings button */}
        {onOpenSettings && (
          <button
            className="settings-btn"
            onClick={onOpenSettings}
            title="Settings"
            aria-label="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        )}
      </div>

      {/* New Session Dialog */}
      <NewSessionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={onCreateSession}
        sessionCount={sessions.length}
        workspaces={workspaces}
      />

      {/* Context Menu */}
      {contextMenu && contextSession && (
        <ContextMenu
          position={contextMenu.position}
          onClose={closeContextMenu}
          onAction={handleContextAction}
          isExited={contextSession.status === 'exited'}
          isOnlyTab={sessions.length === 1}
          isRightmost={contextSessionIndex === sessions.length - 1}
          canSplit={paneCount < 4}
        />
      )}

      <style>{`
        .tab-bar {
          height: 40px;
          background: #13141b;
          border-bottom: 1px solid #1e2030;
          display: flex;
          align-items: center;
          position: relative;
          font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
          user-select: none;
        }

        .new-session-btn {
          width: 32px;
          height: 32px;
          margin: 0 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          color: #565f89;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .new-session-btn:hover {
          background: #1e2030;
          border-color: #292e42;
          color: #7aa2f7;
        }

        .new-session-btn:active {
          transform: scale(0.95);
        }

        .scroll-fade {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 32px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease;
          z-index: 10;
        }

        .scroll-fade.visible {
          opacity: 1;
        }

        .scroll-fade-left {
          left: 48px;
          background: linear-gradient(to right, #13141b, transparent);
        }

        .scroll-fade-right {
          right: 56px;
          background: linear-gradient(to left, #13141b, transparent);
        }

        .tabs-scroll-container {
          flex: 1;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .tabs-scroll-container::-webkit-scrollbar {
          display: none;
        }

        .tabs-inner {
          display: flex;
          height: 40px;
          align-items: flex-end;
          padding: 0 4px;
          gap: 2px;
        }

        .session-count {
          display: flex;
          align-items: center;
          padding: 0 12px;
          font-size: 11px;
          flex-shrink: 0;
          opacity: 0.5;
        }

        .count-current {
          color: #7aa2f7;
        }

        .count-separator {
          color: #3b4261;
          margin: 0 2px;
        }

        .count-max {
          color: #565f89;
        }

        .split-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          color: #565f89;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .split-btn:hover {
          background: #1e2030;
          border-color: #292e42;
          color: #7aa2f7;
        }

        .split-btn.active {
          background: #1e2030;
          border-color: #7aa2f7;
          color: #7aa2f7;
        }

        .split-btn:active {
          transform: scale(0.95);
        }

        .history-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          color: #565f89;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .history-btn:hover {
          background: #1e2030;
          border-color: #292e42;
          color: #7aa2f7;
        }

        .history-btn:active {
          transform: scale(0.95);
        }

        .budget-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          color: #565f89;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .budget-btn:hover {
          background: #1e2030;
          border-color: #292e42;
          color: #9ece6a;
        }

        .budget-btn:active {
          transform: scale(0.95);
        }

        .settings-btn {
          width: 32px;
          height: 32px;
          margin-right: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          color: #565f89;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .settings-btn:hover {
          background: #1e2030;
          border-color: #292e42;
          color: #7aa2f7;
        }

        .settings-btn:active {
          transform: scale(0.95);
        }
      `}</style>
    </>
  );
}
