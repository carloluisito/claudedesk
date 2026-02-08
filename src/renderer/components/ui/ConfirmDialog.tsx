import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDangerous = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="confirm-header">
          <div className={`confirm-icon ${isDangerous ? 'danger' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 id="confirm-title" className="confirm-title">{title}</h3>
        </div>

        <p id="confirm-message" className="confirm-message">{message}</p>

        <div className="confirm-actions">
          <button
            ref={cancelRef}
            className="btn btn-secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`btn ${isDangerous ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        .confirm-overlay {
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

        .confirm-dialog {
          width: 400px;
          max-width: calc(100vw - 48px);
          background: #1a1b26;
          border: 1px solid #292e42;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
          animation: dialog-enter 0.15s ease;
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

        .confirm-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .confirm-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(122, 162, 247, 0.1);
          border-radius: 10px;
          color: #7aa2f7;
        }

        .confirm-icon.danger {
          background: rgba(247, 118, 142, 0.1);
          color: #f7768e;
        }

        .confirm-title {
          font-size: 15px;
          font-weight: 600;
          color: #c0caf5;
          margin: 0;
        }

        .confirm-message {
          font-size: 13px;
          color: #a9b1d6;
          line-height: 1.5;
          margin: 0 0 24px 0;
        }

        .confirm-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
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

        .btn-secondary {
          background: transparent;
          border: 1px solid #292e42;
          color: #a9b1d6;
        }

        .btn-secondary:hover {
          background: #1f2335;
          border-color: #3b4261;
        }

        .btn-primary {
          background: #7aa2f7;
          border: none;
          color: #1a1b26;
        }

        .btn-primary:hover {
          background: #89b4fa;
        }

        .btn-danger {
          background: #f7768e;
          border: none;
          color: #1a1b26;
        }

        .btn-danger:hover {
          background: #ff7a93;
        }

        .btn:active {
          transform: scale(0.98);
        }

        .btn:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(122, 162, 247, 0.3);
        }
      `}</style>
    </div>
  );
}
