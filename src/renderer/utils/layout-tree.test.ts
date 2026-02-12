import { describe, it, expect } from 'vitest';
import type { LayoutNode } from '../../shared/ipc-types';
import {
  countPanes,
  traverseTree,
  transformTree,
  pruneTree,
  updateRatioAtPath,
  getAllPaneIds,
  getFirstPaneId,
} from './layout-tree';

// ── Test helpers ──

const leaf = (id: string, sessionId: string | null = null): LayoutNode => ({
  type: 'leaf',
  paneId: id,
  sessionId,
});

const branch = (
  left: LayoutNode,
  right: LayoutNode,
  direction: 'horizontal' | 'vertical' = 'horizontal',
  ratio = 0.5
): LayoutNode => ({
  type: 'branch',
  direction,
  ratio,
  children: [left, right],
});

const grid = (
  children: LayoutNode[],
  direction: 'horizontal' | 'vertical' = 'horizontal'
): LayoutNode => ({
  type: 'grid',
  id: 'grid-1',
  direction,
  children,
  sizes: children.map(() => 100 / children.length),
});

// ── countPanes ──

describe('countPanes', () => {
  it('counts single leaf', () => {
    expect(countPanes(leaf('a'))).toBe(1);
  });

  it('counts branch with two leaves', () => {
    expect(countPanes(branch(leaf('a'), leaf('b')))).toBe(2);
  });

  it('counts nested branches', () => {
    const tree = branch(
      leaf('a'),
      branch(leaf('b'), leaf('c'))
    );
    expect(countPanes(tree)).toBe(3);
  });

  it('counts grid children', () => {
    const tree = grid([leaf('a'), leaf('b'), leaf('c')]);
    expect(countPanes(tree)).toBe(3);
  });

  it('counts mixed grid and branch', () => {
    const tree = grid([
      leaf('a'),
      branch(leaf('b'), leaf('c')),
    ]);
    expect(countPanes(tree)).toBe(3);
  });
});

// ── traverseTree ──

describe('traverseTree', () => {
  it('visits single leaf', () => {
    const visited: string[] = [];
    traverseTree(leaf('a'), (n) => {
      if (n.type === 'leaf') visited.push(n.paneId);
    });
    expect(visited).toEqual(['a']);
  });

  it('visits all nodes in branch', () => {
    const visited: string[] = [];
    traverseTree(branch(leaf('a'), leaf('b')), (n) => {
      if (n.type === 'leaf') visited.push(n.paneId);
    });
    expect(visited).toEqual(['a', 'b']);
  });

  it('visits all nodes in grid', () => {
    const visited: string[] = [];
    traverseTree(grid([leaf('a'), leaf('b'), leaf('c')]), (n) => {
      if (n.type === 'leaf') visited.push(n.paneId);
    });
    expect(visited).toEqual(['a', 'b', 'c']);
  });

  it('visits parent before children', () => {
    const types: string[] = [];
    traverseTree(branch(leaf('a'), leaf('b')), (n) => {
      types.push(n.type);
    });
    expect(types).toEqual(['branch', 'leaf', 'leaf']);
  });
});

// ── transformTree ──

describe('transformTree', () => {
  it('applies identity function', () => {
    const tree = branch(leaf('a'), leaf('b'));
    const result = transformTree(tree, (n) => n);
    expect(countPanes(result)).toBe(2);
  });

  it('transforms leaves', () => {
    const tree = leaf('a');
    const result = transformTree(tree, (n) => {
      if (n.type === 'leaf') return { ...n, sessionId: 'sess-1' };
      return n;
    });
    expect(result.type === 'leaf' && result.sessionId).toBe('sess-1');
  });

  it('splits a leaf into a branch (children-first recursion prevents infinite loop)', () => {
    const tree = leaf('target');
    const result = transformTree(tree, (n) => {
      if (n.type === 'leaf' && n.paneId === 'target') {
        return branch(n, leaf('new'));
      }
      return n;
    });
    // Should be a branch with two leaves, NOT infinite recursion
    expect(result.type).toBe('branch');
    expect(countPanes(result)).toBe(2);
  });

  it('recurses children before transformation (pitfall regression test)', () => {
    const tree = branch(leaf('a'), leaf('b'));
    const order: string[] = [];

    transformTree(tree, (n) => {
      if (n.type === 'leaf') order.push(`leaf:${n.paneId}`);
      else if (n.type === 'branch') order.push('branch');
      return n;
    });

    // Children should be processed first, then the branch itself
    expect(order).toEqual(['leaf:a', 'leaf:b', 'branch']);
  });

  it('transforms grid children', () => {
    const tree = grid([leaf('a'), leaf('b')]);
    const result = transformTree(tree, (n) => {
      if (n.type === 'leaf') return { ...n, sessionId: 'updated' };
      return n;
    });
    const ids: string[] = [];
    traverseTree(result, (n) => {
      if (n.type === 'leaf') ids.push(n.sessionId!);
    });
    expect(ids).toEqual(['updated', 'updated']);
  });
});

