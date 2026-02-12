/**
 * Layout tree utility functions — extracted from useSplitView.ts
 *
 * Pure functions for manipulating the split-view layout tree (LayoutNode).
 */

import { LayoutNode } from '../../shared/ipc-types';

/** Count total panes (leaves) in the layout tree */
export function countPanes(node: LayoutNode): number {
  if (node.type === 'leaf') {
    return 1;
  }
  if (node.type === 'branch') {
    return countPanes(node.children[0]) + countPanes(node.children[1]);
  }
  if (node.type === 'grid') {
    return node.children.reduce((sum, child) => sum + countPanes(child), 0);
  }
  return 0;
}

/** Traverse the tree and call a callback for each node */
export function traverseTree(node: LayoutNode, callback: (node: LayoutNode) => void): void {
  callback(node);
  if (node.type === 'branch') {
    traverseTree(node.children[0], callback);
    traverseTree(node.children[1], callback);
  } else if (node.type === 'grid') {
    node.children.forEach(child => traverseTree(child, callback));
  }
}

/**
 * Transform the tree by applying a function to each node.
 *
 * CRITICAL: Recurses children BEFORE applying the transformation to prevent
 * infinite recursion when a leaf is transformed into a branch/grid containing
 * itself as a child.
 */
export function transformTree(node: LayoutNode, fn: (node: LayoutNode) => LayoutNode): LayoutNode {
  let processedNode = node;
  if (node.type === 'branch') {
    processedNode = {
      ...node,
      children: [
        transformTree(node.children[0], fn),
        transformTree(node.children[1], fn),
      ] as [LayoutNode, LayoutNode],
    };
  } else if (node.type === 'grid') {
    processedNode = {
      ...node,
      children: node.children.map(child => transformTree(child, fn)),
    };
  }
  return fn(processedNode);
}

/** Prune a pane from the tree (remove leaf and promote sibling) */
export function pruneTree(node: LayoutNode, paneIdToRemove: string): LayoutNode {
  if (node.type === 'leaf') {
    return node;
  }

  if (node.type === 'branch') {
    const [left, right] = node.children;

    if (left.type === 'leaf' && left.paneId === paneIdToRemove) {
      return pruneTree(right, paneIdToRemove);
    }
    if (right.type === 'leaf' && right.paneId === paneIdToRemove) {
      return pruneTree(left, paneIdToRemove);
    }

    const prunedLeft = pruneTree(left, paneIdToRemove);
    const prunedRight = pruneTree(right, paneIdToRemove);

    if (prunedLeft !== left && countPanes(prunedLeft) === 0) {
      return prunedRight;
    }
    if (prunedRight !== right && countPanes(prunedRight) === 0) {
      return prunedLeft;
    }

    return {
      ...node,
      children: [prunedLeft, prunedRight] as [LayoutNode, LayoutNode],
    };
  }

  if (node.type === 'grid') {
    const indexToRemove = node.children.findIndex(
      child => child.type === 'leaf' && child.paneId === paneIdToRemove
    );

    if (indexToRemove !== -1) {
      const newChildren = node.children.filter((_, i) => i !== indexToRemove);
      if (newChildren.length === 1) {
        return newChildren[0];
      }
      const newSize = 100 / newChildren.length;
      const newSizes = new Array(newChildren.length).fill(newSize);
      return { ...node, children: newChildren, sizes: newSizes };
    }

    const prunedChildren = node.children.map(child => pruneTree(child, paneIdToRemove));
    const validChildren = prunedChildren.filter(child => countPanes(child) > 0);

    if (validChildren.length === 1) {
      return validChildren[0];
    }
    if (validChildren.length === 0) {
      return { type: 'leaf', paneId: 'fallback', sessionId: null };
    }

    const newSize = 100 / validChildren.length;
    const newSizes = new Array(validChildren.length).fill(newSize);
    return { ...node, children: validChildren, sizes: newSizes };
  }

  return node;
}

/** Update ratio at a specific branch path */
export function updateRatioAtPath(node: LayoutNode, path: number[], ratio: number): LayoutNode {
  if (path.length === 0) {
    if (node.type === 'branch') {
      return { ...node, ratio: Math.max(0.1, Math.min(0.9, ratio)) };
    }
    return node;
  }

  if (node.type === 'branch') {
    const [childIndex, ...rest] = path;
    const newChildren = [...node.children] as [LayoutNode, LayoutNode];
    newChildren[childIndex] = updateRatioAtPath(newChildren[childIndex], rest, ratio);
    return { ...node, children: newChildren };
  }

  return node;
}

/** Get all pane IDs in the tree */
export function getAllPaneIds(node: LayoutNode): string[] {
  if (node.type === 'leaf') {
    return [node.paneId];
  }
  if (node.type === 'branch') {
    return [...getAllPaneIds(node.children[0]), ...getAllPaneIds(node.children[1])];
  }
  if (node.type === 'grid') {
    return node.children.flatMap(child => getAllPaneIds(child));
  }
  return [];
}

/** Find the first pane ID in the tree (leftmost/topmost leaf) */
export function getFirstPaneId(node: LayoutNode): string {
  if (node.type === 'leaf') {
    return node.paneId;
  }
  if (node.type === 'branch') {
    return getFirstPaneId(node.children[0]);
  }
  if (node.type === 'grid' && node.children.length > 0) {
    return getFirstPaneId(node.children[0]);
  }
  return '';
}
