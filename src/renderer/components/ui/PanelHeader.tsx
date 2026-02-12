import { ReactNode } from 'react';

interface PanelHeaderProps {
  title: string;
  onClose: () => void;
  actions?: ReactNode[];
}

export function PanelHeader({ title, onClose, actions = [] }: PanelHeaderProps) {
  return (
    <div className="panel-header">
      <h2 className="panel-title">{title}</h2>
      <div className="panel-actions">
        {actions.map((action, index) => (
          <div key={index} className="action-item">
            {action}
          </div>
        ))}
        <button
          className="panel-close-btn"
          onClick={onClose}
          aria-label="Close panel"
          title="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <style>{`
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #3d4458;
          background: #1f2335;
          flex-shrink: 0;
        }

        .panel-title {
          font-size: 18px;
          font-weight: 700;
          color: #e9e9ea;
          margin: 0;
          letter-spacing: -0.3px;
        }

        .panel-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .action-item {
          display: flex;
        }

        .panel-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: transparent;
          border: none;
          color: #a9b1d6;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .panel-close-btn:hover {
          background: #24283b;
          color: #f7768e;
        }

        .panel-close-btn:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}
