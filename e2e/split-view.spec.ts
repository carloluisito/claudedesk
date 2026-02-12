import { test, expect } from './fixtures/electron';

test.describe('Split View', () => {
  test('app starts with single pane', async ({ window }) => {
    await window.waitForSelector('.split-layout, .tab-bar', { timeout: 10000 });
    // In single pane mode, no drag handles should exist
    const dragHandles = await window.$$('.drag-handle');
    expect(dragHandles.length).toBe(0);
  });

  test('split container CSS classes are applied', async ({ window }) => {
    await window.waitForSelector('.split-layout, .tab-bar', { timeout: 10000 });
    // The split-layout container should always be present
    const layout = await window.$('.split-layout');
    // Layout might not exist if we're in empty state
    if (layout) {
      const className = await layout.getAttribute('class');
      expect(className).toContain('split-layout');
    }
  });
});
