interface Step2LayoutPickerProps {
  onNext: () => void;
  onBack: () => void;
}

const layoutExamples = [
  {
    id: 'single',
    name: 'Single Pane',
    icon: <rect x="2" y="2" width="20" height="20" rx="2" fill="currentColor" opacity="0.3" />
  },
  {
    id: 'horizontal',
    name: 'Horizontal Split',
    icon: (
      <>
        <rect x="2" y="2" width="9" height="20" rx="2" fill="currentColor" opacity="0.3" />
        <rect x="13" y="2" width="9" height="20" rx="2" fill="currentColor" opacity="0.3" />
      </>
    )
  },
  {
    id: 'vertical',
    name: 'Vertical Split',
    icon: (
      <>
        <rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor" opacity="0.3" />
        <rect x="2" y="13" width="20" height="9" rx="2" fill="currentColor" opacity="0.3" />
      </>
    )
  },
  {
    id: 'quad',
    name: 'Quad Grid',
    icon: (
      <>
        <rect x="2" y="2" width="9" height="9" rx="2" fill="currentColor" opacity="0.3" />
        <rect x="13" y="2" width="9" height="9" rx="2" fill="currentColor" opacity="0.3" />
        <rect x="2" y="13" width="9" height="9" rx="2" fill="currentColor" opacity="0.3" />
        <rect x="13" y="13" width="9" height="9" rx="2" fill="currentColor" opacity="0.3" />
      </>
    )
  }
];

export function Step2_LayoutPicker({ onNext, onBack }: Step2LayoutPickerProps) {
  return (
    <div className="wizard-step-content">
      <h2 className="step-title">Choose Your Workspace Layout</h2>
      <p className="step-subtitle">
        ClaudeDesk supports up to 4 terminal panes simultaneously.
        You can change your layout anytime from the toolbar.
      </p>

      <div className="layout-examples">
        {layoutExamples.map((layout, index) => (
          <div
            key={layout.id}
            className="layout-example"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <svg width="120" height="120" viewBox="0 0 24 24" className="layout-icon">
              {layout.icon}
            </svg>
            <span className="layout-name">{layout.name}</span>
          </div>
        ))}
      </div>

      <p className="layout-hint">
        💡 Tip: Use <kbd>Ctrl+\</kbd> to toggle split view and <kbd>Ctrl+Shift+L</kbd> to open the layout picker
      </p>

      <div className="wizard-actions">
        <button className="wizard-back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <button className="wizard-next-btn" onClick={onNext}>
          Continue
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
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

        .layout-examples {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }

        .layout-example {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px;
          background: #1f2335;
          border: 2px solid #3d4458;
          border-radius: 12px;
          transition: all 0.2s cubic-bezier(0, 0, 0.2, 1);
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

        .layout-example:hover {
          transform: translateY(-4px);
          border-color: #7aa2f7;
        }

        .layout-icon {
          color: #7aa2f7;
        }

        .layout-name {
          font-size: 13px;
          color: #e9e9ea;
          font-weight: 500;
        }

        .layout-hint {
          font-size: 13px;
          color: #a9b1d6;
          margin-bottom: 32px;
          text-align: center;
          padding: 16px 24px;
          background: #1f2335;
          border: 1px solid #3d4458;
          border-radius: 8px;
        }

        .layout-hint kbd {
          display: inline-block;
          padding: 3px 6px;
          background: #24283b;
          border: 1px solid #3d4458;
          border-radius: 4px;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          color: #7aa2f7;
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

        .wizard-next-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          background: linear-gradient(135deg, #7aa2f7, #7dcfff);
          border: none;
          border-radius: 8px;
          color: #1a1b26;
          font-size: 13px;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(122, 162, 247, 0.3);
        }

        .wizard-next-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(122, 162, 247, 0.4);
        }
      `}</style>
    </div>
  );
}
