import React, { useState, useEffect } from 'react';

interface CustomLayoutBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (rows: number, cols: number) => void;
}

export function CustomLayoutBuilder({ isOpen, onClose, onCreate }: CustomLayoutBuilderProps) {
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);

  useEffect(() => {
    if (isOpen) {
      // Reset to defaults when opened
      setRows(2);
      setCols(2);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalPanes = rows * cols;
  const isValid = rows >= 1 && rows <= 6 && cols >= 1 && cols <= 6;

  const handleCreate = () => {
    if (isValid) {
      onCreate(rows, cols);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid) {
      handleCreate();
    }
  };

  return (
    <div className="custom-builder-backdrop" onClick={onClose}>
      <div
        className="custom-builder-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="custom-builder-header">
          <h2>Custom Grid Layout</h2>
          <button
            className="custom-builder-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        <div className="custom-builder-body">
          <div className="custom-builder-inputs">
            <div className="custom-builder-input-group">
              <label htmlFor="rows-input">Rows</label>
              <input
                id="rows-input"
                type="number"
                min="1"
                max="6"
                value={rows}
                onChange={(e) => setRows(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
                onFocus={(e) => e.target.select()}
              />
            </div>

            <div className="custom-builder-multiply">×</div>

            <div className="custom-builder-input-group">
              <label htmlFor="cols-input">Columns</label>
              <input
                id="cols-input"
                type="number"
                min="1"
                max="6"
                value={cols}
                onChange={(e) => setCols(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>

          <div className="custom-builder-info">
            Total panes: <strong>{totalPanes}</strong>
          </div>

          <div className="custom-builder-preview">
            <div className="custom-builder-preview-label">Preview</div>
            <div
              className="custom-builder-preview-grid"
              style={{
                display: 'grid',
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: '2px',
              }}
            >
              {Array.from({ length: totalPanes }).map((_, i) => (
                <div key={i} className="custom-builder-preview-pane" />
              ))}
            </div>
          </div>
        </div>

        <div className="custom-builder-footer">
          <button
            className="custom-builder-button custom-builder-button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="custom-builder-button custom-builder-button-primary"
            onClick={handleCreate}
            disabled={!isValid}
          >
            Create Layout
          </button>
        </div>
      </div>
    </div>
  );
}
