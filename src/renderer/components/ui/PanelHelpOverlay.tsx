import { useState, useEffect } from 'react';

interface Annotation {
  target: string; // CSS selector or description
  title: string;
  description: string;
  position: { x: number; y: number }; // Percentage-based positioning
}

interface PanelHelpOverlayProps {
  panelId: string; // Unique ID (e.g., "atlas-panel")
  title: string;
  annotations: Annotation[];
  onDismiss: () => void;
}

export function PanelHelpOverlay({
  panelId,
  title,
  annotations,
  onDismiss,
}: PanelHelpOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(`panelHelp:${panelId}`) === 'true';
    setIsVisible(!dismissed);
  }, [panelId]);

  const handleGotIt = () => {
    localStorage.setItem(`panelHelp:${panelId}`, 'true');
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="panel-help-overlay">
      <div className="panel-help-backdrop" />

      <div className="panel-help-content">
        <div className="panel-help-header">
          <h2 className="panel-help-title">{title}</h2>
          <p className="panel-help-subtitle">
            Here's a quick guide to help you get started
          </p>
        </div>

        <div className="panel-help-annotations">
          {annotations.map((annotation, index) => (
            <div
              key={index}
              className="panel-help-annotation"
              style={{
                left: `${annotation.position.x}%`,
                top: `${annotation.position.y}%`,
              }}
            >
              <div className="annotation-pulse" />
              <div className="annotation-content">
                <div className="annotation-number">{index + 1}</div>
                <div className="annotation-text">
                  <h4 className="annotation-title">{annotation.title}</h4>
                  <p className="annotation-description">{annotation.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="panel-help-btn" onClick={handleGotIt}>
          Got it, let me try!
        </button>
      </div>

      <style>{`
        .panel-help-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          font-family: 'JetBrains Mono', monospace;
          animation: overlay-fade-in 0.3s ease;
        }

        @keyframes overlay-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .panel-help-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(26, 27, 38, 0.95);
          backdrop-filter: blur(4px);
        }

        .panel-help-content {
          position: relative;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 32px;
        }

        .panel-help-header {
          text-align: center;
          margin-bottom: 32px;
          animation: header-slide-down 0.4s ease;
        }

        @keyframes header-slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .panel-help-title {
          font-size: 24px;
          font-weight: 600;
          color: #7aa2f7;
          margin: 0 0 8px 0;
        }

        .panel-help-subtitle {
          font-size: 14px;
          color: #a9b1d6;
          margin: 0;
        }

        .panel-help-annotations {
          position: relative;
          flex: 1;
        }

        .panel-help-annotation {
          position: absolute;
          animation: annotation-fade-in 0.5s ease backwards;
        }

        .panel-help-annotation:nth-child(1) { animation-delay: 0.2s; }
        .panel-help-annotation:nth-child(2) { animation-delay: 0.3s; }
        .panel-help-annotation:nth-child(3) { animation-delay: 0.4s; }
        .panel-help-annotation:nth-child(4) { animation-delay: 0.5s; }

        @keyframes annotation-fade-in {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .annotation-pulse {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(122, 162, 247, 0.3);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.5;
          }
        }

        .annotation-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #1f2335;
          border: 2px solid #7aa2f7;
          border-radius: 12px;
          padding: 16px;
          min-width: 250px;
          max-width: 300px;
          box-shadow: 0 12px 48px rgba(122, 162, 247, 0.4);
        }

        .annotation-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #7aa2f7;
          color: #1a1b26;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .annotation-text {
          flex: 1;
        }

        .annotation-title {
          font-size: 13px;
          font-weight: 600;
          color: #e9e9ea;
          margin: 0 0 6px 0;
        }

        .annotation-description {
          font-size: 11px;
          color: #a9b1d6;
          margin: 0;
          line-height: 1.5;
        }

        .panel-help-btn {
          align-self: center;
          padding: 14px 32px;
          background: linear-gradient(135deg, #7aa2f7, #7dcfff);
          border: none;
          border-radius: 10px;
          color: #1a1b26;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(122, 162, 247, 0.3);
          animation: button-fade-in 0.6s ease;
        }

        @keyframes button-fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .panel-help-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(122, 162, 247, 0.4);
        }

        .panel-help-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
