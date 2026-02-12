import { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  LayoutNode,
  SplitDirection,
  SplitViewState,
} from '../../shared/ipc-types';
import { LayoutPreset } from '../../types/layout-presets';
import {
  countPanes,
  traverseTree,
  transformTree,
  pruneTree,
  updateRatioAtPath,
  getAllPaneIds,
  getFirstPaneId,
} from '../utils/layout-tree';

export interface UseSplitViewReturn {
  layout: LayoutNode;
  focusedPaneId: string;
  isSplitActive: boolean;
  paneCount: number;
  visibleSessionIds: string[];
  splitPane: (paneId: string, direction: SplitDirection) => string;
  closePane: (paneId: string) => void;
  assignSession: (paneId: string, sessionId: string | null) => void;
  focusPane: (paneId: string) => void;
  focusDirection: (direction: 'left' | 'right' | 'up' | 'down') => void;
  setRatio: (branchPath: number[], ratio: number) => void;
  collapseSplitView: () => void;
  applyLayoutPreset: (preset: LayoutPreset) => Promise<void>;
  createCustomLayout: (rows: number, cols: number) => Promise<void>;
}

// Create a default single-pane layout
function createDefaultLayout(): LayoutNode {
  return {
    type: 'leaf',
    paneId: uuidv4(),
    sessionId: null,
  };
}

// Create a single-pane layout with a specific pane ID
function createSinglePaneLayout(paneId: string, sessionId: string | null = null): LayoutNode {
  return {
    type: 'leaf',
    paneId,
    sessionId,
  };
}

