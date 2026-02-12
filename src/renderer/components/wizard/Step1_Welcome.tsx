interface Step1WelcomeProps {
  onNext: () => void;
}

export function Step1Welcome({ onNext }: Step1WelcomeProps) {
  return (
    <div className="wizard-step-content">
      <div className="welcome-icon">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 3v18" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 8l-5 5l5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h1 className="welcome-title">Welcome to ClaudeDesk</h1>
      <p className="welcome-subtitle">
        Your multi-session terminal workspace for Claude Code CLI
      </p>

      <div className="welcome-features">
        <div className="feature-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Work with up to 4 terminal sessions simultaneously</span>
        </div>
        <div className="feature-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Visualize and coordinate multiple AI agent teams</span>
        </div>
        <div className="feature-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Generate AI-powered repository maps for navigation</span>
        </div>
        <div className="feature-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Save and restore conversation checkpoints</span>
        </div>
      </div>

      <button className="wizard-next-btn" onClick={onNext}>
        Get Started
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <style>{`
        .wizard-step-content {
          display: flex;
          flex-direction: column;
          align-items: center;
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

        .welcome-icon {
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(122, 162, 247, 0.15), rgba(125, 207, 255, 0.1));
          border: 2px solid #3d4458;
          border-radius: 28px;
          margin-bottom: 32px;
          color: #7aa2f7;
          box-shadow: 0 12px 48px rgba(122, 162, 247, 0.2);
        }

        .welcome-title {
          font-size: 32px;
          font-weight: 700;
          color: #e9e9ea;
          margin: 0 0 12px 0;
          letter-spacing: -0.5px;
        }

        .welcome-subtitle {
          font-size: 15px;
          color: #a9b1d6;
          margin: 0 0 48px 0;
          text-align: center;
          max-width: 500px;
          line-height: 1.6;
        }

        .welcome-features {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 48px;
          width: 100%;
          max-width: 480px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #1f2335;
          border: 1px solid #3d4458;
          border-radius: 10px;
          color: #a9b1d6;
          font-size: 14px;
          line-height: 1.5;
          transition: all 0.2s ease;
        }

        .feature-item:hover {
          transform: translateX(4px);
          border-color: #7aa2f7;
        }

        .feature-item svg {
          color: #7aa2f7;
          flex-shrink: 0;
        }

        .wizard-next-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          background: linear-gradient(135deg, #7aa2f7, #7dcfff);
          border: none;
          border-radius: 10px;
          color: #1a1b26;
          font-size: 14px;
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

        .wizard-next-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
