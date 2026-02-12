import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock child components
vi.mock('./ui/SessionStatusIndicator', () => ({
  SessionStatusIndicator: ({ status, onClick }: any) => (
    <span data-testid="status-indicator" data-status={status} onClick={onClick}>
      {status}
    </span>
  ),
}));

vi.mock('./ui/StatusPopover', () => ({
  StatusPopover: ({ isOpen }: any) =>
    isOpen ? <div data-testid="status-popover" /> : null,
}));

import { PaneHeader } from './PaneHeader';

const defaultProps = {
  sessionId: 's1',
  sessionName: 'My Session',
  workingDirectory: '/home/user/project',
  isFocused: true,
  availableSessions: [
    { id: 's2', name: 'Other Session', workingDirectory: '/other', status: 'running' as const, permissionMode: 'standard' as const },
  ],
  canSplit: true,
  onChangeSession: vi.fn(),
  onClosePane: vi.fn(),
  onSplitHorizontal: vi.fn(),
  onSplitVertical: vi.fn(),
};

describe('PaneHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders session name and working directory', () => {
    render(<PaneHeader {...defaultProps} />);
    expect(screen.getByText('My Session')).toBeInTheDocument();
    expect(screen.getByText('/home/user/project')).toBeInTheDocument();
  });

  it('applies focused class when isFocused is true', () => {
    const { container } = render(<PaneHeader {...defaultProps} />);
    expect(container.querySelector('.pane-header.focused')).toBeInTheDocument();
  });

  it('does not apply focused class when isFocused is false', () => {
    const { container } = render(<PaneHeader {...defaultProps} isFocused={false} />);
    expect(container.querySelector('.pane-header.focused')).toBeNull();
  });

  it('renders split buttons when canSplit is true', () => {
    render(<PaneHeader {...defaultProps} />);
    expect(screen.getByTitle('Split Horizontally (Left/Right)')).toBeInTheDocument();
    expect(screen.getByTitle('Split Vertically (Top/Bottom)')).toBeInTheDocument();
  });

  it('hides split buttons when canSplit is false', () => {
    render(<PaneHeader {...defaultProps} canSplit={false} />);
    expect(screen.queryByTitle('Split Horizontally (Left/Right)')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Split Vertically (Top/Bottom)')).not.toBeInTheDocument();
  });

  it('calls onSplitHorizontal when horizontal split button clicked', () => {
    render(<PaneHeader {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Split Horizontally (Left/Right)'));
    expect(defaultProps.onSplitHorizontal).toHaveBeenCalled();
  });

  it('calls onSplitVertical when vertical split button clicked', () => {
    render(<PaneHeader {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Split Vertically (Top/Bottom)'));
    expect(defaultProps.onSplitVertical).toHaveBeenCalled();
  });

  it('calls onClosePane when close button clicked', () => {
    render(<PaneHeader {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Close Pane (Ctrl+Shift+W)'));
    expect(defaultProps.onClosePane).toHaveBeenCalled();
  });

  it('shows session dropdown when dropdown button clicked', () => {
    render(<PaneHeader {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Change Session'));
    expect(screen.getByText('Other Session')).toBeInTheDocument();
  });

  it('shows status indicator', () => {
    render(<PaneHeader {...defaultProps} sessionStatus="ready" />);
    expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
  });
});
