import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ipcMain } from 'electron';
import { IPCRegistry } from './ipc-registry';
import { channels } from '../shared/ipc-contract';

describe('IPCRegistry', () => {
  let registry: IPCRegistry;

  beforeEach(() => {
    vi.resetAllMocks();
    registry = new IPCRegistry();
  });

  it('handle() registers via ipcMain.handle with correct channel', () => {
    const handler = vi.fn();
    registry.handle('createSession', handler);

    expect(ipcMain.handle).toHaveBeenCalledWith(
      channels.createSession,
      handler
    );
  });

  it('on() registers via ipcMain.on with correct channel', () => {
    const handler = vi.fn();
    registry.on('sendSessionInput', handler);

    expect(ipcMain.on).toHaveBeenCalledWith(
      channels.sendSessionInput,
      handler
    );
  });

  it('removeAll() cleans up all registered handlers', () => {
    const invokeHandler = vi.fn();
    const sendHandler = vi.fn();

    registry.handle('createSession', invokeHandler);
    registry.on('sendSessionInput', sendHandler);

    registry.removeAll();

    expect(ipcMain.removeHandler).toHaveBeenCalledWith(channels.createSession);
    expect(ipcMain.removeListener).toHaveBeenCalledWith(
      channels.sendSessionInput,
      sendHandler
    );
  });

  it('removeAll() clears internal tracking arrays', () => {
    registry.handle('createSession', vi.fn());
    registry.on('sendSessionInput', vi.fn());

    registry.removeAll();

    // Calling removeAll again should not call ipcMain methods again
    vi.mocked(ipcMain.removeHandler).mockClear();
    vi.mocked(ipcMain.removeListener).mockClear();

    registry.removeAll();

    expect(ipcMain.removeHandler).not.toHaveBeenCalled();
    expect(ipcMain.removeListener).not.toHaveBeenCalled();
  });

  it('handles multiple registrations and removes them all', () => {
    registry.handle('createSession', vi.fn());
    registry.handle('closeSession', vi.fn());
    registry.handle('listSessions', vi.fn());

    registry.removeAll();

    expect(ipcMain.removeHandler).toHaveBeenCalledTimes(3);
  });
});
