import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  isSlowConnection: boolean;
}

interface NetworkInformation extends EventTarget {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

export function useNetworkStatus(): NetworkStatus {
  const getConnection = (): NetworkInformation | null => {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  };

  const [status, setStatus] = useState<NetworkStatus>(() => {
    const connection = getConnection();
    const effectiveType = connection?.effectiveType || null;
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      wasOffline: false,
      effectiveType,
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
      isSlowConnection: effectiveType === 'slow-2g' || effectiveType === '2g',
    };
  });

  const updateNetworkStatus = useCallback(() => {
    const connection = getConnection();
    const effectiveType = connection?.effectiveType || null;
    setStatus((prev) => ({
      isOnline: navigator.onLine,
      wasOffline: prev.wasOffline || !navigator.onLine,
      effectiveType,
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
      isSlowConnection: effectiveType === 'slow-2g' || effectiveType === '2g',
    }));
  }, []);

  useEffect(() => {
    // Listen for online/offline events
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Listen for connection changes
    const connection = getConnection();
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [updateNetworkStatus]);

  return status;
}

/**
 * Queue actions to be executed when back online
 */
interface QueuedAction {
  id: string;
  action: () => Promise<void>;
  timestamp: number;
}

const actionQueue: QueuedAction[] = [];
let isProcessingQueue = false;

export function queueOfflineAction(id: string, action: () => Promise<void>): void {
  // Remove existing action with same ID
  const existingIndex = actionQueue.findIndex((a) => a.id === id);
  if (existingIndex !== -1) {
    actionQueue.splice(existingIndex, 1);
  }

  actionQueue.push({
    id,
    action,
    timestamp: Date.now(),
  });
}

export async function processOfflineQueue(): Promise<void> {
  if (isProcessingQueue || actionQueue.length === 0) return;

  isProcessingQueue = true;

  while (actionQueue.length > 0) {
    const item = actionQueue.shift();
    if (item) {
      try {
        await item.action();
      } catch (error) {
        console.error('[OfflineQueue] Action failed:', item.id, error);
      }
    }
  }

  isProcessingQueue = false;
}

// Auto-process queue when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processOfflineQueue();
  });
}
