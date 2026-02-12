import { test, expect } from './fixtures/electron';

test.describe('Session Management', () => {
  test('new session button is visible', async ({ window }) => {
    await window.waitForSelector('.tab-bar', { timeout: 10000 });
    const newBtn = await window.$('[aria-label="New session"]');
    expect(newBtn).not.toBeNull();
  });

  test('clicking new session opens dialog', async ({ window }) => {
    await window.waitForSelector('.tab-bar', { timeout: 10000 });
    await window.click('[aria-label="New session"]');

    // Dialog should appear
    await window.waitForSelector('.new-session-dialog, [class*="dialog"]', { timeout: 5000 });
  });

  test.skip('creating a session adds a tab', async ({ window }) => {
    // Skip: requires claude CLI to be installed
    // This test creates an actual session which needs the CLI
    await window.waitForSelector('.tab-bar', { timeout: 10000 });
    const initialTabCount = await window.$$eval('.tabs-inner > *', els => els.length);

    await window.click('[aria-label="New session"]');
    await window.waitForSelector('.new-session-dialog, [class*="dialog"]', { timeout: 5000 });

    // Fill in session details and submit
    // ... (would interact with the dialog form)

    // Verify new tab appeared
    const newTabCount = await window.$$eval('.tabs-inner > *', els => els.length);
    expect(newTabCount).toBeGreaterThan(initialTabCount);
  });
});
