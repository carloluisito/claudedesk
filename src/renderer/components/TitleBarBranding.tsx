import { useState, useEffect, useRef } from 'react';
import { BrandLogo } from './ui/BrandLogo';

interface TitleBarBrandingProps {
  onClick: () => void;
}

export function TitleBarBranding({ onClick }: TitleBarBrandingProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track window width for responsive behavior
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  const handleMouseEnter = () => {
    tooltipTimeoutRef.current = setTimeout(() => setShowTooltip(true), 500);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  const showWordmark = windowWidth >= 400;

  return (
    <>
      <div
        className="branding-button"
        onClick={onClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        tabIndex={0}
        role="button"
        aria-label="Open About ClaudeDesk"
        aria-haspopup="dialog"
      >
        <BrandLogo size={20} />
        {showWordmark && <span className="branding-wordmark">ClaudeDesk</span>}
        {showTooltip && !showWordmark && (
          <div className="branding-tooltip">About ClaudeDesk</div>
        )}
      </div>

      <style>{`
        .branding-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s ease;
          position: relative;
          outline: none;
        }

        .branding-button:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .branding-button:hover svg {
          filter: brightness(1.2);
        }

        .branding-button:hover .branding-wordmark {
          opacity: 1;
        }

        .branding-button:focus {
          outline: 2px solid #7aa2f7;
          outline-offset: 2px;
        }

        .branding-button:active svg {
          transform: scale(0.95);
        }

        .branding-wordmark {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          color: #c0caf5;
          opacity: 0.9;
          user-select: none;
        }

        .branding-tooltip {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 8px;
          padding: 6px 12px;
          background: #1a1b26;
          border: 1px solid #292e42;
          border-radius: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: #a9b1d6;
          white-space: nowrap;
          pointer-events: none;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </>
  );
}
