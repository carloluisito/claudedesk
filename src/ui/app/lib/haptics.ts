/**
 * Haptic feedback utility using the Vibration API
 * Falls back gracefully on unsupported devices
 */

type HapticPattern = number | number[];

interface HapticFeedback {
  /**
   * Light tap - for navigation, toggle, minor interactions
   */
  light: () => void;

  /**
   * Medium feedback - for selections, confirms
   */
  medium: () => void;

  /**
   * Heavy feedback - for important actions
   */
  heavy: () => void;

  /**
   * Success pattern - for successful actions
   */
  success: () => void;

  /**
   * Error pattern - for validation errors, failures
   */
  error: () => void;

  /**
   * Warning pattern - for warnings, destructive action confirmations
   */
  warning: () => void;

  /**
   * Custom vibration pattern
   */
  vibrate: (pattern: HapticPattern) => void;

  /**
   * Check if haptics are supported
   */
  isSupported: () => boolean;
}

function vibrate(pattern: HapticPattern): void {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silently fail on unsupported devices
  }
}

function isSupported(): boolean {
  return 'vibrate' in navigator;
}

export const haptics: HapticFeedback = {
  // Single short vibration - for taps, navigation
  light: () => vibrate(10),

  // Medium vibration - for selections
  medium: () => vibrate(20),

  // Longer vibration - for important actions
  heavy: () => vibrate(40),

  // Success pattern - two quick pulses
  success: () => vibrate([10, 50, 10]),

  // Error pattern - longer, more noticeable
  error: () => vibrate([50, 30, 50]),

  // Warning pattern - distinct pattern
  warning: () => vibrate([30, 50, 30, 50, 30]),

  // Custom pattern
  vibrate,

  // Check support
  isSupported,
};
