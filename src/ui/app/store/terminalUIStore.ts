/**
 * terminalUIStore - Unified overlay and panel state management
 *
 * Consolidates 30+ modal states from Terminal.tsx into a single store.
 * Reduces complexity by enforcing only one overlay can be open at a time.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * True overlay modals that block interaction with the main content.
 * Only one can be active at a time.
 */
export type ActiveOverlay =
  | 'none'
  | 'command-palette'
  | 'settings'
  | 'export'
  | 'agents'
  | 'usage-dashboard'
  | 'mcp-approval'
  | 'new-session'
  | 'ship'
  | 'start-app'
  | 'expanded-input'
  | 'session-search'
  | 'split-selector'
  | 'add-repo'
  | 'merge-sessions'
  | 'create-repo'
  | 'repo-switcher'
  | 'delete-worktree';

/**
 * Expandable panels that can be open alongside the main content.
 * Multiple panels can be expanded on larger screens.
 */
export type ExpandedPanel = 'activity' | 'changes' | 'queue' | 'preview' | null;

/**
 * Mobile bottom sheets.
 * Only one can be open at a time.
 */
export type MobileSheet = 'actions' | 'preview' | 'menu' | null;

/**
 * Mobile actions sheet tabs
 */
export type MobileActionsTab = 'timeline' | 'changes';

/**
 * Mobile menu tabs
 */
export type MobileMenuTab = 'actions' | 'preview' | 'ship' | 'commands';

/**
 * Context menu state
 */
export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  sessionId: string | null;
}

/**
 * Jump menu state (for navigation)
 */
export interface JumpMenuState {
  isOpen: boolean;
}

/**
 * Message search state
 */
export interface MessageSearchState {
  isOpen: boolean;
  query: string;
  index: number;
  matches: string[];
}

/**
 * Delete worktree confirmation state
 */
export interface DeleteWorktreeState {
  sessionId: string;
  branch: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store State
// ─────────────────────────────────────────────────────────────────────────────

export interface TerminalUIState {
  // Primary overlay (modal) - only one at a time
  activeOverlay: ActiveOverlay;

  // Expandable panels - can be multiple on desktop
  expandedPanels: Set<ExpandedPanel>;

  // Mobile-specific sheet
  mobileSheet: MobileSheet;
  mobileActionsTab: MobileActionsTab;
  mobileMenuTab: MobileMenuTab;

  // Context menu
  contextMenu: ContextMenuState;

  // Jump/navigation menu
  jumpMenu: JumpMenuState;

  // In-session message search
  messageSearch: MessageSearchState;

  // Delete worktree confirmation
  deleteWorktreeConfirm: DeleteWorktreeState | null;

  // Split view state
  splitView: boolean;
  splitSessionId: string | null;

  // Actions
  openOverlay: (overlay: ActiveOverlay) => void;
  closeOverlay: () => void;
  toggleOverlay: (overlay: ActiveOverlay) => void;

  expandPanel: (panel: NonNullable<ExpandedPanel>) => void;
  collapsePanel: (panel: NonNullable<ExpandedPanel>) => void;
  togglePanel: (panel: NonNullable<ExpandedPanel>) => void;
  collapseAllPanels: () => void;

  openMobileSheet: (sheet: NonNullable<MobileSheet>, tab?: MobileActionsTab) => void;
  closeMobileSheet: () => void;
  setMobileActionsTab: (tab: MobileActionsTab) => void;
  setMobileMenuTab: (tab: MobileMenuTab) => void;

  openContextMenu: (position: { x: number; y: number }, sessionId: string) => void;
  closeContextMenu: () => void;

  openJumpMenu: () => void;
  closeJumpMenu: () => void;
  toggleJumpMenu: () => void;

  openMessageSearch: () => void;
  closeMessageSearch: () => void;
  setMessageSearchQuery: (query: string) => void;
  setMessageSearchIndex: (index: number) => void;
  setMessageSearchMatches: (matches: string[]) => void;

  setDeleteWorktreeConfirm: (state: DeleteWorktreeState | null) => void;

  setSplitView: (enabled: boolean, sessionId?: string | null) => void;

  // Convenience methods for common overlays
  openCommandPalette: () => void;
  openSettings: () => void;
  openAgents: () => void;
  openNewSession: () => void;
  openExport: () => void;
  openShip: () => void;

