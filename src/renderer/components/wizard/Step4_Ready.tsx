interface Step4ReadyProps {
  onFinish: () => void;
  onBack: () => void;
}

const shortcuts = [
  { category: 'Sessions', items: [
    { keys: ['Ctrl', 'T'], description: 'New Session' },
    { keys: ['Ctrl', 'W'], description: 'Close Session' },
    { keys: ['Ctrl', 'Tab'], description: 'Next Session' },
    { keys: ['Ctrl', 'Shift', 'Tab'], description: 'Previous Session' },
  ]},
  { category: 'View', items: [
    { keys: ['Ctrl', '\\'], description: 'Toggle Split View' },
    { keys: ['Ctrl', 'Shift', 'L'], description: 'Layout Picker' },
    { keys: ['Ctrl', 'Shift', 'W'], description: 'Close Pane' },
  ]},
  { category: 'Features', items: [
    { keys: ['Ctrl', 'Shift', 'H'], description: 'History Panel' },
    { keys: ['Ctrl', 'Shift', 'P'], description: 'Command Palette' },
    { keys: ['Ctrl', ','], description: 'Settings' },
  ]},
];

export function Step4Ready({ onFinish, onBack }: Step4ReadyProps) {
  return (
    <div className="wizard-step-content">
      <div className="ready-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h2 className="step-title">You're All Set!</h2>
      <p className="step-subtitle">
        Here are the essential keyboard shortcuts to get you started.
        You can view all shortcuts anytime by pressing <kbd>Ctrl+/</kbd>
      </p>

      <div className="shortcuts-grid">
        {shortcuts.map((group, index) => (
          <div
            key={group.category}
            className="shortcut-group"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <h3 className="group-title">{group.category}</h3>
            <div className="shortcuts-list">
              {group.items.map((shortcut, idx) => (
                <div key={idx} className="shortcut-row">
                  <div className="shortcut-keys">
                    {shortcut.keys.map((key, keyIdx) => (
                      <span key={keyIdx}>
                        <kbd className="key">{key}</kbd>
                        {keyIdx < shortcut.keys.length - 1 && <span className="key-sep">+</span>}
                      </span>
                    ))}
                  </div>
                  <span className="shortcut-desc">{shortcut.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="wizard-actions">
        <button className="wizard-back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <button className="wizard-finish-btn" onClick={onFinish}>
          Start Using ClaudeDesk
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <style>{`
        .wizard-step-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          animation: step-fade-in 0.4s ease;
        }

        @keyframes step-fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .ready-icon {
          width: 96px;
          height: 96px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(158, 206, 106, 0.15), rgba(158, 206, 106, 0.1));
          border: 2px solid #9ece6a;
          border-radius: 24px;
          margin-bottom: 24px;
          color: #9ece6a;
          box-shadow: 0 8px 32px rgba(158, 206, 106, 0.2);
        }

        .step-title {
          font-size: 24px;
          font-weight: 600;
          color: #e9e9ea;
          margin: 0 0 12px 0;
          letter-spacing: -0.3px;
        }

        .step-subtitle {
          font-size: 14px;
          color: #a9b1d6;
          margin: 0 0 32px 0;
          text-align: center;
          max-width: 600px;
          line-height: 1.6;
        }

        .step-subtitle kbd {
          display: inline-block;
          padding: 2px 6px;
          background: #24283b;
          border: 1px solid #3d4458;
          border-radius: 4px;
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          color: #7aa2f7;
        }

        .shortcuts-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          width: 100%;
          max-width: 900px;
          margin-bottom: 32px;
        }

        .shortcut-group {
          padding: 20px;
          background: #1f2335;
          border: 1px solid #3d4458;
          border-radius: 10px;
          animation: card-fade-in 0.5s ease backwards;
        }

        @keyframes card-fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .group-title {
          font-size: 13px;
          font-weight: 600;
          color: #7aa2f7;
          margin: 0 0 16px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .shortcuts-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .shortcut-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .shortcut-keys {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .key {
          display: inline-block;
          padding: 4px 8px;
          background: #24283b;
          border: 1px solid #3d4458;
          border-radius: 4px;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          color: #e9e9ea;
          font-weight: 500;
          box-shadow: 0 1px 0 #3d4458;
        }

        .key-sep {
          font-size: 11px;
          color: #565f89;
          margin: 0 2px;
        }

        .shortcut-desc {
          font-size: 12px;
          color: #a9b1d6;
        }

        .wizard-actions {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .wizard-back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #24283b;
          border: 1px solid #3d4458;
          border-radius: 8px;
          color: #a9b1d6;
          font-size: 13px;
          font-weight: 500;
          font-family: 'JetBrains Mono', monospace;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .wizard-back-btn:hover {
          background: #292e42;
          border-color: #7aa2f7;
          color: #7aa2f7;
        }

        .wizard-finish-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 32px;
          background: linear-gradient(135deg, #9ece6a, #9ece6a);
          border: none;
          border-radius: 8px;
          color: #1a1b26;
          font-size: 14px;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(158, 206, 106, 0.3);
        }

        .wizard-finish-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(158, 206, 106, 0.4);
        }

        .wizard-finish-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
