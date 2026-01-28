/**
 * TerminalV2.tsx - Refactored Terminal with modular architecture
 *
 * This is the redesigned Terminal screen that:
 * - Uses terminalUIStore for overlay/panel state management
 * - Delegates layout to TerminalLayout component
 * - Uses OverlayManager for all modals
 * - Maintains all existing functionality
 */

import { useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, AlertTriangle, X } from 'lucide-react';
import { api } from '../lib/api';

// Hooks and stores
import { useTerminal } from '../hooks/useTerminal';
import { useAgents } from '../hooks/useAgents';
import { useTerminalUIStore } from '../store/terminalUIStore';
import { cn } from '../lib/cn';

// Layout components
import {
  TerminalLayout,
  TerminalEmpty,
  ConversationArea,
  SidebarArea,
  MobileStatusStrip,
  MobileExpandedActions,
} from '../components/terminal/layout';

// v2 Terminal components
import {
  TopBar,
  TabStrip,
  SessionTab,
  WorkspaceHeader,
  ConversationPanel,
  Composer,
  ActionRail,
  SidePanel,
  TimelineItem,
  ChangedFile,
} from '../components/terminal/v2';

// Existing components
import { MessageItem } from '../components/terminal/MessageItem';
import { QuestionsPanel } from '../components/terminal/QuestionsPanel';
import { QuotaAlertBanner } from '../components/ui/QuotaAlertBanner';
import { PreviewPanel } from '../components/terminal/PreviewPanel';

// Overlays
import { OverlayManager } from '../components/terminal/overlays';
import { SessionContextMenu } from '../components/terminal/SessionModals';

// Hooks for quota
import { useState, useRef } from 'react';

interface ClaudeQuotaBucket {
  utilization: number;
  resets_at: string;
}

interface ClaudeUsageQuota {
  five_hour: ClaudeQuotaBucket;
  seven_day: ClaudeQuotaBucket;
  lastUpdated: string;
}

