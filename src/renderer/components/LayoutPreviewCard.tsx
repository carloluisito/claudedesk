import React, { useState } from 'react';
import { LayoutPreset } from '../../types/layout-presets';
import { LayoutNode } from '../../shared/ipc-types';

interface LayoutPreviewCardProps {
  preset: LayoutPreset;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: () => void;
  onFocus: () => void;
}

export function LayoutPreviewCard({
  preset,
  isSelected,
  isFocused,
  onSelect,
  onFocus,
}: LayoutPreviewCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (!preset.isCustom) {
      onSelect();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!preset.isCustom) {
        onSelect();
      }
    }
  };

  return (
    <div
      className={`layout-preview-card ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${preset.name}: ${preset.description}`}
    >
      {/* Preview area */}
      <div className="layout-preview-area">
        <LayoutPreview
          structure={preset.structure}
          isHovered={isHovered}
          isCustom={preset.isCustom}
        />
      </div>

      {/* Metadata */}
      <div className="layout-preview-metadata">
        <div className="layout-preview-name">{preset.name}</div>
        <div className="layout-preview-description">{preset.description}</div>
        <div className="layout-preview-shortcut">Press {preset.shortcut}</div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="layout-preview-selected-indicator">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
          </svg>
        </div>
      )}
    </div>
  );
}

interface LayoutPreviewProps {
  structure: LayoutNode;
  isHovered: boolean;
  isCustom?: boolean;
}

function LayoutPreview({ structure, isHovered, isCustom }: LayoutPreviewProps) {
  if (isCustom) {
    // Custom preset shows a placeholder with "+" icon
    return (
      <div className="layout-preview-custom">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="layout-preview-panes">
      <RenderLayoutPreview node={structure} isHovered={isHovered} depth={0} />
    </div>
  );
}

interface RenderLayoutPreviewProps {
  node: LayoutNode;
  isHovered: boolean;
  depth: number;
}

function RenderLayoutPreview({ node, isHovered, depth }: RenderLayoutPreviewProps) {
  if (node.type === 'leaf') {
    return (
      <div
        className={`layout-preview-pane ${isHovered ? 'hovered' : ''}`}
        style={{
          animationDelay: isHovered ? `${depth * 150}ms` : '0ms',
        }}
      />
    );
  }

  if (node.type === 'branch') {
    const flexDirection = node.direction === 'horizontal' ? 'row' : 'column';
    const firstSize = node.ratio * 100;
    const secondSize = (1 - node.ratio) * 100;

    return (
      <div
        className="layout-preview-branch"
        style={{
          display: 'flex',
          flexDirection,
          width: '100%',
          height: '100%',
          gap: '2px',
        }}
      >
        <div style={{ flex: `0 0 ${firstSize}%` }}>
          <RenderLayoutPreview node={node.children[0]} isHovered={isHovered} depth={depth} />
        </div>
        <div style={{ flex: `0 0 ${secondSize}%` }}>
          <RenderLayoutPreview node={node.children[1]} isHovered={isHovered} depth={depth + 1} />
        </div>
      </div>
    );
  }

  if (node.type === 'grid') {
    const isHorizontal = node.direction === 'horizontal';
    const gridTemplateProperty = isHorizontal ? 'gridTemplateColumns' : 'gridTemplateRows';
    const gridTemplate = node.sizes.map(size => `${size}%`).join(' ');

    return (
      <div
        className="layout-preview-grid"
        style={{
          display: 'grid',
          [gridTemplateProperty]: gridTemplate,
          width: '100%',
          height: '100%',
          gap: '2px',
        }}
      >
        {node.children.map((child, index) => (
          <RenderLayoutPreview
            key={index}
            node={child}
            isHovered={isHovered}
            depth={depth + index}
          />
        ))}
      </div>
    );
  }

  return null;
}
