import { useState, useEffect } from 'react';
import { WelcomeHero } from './WelcomeHero';
import { QuickActionCard } from './QuickActionCard';
import { FeatureShowcase } from './FeatureShowcase';
import { RecentSessionsList } from './RecentSessionsList';

interface EmptyStateProps {
  onCreateSession: () => void;
  onQuickStart?: {
    startCoding: () => void;
    analyzeCodebase: () => void;
    teamProject: () => void;
  };
}

export function EmptyState({ onCreateSession, onQuickStart }: EmptyStateProps) {
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [appVersion, setAppVersion] = useState('4.3.1');

  useEffect(() => {
    // Load app version
    window.electronAPI.getVersionInfo?.().then((versionInfo) => {
      if (versionInfo?.appVersion) setAppVersion(versionInfo.appVersion);
    }).catch(() => {
      // Fallback to default version if API not available
    });

    // Load recent sessions from history
    window.electronAPI.listHistory?.().then((sessions) => {
      if (sessions && sessions.length > 0) {
        // Convert history entries to recent session format
        const recent = sessions
          .sort((a, b) => (b.lastUpdatedAt || b.createdAt) - (a.lastUpdatedAt || a.createdAt))
          .slice(0, 3)
          .map((session) => ({
            id: session.id,
            name: session.name || 'Unnamed Session',
            timestamp: session.lastUpdatedAt || session.createdAt,
            directory: session.workingDirectory,
          }));
        setRecentSessions(recent);
      }
    }).catch(() => {
      // No history available yet
    });
  }, []);

  const handleRestoreSession = (sessionId: string) => {
    // In future, implement session restoration from history
    console.log('Restore session:', sessionId);
    onCreateSession();
  };

  return (
    <div className="empty-state">
      <WelcomeHero version={appVersion} />

      <div className="quick-actions">
        <QuickActionCard
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="19" x2="20" y2="19" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          title="Start Coding"
          description="Create a new session with a 2-pane split layout"
          onClick={onQuickStart?.startCoding || onCreateSession}
          accentColor="#7aa2f7"
        />

        <QuickActionCard
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="22.08" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          title="Analyze Codebase"
          description="Start a session and open the Repository Atlas"
          onClick={onQuickStart?.analyzeCodebase || onCreateSession}
          accentColor="#9ece6a"
        />

        <QuickActionCard
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="6" r="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="18" cy="6" r="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="18" r="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="18" cy="18" r="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="8" y1="6" x2="10" y2="10" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="16" y1="6" x2="14" y2="10" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="8" y1="18" x2="10" y2="14" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="16" y1="18" x2="14" y2="14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          title="Team Project"
          description="Start a session and open the Agent Teams panel"
          onClick={onQuickStart?.teamProject || onCreateSession}
          accentColor="#ff9e64"
        />
      </div>

      <FeatureShowcase />

      {recentSessions.length > 0 && (
        <RecentSessionsList
          sessions={recentSessions}
          onSelectSession={handleRestoreSession}
        />
      )}

      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          min-height: 100%;
          padding: 64px 48px 128px;
          font-family: 'JetBrains Mono', monospace;
          text-align: center;
          animation: fade-in 0.3s ease;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .quick-actions {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 32px;
          max-width: 920px;
        }
      `}</style>
    </div>
  );
}
