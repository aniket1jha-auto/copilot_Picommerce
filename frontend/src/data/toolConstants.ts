import type { ToolCategory, ToolDefinition } from '@/types/tool';

/**
 * Tool catalog — five categories, ten tools.
 *
 * Source of truth for both the agent builder's per-step tool picker
 * and the new Tools page's "Add Tool" drawer. When a real backend
 * lands, the catalog stays code-side and the user's configured
 * instances live in the API.
 *
 * Phase: post-Tools-refactor. Voicemail, API Request, Webhooks,
 * Handoff, and Slack were removed:
 *   - Voicemail — dropped from product
 *   - API Request + Webhooks — merged into Custom Function
 *   - Handoff — folded into Transfer Call (one of the transfer types)
 *   - Slack — dropped from product
 */
export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'call_control',
    label: 'Call Control',
    items: [
      {
        id: 'end_call',
        name: 'End Call',
        description: 'End the conversation gracefully',
        icon: 'PhoneOff',
        color: '#EF4444',
        category: 'call_control',
      },
      {
        id: 'transfer_call',
        name: 'Transfer Call',
        description: 'Transfer to a human, another agent, or external number',
        icon: 'PhoneForwarded',
        color: '#10B981',
        category: 'call_control',
      },
      {
        id: 'capture_input',
        name: 'Capture Input',
        description: 'Capture structured input like OTP or account number',
        icon: 'Keyboard',
        color: '#F59E0B',
        category: 'call_control',
      },
    ],
  },
  {
    id: 'messaging',
    label: 'Messaging',
    items: [
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send an SMS or WhatsApp during or after the call',
        icon: 'MessageSquare',
        color: '#3B82F6',
        category: 'messaging',
      },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    items: [
      {
        id: 'query',
        name: 'Knowledge Base Query',
        description: 'Search a knowledge base to answer questions',
        icon: 'Search',
        color: '#06B6D4',
        category: 'data',
      },
      {
        id: 'crm_lookup',
        name: 'CRM Lookup',
        description: 'Read customer data from your CRM',
        icon: 'Building2',
        color: '#0EA5E9',
        category: 'data',
      },
      {
        id: 'crm_update',
        name: 'CRM Update',
        description: 'Write call outcomes back to your CRM',
        icon: 'Database',
        color: '#0284C7',
        category: 'data',
      },
    ],
  },
  {
    id: 'productivity',
    label: 'Productivity',
    items: [
      {
        id: 'schedule_appointment',
        name: 'Schedule Appointment',
        description: 'Book a slot on a calendar',
        icon: 'Calendar',
        color: '#4285F4',
        category: 'productivity',
      },
      {
        id: 'google_sheets',
        name: 'Google Sheets',
        description: 'Read or write rows to a Google Sheet',
        icon: 'Sheet',
        color: '#0F9D58',
        category: 'productivity',
      },
    ],
  },
  {
    id: 'custom',
    label: 'Custom',
    items: [
      {
        id: 'custom_function',
        name: 'Custom Function',
        description: 'Build your own tool with any API endpoint',
        icon: 'Wrench',
        color: '#7C3AED',
        category: 'custom',
      },
    ],
  },
];

export const ALL_TOOLS: ToolDefinition[] = TOOL_CATEGORIES.flatMap((c) => c.items);

/** Look up a tool definition by id; null if it isn't in the catalog. */
export function findToolDef(id: string): ToolDefinition | null {
  return ALL_TOOLS.find((t) => t.id === id) ?? null;
}
