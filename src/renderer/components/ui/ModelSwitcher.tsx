import { useState, useRef, useEffect } from 'react';
import type { ClaudeModel } from '../../../shared/ipc-types';

interface ModelSwitcherProps {
  currentModel: ClaudeModel | null;
  onSwitch: (model: ClaudeModel) => Promise<void>;
  disabled?: boolean;
}

const MODELS: Array<{ id: ClaudeModel; label: string; tier: string }> = [
  { id: 'haiku', label: 'Haiku', tier: 'Fast & cheap' },
  { id: 'sonnet', label: 'Sonnet', tier: 'Balanced' },
  { id: 'opus', label: 'Opus', tier: 'Powerful' },
  { id: 'auto', label: 'Auto', tier: 'CLI default' },
];

export function ModelSwitcher({ currentModel, onSwitch, disabled }: ModelSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const currentLabel = MODELS.find(m => m.id === currentModel)?.label || 'Unknown';

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSelect(model: ClaudeModel) {
    if (model === currentModel) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    setIsOpen(false);

    try {
      await onSwitch(model);
      // Badge updates automatically when model detection fires
      // Reset switching state after timeout (fallback)
      setTimeout(() => setIsSwitching(false), 3000);
    } catch (error) {
      setIsSwitching(false);
      console.error('Model switch failed:', error);
    }
  }

  return (
    <div className="model-switcher" ref={dropdownRef}>
      <button
        ref={buttonRef}
        className="switcher-button"
        onClick={() => {
          if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPos({ top: rect.bottom + 4, left: rect.left });
          }
          setIsOpen(!isOpen);
        }}
        disabled={disabled || isSwitching}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          height: '24px',
          background: '#1e2030',
          border: '1px solid #292e42',
          borderRadius: '4px',
          color: '#a9b1d6',
          fontSize: '12px',
          fontFamily: 'JetBrains Mono, monospace',
          cursor: disabled || isSwitching ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          opacity: disabled || isSwitching ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isSwitching) {
            e.currentTarget.style.background = '#24283b';
            e.currentTarget.style.borderColor = '#3b4261';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#1e2030';
          e.currentTarget.style.borderColor = '#292e42';
        }}
      >
        <span>{currentLabel}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            animation: isSwitching ? 'spin 1s linear infinite' : 'none',
          }}
        >
          {isSwitching ? (
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          ) : (
            <polyline points="6 9 12 15 18 9" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div
          className="switcher-menu"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            minWidth: '180px',
            background: '#1a1b26',
            border: '1px solid #292e42',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 10000,
            overflow: 'hidden',
          }}
        >
          {MODELS.map((model) => (
            <button
              key={model.id}
              className={`menu-option ${model.id === currentModel ? 'active' : ''}`}
              onClick={() => handleSelect(model.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                width: '100%',
                background: model.id === currentModel ? '#1e2030' : 'transparent',
                border: 'none',
                color: model.id === currentModel ? '#7aa2f7' : '#a9b1d6',
                fontSize: '13px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#24283b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = model.id === currentModel ? '#1e2030' : 'transparent';
              }}
            >
              <span style={{ flex: 1, fontWeight: 600 }}>{model.label}</span>
              <span style={{ fontSize: '11px', color: '#565f89' }}>{model.tier}</span>
              {model.id === currentModel && <span style={{ color: '#7aa2f7' }}>✓</span>}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .model-switcher {
          position: relative;
        }
      `}</style>
    </div>
  );
}
