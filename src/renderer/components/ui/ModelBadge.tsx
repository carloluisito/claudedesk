import { useEffect, useState } from 'react';
import type { ClaudeModel } from '../../../shared/ipc-types';

interface ModelBadgeProps {
  model: ClaudeModel | null;
  isLoading?: boolean;
  size?: 'small' | 'medium'; // small=PaneHeader, medium=Tab
}

const MODEL_CONFIG = {
  haiku: { label: 'HKU', color: '#9ece6a', name: 'Haiku' },
  sonnet: { label: 'SNT', color: '#7aa2f7', name: 'Sonnet' },
  opus: { label: 'OPS', color: '#bb9af7', name: 'Opus' },
  auto: { label: 'AUTO', color: '#e0af68', name: 'Auto' },
};

export function ModelBadge({ model, isLoading = false, size = 'medium' }: ModelBadgeProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevModel, setPrevModel] = useState(model);

  // Trigger animation on model change
  useEffect(() => {
    if (model !== prevModel && model !== null) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
      setPrevModel(model);
    }
  }, [model, prevModel]);

  if (!model && !isLoading) return null;

  const config = model ? MODEL_CONFIG[model] : null;
  const fontSize = size === 'small' ? '9px' : '10px';
  const height = size === 'small' ? '14px' : '16px';
  const displayText = isLoading ? '⟳ ...' : (config?.label || 'UNK');
  const color = config?.color || '#565f89';

  return (
    <span
      className={`model-badge ${isAnimating ? 'animating' : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0 6px',
        borderRadius: '3px',
        fontWeight: 600,
        fontFamily: 'JetBrains Mono, monospace',
        color: '#1a1b26',
        lineHeight: 1,
        transition: 'all 0.2s ease',
        backgroundColor: color,
        fontSize,
        height,
      }}
      title={config ? `Current model: ${config.name}` : 'Unknown model'}
      role="status"
      aria-live="polite"
    >
      {displayText}
      <style>{`
        .model-badge.animating {
          animation: badge-pulse 0.5s ease-out;
        }
        @keyframes badge-pulse {
          0% { opacity: 0; transform: scale(0.8); }
          50% { transform: scale(1.05); box-shadow: 0 0 12px currentColor; }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </span>
  );
}
