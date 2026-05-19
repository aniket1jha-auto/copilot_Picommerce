import { create } from 'zustand';
import type { ToolInstance } from '@/types/tool';

/**
 * User-configured tools.
 *
 * The catalog (src/data/toolConstants.ts) lists tool *definitions* —
 * what a user can pick from. This store tracks tool *instances*: a
 * user has actually added them and given each one a name + config.
 * The Tools page now renders the user's instances as cards, not the
 * raw catalog.
 */

let counter = 0;
const nextId = () => `tool-${++counter}-${Date.now().toString(36)}`;

const now = () => new Date().toISOString();

/** Seed a small set so the page doesn't always land in empty state. */
const seeded: ToolInstance[] = [
  {
    id: 'tool-seed-1',
    toolType: 'query',
    name: 'KB Query — Recovery Playbook',
    description: 'Looks up DPD bucket scripts during loan-recovery calls.',
    config: { knowledgeBaseId: 'kb-004' },
    knowledgeBases: [],
    messages: [],
    createdAt: '2026-03-14T09:00:00Z',
    updatedAt: '2026-04-22T08:30:00Z',
  },
  {
    id: 'tool-seed-2',
    toolType: 'end_call',
    name: 'Polite Goodbye',
    description: 'Default end-call with a friendly closer.',
    config: { spokenMessage: 'Thanks for your time today, have a great day!' },
    knowledgeBases: [],
    messages: [],
    createdAt: '2026-02-28T11:30:00Z',
    updatedAt: '2026-04-05T14:15:00Z',
  },
  {
    id: 'tool-seed-3',
    toolType: 'transfer_call',
    name: 'Escalate to Floor Supervisor',
    description: 'Hands the customer to the on-shift supervisor.',
    config: { transferType: 'human', destination: '+91 80000 00001' },
    knowledgeBases: [],
    messages: [],
    createdAt: '2026-03-02T07:45:00Z',
    updatedAt: '2026-04-12T16:20:00Z',
  },
];

interface ToolsState {
  tools: ToolInstance[];

  /** Create a new configured tool instance. */
  createTool: (
    input: Pick<ToolInstance, 'toolType' | 'name' | 'description'> &
      Partial<Pick<ToolInstance, 'config'>>,
  ) => ToolInstance;
  /** Patch an existing tool. */
  updateTool: (id: string, patch: Partial<ToolInstance>) => void;
  /** Duplicate a tool — appends " (copy)" to the name and refreshes timestamps. */
  duplicateTool: (id: string) => ToolInstance | null;
  /** Permanently remove a tool. */
  deleteTool: (id: string) => void;
  getTool: (id: string) => ToolInstance | undefined;
}

export const useToolsStore = create<ToolsState>((set, get) => ({
  tools: seeded,

  createTool: (input) => {
    const t: ToolInstance = {
      id: nextId(),
      toolType: input.toolType,
      name: input.name,
      description: input.description,
      config: input.config ?? {},
      knowledgeBases: [],
      messages: [],
      createdAt: now(),
      updatedAt: now(),
    };
    set((s) => ({ tools: [t, ...s.tools] }));
    return t;
  },

  updateTool: (id, patch) =>
    set((s) => ({
      tools: s.tools.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: now() } : t,
      ),
    })),

  duplicateTool: (id) => {
    const src = get().tools.find((t) => t.id === id);
    if (!src) return null;
    const copy: ToolInstance = {
      ...src,
      id: nextId(),
      name: `${src.name} (copy)`,
      createdAt: now(),
      updatedAt: now(),
    };
    set((s) => ({ tools: [copy, ...s.tools] }));
    return copy;
  },

  deleteTool: (id) =>
    set((s) => ({ tools: s.tools.filter((t) => t.id !== id) })),

  getTool: (id) => get().tools.find((t) => t.id === id),
}));
