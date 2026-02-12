interface RecentSession {
  id: string;
  name: string;
  timestamp: number;
  directory?: string;
}

interface RecentSessionsListProps {
  sessions: RecentSession[];
  onSelectSession: (sessionId: string) => void;
}

export function RecentSessionsList({ sessions, onSelectSession }: RecentSessionsListProps) {
  if (sessions.length === 0) {
    return null;
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className="recent-sessions">
      <h2 className="recent-title">Recent Sessions</h2>
      <div className="sessions-list">
        {sessions.slice(0, 3).map((session, index) => (
          <button
            key={session.id}
            className="session-item"
            onClick={() => onSelectSession(session.id)}
            style={{ animationDelay: `${0.8 + index * 0.1}s` }}
          >
            <div className="session-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </div>
            <div className="session-info">
              <div className="session-name">{session.name}</div>
              {session.directory && (
                <div className="session-dir">{session.directory}</div>
              )}
            </div>
            <div className="session-time">{formatTimestamp(session.timestamp)}</div>
          </button>
        ))}
      </div>

      <style>{`
        .recent-sessions {
          margin-top: 48px;
          width: 100%;
          max-width: 700px;
        }

        .recent-title {
          font-size: 14px;
          font-weight: 600;
          color: #a9b1d6;
          margin: 0 0 16px 0;
        }

        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .session-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #1f2335;
          border: 1px solid #3d4458;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0, 0, 0.2, 1);
          font-family: inherit;
          text-align: left;
          width: 100%;
          animation: session-fade-in 0.5s ease backwards;
        }

        @keyframes session-fade-in {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .session-item:hover {
          border-color: #7aa2f7;
          background: #24283b;
          transform: translateX(4px);
        }

        .session-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(122, 162, 247, 0.1);
          border-radius: 8px;
          color: #7aa2f7;
          flex-shrink: 0;
        }

        .session-info {
          flex: 1;
          min-width: 0;
        }

        .session-name {
          font-size: 13px;
          font-weight: 500;
          color: #e9e9ea;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .session-dir {
          font-size: 11px;
          color: #565f89;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }

        .session-time {
          font-size: 11px;
          color: #565f89;
          font-weight: 500;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
