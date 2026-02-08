import { TabData } from './ui/Tab';

interface PaneSessionPickerProps {
  availableSessions: TabData[];
  onSelectSession: (sessionId: string) => void;
  onCreateNewSession: () => void;
  onCancel: () => void;
}

export function PaneSessionPicker({
  availableSessions,
  onSelectSession,
  onCreateNewSession,
  onCancel,
}: PaneSessionPickerProps) {
  return (
    <div className="pane-session-picker">
      <div className="picker-card">
        <div className="picker-header">
          <h3>Select a session for this pane</h3>
        </div>

        <button className="picker-new-session-btn" onClick={onCreateNewSession}>
          + New Session
        </button>

        {availableSessions.length > 0 && (
          <>
            <div className="picker-divider">
              <span>or choose existing</span>
            </div>

            <div className="picker-sessions">
              {availableSessions.map(session => (
                <div
                  key={session.id}
                  className="picker-session-item"
                  onClick={() => onSelectSession(session.id)}
                >
                  <div className="picker-session-name">{session.name}</div>
                  <div className="picker-session-dir">{session.workingDirectory}</div>
                  <div className={`picker-session-status status-${session.status}`}>
                    {session.status === 'running' ? '● Running' : '○ Exited'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="picker-footer">
          <button className="picker-cancel-link" onClick={onCancel}>
            Cancel (close this pane)
          </button>
        </div>
      </div>

      <style>{`
        .pane-session-picker {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1b26;
          padding: 24px;
        }

        .picker-card {
          background: #16161e;
          border: 1px solid #292e42;
          border-radius: 8px;
          padding: 24px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }

        .picker-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #a9b1d6;
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 16px;
        }

        .picker-new-session-btn {
          width: 100%;
          padding: 12px;
          background: #7aa2f7;
          color: #1a1b26;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .picker-new-session-btn:hover {
          background: #7da6ff;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(122, 162, 247, 0.3);
        }

        .picker-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
        }

        .picker-divider::before,
        .picker-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #292e42;
        }

        .picker-divider span {
          color: #565f89;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .picker-sessions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .picker-session-item {
          padding: 12px;
          background: #1a1b26;
          border: 1px solid #292e42;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .picker-session-item:hover {
          background: #292e42;
          border-color: #3b4261;
          transform: translateX(2px);
        }

        .picker-session-name {
          font-size: 13px;
          font-weight: 500;
          color: #a9b1d6;
          margin-bottom: 4px;
        }

        .picker-session-dir {
          font-size: 11px;
          color: #565f89;
          margin-bottom: 6px;
        }

        .picker-session-status {
          font-size: 10px;
          display: inline-block;
          padding: 2px 8px;
          border-radius: 3px;
          font-weight: 500;
        }

        .picker-session-status.status-running {
          color: #9ece6a;
          background: rgba(158, 206, 106, 0.1);
        }

        .picker-session-status.status-exited {
          color: #f7768e;
          background: rgba(247, 118, 142, 0.1);
        }

        .picker-footer {
          margin-top: 20px;
          text-align: center;
        }

        .picker-cancel-link {
          background: transparent;
          border: none;
          color: #565f89;
          font-size: 11px;
          cursor: pointer;
          text-decoration: underline;
          font-family: 'JetBrains Mono', monospace;
          transition: color 0.15s ease;
        }

        .picker-cancel-link:hover {
          color: #a9b1d6;
        }
      `}</style>
    </div>
  );
}
