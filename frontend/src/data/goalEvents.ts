/**
 * Goal events — picker source for the campaign goal field.
 *
 * Two top-level groups:
 *   • BUSINESS EVENTS — workspace-tracked events (mocked here; would
 *     come from the events service in production).
 *   • CAMPAIGN ENGAGEMENT EVENTS — system events fired by the
 *     campaign runtime when messages get delivered / opened /
 *     answered.
 *
 * Each event declares a `channel` (or null for any-channel rollups)
 * and a `phase` (delivery / engagement / conversion) that the goal
 * picker uses to filter the dropdown by Goal Type.
 */

export type GoalChannel =
  | 'any'
  | 'whatsapp'
  | 'sms'
  | 'rcs'
  | 'voice'
  | 'email'
  | null; // null = business event, not channel-scoped

export type GoalPhase = 'delivery' | 'engagement' | 'conversion';

export interface GoalEventDef {
  id: string;
  label: string;
  group: 'business' | 'engagement';
  phase: GoalPhase;
  /** Which channel does this event imply on the journey? */
  channel: GoalChannel;
  /** Optional property catalog — drives the "+ Add filter" field. */
  properties?: GoalEventProperty[];
}

export interface GoalEventProperty {
  id: string;
  label: string;
  /** Display kind for the value input; we keep operators simple in v1. */
  kind: 'number' | 'string';
}

/* ─── Business events (workspace-tracked) ─────────────────────────────── */

export const BUSINESS_EVENTS: GoalEventDef[] = [
  {
    id: 'transaction_completed',
    label: 'transaction_completed',
    group: 'business',
    phase: 'conversion',
    channel: null,
    properties: [
      { id: 'amount', label: 'amount', kind: 'number' },
      { id: 'product_category', label: 'product_category', kind: 'string' },
      { id: 'is_first_time', label: 'is_first_time', kind: 'string' },
    ],
  },
  {
    id: 'kyc_completed',
    label: 'kyc_completed',
    group: 'business',
    phase: 'conversion',
    channel: null,
    properties: [
      { id: 'tier', label: 'tier', kind: 'string' },
      { id: 'method', label: 'method', kind: 'string' },
    ],
  },
  {
    id: 'loan_disbursed',
    label: 'loan_disbursed',
    group: 'business',
    phase: 'conversion',
    channel: null,
    properties: [
      { id: 'amount', label: 'amount', kind: 'number' },
      { id: 'tenure_months', label: 'tenure_months', kind: 'number' },
    ],
  },
  {
    id: 'subscription_started',
    label: 'subscription_started',
    group: 'business',
    phase: 'conversion',
    channel: null,
    properties: [
      { id: 'plan', label: 'plan', kind: 'string' },
      { id: 'mrr', label: 'mrr', kind: 'number' },
    ],
  },
  {
    id: 'wallet_loaded',
    label: 'wallet_loaded',
    group: 'business',
    phase: 'conversion',
    channel: null,
    properties: [{ id: 'amount', label: 'amount', kind: 'number' }],
  },
  {
    id: 'callback_requested',
    label: 'callback_requested',
    group: 'business',
    phase: 'conversion',
    channel: null,
  },
];

/* ─── Campaign engagement / delivery events (system) ─────────────────── */

export const ENGAGEMENT_EVENTS: GoalEventDef[] = [
  // Cross-channel rollups
  { id: 'any_message_delivered', label: 'Any message delivered', group: 'engagement', phase: 'delivery', channel: 'any' },
  { id: 'any_message_clicked', label: 'Any message clicked', group: 'engagement', phase: 'engagement', channel: 'any' },
  { id: 'any_message_replied', label: 'Any message replied', group: 'engagement', phase: 'engagement', channel: 'any' },

  // WhatsApp
  { id: 'whatsapp_delivered', label: 'WhatsApp delivered', group: 'engagement', phase: 'delivery', channel: 'whatsapp' },
  { id: 'whatsapp_read', label: 'WhatsApp read', group: 'engagement', phase: 'engagement', channel: 'whatsapp' },
  { id: 'whatsapp_clicked', label: 'WhatsApp clicked', group: 'engagement', phase: 'engagement', channel: 'whatsapp' },
  { id: 'whatsapp_replied', label: 'WhatsApp replied', group: 'engagement', phase: 'engagement', channel: 'whatsapp' },

  // SMS
  { id: 'sms_delivered', label: 'SMS delivered', group: 'engagement', phase: 'delivery', channel: 'sms' },
  { id: 'sms_clicked', label: 'SMS clicked', group: 'engagement', phase: 'engagement', channel: 'sms' },

  // RCS
  { id: 'rcs_delivered', label: 'RCS delivered', group: 'engagement', phase: 'delivery', channel: 'rcs' },
  { id: 'rcs_read', label: 'RCS read', group: 'engagement', phase: 'engagement', channel: 'rcs' },
  { id: 'rcs_clicked', label: 'RCS clicked', group: 'engagement', phase: 'engagement', channel: 'rcs' },

  // Voice
  { id: 'voice_answered', label: 'Voice call answered', group: 'engagement', phase: 'engagement', channel: 'voice' },
  { id: 'voice_completed', label: 'Voice call completed', group: 'engagement', phase: 'engagement', channel: 'voice' },

  // Email
  { id: 'email_opened', label: 'Email opened', group: 'engagement', phase: 'engagement', channel: 'email' },
  { id: 'email_clicked', label: 'Email clicked', group: 'engagement', phase: 'engagement', channel: 'email' },
];

export const ALL_GOAL_EVENTS: GoalEventDef[] = [...BUSINESS_EVENTS, ...ENGAGEMENT_EVENTS];

/** Find a goal event by id (case-insensitive). */
export function findGoalEvent(id: string | undefined | null): GoalEventDef | null {
  if (!id) return null;
  const lower = id.toLowerCase();
  return ALL_GOAL_EVENTS.find((e) => e.id.toLowerCase() === lower) ?? null;
}

/**
 * Map a goal type to the events the picker should show. The Custom
 * type shows both groups (caller adds the "+ Define custom metric"
 * link separately).
 */
export function eventsForGoalType(
  type: 'conversion' | 'engagement' | 'delivery' | 'custom',
): { business: GoalEventDef[]; engagement: GoalEventDef[] } {
  switch (type) {
    case 'conversion':
      return { business: BUSINESS_EVENTS, engagement: [] };
    case 'engagement':
      return {
        business: [],
        engagement: ENGAGEMENT_EVENTS.filter((e) => e.phase === 'engagement'),
      };
    case 'delivery':
      return {
        business: [],
        engagement: ENGAGEMENT_EVENTS.filter((e) => e.phase === 'delivery'),
      };
    case 'custom':
      return { business: BUSINESS_EVENTS, engagement: ENGAGEMENT_EVENTS };
  }
}

/** Property-filter operators supported in v1. */
export const PROPERTY_FILTER_OPERATORS = [
  { id: 'equals', label: 'equals' },
  { id: 'not_equals', label: 'not equals' },
  { id: 'gt', label: '>' },
  { id: 'gte', label: '>=' },
  { id: 'lt', label: '<' },
  { id: 'lte', label: '<=' },
  { id: 'contains', label: 'contains' },
] as const;
