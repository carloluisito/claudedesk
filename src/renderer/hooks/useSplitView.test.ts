import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { getElectronAPI } from '../../../test/helpers/electron-api-mock';

// Mock uuid to return predictable IDs
let uuidCounter = 0;
vi.mock('uuid', () => ({
  v4: () => `pane-${++uuidCounter}`,
}));

import { useSplitView } from './useSplitView';

describe('useSplitView', () => {
  let api: ReturnType<typeof getElectronAPI>;

  beforeEach(() => {
    uuidCounter = 0;
    api = getElectronAPI();
    api.getSettings.mockResolvedValue({ version: 1, workspaces: [] });
    api.updateSplitViewState.mockResolvedValue(undefined);
  });

  it('initializes with a single pane layout', () => {
    const { result } = renderHook(() => useSplitView());
    expect(result.current.layout.type).toBe('leaf');
    expect(result.current.paneCount).toBe(1);
    expect(result.current.isSplitActive).toBe(false);
  });

  it('loads saved layout from getSettings', async () => {
    const savedLayout = {
      type: 'branch' as const,
      direction: 'horizontal' as const,
      ratio: 0.5,
      children: [
        { type: 'leaf' as const, paneId: 'saved-a', sessionId: null },
        { type: 'leaf' as const, paneId: 'saved-b', sessionId: null },
      ] as [any, any],
    };

    api.getSettings.mockResolvedValue({
      version: 1,
      workspaces: [],
      splitViewState: { layout: savedLayout, focusedPaneId: 'saved-a' },
    });

    const { result } = renderHook(() => useSplitView());

    await waitFor(() => {
      expect(result.current.layout.type).toBe('branch');
    });

    expect(result.current.paneCount).toBe(2);
    expect(result.current.focusedPaneId).toBe('saved-a');
  });

  it('falls back to default layout on invalid saved state', async () => {
    api.getSettings.mockResolvedValue({
      version: 1,
      workspaces: [],
      splitViewState: { layout: { type: 'invalid' }, focusedPaneId: '' },
    });

    const { result } = renderHook(() => useSplitView());

    await waitFor(() => {
      expect(result.current.layout.type).toBe('leaf');
    });

    expect(result.current.paneCount).toBe(1);
  });

  it('splitPane creates a new pane', () => {
    const { result } = renderHook(() => useSplitView());
    const initialPaneId = result.current.focusedPaneId;

    act(() => {
      result.current.splitPane(initialPaneId, 'horizontal');
    });

    expect(result.current.paneCount).toBe(2);
    expect(result.current.isSplitActive).toBe(true);
    expect(result.current.layout.type).toBe('branch');
  });

  it('closePane removes a pane and promotes sibling', () => {
    const { result } = renderHook(() => useSplitView());
    const initialPaneId = result.current.focusedPaneId;

    let newPaneId: string;
    act(() => {
      newPaneId = result.current.splitPane(initialPaneId, 'horizontal');
    });

    act(() => {
      result.current.closePane(newPaneId!);
    });

    expect(result.current.paneCount).toBe(1);
    expect(result.current.isSplitActive).toBe(false);
  });

  it('assignSession assigns session to a pane', () => {
    const { result } = renderHook(() => useSplitView());
    const paneId = result.current.focusedPaneId;

    act(() => {
      result.current.assignSession(paneId, 'session-1');
    });

    expect(result.current.visibleSessionIds).toContain('session-1');
  });

  it('focusDirection navigates between panes', () => {
    const { result } = renderHook(() => useSplitView());
    const leftPaneId = result.current.focusedPaneId;

    let rightPaneId: string;
    act(() => {
      rightPaneId = result.current.splitPane(leftPaneId, 'horizontal');
    });

    // Focus should be on the new (right) pane
    expect(result.current.focusedPaneId).toBe(rightPaneId!);

    // Navigate left
    act(() => {
      result.current.focusDirection('left');
    });

    expect(result.current.focusedPaneId).toBe(leftPaneId);
  });

  it('persists layout changes via updateSplitViewState', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useSplitView());

    act(() => {
      result.current.splitPane(result.current.focusedPaneId, 'horizontal');
    });

    // Advance past the 500ms debounce
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(api.updateSplitViewState).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('collapseSplitView collapses to single pane', () => {
    const { result } = renderHook(() => useSplitView());

    act(() => {
      result.current.splitPane(result.current.focusedPaneId, 'horizontal');
    });

    expect(result.current.paneCount).toBe(2);

    act(() => {
      result.current.collapseSplitView();
    });

    expect(result.current.paneCount).toBe(1);
  });
});
