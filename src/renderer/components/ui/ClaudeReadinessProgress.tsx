import { useState, useEffect } from 'react';

interface ClaudeReadinessProgressProps {
  isVisible: boolean;
}

export function ClaudeReadinessProgress({ isVisible }: ClaudeReadinessProgressProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setStage(0);
      return;
    }

    // Progress through stages over 5 seconds
    const timers = [
      setTimeout(() => setStage(1), 800),   // "Starting shell..." → "Loading Claude..."
      setTimeout(() => setStage(2), 2500),  // "Loading Claude..." → "Almost ready..."
    ];

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const stages = [
    'Starting shell...',
    'Loading Claude...',
    'Almost ready...',
  ];

  return (
    <div className="claude-readiness-overlay">
      <div className="readiness-content">
        <div className="readiness-logo">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 3v18" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 8l-5 5l5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="readiness-title">Initializing Claude Code</h2>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((stage + 1) / 3) * 100}%` }} />
        </div>

        <p className="readiness-status">{stages[stage]}</p>
      </div>

      <style>{`
        .claude-readiness-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(26, 27, 38, 0.95);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          font-family: 'JetBrains Mono', monospace;
          animation: overlay-fade-in 0.3s ease;
        }

        @keyframes overlay-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .readiness-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: content-slide-up 0.4s cubic-bezier(0, 0, 0.2, 1);
        }

        @keyframes content-slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .readiness-logo {
          width: 96px;
          height: 96px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(122, 162, 247, 0.15), rgba(125, 207, 255, 0.1));
          border: 2px solid #3d4458;
          border-radius: 24px;
          margin-bottom: 32px;
          color: #7aa2f7;
          box-shadow: 0 8px 32px rgba(122, 162, 247, 0.2);
          animation: logo-pulse 2s ease-in-out infinite;
        }

        @keyframes logo-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 8px 32px rgba(122, 162, 247, 0.2);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 12px 48px rgba(122, 162, 247, 0.3);
          }
        }

        .readiness-title {
          font-size: 18px;
          font-weight: 600;
          color: #e9e9ea;
          margin: 0 0 24px 0;
          letter-spacing: -0.3px;
        }

        .progress-bar {
          width: 300px;
          height: 4px;
          background: #24283b;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #7aa2f7, #7dcfff);
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 12px rgba(122, 162, 247, 0.5);
        }

        .readiness-status {
          font-size: 13px;
          color: #a9b1d6;
          margin: 0;
          min-height: 20px;
          animation: status-fade-in 0.3s ease;
        }

        @keyframes status-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
