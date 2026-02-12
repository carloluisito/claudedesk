import { useState, useEffect, useRef } from 'react';

interface TooltipCoachProps {
  id: string; // Unique ID for this tooltip (e.g., "atlas-button")
  children: React.ReactNode; // The element to wrap
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
}

export function TooltipCoach({
  id,
  children,
  title,
  description,
  position = 'bottom',
  disabled = false,
}: TooltipCoachProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasShownInSession, setHasShownInSession] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check if this tooltip has been dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem(`tooltipCoach:${id}`) === 'true';
    setIsDismissed(dismissed);
  }, [id]);

  // Handle showing tooltip on hover (only if not dismissed and not shown in this session)
  const handleMouseEnter = () => {
    if (disabled || isDismissed || hasShownInSession) return;
    setIsVisible(true);
    setHasShownInSession(true); // Only show once per session
  };

  const handleMouseLeave = () => {
    // Don't auto-hide - user must click "Got it"
  };

  const handleGotIt = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(`tooltipCoach:${id}`, 'true');
    setIsDismissed(true);
    setIsVisible(false);
  };

  if (isDismissed || disabled) {
    return <>{children}</>;
  }

  return (
    <div
      ref={wrapperRef}
      className="tooltip-coach-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div ref={tooltipRef} className={`tooltip-coach tooltip-coach-${position}`}>
          <div className="tooltip-coach-content">
            <h4 className="tooltip-coach-title">{title}</h4>
            <p className="tooltip-coach-description">{description}</p>
            <button className="tooltip-coach-btn" onClick={handleGotIt}>
              Got it!
            </button>
          </div>
          <div className={`tooltip-coach-arrow tooltip-coach-arrow-${position}`} />

          <style>{`
            .tooltip-coach-wrapper {
              position: relative;
              display: inline-block;
            }

            .tooltip-coach {
              position: absolute;
              z-index: 10000;
              background: #1f2335;
              border: 2px solid #7aa2f7;
              border-radius: 10px;
              padding: 16px;
              min-width: 280px;
              max-width: 320px;
              box-shadow: 0 12px 48px rgba(122, 162, 247, 0.3);
              font-family: 'JetBrains Mono', monospace;
              animation: tooltip-coach-fade-in 0.3s ease;
            }

            @keyframes tooltip-coach-fade-in {
              from {
                opacity: 0;
                transform: translateY(-8px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            .tooltip-coach-bottom {
              top: calc(100% + 12px);
              left: 50%;
              transform: translateX(-50%);
            }

            .tooltip-coach-top {
              bottom: calc(100% + 12px);
              left: 50%;
              transform: translateX(-50%);
            }

            .tooltip-coach-left {
              right: calc(100% + 12px);
              top: 50%;
              transform: translateY(-50%);
            }

            .tooltip-coach-right {
              left: calc(100% + 12px);
              top: 50%;
              transform: translateY(-50%);
            }

            .tooltip-coach-content {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .tooltip-coach-title {
              font-size: 14px;
              font-weight: 600;
              color: #7aa2f7;
              margin: 0;
            }

            .tooltip-coach-description {
              font-size: 12px;
              color: #a9b1d6;
              margin: 0;
              line-height: 1.5;
            }

            .tooltip-coach-btn {
              padding: 8px 16px;
              background: linear-gradient(135deg, #7aa2f7, #7dcfff);
              border: none;
              border-radius: 6px;
              color: #1a1b26;
              font-size: 12px;
              font-weight: 600;
              font-family: inherit;
              cursor: pointer;
              transition: all 0.2s ease;
              align-self: flex-start;
            }

            .tooltip-coach-btn:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 16px rgba(122, 162, 247, 0.4);
            }

            .tooltip-coach-btn:active {
              transform: translateY(0);
            }

            .tooltip-coach-arrow {
              position: absolute;
              width: 12px;
              height: 12px;
              background: #1f2335;
              border: 2px solid #7aa2f7;
              transform: rotate(45deg);
            }

            .tooltip-coach-arrow-bottom {
              top: -7px;
              left: 50%;
              margin-left: -6px;
              border-bottom: none;
              border-right: none;
            }

            .tooltip-coach-arrow-top {
              bottom: -7px;
              left: 50%;
              margin-left: -6px;
              border-top: none;
              border-left: none;
            }

            .tooltip-coach-arrow-left {
              right: -7px;
              top: 50%;
              margin-top: -6px;
              border-left: none;
              border-bottom: none;
            }

            .tooltip-coach-arrow-right {
              left: -7px;
              top: 50%;
              margin-top: -6px;
              border-right: none;
              border-top: none;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
