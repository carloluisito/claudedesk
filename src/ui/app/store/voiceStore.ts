import { create } from 'zustand';
import type { VoiceStatus, ParsedIntent, PendingAction } from '../types';

interface VoiceState {
  // Recording state
  status: VoiceStatus;
  transcript: string;
  error: string | null;

  // Parsed intent
  intent: ParsedIntent | null;

  // For confirmation flow
  pendingAction: PendingAction | null;

  // Actions
  setStatus: (status: VoiceStatus) => void;
  setTranscript: (text: string) => void;
  setIntent: (intent: ParsedIntent | null) => void;
  setPendingAction: (action: PendingAction | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as VoiceStatus,
  transcript: '',
  error: null,
  intent: null,
  pendingAction: null,
};

export const useVoiceStore = create<VoiceState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  setTranscript: (transcript) => set({ transcript }),

  setIntent: (intent) => set({ intent }),

  setPendingAction: (pendingAction) => set({ pendingAction }),

  setError: (error) => set({ error, status: error ? 'error' : 'idle' }),

  reset: () => set(initialState),
}));
