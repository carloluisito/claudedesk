import { vi } from 'vitest';
import { channels, contractKinds } from '../../src/shared/ipc-contract';

type MockElectronAPI = Record<string, ReturnType<typeof vi.fn>>;

/**
 * Build a comprehensive mock of window.electronAPI matching all IPC methods.
 * - invoke methods → vi.fn().mockResolvedValue(undefined)
 * - send methods → vi.fn()
 * - event methods → vi.fn(() => vi.fn()) (returns unsubscribe)
 */
function buildElectronAPIMock(): MockElectronAPI {
  const mock: MockElectronAPI = {};

  for (const [methodName, kind] of Object.entries(contractKinds)) {
    switch (kind) {
      case 'invoke':
        mock[methodName] = vi.fn().mockResolvedValue(undefined);
        break;
      case 'send':
        mock[methodName] = vi.fn();
        break;
      case 'event':
        mock[methodName] = vi.fn(() => vi.fn());
        break;
    }
  }

  return mock;
}

let currentMock: MockElectronAPI | null = null;

/**
 * Get the current electronAPI mock. Creates one if it doesn't exist.
 */
export function getElectronAPI(): MockElectronAPI {
  if (!currentMock) {
    currentMock = buildElectronAPIMock();
    (window as any).electronAPI = currentMock;
  }
  return currentMock;
}

/**
 * Reset all mock functions and rebuild the electronAPI mock.
 */
export function resetElectronAPI(): MockElectronAPI {
  currentMock = buildElectronAPIMock();
  (window as any).electronAPI = currentMock;
  return currentMock;
}