export function useSplitView(): UseSplitViewReturn {
  // Initialize with a default layout and its pane ID
  const defaultLayout = useMemo(() => createDefaultLayout(), []);
  const [layout, setLayout] = useState<LayoutNode>(defaultLayout);
  const [focusedPaneId, setFocusedPaneId] = useState<string>(() => {
    // Initialize focusedPaneId immediately to avoid race conditions
    return defaultLayout.type === 'leaf' ? defaultLayout.paneId : '';
  });

  // Initialize focused pane ID from layout
  useEffect(() => {
    if (!focusedPaneId && layout.type === 'leaf') {
      setFocusedPaneId(layout.paneId);
    }
  }, [layout, focusedPaneId]);

  // Validate layout structure
  function isValidLayout(node: any): node is LayoutNode {
    if (!node || typeof node !== 'object') return false;
    if (node.type === 'leaf') {
      return typeof node.paneId === 'string';
    }
    if (node.type === 'branch') {
      return (
        typeof node.direction === 'string' &&
        typeof node.ratio === 'number' &&
        Array.isArray(node.children) &&
        node.children.length === 2 &&
        isValidLayout(node.children[0]) &&
        isValidLayout(node.children[1])
      );
    }
    if (node.type === 'grid') {
      if (
        typeof node.id !== 'string' ||
        (node.direction !== 'horizontal' && node.direction !== 'vertical') ||
        !Array.isArray(node.children) ||
        !Array.isArray(node.sizes) ||
        node.children.length !== node.sizes.length ||
        node.children.length === 0
      ) {
        return false;
      }

      // Validate sizes sum to approximately 100
      const sum = node.sizes.reduce((a: number, b: number) => a + b, 0);
      if (Math.abs(sum - 100) > 0.5) {
        return false;
      }

      // Validate all children
      return node.children.every((child: any) => isValidLayout(child));
    }
    return false;
  }

  // Load layout from settings on mount
  useEffect(() => {
    const loadLayoutFromSettings = async () => {
      try {
        const settings = await window.electronAPI.getSettings();
        if (settings.splitViewState) {
          const { layout: savedLayout, focusedPaneId: savedFocusedPaneId } = settings.splitViewState;

          // Validate the saved layout structure
          if (!isValidLayout(savedLayout)) {
            console.error('Invalid saved layout structure, using default');
            throw new Error('Invalid layout');
          }

          // Validate that focusedPaneId exists in the tree
          const allPaneIds = getAllPaneIds(savedLayout);
          const validFocusedPaneId = allPaneIds.includes(savedFocusedPaneId)
            ? savedFocusedPaneId
            : getFirstPaneId(savedLayout);

          setLayout(savedLayout);
          setFocusedPaneId(validFocusedPaneId);
        } else {
          // No saved state, use default
          const newDefaultLayout = createDefaultLayout();
          setLayout(newDefaultLayout);
          if (newDefaultLayout.type === 'leaf') {
            setFocusedPaneId(newDefaultLayout.paneId);
          }
        }
      } catch (err) {
        console.error('Failed to load split view state:', err);
        const newDefaultLayout = createDefaultLayout();
        setLayout(newDefaultLayout);
        if (newDefaultLayout.type === 'leaf') {
          setFocusedPaneId(newDefaultLayout.paneId);
        }
      }
    };

    loadLayoutFromSettings();
  }, []);

  // Persist layout whenever it changes (debounced)
  useEffect(() => {
    const persistLayout = async () => {
      try {
        const splitViewState: SplitViewState = {
          layout,
          focusedPaneId,
        };

        // Save to settings
        await window.electronAPI.updateSplitViewState(splitViewState);
      } catch (err) {
        console.error('Failed to persist split view state:', err);
      }
    };

    const timer = setTimeout(persistLayout, 500);
    return () => clearTimeout(timer);
  }, [layout, focusedPaneId]);

  const splitPane = useCallback((paneId: string, direction: SplitDirection): string => {
    // No max pane limit — unlimited panes now supported
    const newPaneId = uuidv4();
    setLayout(prev => {
      return transformTree(prev, (node) => {
        if (node.type === 'leaf' && node.paneId === paneId) {
          return {
            type: 'branch',
            direction,
            ratio: 0.5,
            children: [
              node,
              { type: 'leaf', paneId: newPaneId, sessionId: null },
            ],
          };
        }
        return node;
      });
    });
    setFocusedPaneId(newPaneId);
    return newPaneId;
  }, [layout]);

  const closePane = useCallback((paneId: string) => {
    setLayout(prev => {
      const newLayout = pruneTree(prev, paneId);

      // If we pruned down to a single pane, ensure it's a leaf
      if (countPanes(newLayout) === 0) {
        // This shouldn't happen, but if it does, create a new default layout
        return createDefaultLayout();
      }

      return newLayout;
    });

    // Update focused pane if we closed the focused one
    setFocusedPaneId(prevFocused => {
      if (prevFocused === paneId) {
        const firstPaneId = getFirstPaneId(layout);
        return firstPaneId;
      }
      return prevFocused;
    });
  }, [layout]);

  const assignSession = useCallback((paneId: string, sessionId: string | null) => {
    setLayout(prev => {
      return transformTree(prev, (node) => {
        if (node.type === 'leaf') {
          if (node.paneId === paneId) {
            // Assign session to this pane
            return { ...node, sessionId };
          } else if (node.sessionId === sessionId && sessionId !== null) {
            // Remove session from other panes (one session per pane)
            return { ...node, sessionId: null };
          }
        }
        return node;
      });
    });
  }, []);

  const focusPane = useCallback((paneId: string) => {
    setFocusedPaneId(paneId);
  }, []);

  const focusDirection = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    // Build a map of panes with their positions
    interface PaneInfo {
      paneId: string;
      path: number[]; // Path in tree (e.g., [0, 1] means first child, then second child)
      rect: { left: number; top: number; right: number; bottom: number };
    }

    const panes: PaneInfo[] = [];

    function buildPaneMap(
      node: LayoutNode,
      path: number[],
      rect: { left: number; top: number; right: number; bottom: number }
    ) {
      if (node.type === 'leaf') {
        panes.push({ paneId: node.paneId, path, rect });
        return;
      }

      if (node.type === 'branch') {
        // Branch: split the rectangle based on direction and ratio
        const [first, second] = node.children;
        const ratio = node.ratio;

        if (node.direction === 'horizontal') {
          // Split left/right
          const splitX = rect.left + (rect.right - rect.left) * ratio;
          buildPaneMap(first, [...path, 0], { ...rect, right: splitX });
          buildPaneMap(second, [...path, 1], { ...rect, left: splitX });
        } else {
          // Split top/bottom
          const splitY = rect.top + (rect.bottom - rect.top) * ratio;
          buildPaneMap(first, [...path, 0], { ...rect, bottom: splitY });
          buildPaneMap(second, [...path, 1], { ...rect, top: splitY });
        }
        return;
      }

      if (node.type === 'grid') {
        // Grid: distribute space evenly among children
        const sizes = node.sizes;
        let currentPos = 0;

        node.children.forEach((child, index) => {
          const size = sizes[index];
          if (node.direction === 'horizontal') {
            // Horizontal grid: split columns
            const width = (rect.right - rect.left) * (size / 100);
            const left = rect.left + currentPos;
            buildPaneMap(child, [...path, index], {
              left,
              top: rect.top,
              right: left + width,
              bottom: rect.bottom
            });
            currentPos += width;
          } else {
            // Vertical grid: split rows
            const height = (rect.bottom - rect.top) * (size / 100);
            const top = rect.top + currentPos;
            buildPaneMap(child, [...path, index], {
              left: rect.left,
              top,
              right: rect.right,
              bottom: top + height
            });
            currentPos += height;
          }
        });
      }
    }

    // Build map with normalized coordinates (0-1000)
    buildPaneMap(layout, [], { left: 0, top: 0, right: 1000, bottom: 1000 });

    // Find current pane
    const currentPane = panes.find(p => p.paneId === focusedPaneId);
    if (!currentPane) return;

    // Find best candidate in the specified direction
    let bestCandidate: PaneInfo | null = null;
    let bestDistance = Infinity;

    for (const candidate of panes) {
      if (candidate.paneId === focusedPaneId) continue;

      // Check if candidate is in the right direction
      let isInDirection = false;
      let distance = 0;

      switch (direction) {
        case 'left':
          isInDirection = candidate.rect.right <= currentPane.rect.left;
          distance = currentPane.rect.left - candidate.rect.right;
          break;
        case 'right':
          isInDirection = candidate.rect.left >= currentPane.rect.right;
          distance = candidate.rect.left - currentPane.rect.right;
          break;
        case 'up':
          isInDirection = candidate.rect.bottom <= currentPane.rect.top;
          distance = currentPane.rect.top - candidate.rect.bottom;
          break;
        case 'down':
          isInDirection = candidate.rect.top >= currentPane.rect.bottom;
          distance = candidate.rect.top - currentPane.rect.bottom;
          break;
      }

      if (isInDirection && distance < bestDistance) {
        // Also check for overlap in the perpendicular direction
        let hasOverlap = false;
        if (direction === 'left' || direction === 'right') {
          // Check vertical overlap
          hasOverlap = !(candidate.rect.bottom <= currentPane.rect.top || candidate.rect.top >= currentPane.rect.bottom);
        } else {
          // Check horizontal overlap
          hasOverlap = !(candidate.rect.right <= currentPane.rect.left || candidate.rect.left >= currentPane.rect.right);
        }

        if (hasOverlap) {
          bestDistance = distance;
          bestCandidate = candidate;
        }
      }
    }

    if (bestCandidate) {
      setFocusedPaneId(bestCandidate.paneId);
    }
  }, [layout, focusedPaneId]);

  const setRatio = useCallback((branchPath: number[], ratio: number) => {
    setLayout(prev => updateRatioAtPath(prev, branchPath, ratio));
  }, []);

  const collapseSplitView = useCallback(() => {
    // Get the session from the focused pane
    let sessionId: string | null = null;
    traverseTree(layout, (node) => {
      if (node.type === 'leaf' && node.paneId === focusedPaneId) {
        sessionId = node.sessionId;
      }
    });

    const newLayout = createSinglePaneLayout(uuidv4(), sessionId);
    setLayout(newLayout);
    if (newLayout.type === 'leaf') {
      setFocusedPaneId(newLayout.paneId);
    }
  }, [layout, focusedPaneId]);

  const visibleSessionIds = useMemo(() => {
    const ids: string[] = [];
    traverseTree(layout, (node) => {
      if (node.type === 'leaf' && node.sessionId) {
        ids.push(node.sessionId);
      }
    });
    return ids;
  }, [layout]);

  const applyLayoutPreset = useCallback(async (preset: LayoutPreset) => {
    try {
      // Apply the preset via IPC (which will update settings)
      const success = await window.electronAPI.applyLayoutPreset(preset.id);

      if (success) {
        // Reload the layout from settings
        const settings = await window.electronAPI.getSettings();
        if (settings.splitViewState) {
          setLayout(settings.splitViewState.layout);
          // Set focus to first pane
          const firstPaneId = getFirstPaneId(settings.splitViewState.layout);
          setFocusedPaneId(firstPaneId);
        }
      }
    } catch (err) {
      console.error('Failed to apply layout preset:', err);
    }
  }, []);

  const createCustomLayout = useCallback(async (rows: number, cols: number) => {
    try {
      // Create custom layout via IPC (which will update settings)
      const success = await window.electronAPI.applyCustomLayout(rows, cols);

      if (success) {
        // Reload the layout from settings
        const settings = await window.electronAPI.getSettings();
        if (settings.splitViewState) {
          setLayout(settings.splitViewState.layout);
          // Set focus to first pane
          const firstPaneId = getFirstPaneId(settings.splitViewState.layout);
          setFocusedPaneId(firstPaneId);
        }
      }
    } catch (err) {
      console.error('Failed to create custom layout:', err);
    }
  }, []);

  const isSplitActive = useMemo(() => countPanes(layout) > 1, [layout]);
  const paneCount = useMemo(() => countPanes(layout), [layout]);

  return {
    layout,
    focusedPaneId,
    isSplitActive,
    paneCount,
    visibleSessionIds,
    splitPane,
    closePane,
    assignSession,
    focusPane,
    focusDirection,
    setRatio,
    collapseSplitView,
    applyLayoutPreset,
    createCustomLayout,
  };
}
