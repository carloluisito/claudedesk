import React, { useState, useCallback } from 'react';
import { LayoutNode, LayoutBranch, LayoutGrid, SplitDirection } from '../../shared/ipc-types';

interface SplitLayoutProps {
  layout: LayoutNode;
  focusedPaneId: string;
  onPaneFocus: (paneId: string) => void;
  onRatioChange: (branchPath: number[], ratio: number) => void;
  onAssignSession?: (paneId: string, sessionId: string) => void;
  renderPane: (paneId: string, sessionId: string | null, isFocused: boolean) => React.ReactNode;
}

interface DragHandleProps {
  direction: SplitDirection;
  onDrag: (delta: number) => void;
  onDoubleClick: () => void;
}

function DragHandle({ direction, onDrag, onDoubleClick }: DragHandleProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
    let lastPos = startPos;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPos - lastPos;
      lastPos = currentPos;
      onDrag(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [direction, onDrag]);

  return (
    <div
      className={`drag-handle drag-handle-${direction} ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
    />
  );
}

export function SplitLayout({
  layout,
  focusedPaneId,
  onPaneFocus,
  onRatioChange,
  onAssignSession,
  renderPane,
}: SplitLayoutProps) {
  const [dragOverPaneId, setDragOverPaneId] = useState<string | null>(null);
  const [canDrop, setCanDrop] = useState(true);

  const renderNode = useCallback((node: LayoutNode, path: number[], depth: number = 0): React.ReactNode => {
    // Prevent infinite recursion - max 10 levels deep (normal max is 3 for 4 panes)
    if (depth > 10) {
      console.error('Maximum recursion depth exceeded in renderNode. Layout tree may be corrupted:', { node, path, depth });
      return <div style={{ padding: '20px', color: 'red' }}>Error: Layout tree too deep</div>;
    }

    // Add defensive check for invalid node
    if (!node || !node.type) {
      console.error('Invalid layout node:', node, { path, depth });
      return null;
    }

    if (node.type === 'leaf') {
      const isDragOver = dragOverPaneId === node.paneId;

      const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverPaneId(node.paneId);

        // Check if dragged session is already in this pane
        const draggedSessionId = e.dataTransfer.types.includes('sessionid') ? 'pending' : null;
        if (draggedSessionId && node.sessionId) {
          // We'll check on drop if it's the same session
          setCanDrop(true);
        } else {
          setCanDrop(true);
        }
      };

      const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = canDrop ? 'move' : 'none';
      };

      const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Only clear if we're leaving the pane entirely (not entering a child)
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
          setDragOverPaneId(null);
          setCanDrop(true);
        }
      };

      const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const draggedSessionId = e.dataTransfer.getData('sessionId');

        // Check if dropping on the same session
        if (draggedSessionId === node.sessionId) {
          setCanDrop(false);
          setDragOverPaneId(null);
          return;
        }

        if (draggedSessionId && onAssignSession) {
          onAssignSession(node.paneId, draggedSessionId);
        }

        setDragOverPaneId(null);
        setCanDrop(true);
      };

      return (
        <div
          className={`split-pane-wrapper pane-drop-zone ${isDragOver ? (canDrop ? 'drag-over-can-drop' : 'drag-over-cannot-drop') : ''}`}
          onClick={() => onPaneFocus(node.paneId)}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {renderPane(node.paneId, node.sessionId, node.paneId === focusedPaneId)}
        </div>
      );
    }

    // Grid: render as CSS Grid
    if (node.type === 'grid') {
      const grid = node as LayoutGrid;

      // Add defensive check for missing children
      if (!grid.children || grid.children.length === 0) {
        console.error('Invalid grid node - missing or empty children:', grid);
        return null;
      }

      // Construct grid template based on direction and sizes
      const isHorizontal = grid.direction === 'horizontal';
      const gridTemplateProperty = isHorizontal ? 'gridTemplateColumns' : 'gridTemplateRows';
      const gridTemplate = grid.sizes.map(size => `${size}fr`).join(' ');

      return (
        <div
          className={`split-grid split-grid-${grid.direction}`}
          style={{
            display: 'grid',
            [gridTemplateProperty]: gridTemplate,
            gap: '2px',
            width: '100%',
            height: '100%',
          }}
        >
          {grid.children.map((child, index) => (
            <div key={index} className="split-grid-item">
              {renderNode(child, [...path, index], depth + 1)}
            </div>
          ))}
        </div>
      );
    }

    // Branch: render flex container with drag handle
    const branch = node as LayoutBranch;

    // Add defensive check for missing children
    if (!branch.children || branch.children.length !== 2) {
      console.error('Invalid branch node - missing or malformed children:', branch);
      return null;
    }

    const [first, second] = branch.children;

    // Plain functions instead of useCallback to avoid Rules of Hooks violation
    // (these are inside renderNode callback, so hooks cannot be used here)
    const handleDrag = (delta: number) => {
      // Calculate new ratio based on drag delta
      // We need to get the container size to convert pixel delta to ratio delta
      const container = document.querySelector('.split-layout');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const totalSize = branch.direction === 'horizontal' ? rect.width : rect.height;
      const ratioDelta = delta / totalSize;

      onRatioChange(path, branch.ratio + ratioDelta);
    };

    const handleDoubleClick = () => {
      onRatioChange(path, 0.5);
    };

    return (
      <div className={`split-container split-${branch.direction}`}>
        <div
          className="split-child"
          style={{
            flex: branch.ratio,
            minWidth: branch.direction === 'horizontal' ? '200px' : undefined,
            minHeight: branch.direction === 'vertical' ? '100px' : undefined,
          }}
        >
          {renderNode(first, [...path, 0], depth + 1)}
        </div>
        <DragHandle
          direction={branch.direction}
          onDrag={handleDrag}
          onDoubleClick={handleDoubleClick}
        />
        <div
          className="split-child"
          style={{
            flex: 1 - branch.ratio,
            minWidth: branch.direction === 'horizontal' ? '200px' : undefined,
            minHeight: branch.direction === 'vertical' ? '100px' : undefined,
          }}
        >
          {renderNode(second, [...path, 1], depth + 1)}
        </div>
      </div>
    );
  }, [focusedPaneId, onPaneFocus, onRatioChange, renderPane, dragOverPaneId, canDrop, onAssignSession]);

  return <div className="split-layout">{renderNode(layout, [])}</div>;
}