  // Reset all UI state
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

const initialState = {
  activeOverlay: 'none' as ActiveOverlay,
  expandedPanels: new Set<ExpandedPanel>(),
  mobileSheet: null as MobileSheet,
  mobileActionsTab: 'timeline' as MobileActionsTab,
  mobileMenuTab: 'actions' as MobileMenuTab,
  contextMenu: {
    isOpen: false,
    position: { x: 0, y: 0 },
    sessionId: null,
  },
  jumpMenu: {
    isOpen: false,
  },
  messageSearch: {
    isOpen: false,
    query: '',
    index: 0,
    matches: [],
  },
  deleteWorktreeConfirm: null,
  splitView: false,
  splitSessionId: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useTerminalUIStore = create<TerminalUIState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Overlay management
    openOverlay: (overlay) => {
      set({
        activeOverlay: overlay,
        // Close mobile sheet when opening overlay
        mobileSheet: null,
        // Close jump menu
        jumpMenu: { isOpen: false },
        // Close context menu
        contextMenu: { ...get().contextMenu, isOpen: false },
      });
    },

    closeOverlay: () => {
      set({ activeOverlay: 'none' });
    },

    toggleOverlay: (overlay) => {
      const current = get().activeOverlay;
      if (current === overlay) {
        set({ activeOverlay: 'none' });
      } else {
        get().openOverlay(overlay);
      }
    },

    // Panel management
    expandPanel: (panel) => {
      set((state) => {
        const newPanels = new Set(state.expandedPanels);
        newPanels.add(panel);
        return { expandedPanels: newPanels };
      });
    },

    collapsePanel: (panel) => {
      set((state) => {
        const newPanels = new Set(state.expandedPanels);
        newPanels.delete(panel);
        return { expandedPanels: newPanels };
      });
    },

    togglePanel: (panel) => {
      const panels = get().expandedPanels;
      if (panels.has(panel)) {
        get().collapsePanel(panel);
      } else {
        get().expandPanel(panel);
      }
    },

    collapseAllPanels: () => {
      set({ expandedPanels: new Set() });
    },

    // Mobile sheet management
    openMobileSheet: (sheet, tab) => {
      set({
        mobileSheet: sheet,
        ...(sheet === 'actions' && tab ? { mobileActionsTab: tab } : {}),
        // Close any open overlay
        activeOverlay: 'none',
      });
    },

    closeMobileSheet: () => {
      set({ mobileSheet: null });
    },

    setMobileActionsTab: (tab) => {
      set({ mobileActionsTab: tab });
    },

    setMobileMenuTab: (tab) => {
      set({ mobileMenuTab: tab });
    },

    // Context menu
    openContextMenu: (position, sessionId) => {
      set({
        contextMenu: {
          isOpen: true,
          position,
          sessionId,
        },
      });
    },

    closeContextMenu: () => {
      set({
        contextMenu: {
          ...get().contextMenu,
          isOpen: false,
        },
      });
    },

    // Jump menu
    openJumpMenu: () => {
      set({ jumpMenu: { isOpen: true } });
    },

    closeJumpMenu: () => {
      set({ jumpMenu: { isOpen: false } });
    },

    toggleJumpMenu: () => {
      set((state) => ({
        jumpMenu: { isOpen: !state.jumpMenu.isOpen },
      }));
    },

    // Message search
    openMessageSearch: () => {
      set({
        messageSearch: {
          ...get().messageSearch,
          isOpen: true,
        },
      });
    },

    closeMessageSearch: () => {
      set({
        messageSearch: {
          ...initialState.messageSearch,
        },
      });
    },

    setMessageSearchQuery: (query) => {
      set({
        messageSearch: {
          ...get().messageSearch,
          query,
          index: 0, // Reset index when query changes
        },
      });
    },

    setMessageSearchIndex: (index) => {
      set({
        messageSearch: {
          ...get().messageSearch,
          index,
        },
      });
    },

    setMessageSearchMatches: (matches) => {
      set({
        messageSearch: {
          ...get().messageSearch,
          matches,
        },
      });
    },

    // Delete worktree confirmation
    setDeleteWorktreeConfirm: (state) => {
      set({ deleteWorktreeConfirm: state });
    },

    // Split view
    setSplitView: (enabled, sessionId = null) => {
      set({
        splitView: enabled,
        splitSessionId: enabled ? sessionId : null,
      });
    },

    // Convenience methods
    openCommandPalette: () => get().openOverlay('command-palette'),
    openSettings: () => get().openOverlay('settings'),
    openAgents: () => get().openOverlay('agents'),
    openNewSession: () => get().openOverlay('new-session'),
    openExport: () => get().openOverlay('export'),
    openShip: () => get().openOverlay('ship'),

    // Reset
    reset: () => {
      set(initialState);
    },
  }))
);

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const selectIsOverlayOpen = (state: TerminalUIState) =>
  state.activeOverlay !== 'none';

export const selectIsPanelExpanded = (panel: NonNullable<ExpandedPanel>) =>
  (state: TerminalUIState) => state.expandedPanels.has(panel);

export const selectHasMobileSheet = (state: TerminalUIState) =>
  state.mobileSheet !== null;

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard shortcuts hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTerminalUIKeyboardShortcuts() {
  const { openCommandPalette, openAgents, closeOverlay, activeOverlay } = useTerminalUIStore();

  // This would be called from a useEffect in the Terminal component
  const handleKeyDown = (e: KeyboardEvent) => {
    // Escape closes any overlay
    if (e.key === 'Escape' && activeOverlay !== 'none') {
      e.preventDefault();
      closeOverlay();
      return;
    }

    // Cmd/Ctrl+K opens command palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
      return;
    }

    // Cmd/Ctrl+Shift+A opens agents panel
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      openAgents();
      return;
    }
  };

  return { handleKeyDown };
}
