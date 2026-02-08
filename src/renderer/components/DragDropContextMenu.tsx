import { useEffect, useRef } from 'react';
import { FileInfo } from '../../shared/ipc-types';

interface DragDropContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  files: FileInfo[];
  onInsertPath: () => void;
  onInsertContent: () => void;
  onCancel: () => void;
}

export function DragDropContextMenu({
  isOpen,
  position,
  files,
  onInsertPath,
  onInsertContent,
  onCancel,
}: DragDropContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Keep menu within horizontal bounds
    if (position.x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 8;
    }

    // Keep menu within vertical bounds
    if (position.y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 8;
    }

    menu.style.left = `${adjustedX}px`;
    menu.style.top = `${adjustedY}px`;
  }, [isOpen, position]);

  if (!isOpen) return null;

  const hasTextFiles = files.some(f => !f.isBinary);

  return (
    <>
      <div className="dragdrop-menu-overlay" onClick={onCancel} />
      <div
        ref={menuRef}
        className="dragdrop-menu"
        style={{ left: position.x, top: position.y }}
      >
        <div className="dragdrop-menu-header">
          <span className="dragdrop-menu-title">
            {files.length === 1 ? 'Insert file as...' : `Insert ${files.length} files as...`}
          </span>
        </div>

        <div className="dragdrop-menu-items">
          <button
            className="dragdrop-menu-item"
            onClick={onInsertPath}
          >
            <span className="dragdrop-menu-icon">📂</span>
            <div className="dragdrop-menu-item-content">
              <span className="dragdrop-menu-item-label">File Path</span>
              <span className="dragdrop-menu-item-hint">Insert quoted path(s)</span>
            </div>
          </button>

          <button
            className="dragdrop-menu-item"
            onClick={onInsertContent}
            disabled={!hasTextFiles}
          >
            <span className="dragdrop-menu-icon">📋</span>
            <div className="dragdrop-menu-item-content">
              <span className="dragdrop-menu-item-label">File Content</span>
              <span className="dragdrop-menu-item-hint">
                {hasTextFiles ? 'Insert file content' : 'No text files'}
              </span>
            </div>
          </button>

          <div className="dragdrop-menu-divider" />

          <button
            className="dragdrop-menu-item"
            onClick={onCancel}
          >
            <span className="dragdrop-menu-icon">✖️</span>
            <div className="dragdrop-menu-item-content">
              <span className="dragdrop-menu-item-label">Cancel</span>
            </div>
          </button>
        </div>
      </div>

      <style>{`
        .dragdrop-menu-overlay {
          position: fixed;
          inset: 0;
          z-index: 1099;
        }

        .dragdrop-menu {
          position: fixed;
          background: #1a1b26;
          border: 1px solid #292e42;
          border-radius: 12px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
          min-width: 240px;
          z-index: 1100;
          font-family: 'JetBrains Mono', monospace;
          animation: menu-enter 0.15s ease;
        }

        @keyframes menu-enter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .dragdrop-menu-header {
          padding: 12px 16px;
          border-bottom: 1px solid #292e42;
        }

        .dragdrop-menu-title {
          font-size: 12px;
          font-weight: 600;
          color: #a9b1d6;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .dragdrop-menu-items {
          padding: 8px;
        }

        .dragdrop-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s ease;
          font-family: inherit;
        }

        .dragdrop-menu-item:hover:not(:disabled) {
          background: #1f2335;
        }

        .dragdrop-menu-item:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .dragdrop-menu-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .dragdrop-menu-item-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          flex: 1;
        }

        .dragdrop-menu-item-label {
          font-size: 13px;
          font-weight: 500;
          color: #c0caf5;
        }

        .dragdrop-menu-item-hint {
          font-size: 11px;
          color: #565f89;
        }

        .dragdrop-menu-divider {
          height: 1px;
          background: #292e42;
          margin: 4px 0;
        }
      `}</style>
    </>
  );
}
