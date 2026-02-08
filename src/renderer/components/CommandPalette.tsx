import { useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import { PromptTemplate } from '../../shared/types/prompt-templates';
import { FuzzySearchResult } from '../utils/fuzzy-search';

interface CommandPaletteProps {
  isOpen: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  results: FuzzySearchResult<PromptTemplate>[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onSelectTemplate: (template: PromptTemplate) => void;
  onClose: () => void;
  onManageTemplates: () => void;
}

export function CommandPalette({
  isOpen,
  query,
  onQueryChange,
  results,
  selectedIndex,
  onSelectIndex,
  onSelectTemplate,
  onClose,
  onManageTemplates,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current && resultsRef.current) {
      const itemRect = selectedItemRef.current.getBoundingClientRect();
      const containerRect = resultsRef.current.getBoundingClientRect();

      if (itemRect.bottom > containerRect.bottom) {
        selectedItemRef.current.scrollIntoView({ block: 'nearest' });
      } else if (itemRect.top < containerRect.top) {
        selectedItemRef.current.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={handleOverlayClick}>
      <div className="command-palette" role="dialog" aria-modal="true">
        {/* Search input */}
        <div className="command-palette-header">
          <div className="command-palette-search">
            <SearchIcon />
            <input
              ref={inputRef}
              type="text"
              className="command-palette-input"
              placeholder="Search templates or actions..."
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="command-palette-hint">
            <kbd>↑↓</kbd> Navigate
            <kbd>↵</kbd> Select
            <kbd>Esc</kbd> Close
          </div>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="command-palette-results">
          {results.length === 0 ? (
            <div className="command-palette-empty">
              <span>No templates found</span>
              <button className="command-palette-manage-link" onClick={onManageTemplates}>
                Manage Templates
              </button>
            </div>
          ) : (
            <>
              {results.map((result, index) => {
                const template = result.item;
                const Icon = getIcon(template.icon);

                return (
                  <div
                    key={template.id}
                    ref={index === selectedIndex ? selectedItemRef : null}
                    className={`command-palette-item ${index === selectedIndex ? 'selected' : ''} ${
                      template.type === 'built-in' ? 'built-in' : 'user'
                    }`}
                    onClick={() => onSelectTemplate(template)}
                    onMouseEnter={() => onSelectIndex(index)}
                  >
                    <div className="command-palette-item-icon">
                      {Icon ? <Icon size={16} /> : <CommandIcon />}
                    </div>
                    <div className="command-palette-item-content">
                      <div className="command-palette-item-title">
                        {template.name}
                        {template.type === 'built-in' && (
                          <span className="command-palette-badge">Built-in</span>
                        )}
                      </div>
                      {template.description && (
                        <div className="command-palette-item-description">
                          {template.description}
                        </div>
                      )}
                    </div>
                    {result.score < 100 && (
                      <div className="command-palette-item-score">{result.score}</div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="command-palette-footer">
          <button className="command-palette-footer-btn" onClick={onManageTemplates}>
            <SettingsIcon />
            Manage Templates
          </button>
        </div>
      </div>

      <style>{commandPaletteStyles}</style>
    </div>
  );
}

// Helper to get Lucide icon component by name
function getIcon(iconName?: string): React.ComponentType<{ size?: number }> | null {
  if (!iconName) return null;

  // @ts-ignore - Dynamic icon lookup
  const Icon = LucideIcons[iconName];
  return Icon || null;
}

// Icon components
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function CommandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

const commandPaletteStyles = `
  .command-palette-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    z-index: 2000;
    padding-top: 120px;
    font-family: 'JetBrains Mono', monospace;
    animation: fade-in 0.15s ease;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .command-palette {
    width: 600px;
    max-width: calc(100vw - 48px);
    max-height: calc(100vh - 160px);
    background: #1a1b26;
    border: 1px solid #292e42;
    border-radius: 12px;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    animation: dialog-enter 0.15s ease;
  }

  @keyframes dialog-enter {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .command-palette-header {
    padding: 16px;
    border-bottom: 1px solid #292e42;
  }

  .command-palette-search {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: #16161e;
    border: 1px solid #292e42;
    border-radius: 8px;
    transition: border-color 0.15s ease;
  }

  .command-palette-search:focus-within {
    border-color: #7aa2f7;
  }

  .command-palette-search svg {
    flex-shrink: 0;
    color: #565f89;
  }

  .command-palette-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #c0caf5;
    font-size: 14px;
    font-family: inherit;
  }

  .command-palette-input::placeholder {
    color: #3b4261;
  }

  .command-palette-hint {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 10px;
    font-size: 11px;
    color: #565f89;
  }

  .command-palette-hint kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 18px;
    padding: 0 5px;
    background: #16161e;
    border: 1px solid #292e42;
    border-radius: 4px;
    font-size: 10px;
    font-family: inherit;
    color: #a9b1d6;
    margin-right: 4px;
  }

  .command-palette-results {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    min-height: 200px;
    max-height: 400px;
  }

  .command-palette-results::-webkit-scrollbar {
    width: 8px;
  }

  .command-palette-results::-webkit-scrollbar-track {
    background: transparent;
  }

  .command-palette-results::-webkit-scrollbar-thumb {
    background-color: #3b4261;
    border-radius: 4px;
  }

  .command-palette-results::-webkit-scrollbar-thumb:hover {
    background-color: #565f89;
  }

  .command-palette-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 48px 24px;
    text-align: center;
    color: #565f89;
    font-size: 13px;
  }

  .command-palette-manage-link {
    background: transparent;
    border: 1px solid #292e42;
    border-radius: 6px;
    padding: 8px 16px;
    color: #7aa2f7;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .command-palette-manage-link:hover {
    background: rgba(122, 162, 247, 0.1);
    border-color: #7aa2f7;
  }

  .command-palette-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    border: 1px solid transparent;
  }

  .command-palette-item:hover,
  .command-palette-item.selected {
    background: #16161e;
    border-color: #292e42;
  }

  .command-palette-item.selected {
    border-color: #7aa2f7;
  }

  .command-palette-item-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #16161e;
    border-radius: 8px;
    color: #7aa2f7;
    flex-shrink: 0;
  }

  .command-palette-item.built-in .command-palette-item-icon {
    background: rgba(122, 162, 247, 0.1);
  }

  .command-palette-item.user .command-palette-item-icon {
    background: rgba(158, 206, 106, 0.1);
    color: #9ece6a;
  }

  .command-palette-item-content {
    flex: 1;
    min-width: 0;
  }

  .command-palette-item-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: #c0caf5;
    margin-bottom: 2px;
  }

  .command-palette-badge {
    display: inline-flex;
    align-items: center;
    height: 16px;
    padding: 0 6px;
    background: rgba(122, 162, 247, 0.15);
    border-radius: 4px;
    font-size: 10px;
    font-weight: 500;
    color: #7aa2f7;
  }

  .command-palette-item-description {
    font-size: 11px;
    color: #565f89;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .command-palette-item-score {
    width: 32px;
    text-align: right;
    font-size: 10px;
    color: #3b4261;
    flex-shrink: 0;
  }

  .command-palette-footer {
    padding: 10px 16px;
    border-top: 1px solid #292e42;
    display: flex;
    justify-content: flex-end;
  }

  .command-palette-footer-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: transparent;
    border: 1px solid #292e42;
    border-radius: 6px;
    color: #a9b1d6;
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .command-palette-footer-btn:hover {
    background: #16161e;
    border-color: #3b4261;
    color: #c0caf5;
  }

  .command-palette-footer-btn svg {
    color: #565f89;
  }
`;
