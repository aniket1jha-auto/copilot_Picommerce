import type { Node, Edge } from '@xyflow/react';
import type { ContentVariant, TestingConfig } from '@/components/campaign/ChannelContentEditor';

/** Legacy trigger kinds (graphs only). New journeys use `entry_trigger` only. */
export const LEGACY_TRIGGER_KINDS = ['campaign_start', 'event_trigger', 'schedule_trigger', 're_entry'] as const;

/** Exactly one entry node per journey (entry_trigger preferred). */
export const ENTRY_TRIGGER_KINDS = ['entry_trigger', ...LEGACY_TRIGGER_KINDS] as const;

export type EntryTriggerKind = (typeof ENTRY_TRIGGER_KINDS)[number];

export type JourneyNodeKind =
  | EntryTriggerKind
  | 'whatsapp_message'
  | 'sms'
  | 'email'
  | 'push'
  | 'rcs_message'
  | 'in_app'
  | 'voice_agent'
  | 'chat_agent'
  | 'condition'
  | 'ab_split'
  | 'wait'
  | 'exit'
  | 'goto'
  | 'api_webhook'
  | 'update_contact'
  | 'crm_sync'
  | 'note';

export interface JourneyNodeBase {
  kind: JourneyNodeKind;
  label: string;
  typeLabel: string;
  icon: string;
  configured: boolean;
  needsConfig?: boolean;
}

export interface JourneyMessagingEditorFields {
  variants: ContentVariant[];
  testing: TestingConfig;
}

export interface EntryTriggerNodeData extends JourneyNodeBase {
  kind: 'entry_trigger';
  /** Legacy schedule kind (kept for back-compat with older journeys). */
  when: 'campaign_start' | 'behavioral_event' | 'recurring';
  startDate: string;
  startTime: string;
  eventName: string;
  recurringFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  recurringDay: string;
  recurringTime: string;
  /**
   * Phase A of the unified-builder pivot: audience + canonical schedule
   * mode live on the entry node. The right-pane wizard step is being
   * retired in favour of clicking the Entry node on the canvas.
   */
  audienceId?: string;
  audienceName?: string;
  audienceSize?: number;
  scheduleMode?: 'one-time' | 'recurring' | 'event' | 'smart_ai';
}

export interface VoiceAgentNodeData extends JourneyNodeBase {
  kind: 'voice_agent';
  agentId: string | null;
  callScriptRef: string;
  callingWindowStart: string;
  callingWindowEnd: string;
  maxAttempts: number;
  retryInterval: string;
  timezone: string;
  dispositionLabels: Record<string, string>;
  recordCalls: boolean;
  storeTranscript: boolean;
}

export interface ChatAgentNodeData extends JourneyNodeBase {
  kind: 'chat_agent';
  agentId: string | null;
  deployChannel: 'whatsapp_chat' | 'in_app_chat';
  triggerMode: 'immediate' | 'after_delivery';
  afterDeliveryMinutes: number;
  sessionTimeoutHours: number;
  outputLabels: Record<string, string>;
}

export interface WhatsAppMessageNodeData extends JourneyNodeBase, JourneyMessagingEditorFields {
  kind: 'whatsapp_message';
  templateId: string | null;
  variableMap: Record<string, string>;
  sendTiming: 'immediate' | 'scheduled';
  scheduledTime: string;
  scheduledTz: string;
}

export interface SmsNodeData extends JourneyNodeBase, JourneyMessagingEditorFields {
  kind: 'sms';
  mode: 'template' | 'custom';
  templateId: string | null;
  customBody: string;
  variableMap: Record<string, string>;
  dltTemplateId: string;
}

export interface EmailNodeData extends JourneyNodeBase, JourneyMessagingEditorFields {
  kind: 'email';
}

export interface PushNodeData extends JourneyNodeBase, JourneyMessagingEditorFields {
  kind: 'push';
}

export interface RcsMessageNodeData extends JourneyNodeBase, JourneyMessagingEditorFields {
  kind: 'rcs_message';
}

export interface InAppMessageNodeData extends JourneyNodeBase, JourneyMessagingEditorFields {
  kind: 'in_app';
}

export interface WaitNodeData extends JourneyNodeBase {
  kind: 'wait';
  waitType: 'duration' | 'datetime' | 'event' | 'optimal';
  durationValue: number;
  durationUnit: 'minutes' | 'hours' | 'days' | 'weeks';
  untilDate: string;
  untilTime: string;
  eventKey: string;
  eventTimeoutDays: number;
  optimalMaxValue: number;
  optimalMaxUnit: string;
}

export interface ConditionNodeData extends JourneyNodeBase {
  kind: 'condition';
  conditions: { attribute: string; operator: string; value: string }[];
  logic: 'and' | 'or';
  pathLabels: string[];
}

export interface AbSplitNodeData extends JourneyNodeBase {
  kind: 'ab_split';
  variantCount: 2 | 3 | 'custom';
  customCount: number;
  variants: { label: string; percent: number }[];
  holdoutEnabled: boolean;
  holdoutPercent: number;
  winnerMode: 'manual' | 'auto';
  autoConfidence: number;
  winnerMetric: 'conversion' | 'click' | 'open';
}

export interface ApiWebhookNodeData extends JourneyNodeBase {
  kind: 'api_webhook';
  method: 'GET' | 'POST' | 'PUT';
  url: string;
  headers: { key: string; value: string }[];
  bodyJson: string;
  responseMap: { path: string; attribute: string }[];
  onFailure: 'continue' | 'stop' | 'error_path';
}

export interface UpdateContactNodeData extends JourneyNodeBase {
  kind: 'update_contact';
  updates: { attribute: string; value: string; mode: 'set' | 'increment' | 'append' }[];
}

export type JourneyNodeData =
  | JourneyNodeBase
  | EntryTriggerNodeData
  | VoiceAgentNodeData
  | ChatAgentNodeData
  | WhatsAppMessageNodeData
  | SmsNodeData
  | EmailNodeData
  | PushNodeData
  | RcsMessageNodeData
  | InAppMessageNodeData
  | WaitNodeData
  | ConditionNodeData
  | AbSplitNodeData
  | ApiWebhookNodeData
  | UpdateContactNodeData;

/** React Flow requires node data to extend Record<string, unknown> */
export type JourneyFlowNode = Node<Record<string, unknown>>;
export type JourneyFlowEdge = Edge;

export interface CampaignJourneyState {
  nodes: JourneyFlowNode[];
  edges: JourneyFlowEdge[];
}

export function newNodeId(): string {
  return `jn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** @deprecated Use ENTRY_TRIGGER_KINDS — kept for existing imports */
export const TRIGGER_KINDS = ENTRY_TRIGGER_KINDS;
export type TriggerKind = EntryTriggerKind;
