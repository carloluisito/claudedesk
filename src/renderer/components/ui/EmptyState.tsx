interface EmptyStateProps {
  onCreateSession: () => void;
}

export function EmptyState({ onCreateSession }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="13,2 13,9 20,9" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round" />
          <line x1="9" y1="17" x2="15" y2="17" strokeLinecap="round" />
        </svg>
      </div>

      <h2 className="empty-title">No Active Sessions</h2>
      <p className="empty-description">
        Start a new Claude Code session to begin coding with AI assistance.
      </p>

      <button className="create-btn" onClick={onCreateSession}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 2v12M2 8h12" strokeLinecap="round" />
        </svg>
        New Session
        <span className="shortcut">Ctrl+T</span>
      </button>

      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 48px;
          font-family: 'JetBrains Mono', monospace;
          text-align: center;
          animation: fade-in 0.3s ease;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(122, 162, 247, 0.1), rgba(125, 207, 255, 0.05));
          border: 1px solid #292e42;
          border-radius: 20px;
          margin-bottom: 24px;
          color: #565f89;
        }

        .empty-title {
          font-size: 16px;
          font-weight: 600;
          color: #a9b1d6;
          margin: 0 0 8px 0;
        }

        .empty-description {
          font-size: 13px;
          color: #565f89;
          margin: 0 0 32px 0;
          max-width: 320px;
          line-height: 1.5;
        }

        .create-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          height: 44px;
          padding: 0 24px;
          background: linear-gradient(135deg, #7aa2f7, #7dcfff);
          border: none;
          border-radius: 10px;
          color: #1a1b26;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(122, 162, 247, 0.2);
        }

        .create-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(122, 162, 247, 0.3);
        }

        .create-btn:active {
          transform: translateY(0);
        }

        .create-btn svg {
          opacity: 0.8;
        }

        .shortcut {
          font-size: 11px;
          font-weight: 500;
          opacity: 0.6;
          margin-left: 4px;
        }
      `}</style>
    </div>
  );
}
