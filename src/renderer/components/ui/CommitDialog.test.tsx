import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommitDialog } from './CommitDialog';

const mockStagedFiles = [
  { path: 'src/index.ts', indexStatus: 'modified', workTreeStatus: 'unmodified', area: 'staged' as const },
  { path: 'src/utils.ts', indexStatus: 'added', workTreeStatus: 'unmodified', area: 'staged' as const },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onCommit: vi.fn().mockResolvedValue({ success: true }),
  onGenerateMessage: vi.fn().mockResolvedValue(null),
  stagedFiles: mockStagedFiles,
  workingDirectory: '/test',
  sessionId: 's1',
  generatedMessage: null,
  isGenerating: false,
};

describe('CommitDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when not open', () => {
    const { container } = render(<CommitDialog {...defaultProps} isOpen={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders dialog with title and staged file count', () => {
    render(<CommitDialog {...defaultProps} />);
    expect(screen.getByText('Commit Changes')).toBeInTheDocument();
    expect(screen.getByText('2 files staged')).toBeInTheDocument();
  });

  it('renders commit message input and description textarea', () => {
    render(<CommitDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText('type(scope): description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Provide additional context (optional)...')).toBeInTheDocument();
  });

  it('disables commit button when title is empty', () => {
    render(<CommitDialog {...defaultProps} />);
    const commitBtn = screen.getByText('Commit (2)');
    expect(commitBtn).toBeDisabled();
  });

  it('enables commit button when title is provided', () => {
    render(<CommitDialog {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('type(scope): description'), {
      target: { value: 'feat: add thing' },
    });
    const commitBtn = screen.getByText('Commit (2)');
    expect(commitBtn).not.toBeDisabled();
  });

  it('calls onCommit with correct request on submit', async () => {
    render(<CommitDialog {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('type(scope): description'), {
      target: { value: 'feat: add thing' },
    });
    fireEvent.click(screen.getByText('Commit (2)'));

    await waitFor(() => {
      expect(defaultProps.onCommit).toHaveBeenCalledWith({
        workingDirectory: '/test',
        message: 'feat: add thing',
        createCheckpoint: false,
        sessionId: 's1',
      });
    });
  });

  it('concatenates title and body in message', async () => {
    render(<CommitDialog {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('type(scope): description'), {
      target: { value: 'feat: add thing' },
    });
    fireEvent.change(screen.getByPlaceholderText('Provide additional context (optional)...'), {
      target: { value: 'Some extra detail' },
    });
    fireEvent.click(screen.getByText('Commit (2)'));

    await waitFor(() => {
      expect(defaultProps.onCommit).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'feat: add thing\n\nSome extra detail',
        })
      );
    });
  });

  it('calls onClose on cancel', () => {
    render(<CommitDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onGenerateMessage when generate button clicked', () => {
    render(<CommitDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Generate'));
    expect(defaultProps.onGenerateMessage).toHaveBeenCalled();
  });

  it('shows confidence badge when generatedMessage is provided', () => {
    render(
      <CommitDialog
        {...defaultProps}
        generatedMessage={{
          message: 'feat: test',
          type: 'feat',
          scope: null,
          description: 'test',
          confidence: 'high' as const,
          reasoning: 'All tests pass',
        }}
      />
    );
    expect(screen.getByText(/high confidence/)).toBeInTheDocument();
    expect(screen.getByText(/All tests pass/)).toBeInTheDocument();
  });

  it('shows character count warning when title exceeds 72 chars', () => {
    render(<CommitDialog {...defaultProps} />);
    const input = screen.getByPlaceholderText('type(scope): description');
    fireEvent.change(input, {
      target: { value: 'a'.repeat(80) },
    });
    const charCount = screen.getByText('80/72');
    expect(charCount.classList.contains('warning')).toBe(true);
  });
});
