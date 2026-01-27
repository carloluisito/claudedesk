import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'pink';
type FontSize = 'small' | 'medium' | 'large';

// Default values
const DEFAULT_THEME: Theme = 'system';
const DEFAULT_ACCENT_COLOR: AccentColor = 'blue';
const DEFAULT_FONT_SIZE: FontSize = 'medium';
const DEFAULT_COMPACT_MODE = false;
const DEFAULT_SOUND_ENABLED = true;

interface ThemeState {
  theme: Theme;
  accentColor: AccentColor;
  fontSize: FontSize;
  compactMode: boolean;
  soundEnabled: boolean;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
  setFontSize: (size: FontSize) => void;
  setCompactMode: (compact: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

// Accent color CSS variables mapping - using full rgb() strings for browser compatibility
const ACCENT_COLORS: Record<AccentColor, { primary: string; hover: string }> = {
  blue: { primary: 'rgb(59, 130, 246)', hover: 'rgb(37, 99, 235)' }, // blue-500, blue-600
  purple: { primary: 'rgb(168, 85, 247)', hover: 'rgb(147, 51, 234)' }, // purple-500, purple-600
  green: { primary: 'rgb(34, 197, 94)', hover: 'rgb(22, 163, 74)' }, // green-500, green-600
  orange: { primary: 'rgb(249, 115, 22)', hover: 'rgb(234, 88, 12)' }, // orange-500, orange-600
  pink: { primary: 'rgb(236, 72, 153)', hover: 'rgb(219, 39, 119)' }, // pink-500, pink-600
};

// Font size mappings
const FONT_SIZES: Record<FontSize, string> = {
  small: '13px',
  medium: '14px',
  large: '16px',
};

// Get system preference
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Apply theme class to document
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;

  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Apply accent color CSS variables
function applyAccentColor(color: AccentColor) {
  const root = document.documentElement;
  const { primary, hover } = ACCENT_COLORS[color];
  root.style.setProperty('--accent-color', primary);
  root.style.setProperty('--accent-color-hover', hover);
}

// Apply font size
function applyFontSize(size: FontSize) {
  const root = document.documentElement;
  root.style.setProperty('--base-font-size', FONT_SIZES[size]);
}

// Apply compact mode
function applyCompactMode(compact: boolean) {
  const root = document.documentElement;
  if (compact) {
    root.classList.add('compact');
  } else {
    root.classList.remove('compact');
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      accentColor: DEFAULT_ACCENT_COLOR,
      fontSize: DEFAULT_FONT_SIZE,
      compactMode: DEFAULT_COMPACT_MODE,
      soundEnabled: DEFAULT_SOUND_ENABLED,

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      setAccentColor: (color) => {
        applyAccentColor(color);
        set({ accentColor: color });
      },

      setFontSize: (size) => {
        applyFontSize(size);
        set({ fontSize: size });
      },

      setCompactMode: (compact) => {
        applyCompactMode(compact);
        set({ compactMode: compact });
      },

      setSoundEnabled: (enabled) => {
        set({ soundEnabled: enabled });
      },

      resetToDefaults: () => {
        applyTheme(DEFAULT_THEME);
        applyAccentColor(DEFAULT_ACCENT_COLOR);
        applyFontSize(DEFAULT_FONT_SIZE);
        applyCompactMode(DEFAULT_COMPACT_MODE);
        set({
          theme: DEFAULT_THEME,
          accentColor: DEFAULT_ACCENT_COLOR,
          fontSize: DEFAULT_FONT_SIZE,
          compactMode: DEFAULT_COMPACT_MODE,
          soundEnabled: DEFAULT_SOUND_ENABLED,
        });
      },
    }),
    {
      name: 'claudedesk-theme',
      onRehydrateStorage: () => (state) => {
        // Apply all settings after hydration from localStorage
        if (state) {
          applyTheme(state.theme);
          applyAccentColor(state.accentColor);
          applyFontSize(state.fontSize);
          applyCompactMode(state.compactMode);
        }
      },
    }
  )
);

// Initialize theme and listen for system preference changes
export function initTheme() {
  const { theme, accentColor, fontSize, compactMode } = useThemeStore.getState();
  applyTheme(theme);
  applyAccentColor(accentColor);
  applyFontSize(fontSize);
  applyCompactMode(compactMode);

  // Listen for system preference changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') {
      applyTheme('system');
    }
  });
}

// Helper to get effective theme (for components that need to know)
export function getEffectiveTheme(): 'light' | 'dark' {
  const { theme } = useThemeStore.getState();
  return theme === 'system' ? getSystemTheme() : theme;
}

// Play notification sound
export function playNotificationSound(type: 'message' | 'complete' | 'error' = 'message') {
  const { soundEnabled } = useThemeStore.getState();
  if (!soundEnabled) return;

  // Use Web Audio API for simple notification sounds
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies for different notification types
    const frequencies: Record<string, number> = {
      message: 800,
      complete: 600,
      error: 400,
    };

    oscillator.frequency.value = frequencies[type];
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    // Audio not supported or blocked
  }
}

// Export types
export type { Theme, AccentColor, FontSize };
