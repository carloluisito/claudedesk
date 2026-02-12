import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock useGit hook
const mockUseGit = {
  status: null as any,
  branches: [],
  log: [],
  isLoading: false,
  operationInProgress: null,
  selectedDiff: null,
  generatedMessage: null,
  refreshStatus: vi.fn(),
  loadBranches: vi.fn(),
  loadHistory: vi.fn(),
  startWatching: vi.fn(),
  stopWatching: vi.fn(),
  stageFiles: vi.fn(),
  unstageFiles: vi.fn(),
  stageAll: vi.fn(),
  unstageAll: vi.fn(),
  commit: vi.fn().mockResolvedValue({ success: true }),
  push: vi.fn(),
  pull: vi.fn(),
  fetch: vi.fn(),
  viewDiff: vi.fn(),
  setSelectedDiff: vi.fn(),
  switchBranch: vi.fn(),
  createBranch: vi.fn(),
  initRepo: vi.fn(),
  generateMessage: vi.fn(),
  discardAll: vi.fn(),
};

vi.mock('../hooks/useGit', () => ({
  useGit: () => mockUseGit,
}));

// Mock ConfirmDialog
vi.mock('./ui', () => ({
  ConfirmDialog: ({ isOpen, onConfirm, onCancel }: any) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <button data-testid="confirm-yes" onClick={onConfirm}>Yes</button>
        <button data-testid="confirm-no" onClick={onCancel}>No</button>
      </div>
    ) : null,
}));

// Mock CommitDialog
vi.mock('./ui/CommitDialog', () => ({
  CommitDialog: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="commit-dialog">
        <button data-testid="commit-dialog-close" onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

import { GitPanel } from './GitPanel';

describe('GitPanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    projectPath: '/test',
    activeSessionId: 's1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGit.status = null;
    mockUseGit.isLoading = false;
    mockUseGit.operationInProgress = null;
    mockUseGit.branches = [];
    mockUseGit.log = [];
    mockUseGit.selectedDiff = null;
    mockUseGit.generatedMessage = null;
  });

  it('returns null when not open', () => {
    const { container } = render(<GitPanel {...defaultProps} isOpen={false} />);
    expect(container.querySelector('.git-panel')).not.toBeInTheDocument();
  });

  it('renders panel header with title', () => {
    render(<GitPanel {...defaultProps} />);
    expect(screen.getByText('Git')).toBeInTheDocument();
  });

  it('shows loading state when status is null and isLoading', () => {
    mockUseGit.isLoading = true;
    render(<GitPanel {...defaultProps} />);
    expect(screen.getByText('Loading git status...')).toBeInTheDocument();
  });

  it('shows "Not a Git Repository" when status.isRepo is false', () => {
    mockUseGit.status = { isRepo: false, branch: null, files: [], stagedCount: 0, unstagedCount: 0, untrackedCount: 0, conflictedCount: 0, ahead: 0, behind: 0, isDetached: false, hasConflicts: false, upstream: null };
    render(<GitPanel {...defaultProps} />);
    expect(screen.getByText('Not a Git Repository')).toBeInTheDocument();
    expect(screen.getByText('Initialize Repository')).toBeInTheDocument();
  });

  it('calls initRepo when init button clicked', () => {
    mockUseGit.status = { isRepo: false, branch: null, files: [], stagedCount: 0, unstagedCount: 0, untrackedCount: 0, conflictedCount: 0, ahead: 0, behind: 0, isDetached: false, hasConflicts: false, upstream: null };
    render(<GitPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Initialize Repository'));
    expect(mockUseGit.initRepo).toHaveBeenCalled();
  });

  it('shows "Working tree clean" when no files to show', () => {
    mockUseGit.status = { isRepo: true, branch: 'main', files: [], stagedCount: 0, unstagedCount: 0, untrackedCount: 0, conflictedCount: 0, ahead: 0, behind: 0, isDetached: false, hasConflicts: false, upstream: null };
    render(<GitPanel {...defaultProps} />);
    expect(screen.getByText('Working tree clean')).toBeInTheDocument();
  });

  it('shows staged files section', () => {
    mockUseGit.status = {
      isRepo: true, branch: 'main',
      files: [
        { path: 'src/index.ts', originalPath: null, indexStatus: 'modified', workTreeStatus: 'unmodified', area: 'staged' },
      ],
      stagedCount: 1, unstagedCount: 0, untrackedCount: 0, conflictedCount: 0,
      ahead: 0, behind: 0, isDetached: false, hasConflicts: false, upstream: null,
    };
    render(<GitPanel {...defaultProps} />);
    expect(screen.getByText('Staged Changes')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('shows unstaged files section', () => {
    mockUseGit.status = {
      isRepo: true, branch: 'main',
      files: [
        { path: 'src/utils.ts', originalPath: null, indexStatus: 'unmodified', workTreeStatus: 'modified', area: 'unstaged' },
      ],
      stagedCount: 0, unstagedCount: 1, untrackedCount: 0, conflictedCount: 0,
      ahead: 0, behind: 0, isDetached: false, hasConflicts: false, upstream: null,
    };
    render(<GitPanel {...defaultProps} />);
    expect(screen.getByText('Unstaged Changes')).toBeInTheDocument();
  });

  it('shows branch name', () => {
    mockUseGit.status = { isRepo: true, branch: 'feature/cool', files: [], stagedCount: 0, unstagedCount: 0, untrackedCount: 0, conflictedCount: 0, ahead: 0, behind: 0, isDetached: false, hasConflicts: false, upstream: null };
    render(<GitPanel {...defaultProps} />);
    expect(screen.getByText('feature/cool')).toBeInTheDocument();
  });

  it('shows detached HEAD banner', () => {
    mockUseGit.status = { isRepo: true, branch: 'abc1234', files: [], stagedCount: 0, unstagedCount: 0, untrackedCount: 0, conflictedCount: 0, ahead: 0, behind: 0, isDetached: true, hasConflicts: false, upstream: null };
    render(<GitPanel {...defaultProps} />);
    expect(screen.getByText(/Detached HEAD/)).toBeInTheDocument();
  });

  it('disables commit button when no staged files', () => {
    mockUseGit.status = {
      isRepo: true, branch: 'main',
      files: [
        { path: 'src/utils.ts', originalPath: null, indexStatus: 'unmodified', workTreeStatus: 'modified', area: 'unstaged' },
      ],
      stagedCount: 0, unstagedCount: 1, untrackedCount: 0, conflictedCount: 0,
      ahead: 0, behind: 0, isDetached: false, hasConflicts: false, upstream: null,
    };
    render(<GitPanel {...defaultProps} />);
    const commitBtn = screen.getByText('Commit (0)');
    expect(commitBtn).toBeDisabled();
  });

  it('calls onClose when close button clicked', () => {
    render(<GitPanel {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Close Git panel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows operation status when operation is in progress', () => {
    (mockUseGit as any).operationInProgress = 'pushing';
    render(<GitPanel {...defaultProps} />);
    expect(screen.getByText('pushing...')).toBeInTheDocument();
  });
});
