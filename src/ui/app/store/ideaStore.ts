import { create } from 'zustand';
import { api } from '../lib/api';
import type { Idea, PromoteOptions } from '../../../types';

const ACTIVE_IDEA_KEY = 'claudedesk-active-idea';

export interface IdeaChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

const getStoredActiveIdeaId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_IDEA_KEY);
  } catch {
    return null;
  }
};

const storeActiveIdeaId = (ideaId: string | null): void => {
  try {
    if (ideaId) {
      localStorage.setItem(ACTIVE_IDEA_KEY, ideaId);
    } else {
      localStorage.removeItem(ACTIVE_IDEA_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
};

interface IdeaStore {
  ideas: Idea[];
  activeIdeaId: string | null;
  openIdeaIds: Set<string>; // Ideas shown in the dock (persists across focus changes)
  isLoadingIdeas: boolean;
  showIdeaPanel: boolean;
  ideaPanelSearch: string;

  // Actions
  loadIdeas: (options?: { forceRefresh?: boolean }) => Promise<void>;
  createIdea: () => Promise<Idea>;
  saveIdea: (id: string) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;
  switchIdea: (id: string) => void;
  clearActiveIdea: () => void;
  closeIdea: (id: string) => void; // Remove from dock (and clear active if matches)
  updateIdeaTitle: (id: string, title: string) => Promise<void>;
  sendMessage: (content: string) => void;
  cancelOperation: () => void;
  setMode: (mode: 'plan' | 'direct') => void;
  promoteIdea: (id: string, opts: PromoteOptions) => Promise<{ sessionId: string; repoId: string; handoffSummary: string }>;
  attachToRepo: (id: string, repoId: string) => Promise<void>;
  detachFromRepo: (id: string, repoId: string) => Promise<void>;
  fetchContextState: (ideaId: string) => Promise<void>;
  toggleIdeaPanel: () => void;
  setIdeaPanelSearch: (search: string) => void;

  // Internal
  updateIdea: (ideaId: string, updates: Partial<Idea>) => void;
  appendChunk: (ideaId: string, messageId: string, chunk: string) => void;
}

export const useIdeaStore = create<IdeaStore>((set, get) => ({
  ideas: [],
  activeIdeaId: null,
  openIdeaIds: new Set<string>(),
  isLoadingIdeas: false,
  showIdeaPanel: false,
  ideaPanelSearch: '',

  loadIdeas: async (options?: { forceRefresh?: boolean }) => {
    if (get().isLoadingIdeas && !options?.forceRefresh) return;

    set({ isLoadingIdeas: true });
    try {
      const ideas = await api<Idea[]>('GET', '/ideas');

      // Restore active idea from localStorage
      const currentActiveId = get().activeIdeaId;
      let newActiveId = currentActiveId;

      if (!currentActiveId) {
        const storedId = getStoredActiveIdeaId();
        if (storedId && ideas.some((i) => i.id === storedId)) {
          newActiveId = storedId;
        }
      }

      set({
        isLoadingIdeas: false,
        ideas,
        activeIdeaId: newActiveId,
      });
    } catch (error) {
      console.error('Failed to load ideas:', error);
      set({ isLoadingIdeas: false });
    }
  },

  createIdea: async () => {
    const idea = await api<Idea>('POST', '/ideas');

    set((state) => ({
      ideas: [idea, ...state.ideas],
      activeIdeaId: idea.id,
      openIdeaIds: new Set([...state.openIdeaIds, idea.id]),
    }));
    storeActiveIdeaId(idea.id);

    // Subscribe via the terminal store's WebSocket
    const ws = getWebSocket();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe-idea', ideaId: idea.id }));
    }

    return idea;
  },

  saveIdea: async (id: string) => {
    const result = await api<Idea>('POST', `/ideas/${id}/save`);
    get().updateIdea(id, {
      status: result.status,
      savedAt: result.savedAt,
    });
  },

  deleteIdea: async (id: string) => {
    const ws = getWebSocket();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'unsubscribe-idea', ideaId: id }));
    }

    await api('DELETE', `/ideas/${id}`);

    set((state) => {
      const newIdeas = state.ideas.filter((i) => i.id !== id);
      const newActiveId = id === state.activeIdeaId
        ? null
        : state.activeIdeaId;
      if (id === state.activeIdeaId) {
        storeActiveIdeaId(null);
      }
      const newOpenIds = new Set(state.openIdeaIds);
      newOpenIds.delete(id);
      return { ideas: newIdeas, activeIdeaId: newActiveId, openIdeaIds: newOpenIds };
    });
  },

  switchIdea: (id: string) => {
    const ws = getWebSocket();
    const { activeIdeaId } = get();

    // Unsubscribe from old
    if (ws && ws.readyState === WebSocket.OPEN && activeIdeaId) {
      ws.send(JSON.stringify({ type: 'unsubscribe-idea', ideaId: activeIdeaId }));
    }

    set((state) => ({
      activeIdeaId: id,
      openIdeaIds: new Set([...state.openIdeaIds, id]),
    }));
    storeActiveIdeaId(id);

    // Subscribe to new
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe-idea', ideaId: id }));
    }
  },

  clearActiveIdea: () => {
    const ws = getWebSocket();
    const { activeIdeaId } = get();
    if (ws && ws.readyState === WebSocket.OPEN && activeIdeaId) {
      ws.send(JSON.stringify({ type: 'unsubscribe-idea', ideaId: activeIdeaId }));
    }
    set({ activeIdeaId: null });
    storeActiveIdeaId(null);
  },

  closeIdea: (id: string) => {
    const ws = getWebSocket();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'unsubscribe-idea', ideaId: id }));
    }

    set((state) => {
      const newOpenIds = new Set(state.openIdeaIds);
      newOpenIds.delete(id);
      const newActiveId = id === state.activeIdeaId ? null : state.activeIdeaId;
      if (id === state.activeIdeaId) {
        storeActiveIdeaId(null);
      }
      // Remove ephemeral ideas from the list when closed
      const idea = state.ideas.find(i => i.id === id);
      const newIdeas = idea?.status === 'ephemeral'
        ? state.ideas.filter(i => i.id !== id)
        : state.ideas;
      return { activeIdeaId: newActiveId, openIdeaIds: newOpenIds, ideas: newIdeas };
    });
  },

  updateIdeaTitle: async (id: string, title: string) => {
    await api<Idea>('PUT', `/ideas/${id}`, { title });
    get().updateIdea(id, { title });
  },

  sendMessage: (content: string) => {
    const ws = getWebSocket();
    const { activeIdeaId } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN || !activeIdeaId) return;

    ws.send(JSON.stringify({
      type: 'idea-message',
      ideaId: activeIdeaId,
      content,
    }));
  },

  cancelOperation: () => {
    const ws = getWebSocket();
    const { activeIdeaId } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN || !activeIdeaId) return;

    ws.send(JSON.stringify({
      type: 'idea-cancel',
      ideaId: activeIdeaId,
    }));
  },

  setMode: (mode: 'plan' | 'direct') => {
    const ws = getWebSocket();
    const { activeIdeaId } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN || !activeIdeaId) return;

    ws.send(JSON.stringify({
      type: 'idea-set-mode',
      ideaId: activeIdeaId,
      mode,
    }));

    // Optimistic update
    get().updateIdea(activeIdeaId, { mode });
  },

  promoteIdea: async (id: string, opts: PromoteOptions) => {
    const result = await api<{ sessionId: string; repoId: string; handoffSummary: string }>('POST', `/ideas/${id}/promote`, opts);
    get().updateIdea(id, {
      status: 'promoted',
      promotedToSessionId: result.sessionId,
      promotedToRepoId: result.repoId,
    });
    return result;
  },

  attachToRepo: async (id: string, repoId: string) => {
    const result = await api<Idea>('POST', `/ideas/${id}/attach`, { repoId });
    get().updateIdea(id, { attachedRepoIds: result.attachedRepoIds });
  },

  detachFromRepo: async (id: string, repoId: string) => {
    const result = await api<Idea>('POST', `/ideas/${id}/detach`, { repoId });
    get().updateIdea(id, { attachedRepoIds: result.attachedRepoIds });
  },

  fetchContextState: async (ideaId: string) => {
    try {
      const result = await api<Idea['contextState']>('GET', `/ideas/${ideaId}/context`);
      if (result) {
        get().updateIdea(ideaId, { contextState: result });
      }
    } catch (error) {
      console.error('[IdeaStore] Failed to fetch context state:', error);
    }
  },

  toggleIdeaPanel: () => {
    set((state) => ({ showIdeaPanel: !state.showIdeaPanel }));
  },

  setIdeaPanelSearch: (search: string) => {
    set({ ideaPanelSearch: search });
  },

  // Internal helpers
  updateIdea: (ideaId: string, updates: Partial<Idea>) => {
    set((state) => ({
      ideas: state.ideas.map((i) =>
        i.id === ideaId ? { ...i, ...updates } : i
      ),
    }));
  },

  appendChunk: (ideaId: string, messageId: string, chunk: string) => {
    set((state) => ({
      ideas: state.ideas.map((i) =>
        i.id === ideaId
          ? {
              ...i,
              messages: i.messages.map((m) =>
                m.id === messageId
                  ? { ...m, content: m.content + chunk }
                  : m
              ),
            }
          : i
      ),
    }));
  },
}));

