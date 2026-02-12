import { useState, useEffect } from 'react';
import { SessionStatus } from './SessionStatusIndicator';

interface StatusPopoverProps {
  sessionId: string;
  sessionName: string;
  status: SessionStatus;
  isOpen: boolean;
  onClose: () => void;
  onOpenBudget?: () => void;
  onOpenHistory?: () => void;
  onCreateCheckpoint?: () => void;
}

interface SessionStats {
  duration: string;
  model: string;
  apiCalls: number;
  tokensUsed: number;
  budgetUsage: number;
}

export function StatusPopover({
  sessionId,
  sessionName,
  status,
  isOpen,
  onClose,
  onOpenBudget,
  onOpenHistory,
  onCreateCheckpoint,
}: StatusPopoverProps) {
  const [stats, setStats] = useState<SessionStats>({
    duration: '0m',
    model: 'Claude Sonnet 4.5',
    apiCalls: 0,
    tokensUsed: 0,
    budgetUsage: 0,
  });

  useEffect(() => {
    if (!isOpen) return;

    // TODO: Load actual session stats from IPC
    // For now, use placeholder data
    setStats({
      duration: '12m',
      model: 'Claude Sonnet 4.5',
      apiCalls: 8,
      tokensUsed: 4521,
      budgetUsage: 35,
    });
  }, [isOpen, sessionId]);

  if (!isOpen) return null;

  const getStatusColor = () => {
    switch (status) {
      case 'ready': return '#9ece6a';
      case 'initializing': return '#ff9e64';
      case 'error': return '#f7768e';
      case 'warning': return '#e0af68';
      case 'idle': return '#565f89';
      default: return '#565f89';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'ready': return 'Claude Ready';
      case 'initializing': return 'Initializing...';
      case 'error': return 'Connection Error';
      case 'warning': return 'Budget Warning';
      case 'idle': return 'Idle';
      default: return 'Unknown';
    }
  };

  return (
    <>
      <div className="status-popover-overlay" onClick={onClose} />
      <div className="status-popover">
        <div className="popover-header">
          <h3 className="popover-title">Session Status</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="status-badge" style={{ borderColor: getStatusColor() }}>
          <div className="status-dot" style={{ backgroundColor: getStatusColor() }} />
          <span className="status-label">{getStatusLabel()}</span>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Session</div>
            <div className="stat-value">{sessionName}</div>
          </div>

          <div className="stat-item">
            <div className="stat-label">Duration</div>
            <div className="stat-value">{stats.duration}</div>
          </div>

          <div className="stat-item">
            <div className="stat-label">Model</div>
            <div className="stat-value">{stats.model}</div>
          </div>

          <div className="stat-item">
            <div className="stat-label">API Calls</div>
            <div className="stat-value">{stats.apiCalls}</div>
          </div>

          <div className="stat-item">
            <div className="stat-label">Tokens</div>
            <div className="stat-value">{stats.tokensUsed.toLocaleString()}</div>
          </div>

          <div className="stat-item">
            <div className="stat-label">Budget Used</div>
            <div className="stat-value">
              <div className="budget-bar">
                <div
                  className="budget-fill"
                  style={{ width: `${Math.min(stats.budgetUsage, 100)}%` }}
                />
              </div>
              <span className="budget-percent">{stats.budgetUsage}%</span>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          {onOpenBudget && (
            <button className="action-btn" onClick={() => { onOpenBudget(); onClose(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              Budget
            </button>
          )}
          {onOpenHistory && (
            <button className="action-btn" onClick={() => { onOpenHistory(); onClose(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              History
            </button>
          )}
          {onCreateCheckpoint && (
            <button className="action-btn" onClick={() => { onCreateCheckpoint(); onClose(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Checkpoint
            </button>
          )}
        </div>

        <style>{`
          .status-popover-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 998;
          }

          .status-popover {
            position: fixed;
            top: 80px;
            right: 20px;
            width: 320px;
            background: #1f2335;
            border: 2px solid #3d4458;
            border-radius: 12px;
            padding: 20px;
            z-index: 999;
            font-family: 'JetBrains Mono', monospace;
            box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
            animation: popover-slide-in 0.2s cubic-bezier(0, 0, 0.2, 1);
          }

          @keyframes popover-slide-in {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .popover-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .popover-title {
            font-size: 14px;
            font-weight: 600;
            color: #e9e9ea;
            margin: 0;
          }

          .close-btn {
            background: none;
            border: none;
            color: #a9b1d6;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s ease;
          }

          .close-btn:hover {
            background: #24283b;
            color: #e9e9ea;
          }

          .status-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            background: #24283b;
            border: 1px solid;
            border-radius: 8px;
            margin-bottom: 16px;
          }

          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }

          .status-label {
            font-size: 12px;
            font-weight: 500;
            color: #e9e9ea;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 16px;
          }

          .stat-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .stat-label {
            font-size: 10px;
            color: #565f89;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .stat-value {
            font-size: 13px;
            color: #e9e9ea;
            font-weight: 500;
          }

          .budget-bar {
            width: 100%;
            height: 6px;
            background: #24283b;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 4px;
          }

          .budget-fill {
            height: 100%;
            background: linear-gradient(90deg, #7aa2f7, #7dcfff);
            transition: width 0.3s ease;
          }

          .budget-percent {
            font-size: 11px;
            color: #a9b1d6;
          }

          .quick-actions {
            display: flex;
            gap: 8px;
            padding-top: 16px;
            border-top: 1px solid #3d4458;
          }

          .action-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 12px;
            background: #24283b;
            border: 1px solid #3d4458;
            border-radius: 6px;
            color: #a9b1d6;
            font-size: 11px;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .action-btn:hover {
            background: #292e42;
            border-color: #7aa2f7;
            color: #7aa2f7;
          }

          .action-btn svg {
            opacity: 0.8;
          }
        `}</style>
      </div>
    </>
  );
}