// ── pruneTree ──

describe('pruneTree', () => {
  it('returns leaf unchanged when pane not found', () => {
    const tree = leaf('a');
    const result = pruneTree(tree, 'nonexistent');
    expect(result).toEqual(tree);
  });

  it('promotes sibling when left child pruned', () => {
    const tree = branch(leaf('remove'), leaf('keep'));
    const result = pruneTree(tree, 'remove');
    expect(result.type).toBe('leaf');
    if (result.type === 'leaf') {
      expect(result.paneId).toBe('keep');
    }
  });

  it('promotes sibling when right child pruned', () => {
    const tree = branch(leaf('keep'), leaf('remove'));
    const result = pruneTree(tree, 'remove');
    expect(result.type).toBe('leaf');
    if (result.type === 'leaf') {
      expect(result.paneId).toBe('keep');
    }
  });

  it('prunes from nested tree', () => {
    const tree = branch(
      leaf('a'),
      branch(leaf('b'), leaf('remove'))
    );
    const result = pruneTree(tree, 'remove');
    expect(countPanes(result)).toBe(2);
  });

  it('prunes from grid (promotes last child)', () => {
    const tree = grid([leaf('a'), leaf('remove')]);
    const result = pruneTree(tree, 'remove');
    expect(result.type).toBe('leaf');
    if (result.type === 'leaf') {
      expect(result.paneId).toBe('a');
    }
  });

  it('prunes from grid with 3+ children', () => {
    const tree = grid([leaf('a'), leaf('remove'), leaf('c')]);
    const result = pruneTree(tree, 'remove');
    expect(result.type).toBe('grid');
    expect(countPanes(result)).toBe(2);
  });
});

// ── updateRatioAtPath ──

describe('updateRatioAtPath', () => {
  it('updates ratio at root branch', () => {
    const tree = branch(leaf('a'), leaf('b'), 'horizontal', 0.5);
    const result = updateRatioAtPath(tree, [], 0.7);
    expect(result.type === 'branch' && result.ratio).toBe(0.7);
  });

  it('clamps ratio to min 0.1', () => {
    const tree = branch(leaf('a'), leaf('b'));
    const result = updateRatioAtPath(tree, [], 0.0);
    expect(result.type === 'branch' && result.ratio).toBe(0.1);
  });

  it('clamps ratio to max 0.9', () => {
    const tree = branch(leaf('a'), leaf('b'));
    const result = updateRatioAtPath(tree, [], 1.0);
    expect(result.type === 'branch' && result.ratio).toBe(0.9);
  });

  it('updates nested branch ratio via path', () => {
    const inner = branch(leaf('c'), leaf('d'), 'vertical', 0.5);
    const tree = branch(leaf('a'), inner);
    const result = updateRatioAtPath(tree, [1], 0.3);
    if (result.type === 'branch') {
      const right = result.children[1];
      expect(right.type === 'branch' && right.ratio).toBe(0.3);
    }
  });

  it('returns leaf unchanged when path is empty', () => {
    const tree = leaf('a');
    const result = updateRatioAtPath(tree, [], 0.5);
    expect(result).toEqual(tree);
  });
});

// ── getAllPaneIds ──

describe('getAllPaneIds', () => {
  it('returns single leaf ID', () => {
    expect(getAllPaneIds(leaf('a'))).toEqual(['a']);
  });

  it('returns all IDs from branch', () => {
    const tree = branch(leaf('a'), leaf('b'));
    expect(getAllPaneIds(tree)).toEqual(['a', 'b']);
  });

  it('returns all IDs from nested tree', () => {
    const tree = branch(leaf('a'), branch(leaf('b'), leaf('c')));
    expect(getAllPaneIds(tree)).toEqual(['a', 'b', 'c']);
  });

  it('returns all IDs from grid', () => {
    const tree = grid([leaf('x'), leaf('y'), leaf('z')]);
    expect(getAllPaneIds(tree)).toEqual(['x', 'y', 'z']);
  });
});

// ── getFirstPaneId ──

describe('getFirstPaneId', () => {
  it('returns leaf pane ID', () => {
    expect(getFirstPaneId(leaf('a'))).toBe('a');
  });

  it('returns leftmost leaf in branch', () => {
    const tree = branch(leaf('first'), leaf('second'));
    expect(getFirstPaneId(tree)).toBe('first');
  });

  it('returns leftmost leaf in nested tree', () => {
    const tree = branch(
      branch(leaf('deepest'), leaf('b')),
      leaf('c')
    );
    expect(getFirstPaneId(tree)).toBe('deepest');
  });

  it('returns first child in grid', () => {
    const tree = grid([leaf('first'), leaf('second')]);
    expect(getFirstPaneId(tree)).toBe('first');
  });
});
