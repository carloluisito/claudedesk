import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { playSuccessSound, playErrorSound } from '../lib/sounds';
import type { NotificationSettings } from '../types';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Load notification settings
  useEffect(() => {
    loadSettings();
    checkPermission();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api<NotificationSettings>('GET', '/settings/notifications');
      setSettings(data);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      // Use defaults
      setSettings({
        enabled: true,
        sound: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  };

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, []);

  const playSound = useCallback((type: 'success' | 'error') => {
    if (!settings?.sound) return;

    try {
      if (type === 'success') {
        playSuccessSound(0.3);
      } else {
        playErrorSound(0.3);
      }
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }, [settings?.sound]);

  const notify = useCallback(async (options: NotificationOptions) => {
    if (!settings?.enabled) return;

    // Play sound first
    if (options.title.toLowerCase().includes('failed') || options.title.toLowerCase().includes('error')) {
      playSound('error');
    } else {
      playSound('success');
    }

    // Check if we can show browser notification
    if (!('Notification' in window)) return;

    let currentPermission = permission;
    if (currentPermission === 'default') {
      const granted = await requestPermission();
      if (!granted) return;
      currentPermission = 'granted';
    }

    if (currentPermission !== 'granted') return;

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: false,
      });

      if (options.onClick) {
        notification.onclick = () => {
          window.focus();
          options.onClick?.();
          notification.close();
        };
      }

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }, [permission, settings?.enabled, playSound, requestPermission]);

  return {
    permission,
    settings,
    loading,
    requestPermission,
    notify,
    playSound,
    isSupported: 'Notification' in window,
    isEnabled: settings?.enabled && permission === 'granted',
  };
}