// Helper to get the shared WebSocket from terminalStore
// The idea store shares the WS connection with the terminal store
// Cached reference to terminal store — set lazily to avoid circular import
let _terminalStoreRef: { getState: () => { ws: WebSocket | null } } | null = null;

function getWebSocket(): WebSocket | null {
  if (!_terminalStoreRef) {
    return null;
  }
  return _terminalStoreRef.getState().ws;
}

// Called once from MissionControl to provide the terminal store reference
export function setTerminalStoreRef(store: { getState: () => { ws: WebSocket | null } }): void {
  _terminalStoreRef = store;
}

// Register idea-specific WS message handlers on the terminal store's WS
// This is called from the component that mounts the idea system
export function registerIdeaWSHandlers(ws: WebSocket): void {
  // Helper to subscribe all open ideas
  const subscribeOpenIdeas = () => {
    const { openIdeaIds, activeIdeaId } = useIdeaStore.getState();
    const idsToSubscribe = new Set(openIdeaIds);
    if (activeIdeaId) idsToSubscribe.add(activeIdeaId);
    for (const ideaId of idsToSubscribe) {
      ws.send(JSON.stringify({ type: 'subscribe-idea', ideaId }));
    }
  };

  // Re-subscribe all open ideas on (re)connect
  const originalOnOpen = ws.onopen;
  ws.onopen = (event) => {
    // Call original onopen first (sets isConnected, re-subscribes terminal sessions)
    if (originalOnOpen) {
      (originalOnOpen as (ev: Event) => void).call(ws, event);
    }
    subscribeOpenIdeas();
  };

  // If WS is already open (race: connected before React rendered), subscribe now
  if (ws.readyState === WebSocket.OPEN) {
    subscribeOpenIdeas();
  }

  // The idea messages come through the same WS connection
  // We add a message listener that handles idea-specific events
  const originalOnMessage = ws.onmessage;

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);

      // Handle idea-specific messages
      if (message.type === 'idea-state' && message.ideaId) {
        const store = useIdeaStore.getState();
        const existingIdea = store.ideas.find(i => i.id === message.ideaId);
        if (existingIdea) {
          store.updateIdea(message.ideaId, message.idea);
        } else {
          // Add new idea to store
          useIdeaStore.setState(state => ({
            ideas: [message.idea, ...state.ideas],
          }));
        }
        return;
      }

      // Check if this message is for an idea (ideaId-prefixed sessionId)
      const { sessionId } = message;
      if (sessionId && sessionId.startsWith('idea-')) {
        const store = useIdeaStore.getState();

        switch (message.type) {
          case 'message':
            if (message.message) {
              useIdeaStore.setState(state => ({
                ideas: state.ideas.map(i =>
                  i.id === sessionId
                    ? {
                        ...i,
                        messages: i.messages.some(m => m.id === message.message.id)
                          ? i.messages
                          : [...i.messages, message.message],
                      }
                    : i
                ),
              }));
            }
            break;

          case 'chunk':
            if (message.messageId && message.content) {
              store.appendChunk(sessionId, message.messageId, message.content);
            }
            break;

          case 'status':
            if (message.status) {
              store.updateIdea(sessionId, { chatStatus: message.status });
            }
            break;

          case 'message-complete':
            if (message.messageId) {
              useIdeaStore.setState(state => ({
                ideas: state.ideas.map(i =>
                  i.id === sessionId
                    ? {
                        ...i,
                        messages: i.messages.map(m =>
                          m.id === message.messageId
                            ? { ...m, isStreaming: false }
                            : m
                        ),
                      }
                    : i
                ),
              }));
            }
            break;

          case 'mode-change':
            if (message.mode) {
              store.updateIdea(sessionId, { mode: message.mode });
            }
            break;

          case 'queue-update':
            if (message.queue) {
              store.updateIdea(sessionId, { messageQueue: message.queue });
            }
            break;

          case 'context_state_update':
            if (message.contextState) {
              store.updateIdea(sessionId, { contextState: message.contextState });
            }
            break;

          case 'context_split_suggested':
            store.updateIdea(sessionId, { splitSuggested: true });
            break;

          case 'error':
            store.updateIdea(sessionId, { chatStatus: 'error' });
            break;
        }
        return; // Don't pass to terminal store
      }
    } catch {
      // JSON parse error, pass through
    }

    // Pass non-idea messages to the original handler
    if (originalOnMessage) {
      originalOnMessage.call(ws, event);
    }
  };
}
