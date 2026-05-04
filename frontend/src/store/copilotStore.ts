import { create } from 'zustand';
import {
  startBuilding,
  type BuildingState,
} from '@/components/campaign/copilot/copilotFlow';

/**
 * Campaign Copilot session state.
 *
 * Lives outside the React tree so the chat survives navigation between
 * /campaigns/copilot and /campaigns/copilot/review (and back). Cleared
 * after a successful launch so the next visit starts fresh.
 *
 * In-memory only — refresh resets it. That matches the rest of the mocks.
 */

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  applied?: string[];
  suggestions?: string[];
  timestamp: number;
}

interface CopilotState {
  building: BuildingState;
  messages: CopilotMessage[];
  /** True once the user has launched the campaign — chat input is locked. */
  handedOff: boolean;
  setBuilding: (next: BuildingState) => void;
  appendMessage: (m: CopilotMessage) => void;
  setMessages: (m: CopilotMessage[]) => void;
  setHandedOff: (v: boolean) => void;
  /** Wipe the session; called after a successful launch. */
  reset: () => void;
}

export const useCopilotStore = create<CopilotState>((set) => ({
  building: startBuilding(),
  messages: [],
  handedOff: false,
  setBuilding: (next) => set({ building: next }),
  appendMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  setMessages: (messages) => set({ messages }),
  setHandedOff: (handedOff) => set({ handedOff }),
  reset: () =>
    set({
      building: startBuilding(),
      messages: [],
      handedOff: false,
    }),
}));
