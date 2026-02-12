import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { getElectronAPI } from '../../../test/helpers/electron-api-mock';

// Mock showToast
vi.mock('../utils/toast', () => ({
  showToast: vi.fn(),
}));

import { useGit } from './useGit';

describe('useGit', () => {
  let api: ReturnType<typeof getElectronAPI>;

  beforeEach(() => {
    api = getElectronAPI();
  });

  it('returns null status when projectPath is null', () => {
    const { result } = renderHook(() => useGit(null));
    expect(result.current.status).toBeNull();
    expect(result.current.branches).toEqual([]);
    expect(result.current.log).toEqual([]);
  });

  it('calls getGitStatus when projectPath changes', async () => {
    const mockStatus = { isRepo: true, branch: 'main', files: [], stagedCount: 0, unstagedCount: 0, untrackedCount: 0, conflictedCount: 0, ahead: 0, behind: 0, isDetached: false, hasConflicts: false, upstream: null };
    api.getGitStatus.mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useGit('/test'));
    await waitFor(() => {
      expect(result.current.status).toEqual(mockStatus);
    });
    expect(api.getGitStatus).toHaveBeenCalledWith('/test');
  });

  it('resets state when projectPath becomes null', async () => {
    const mockStatus = { isRepo: true, branch: 'main', files: [], stagedCount: 0, unstagedCount: 0, untrackedCount: 0, conflictedCount: 0, ahead: 0, behind: 0, isDetached: false, hasConflicts: false, upstream: null };
    api.getGitStatus.mockResolvedValue(mockStatus);

    const { result, rerender } = renderHook(
      ({ path }) => useGit(path),
      { initialProps: { path: '/test' as string | null } }
    );

    await waitFor(() => {
      expect(result.current.status).toEqual(mockStatus);
    });

    rerender({ path: null });
    expect(result.current.status).toBeNull();
  });

  it('subscribes to onGitStatusChanged and cleans up', () => {
    const unsubscribe = vi.fn();
    api.onGitStatusChanged.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useGit(null));
    expect(api.onGitStatusChanged).toHaveBeenCalled();

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('stageFiles calls gitStageFiles and refreshes', async () => {
    api.getGitStatus.mockResolvedValue({ isRepo: true, branch: 'main', files: [], stagedCount: 0, unstagedCount: 0, untrackedCount: 0, conflictedCount: 0, ahead: 0, behind: 0, isDetached: false, hasConflicts: false, upstream: null });
    api.gitStageFiles.mockResolvedValue({ success: true, message: 'ok', errorCode: null });

    const { result } = renderHook(() => useGit('/test'));
    await waitFor(() => expect(result.current.status).not.toBeNull());

    await act(async () => {
      await result.current.stageFiles(['file.ts']);
    });

    expect(api.gitStageFiles).toHaveBeenCalledWith('/test', ['file.ts']);
    // getGitStatus called once initially + once for refresh
    expect(api.getGitStatus).toHaveBeenCalledTimes(2);
  });

  it('commit calls gitCommit and refreshes status + history', async () => {
    api.getGitStatus.mockResolvedValue({ isRepo: true, branch: 'main', files: [], stagedCount: 0, unstagedCount: 0, untrackedCount: 0, conflictedCount: 0, ahead: 0, behind: 0, isDetached: false, hasConflicts: false, upstream: null });
    api.gitCommit.mockResolvedValue({ success: true, message: 'Committed: abc1234', errorCode: null });
    api.gitLog.mockResolvedValue([]);

    const { result } = renderHook(() => useGit('/test'));
    await waitFor(() => expect(result.current.status).not.toBeNull());

    await act(async () => {
      await result.current.commit({
        workingDirectory: '/test',
        message: 'test commit',
        createCheckpoint: false,
        sessionId: null,
      });
    });

    expect(api.gitCommit).toHaveBeenCalled();
    expect(api.gitLog).toHaveBeenCalledWith('/test', 10);
  });

  it('operationInProgress tracks async operations', async () => {
    api.getGitStatus.mockResolvedValue({ isRepo: true, branch: 'main', files: [], stagedCount: 0, unstagedCount: 0, untrackedCount: 0, conflictedCount: 0, ahead: 0, behind: 0, isDetached: false, hasConflicts: false, upstream: null });

    let resolveStage: Function;
    api.gitStageFiles.mockImplementation(() => new Promise(r => { resolveStage = r; }));

    const { result } = renderHook(() => useGit('/test'));
    await waitFor(() => expect(result.current.status).not.toBeNull());

    act(() => {
      result.current.stageFiles(['file.ts']);
    });

    expect(result.current.operationInProgress).toBe('staging');

    await act(async () => {
      resolveStage!({ success: true, message: 'ok', errorCode: null });
    });

    await waitFor(() => {
      expect(result.current.operationInProgress).toBeNull();
    });
  });

  it('generateMessage calls gitGenerateMessage and stores result', async () => {
    const mockMsg = { message: 'feat: test', type: 'feat', scope: null, description: 'test', confidence: 'high', reasoning: 'test' };
    api.getGitStatus.mockResolvedValue({ isRepo: true, branch: 'main', files: [], stagedCount: 0, unstagedCount: 0, untrackedCount: 0, conflictedCount: 0, ahead: 0, behind: 0, isDetached: false, hasConflicts: false, upstream: null });
    api.gitGenerateMessage.mockResolvedValue(mockMsg);

    const { result } = renderHook(() => useGit('/test'));
    await waitFor(() => expect(result.current.status).not.toBeNull());

    await act(async () => {
      await result.current.generateMessage();
    });

    expect(result.current.generatedMessage).toEqual(mockMsg);
  });
});
