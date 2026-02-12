import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SplitLayout } from './SplitLayout';
import type { LayoutNode } from '../../shared/ipc-types';

describe('SplitLayout', () => {
  const mockRenderPane = vi.fn((paneId: string, sessionId: string | null, isFocused: boolean) => (
    <div data-testid={`pane-${paneId}`} data-focused={isFocused}>
      Pane {paneId}
    </div>
  ));

  const defaultProps = {
    focusedPaneId: 'p1',
    onPaneFocus: vi.fn(),
    onRatioChange: vi.fn(),
    renderPane: mockRenderPane,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a single leaf pane', () => {
    const layout: LayoutNode = {
      type: 'leaf',
      paneId: 'p1',
      sessionId: 's1',
    };
    render(<SplitLayout {...defaultProps} layout={layout} />);
    expect(screen.getByTestId('pane-p1')).toBeInTheDocument();
    expect(screen.getByText('Pane p1')).toBeInTheDocument();
  });

  it('marks focused pane correctly', () => {
    const layout: LayoutNode = {
      type: 'leaf',
      paneId: 'p1',
      sessionId: 's1',
    };
    render(<SplitLayout {...defaultProps} layout={layout} focusedPaneId="p1" />);
    expect(screen.getByTestId('pane-p1').getAttribute('data-focused')).toBe('true');
  });

  it('renders split pane layout with two children', () => {
    const layout: LayoutNode = {
      type: 'branch',
      direction: 'horizontal',
      ratio: 0.5,
      children: [
        { type: 'leaf', paneId: 'p1', sessionId: null },
        { type: 'leaf', paneId: 'p2', sessionId: null },
      ] as [LayoutNode, LayoutNode],
    };
    render(<SplitLayout {...defaultProps} layout={layout} />);
    expect(screen.getByTestId('pane-p1')).toBeInTheDocument();
    expect(screen.getByTestId('pane-p2')).toBeInTheDocument();
  });

  it('calls onPaneFocus when pane is clicked', () => {
    const layout: LayoutNode = {
      type: 'branch',
      direction: 'horizontal',
      ratio: 0.5,
      children: [
        { type: 'leaf', paneId: 'p1', sessionId: null },
        { type: 'leaf', paneId: 'p2', sessionId: null },
      ] as [LayoutNode, LayoutNode],
    };
    render(<SplitLayout {...defaultProps} layout={layout} />);

    fireEvent.click(screen.getByTestId('pane-p2'));
    expect(defaultProps.onPaneFocus).toHaveBeenCalledWith('p2');
  });

  it('renders nested branch layouts', () => {
    const layout: LayoutNode = {
      type: 'branch',
      direction: 'horizontal',
      ratio: 0.5,
      children: [
        { type: 'leaf', paneId: 'p1', sessionId: null },
        {
          type: 'branch',
          direction: 'vertical',
          ratio: 0.5,
          children: [
            { type: 'leaf', paneId: 'p2', sessionId: null },
            { type: 'leaf', paneId: 'p3', sessionId: null },
          ] as [LayoutNode, LayoutNode],
        },
      ] as [LayoutNode, LayoutNode],
    };
    render(<SplitLayout {...defaultProps} layout={layout} />);
    expect(screen.getByTestId('pane-p1')).toBeInTheDocument();
    expect(screen.getByTestId('pane-p2')).toBeInTheDocument();
    expect(screen.getByTestId('pane-p3')).toBeInTheDocument();
  });

  it('guards against excessively deep trees', () => {
    // Build a tree deeper than 10 levels
    let deepLayout: LayoutNode = { type: 'leaf', paneId: 'deep', sessionId: null };
    for (let i = 0; i < 12; i++) {
      deepLayout = {
        type: 'branch',
        direction: 'horizontal',
        ratio: 0.5,
        children: [
          deepLayout,
          { type: 'leaf', paneId: `side-${i}`, sessionId: null },
        ] as [LayoutNode, LayoutNode],
      };
    }

    // Should not crash — the depth guard prevents infinite recursion
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<SplitLayout {...defaultProps} layout={deepLayout} />);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Maximum recursion depth exceeded'),
      expect.any(Object)
    );
    consoleSpy.mockRestore();
  });

  it('handles null/invalid nodes gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const layout: any = {
      type: 'branch',
      direction: 'horizontal',
      ratio: 0.5,
      children: [null, { type: 'leaf', paneId: 'p1', sessionId: null }],
    };
    render(<SplitLayout {...defaultProps} layout={layout} />);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('renders grid layout', () => {
    const layout: LayoutNode = {
      type: 'grid',
      id: 'grid-1',
      direction: 'horizontal',
      sizes: [50, 50],
      children: [
        { type: 'leaf', paneId: 'g1', sessionId: null },
        { type: 'leaf', paneId: 'g2', sessionId: null },
      ],
    };
    render(<SplitLayout {...defaultProps} layout={layout} />);
    expect(screen.getByTestId('pane-g1')).toBeInTheDocument();
    expect(screen.getByTestId('pane-g2')).toBeInTheDocument();
  });
});