// Remote Access Warning Banner
function RemoteAccessBanner() {
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api<{ remoteEnabled: boolean }>('GET', '/system/remote-status')
      .then((data) => setRemoteEnabled(data.remoteEnabled))
      .catch(() => {});
  }, []);

  if (!remoteEnabled || dismissed) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-40 bg-amber-600/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-white">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">
            Remote Access Enabled • This instance is accessible over the network.
          </span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-white/80 hover:text-white p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function TerminalV2() {
  const terminal = useTerminal();
  const agents = useAgents();
  const ui = useTerminalUIStore();

  // Quota state
  const [quota, setQuota] = useState<ClaudeUsageQuota | null>(null);
  const hasLoadedQuota = useRef(false);

  // Fetch quota
  const fetchQuota = useCallback(async () => {
    try {
      const result = await api<ClaudeUsageQuota | null>('GET', '/terminal/usage/quota');
      setQuota(result);
    } catch (e) {
      console.error('Failed to fetch quota:', e);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedQuota.current) {
      hasLoadedQuota.current = true;
      fetchQuota();
      const interval = setInterval(fetchQuota, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchQuota]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        ui.openCommandPalette();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        ui.openAgents();
      }
      if (e.key === 'Escape' && ui.activeOverlay !== 'none') {
        e.preventDefault();
        ui.closeOverlay();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ui]);

  // Destructure terminal for convenience
  const {
    navigate,
    sessions,
    activeSessionId,
    activeSession,
    isConnected,
    repos,
    workspaces,
    pendingAttachments,
    hasRunningApp,
    lastAssistantIndex,
    input,
    setInput,
    isDragging,
    isSending,
    isUploading,
    connectionToast,
    switcherToast,
    handleSend,
    handleKeyDown,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    handleRetry,
    handleRegenerate,
    handleToggleMessageBookmark,
    switchSession,
    closeSession,
    setMode,
    toggleBookmark,
    exportSession,
    answerPlanQuestion,
    setAdditionalContext,
    approvePlan,
    cancelPlan,
    cancelOperation,
    removePendingAttachment,
    removeFromQueue,
    clearQueue,
    resumeQueue,
    showPreviewPanel,
    setShowPreviewPanel,
    getShortenedPath,
    messagesEndRef,
    inputRef,
    fileInputRef,
    contextMenu,
    setContextMenu,
    deleteWorktreeConfirm,
    setDeleteWorktreeConfirm,
  } = terminal;

  // Convert sessions to tab format
  const sessionTabs: SessionTab[] = useMemo(
    () =>
      sessions.map((s) => ({
        id: s.id,
        name: s.repoIds?.[0] || s.repoId || 'Session',
        repo: s.repoIds?.[0] || s.repoId || '',
        branch: s.gitStatus?.branch || s.branch,
        dirtyFiles: (s.gitStatus?.modified || 0) + (s.gitStatus?.staged || 0),
        isMultiRepo: s.isMultiRepo,
        repoCount: s.repoIds?.length || 1,
        isRunning: s.status === 'running',
        isBookmarked: s.isBookmarked,
        worktreeMode: s.worktreeMode,
      })),
    [sessions]
  );

  // Timeline items
  const timelineItems: TimelineItem[] = useMemo(() => {
    if (!activeSession?.toolActivities) return [];
    return activeSession.toolActivities.map((a, i) => ({
      id: a.id || `activity-${i}`,
      kind: (a.tool?.toLowerCase() as TimelineItem['kind']) || 'other',
      label: a.description || a.tool || 'Activity',
      status: a.status === 'completed' ? 'ok' : a.status === 'error' ? 'error' : 'running',
      ms: a.duration || 0,
    }));
  }, [activeSession?.toolActivities]);

  // Changed files
  const changedFiles: ChangedFile[] = useMemo(() => {
    if (!activeSession?.gitStatus?.files) return [];
    return activeSession.gitStatus.files.map((f: any) => ({
      path: f.path || f,
      status: f.status || 'modified',
    }));
  }, [activeSession?.gitStatus?.files]);

  // Format reset time
  const getRelativeResetTime = useCallback((resetsAt: string): string => {
    const diffMs = new Date(resetsAt).getTime() - Date.now();
    if (diffMs <= 0) return 'now';
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `in ${days}d ${hours}h`;
    if (hours > 0) return `in ${hours}h ${minutes}m`;
    return `in ${minutes}m`;
  }, []);

  // Render message
  const renderMessage = useCallback(
    (message: any, index: number) => (
      <MessageItem
        key={message.id}
        message={message}
        isLastAssistantMessage={message.role === 'assistant' && index === lastAssistantIndex}
        toolActivities={activeSession?.toolActivities || []}
        currentActivity={activeSession?.currentActivity}
        onRetry={handleRetry}
        onRegenerate={handleRegenerate}
        onToggleBookmark={handleToggleMessageBookmark}
        isSessionRunning={activeSession?.status === 'running'}
        sessionId={activeSession?.id}
      />
    ),
    [lastAssistantIndex, activeSession, handleRetry, handleRegenerate, handleToggleMessageBookmark]
  );

  // Handle opening new session
  const handleOpenNewSession = useCallback(() => {
    if (!terminal.selectedWorkspaceId && workspaces.length > 0) {
      terminal.setSelectedWorkspaceId(workspaces[0].id);
    }
    ui.openNewSession();
  }, [terminal, workspaces, ui]);

  return (
    <TerminalLayout
      topBar={
        <TopBar
          onNewSession={handleOpenNewSession}
          onOpenPalette={ui.openCommandPalette}
          onSearch={() => ui.openOverlay('session-search')}
          onSplit={() => {
            if (ui.splitView) {
              ui.setSplitView(false);
            } else {
              ui.openOverlay('split-selector');
            }
          }}
          isSplitActive={ui.splitView}
          hourlyQuota={quota ? Math.round(quota.five_hour.utilization * 100) : undefined}
          weeklyQuota={quota ? Math.round(quota.seven_day.utilization * 100) : undefined}
          hourlyResetTime={quota ? getRelativeResetTime(quota.five_hour.resets_at) : undefined}
          weeklyResetTime={quota ? getRelativeResetTime(quota.seven_day.resets_at) : undefined}
          onQuotaClick={() => ui.openOverlay('usage-dashboard')}
        />
      }
      tabs={
        <TabStrip
          tabs={sessionTabs}
          activeId={activeSessionId}
          onSelect={switchSession}
          onClose={(id) => {
            const session = sessions.find((s) => s.id === id);
            if (session?.worktreeMode && session.branch && session.ownsWorktree === true) {
              ui.setDeleteWorktreeConfirm({ sessionId: id, branch: session.branch });
            } else {
              closeSession(id);
            }
          }}
          onToggleBookmark={toggleBookmark}
          onContextMenu={(e, sessionId) => {
            ui.openContextMenu({ x: e.clientX, y: e.clientY }, sessionId);
          }}
        />
      }
      mainContent={
        activeSession ? (
          <>
            <WorkspaceHeader
              name={activeSession.repoIds?.[0] || activeSession.repoId || 'Session'}
              repo={getShortenedPath(activeSession.repoIds?.[0] || activeSession.repoId || '')}
              branch={activeSession.gitStatus?.branch || activeSession.branch}
              changesCount={changedFiles.length}
              mode={activeSession.mode || 'direct'}
              onToggleMode={() => setMode(activeSession.mode === 'plan' ? 'direct' : 'plan')}
              onJumpTo={ui.toggleJumpMenu}
            />

            <ConversationArea
              isDragging={isDragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              showSearch={ui.messageSearch.isOpen}
              searchQuery={ui.messageSearch.query}
              onSearchQueryChange={ui.setMessageSearchQuery}
              searchIndex={ui.messageSearch.index}
              searchMatchCount={ui.messageSearch.matches.length}
              onSearchNavigate={(dir) => {
                const newIndex = dir === 'next' ? ui.messageSearch.index + 1 : ui.messageSearch.index - 1;
                ui.setMessageSearchIndex(newIndex);
              }}
              onSearchClose={ui.closeMessageSearch}
              queueCount={activeSession.messageQueue.length}
              showQueueManager={ui.expandedPanels.has('queue')}
              queueItems={activeSession.messageQueue}
              onToggleQueueManager={() => ui.togglePanel('queue')}
              onRemoveFromQueue={removeFromQueue}
              onClearQueue={clearQueue}
              showResumeControls={activeSession.status === 'idle' && activeSession.wasRecentlyStopped}
              isSessionRunning={activeSession.status === 'running'}
              onResumeQueue={resumeQueue}
              composer={
                <Composer
                  value={input}
                  onChange={setInput}
                  onSend={() => {
                    handleSend(undefined, agents.selectedAgent?.id);
                    if (agents.selectedAgent) agents.addToRecentAgents(agents.selectedAgent);
                    agents.setSelectedAgent(null);
                  }}
                  onStop={cancelOperation}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  mode={activeSession.mode || 'direct'}
                  onToggleMode={() => setMode(activeSession.mode === 'plan' ? 'direct' : 'plan')}
                  onAttach={() => fileInputRef.current?.click()}
                  inputRef={inputRef}
                  disabled={false}
                  isSending={isSending}
                  isGenerating={activeSession.status === 'running'}
                  isUploading={isUploading}
                  queueCount={activeSession.messageQueue.length}
                  pendingAttachments={pendingAttachments}
                  onRemoveAttachment={(id) => removePendingAttachment(activeSessionId!, id)}
                  agents={agents.allAgents}
                  pinnedAgents={agents.pinnedAgents}
                  recentAgents={agents.recentAgents}
                  userAgents={agents.userAgents}
                  builtinAgents={agents.builtinAgents}
                  selectedAgent={agents.selectedAgent}
                  onAgentSelect={agents.setSelectedAgent}
                  agentSearchQuery={agents.searchQuery}
                  onAgentSearchChange={agents.setSearchQuery}
                  onBrowseAgents={ui.openAgents}
                />
              }
            >
              <ConversationPanel
                messagesEndRef={messagesEndRef}
                isEmpty={activeSession.messages.length === 0}
                isRunning={activeSession.status === 'running'}
                isThinking={!activeSession.messages.some((m: any) => m.isStreaming)}
                currentActivity={activeSession.currentActivity}
                onExport={ui.openExport}
              >
                {activeSession.messages.map(renderMessage)}

                {activeSession.pendingPlan?.questions?.length > 0 && (
                  <div className="pt-4">
                    <QuestionsPanel
                      questions={activeSession.pendingPlan.questions}
                      additionalContext={activeSession.pendingPlan.additionalContext || ''}
                      onAnswer={(qId, answer) => answerPlanQuestion(activeSessionId!, qId, answer)}
                      onContextChange={(ctx) => setAdditionalContext(activeSessionId!, ctx)}
                      onApprove={() => approvePlan(activeSessionId!)}
                      onCancel={() => cancelPlan(activeSessionId!)}
                      isRunning={activeSession.status === 'running'}
                    />
                  </div>
                )}
              </ConversationPanel>
            </ConversationArea>

            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
          </>
        ) : (
          <TerminalEmpty onCreateSession={handleOpenNewSession} />
        )
      }
      sidebarContent={
        activeSession && (
          <SidebarArea
            actionRail={
              <ActionRail
                onRun={() => {
                  const repoId = activeSession?.repoIds?.[0];
                  if (repoId) {
                    navigate(`/run?repoId=${encodeURIComponent(repoId)}&sessionId=${activeSessionId}`);
                  } else {
                    ui.openOverlay('start-app');
                  }
                }}
                onShip={() => navigate(`/pre-ship?sessionId=${activeSessionId}`)}
                onAgents={ui.openAgents}
                hasRunningApp={hasRunningApp}
                isPreviewOpen={showPreviewPanel}
                isAgentsOpen={ui.activeOverlay === 'agents'}
                changesCount={changedFiles.length}
              />
            }
            sidePanel={
              <SidePanel
                toolActivities={activeSession?.toolActivities || []}
                isRunning={activeSession?.status === 'running'}
                currentActivity={activeSession?.currentActivity}
                onNavigate={() => {
                  const timeline = document.getElementById('activity-timeline');
                  if (timeline) {
                    timeline.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                changedFiles={changedFiles}
                onViewDiffs={() => navigate(`/review-changes?sessionId=${activeSessionId}`)}
                sessionId={activeSessionId!}
                repoId={activeSession?.repoIds?.[0]}
                isMultiRepo={activeSession?.isMultiRepo}
                onNavigateToReview={() => navigate(`/pre-ship?sessionId=${activeSessionId}`)}
              />
            }
          />
        )
      }
      statusStrip={
        activeSession && (
          <MobileStatusStrip
            activityCount={timelineItems.length}
            hasRunningActivity={activeSession.status === 'running'}
            changesCount={changedFiles.length}
            mode={activeSession.mode || 'direct'}
            isExpanded={ui.mobileSheet === 'actions'}
            onActivityClick={() => ui.openMobileSheet('actions', 'timeline')}
            onChangesClick={() => ui.openMobileSheet('actions', 'changes')}
            onModeToggle={() => setMode(activeSession.mode === 'plan' ? 'direct' : 'plan')}
            onMoreClick={() => ui.openMobileSheet('actions')}
          />
        )
      }
      alertBanners={
        <>
          <RemoteAccessBanner />
          <QuotaAlertBanner
            hourlyPct={quota ? Math.round(quota.five_hour.utilization * 100) : undefined}
            weeklyPct={quota ? Math.round(quota.seven_day.utilization * 100) : undefined}
            onViewDetails={() => ui.openOverlay('usage-dashboard')}
          />
        </>
      }
      toasts={
        <>
          <AnimatePresence>
            {connectionToast.show && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={cn(
                  'fixed top-32 right-4 z-50 flex items-center gap-2 rounded-2xl px-4 py-2.5 shadow-lg ring-1',
                  connectionToast.connected
                    ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 ring-red-500/30'
                )}
              >
                {connectionToast.connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                <span className="text-sm font-medium">{connectionToast.connected ? 'Connected' : 'Reconnecting...'}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {switcherToast.show && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
              >
                <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl px-6 py-4 shadow-2xl">
                  <div className="text-sm">
                    <div className="text-white/60 text-xs">Switched to</div>
                    <div className="text-white font-medium">{switcherToast.sessionName}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      }
      overlays={
        <>
          <OverlayManager
            onCommandSelect={handleSend}
            onSetMode={setMode}
            onSearchSelectResult={(sessionId, messageId) => {
              switchSession(sessionId);
              setTimeout(() => {
                const el = document.getElementById(`message-${messageId}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add('bg-yellow-500/20');
                  setTimeout(() => el.classList.remove('bg-yellow-500/20'), 2000);
                }
              }, 100);
            }}
            sessions={sessions.map((s) => ({
              id: s.id,
              repoId: s.repoId,
              repoIds: s.repoIds,
              isMultiRepo: s.isMultiRepo,
            }))}
            currentSessionId={activeSessionId}
            onSplitSelect={(sessionId) => ui.setSplitView(true, sessionId)}
            repos={repos}
            currentRepoIds={activeSession?.repoIds || []}
            onAddRepo={(repoId) => activeSessionId && terminal.addRepoToSession(activeSessionId, repoId)}
            onMergeSessions={terminal.mergeSessions}
            messages={activeSession?.messages || []}
            sessionName={activeSession?.repoId || 'conversation'}
            quota={quota}
            onRefreshQuota={fetchQuota}
            onSelectAgent={agents.setSelectedAgent}
            activeRepoId={activeSession?.repoIds?.[0]}
            pendingMCPApproval={terminal.pendingMCPApproval}
            onApproveMCPTool={terminal.approveMCPTool}
            onDenyMCPTool={terminal.denyMCPTool}
            newSessionProps={terminal}
            shipProps={
              activeSessionId
                ? {
                    sessionId: activeSessionId,
                    repoId: activeSession?.repoIds?.[0],
                    isMultiRepo: activeSession?.isMultiRepo,
                    initialConfig: terminal.shipConfig,
                    onFeedback: handleSend,
                  }
                : undefined
            }
            startAppProps={
              activeSession?.repoIds?.[0]
                ? {
                    repoId: activeSession.repoIds[0],
                    onStarted: () => {
                      terminal.loadApps?.();
                      if (window.innerWidth >= 640) setShowPreviewPanel(true);
                    },
                  }
                : undefined
            }
            expandedInputProps={{
              initialValue: input,
              onSend: (content) => {
                setInput(content);
                handleSend(content);
              },
            }}
          />

          <SessionContextMenu
            isOpen={ui.contextMenu.isOpen}
            position={ui.contextMenu.position}
            onClose={ui.closeContextMenu}
            onAddRepo={() => ui.openOverlay('add-repo')}
            onMerge={() => ui.openOverlay('merge-sessions')}
            onCloseSession={() => {
              if (ui.contextMenu.sessionId) closeSession(ui.contextMenu.sessionId);
            }}
            onExportMarkdown={() => {
              if (ui.contextMenu.sessionId) exportSession(ui.contextMenu.sessionId, 'markdown');
            }}
            onExportJson={() => {
              if (ui.contextMenu.sessionId) exportSession(ui.contextMenu.sessionId, 'json');
            }}
          />

          {ui.deleteWorktreeConfirm && (
            <DeleteWorktreeDialog
              branch={ui.deleteWorktreeConfirm.branch}
              onKeepWorktree={() => {
                closeSession(ui.deleteWorktreeConfirm!.sessionId, false, false);
                ui.setDeleteWorktreeConfirm(null);
              }}
              onDeleteWorktree={() => {
                closeSession(ui.deleteWorktreeConfirm!.sessionId, false, true);
                ui.setDeleteWorktreeConfirm(null);
              }}
              onCancel={() => ui.setDeleteWorktreeConfirm(null)}
            />
          )}

          {showPreviewPanel && activeSession?.repoIds?.[0] && (
            <PreviewPanel repoId={activeSession.repoIds[0]} onClose={() => setShowPreviewPanel(false)} />
          )}

          <MobileExpandedActions
            isOpen={ui.mobileSheet === 'actions'}
            onClose={ui.closeMobileSheet}
            onRun={() => {
              const repoId = activeSession?.repoIds?.[0];
              if (repoId) navigate(`/run?repoId=${encodeURIComponent(repoId)}&sessionId=${activeSessionId}`);
              else ui.openOverlay('start-app');
              ui.closeMobileSheet();
            }}
            onShip={() => {
              navigate(`/pre-ship?sessionId=${activeSessionId}`);
              ui.closeMobileSheet();
            }}
            onAgents={() => {
              ui.openAgents();
              ui.closeMobileSheet();
            }}
            hasRunningApp={hasRunningApp}
            changesCount={changedFiles.length}
          />
        </>
      }
    />
  );
}

// Delete worktree dialog
function DeleteWorktreeDialog({
  branch,
  onKeepWorktree,
  onDeleteWorktree,
  onCancel,
}: {
  branch: string;
  onKeepWorktree: () => void;
  onDeleteWorktree: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-zinc-100">Close Worktree Session</h3>
        <p className="mt-2 text-sm text-zinc-400">
          This session owns a worktree for branch "{branch}". What would you like to do?
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button onClick={onKeepWorktree} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500">
            Close Session <span className="ml-1 text-xs text-blue-200">(keep worktree)</span>
          </button>
          <button onClick={onDeleteWorktree} className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-500">
            Delete All <span className="ml-1 text-xs text-red-200">(remove worktree)</span>
          </button>
          <button onClick={onCancel} className="w-full rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
