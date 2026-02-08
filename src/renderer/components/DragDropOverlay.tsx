import { FileInfo } from '../../shared/ipc-types';

interface DragDropOverlayProps {
  isVisible: boolean;
  files: FileInfo[];
  isShiftPressed: boolean;
}

export function DragDropOverlay({ isVisible, files, isShiftPressed }: DragDropOverlayProps) {
  if (!isVisible || files.length === 0) {
    return null;
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'code': return '📝';
      case 'markup': return '🔖';
      case 'document': return '📄';
      case 'image': return '🖼️';
      case 'binary': return '📦';
      default: return '📁';
    }
  };

  const insertMode = isShiftPressed ? 'content' : 'path';

  return (
    <div className="dragdrop-overlay">
      <div className="dragdrop-content">
        <div className="dragdrop-icon">
          {insertMode === 'content' ? '📋' : '📂'}
        </div>

        <div className="dragdrop-info">
          <div className="dragdrop-mode">
            {insertMode === 'content' ? 'Insert File Content' : 'Insert File Path'}
          </div>

          {files.length === 1 ? (
            <div className="dragdrop-file-single">
              <div className="dragdrop-file-name">
                {getCategoryIcon(files[0].category)} {files[0].name}
              </div>
              <div className="dragdrop-file-meta">
                {formatFileSize(files[0].sizeBytes)} • {files[0].category}
                {files[0].isBinary && ' • binary'}
              </div>
            </div>
          ) : (
            <div className="dragdrop-file-multi">
              <div className="dragdrop-file-count">
                {files.length} files
              </div>
              <div className="dragdrop-file-list">
                {files.slice(0, 3).map((file, idx) => (
                  <div key={idx} className="dragdrop-file-item">
                    {getCategoryIcon(file.category)} {file.name}
                  </div>
                ))}
                {files.length > 3 && (
                  <div className="dragdrop-file-more">
                    +{files.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="dragdrop-hint">
            {isShiftPressed ? (
              <span>Release to insert content</span>
            ) : (
              <span>Hold Shift to insert content</span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .dragdrop-overlay {
          position: absolute;
          inset: 0;
          background: rgba(26, 27, 38, 0.95);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          pointer-events: none;
          animation: fade-in 0.15s ease;
          font-family: 'JetBrains Mono', monospace;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .dragdrop-content {
          background: #1a1b26;
          border: 2px dashed #7aa2f7;
          border-radius: 16px;
          padding: 32px;
          min-width: 320px;
          max-width: 480px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .dragdrop-icon {
          font-size: 48px;
          animation: bounce 0.6s ease infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .dragdrop-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          text-align: center;
        }

        .dragdrop-mode {
          font-size: 16px;
          font-weight: 600;
          color: #7aa2f7;
          letter-spacing: 0.5px;
        }

        .dragdrop-file-single,
        .dragdrop-file-multi {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .dragdrop-file-name {
          font-size: 14px;
          color: #c0caf5;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dragdrop-file-meta {
          font-size: 12px;
          color: #a9b1d6;
        }

        .dragdrop-file-count {
          font-size: 14px;
          color: #c0caf5;
          font-weight: 600;
        }

        .dragdrop-file-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 120px;
          overflow: auto;
        }

        .dragdrop-file-item {
          font-size: 12px;
          color: #a9b1d6;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dragdrop-file-more {
          font-size: 12px;
          color: #7aa2f7;
          font-style: italic;
        }

        .dragdrop-hint {
          font-size: 12px;
          color: #565f89;
          padding-top: 8px;
          border-top: 1px solid #292e42;
        }
      `}</style>
    </div>
  );
}
