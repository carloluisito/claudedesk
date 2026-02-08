import { useEffect, useRef, useState } from 'react';
import { BrandLogo } from './ui/BrandLogo';
import type { AppVersionInfo } from '../../shared/ipc-types';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [versionInfo, setVersionInfo] = useState<AppVersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      closeRef.current?.focus();

      // Fetch version info
      setIsLoading(true);
      window.electronAPI.getVersionInfo()
        .then(setVersionInfo)
        .catch(err => {
          console.error('Failed to fetch version info:', err);
          setVersionInfo(null);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="about-overlay" onClick={onClose}>
      <div
        className="about-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-dialog-title"
      >
        {/* Header with large logo */}
        <div className="about-header">
          <BrandLogo size={48} />
          <h2 id="about-dialog-title" className="about-title">ClaudeDesk</h2>
        </div>

        {/* Description */}
        <p className="about-description">
          Multi-session terminal interface for Claude Code CLI
        </p>

        {/* Version info */}
        <div className="about-version-info">
          {isLoading ? (
            <>
              <div className="version-row skeleton">
                <span className="version-label">App Version</span>
                <span className="version-value skeleton-text">Loading...</span>
              </div>
              <div className="version-row skeleton">
                <span className="version-label">Electron</span>
                <span className="version-value skeleton-text">Loading...</span>
              </div>
              <div className="version-row skeleton">
                <span className="version-label">Node.js</span>
                <span className="version-value skeleton-text">Loading...</span>
              </div>
              <div className="version-row skeleton">
                <span className="version-label">Claude CLI</span>
                <span className="version-value skeleton-text">Loading...</span>
              </div>
            </>
          ) : versionInfo ? (
            <>
              <div className="version-row">
                <span className="version-label">App Version</span>
                <span className="version-value">{versionInfo.appVersion}</span>
              </div>
              <div className="version-row">
                <span className="version-label">Electron</span>
                <span className="version-value">{versionInfo.electronVersion}</span>
              </div>
              <div className="version-row">
                <span className="version-label">Node.js</span>
                <span className="version-value">{versionInfo.nodeVersion}</span>
              </div>
              <div className="version-row">
                <span className="version-label">Claude CLI</span>
                <span className="version-value">
                  {versionInfo.claudeVersion || <span className="not-detected">Not detected</span>}
                </span>
              </div>
            </>
          ) : (
            <div className="version-error">Failed to load version information</div>
          )}
        </div>

        {/* Links */}
        <div className="about-links">
          <a
            href="https://claude.ai/claude-code"
            target="_blank"
            rel="noopener noreferrer"
            className="about-link"
          >
            Claude Code Documentation
          </a>
        </div>

        {/* Footer with close button */}
        <div className="about-footer">
          <button
            ref={closeRef}
            className="btn btn-primary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        .about-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          font-family: 'JetBrains Mono', monospace;
          animation: fade-in 0.15s ease;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .about-dialog {
          width: 400px;
          max-width: calc(100vw - 48px);
          background: #1a1b26;
          border: 1px solid #292e42;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
          animation: dialog-enter 0.15s ease;
        }

        @media (max-width: 480px) {
          .about-dialog {
            padding: 16px;
          }
        }

        @keyframes dialog-enter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .about-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .about-title {
          font-size: 20px;
          font-weight: 600;
          color: #c0caf5;
          margin: 0;
        }

        @media (max-width: 480px) {
          .about-title {
            font-size: 18px;
          }
        }

        .about-description {
          font-size: 13px;
          color: #a9b1d6;
          text-align: center;
          line-height: 1.5;
          margin: 0 0 24px 0;
        }

        .about-version-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
          padding: 16px;
          background: rgba(122, 162, 247, 0.05);
          border: 1px solid #292e42;
          border-radius: 8px;
        }

        .version-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }

        .version-label {
          color: #7aa2f7;
          font-weight: 500;
        }

        .version-value {
          color: #c0caf5;
        }

        .not-detected {
          color: #565f89;
          font-style: italic;
        }

        .skeleton-text {
          color: #565f89;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.6; }
        }

        .version-error {
          color: #f7768e;
          font-size: 12px;
          text-align: center;
        }

        .about-links {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
        }

        .about-link {
          color: #7aa2f7;
          font-size: 12px;
          text-decoration: none;
          text-align: center;
          padding: 8px;
          border-radius: 6px;
          transition: all 0.15s ease;
        }

        .about-link:hover {
          background: rgba(122, 162, 247, 0.1);
          text-decoration: underline;
        }

        .about-link:focus {
          outline: 2px solid #7aa2f7;
          outline-offset: 2px;
        }

        .about-footer {
          display: flex;
          justify-content: center;
        }

        .btn {
          height: 38px;
          padding: 0 20px;
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-primary {
          background: #7aa2f7;
          border: none;
          color: #1a1b26;
        }

        .btn-primary:hover {
          background: #89b4fa;
        }

        .btn-primary:active {
          transform: scale(0.98);
        }

        .btn-primary:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(122, 162, 247, 0.3);
        }
      `}</style>
    </div>
  );
}
