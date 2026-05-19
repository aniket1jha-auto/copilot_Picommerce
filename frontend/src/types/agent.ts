import type { AgentKBAttachment } from './knowledgeBase';
export type { AgentKBAttachment };

export type AgentType = 'voice' | 'chat';
export type AgentStatus = 'draft' | 'testing' | 'deployed' | 'paused';
export type VoiceType = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse' | 'cedar' | 'marin';
export type ModelType = 'gpt-realtime' | 'gpt-realtime-mini' | 'gpt-realtime-mini-2025-12-15' | 'gpt-realtime-1.5-2026-02-23';
export type AudioFormat = 'pcm16' | 'g711_ulaw' | 'g711_alaw';
export type TurnDetectionType = 'server_vad' | 'none';
export type NodeType = 'start' | 'message' | 'question' | 'condition' | 'action' | 'transfer' | 'end';
export type CallStatus = 'completed' | 'failed' | 'abandoned' | 'transferred';
export type SentimentType = 'positive' | 'neutral' | 'negative';

export interface VoiceOption {
  id: VoiceType;
  name: string;
  description: string;
  characteristics: string[];
}

export interface ModelOption {
  id: ModelType;
  name: string;
  description: string;
  features: string[];
  costMultiplier: number;
}

export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    content?: string;
    condition?: string;
    actionType?: string;
    transferTo?: string;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface CustomFunction {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  parameters: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  authentication?: {
    type: 'none' | 'bearer' | 'api_key';
    value?: string;
  };
}

export type ChatChannelId = 'whatsapp' | 'sms' | 'rcs' | 'webhook';

/** Ordered plain-language steps for the Instructions wizard step */
export interface InstructionStep {
  id: string;
  instruction: string;
  transitionCondition: string;
  attachedToolIds: string[];
  /** Quick-reply button labels shown to the customer at this step (chat agents) */
  quickReplies?: string[];
}

export interface AgentConfiguration {
  // Step 1: Basic Info
  name: string;
  description: string;
  type: AgentType;
  /**
   * @deprecated Phase 1 of the agent-builder simplification removed the
   * Use Case picker from Basic Info. New agents created via the unified
   * builder won't set this. Kept optional for legacy mock agents and
   * orphaned chat-builder code paths that still reference it.
   */
  useCase?: string;
  templateId?: string;

  // Step 2: Model & Voice
  model: ModelType;
  voice: VoiceType;

  // Step 3: System Prompt
  systemPrompt: string;
  personality: {
    traits: string[];
    tone: string;
    role: string;
  };
  objectives: string[];
  guidelines: {
    dos: string[];
    donts: string[];
  };
  exampleConversations?: {
    user: string;
    agent: string;
  }[];

  // Step 4: Instructions (conversation steps + global tools; legacy flow retained)
  instructionSteps: InstructionStep[];
  globalToolIds: string[];

  flow: {
    nodes: FlowNode[];
    edges: FlowEdge[];
  };

  builtInTools: string[];
  customFunctions: CustomFunction[];

  /**
   * Connected knowledge sources (Phase 2).
   * Inline within the Instructions step — sibling to global tools.
   * See docs/KB_SPEC.md §6, types/knowledgeBase.ts
   */
  knowledgeBases?: AgentKBAttachment[];

  // Step 5: Advanced Settings (renumbered from former step 6)
  audioConfig: {
    inputFormat: AudioFormat;
    outputFormat: AudioFormat;
    turnDetection: TurnDetectionType;
    allowInterruptions: boolean;
  };
  llmConfig: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  conversationSettings: {
    silenceTimeout: number; // seconds
    maxDuration: number; // seconds
    endCallPhrases: string[];
    language: string;
    speechRate: number;
  };
  compliance: {
    contentFiltering: boolean;
    piiDetection: boolean;
    recordingConsent: boolean;
    tcpaCompliance: boolean;
  };

  // Step 6: Review & Deploy (renumbered from former step 7)
  webhookUrl?: string;
  environment: 'test' | 'production';

  /** Chat agent wizard — channel & languages */
  chatChannel?: ChatChannelId;
  chatLanguages?: string[];
  /** Optional display name for customer-facing intro */
  chatDisplayName?: string;
  /** Hard constraints — chat wizard */
  mustAlwaysRules?: string[];
  mustNeverRules?: string[];

  /** Step 2 (chat): WhatsApp Business API */
  chatWhatsAppAccountId?: string;
  chatWhatsAppPhoneId?: string;
  /** Single fallback when auto-detect not used */
  chatFallbackLanguage?: string;

  /** Step 5 (chat): session, fallback, opt-out, escalation */
  chatAdvancedSettings?: ChatAgentAdvancedSettings;
}

export type ChatSessionExpiryAction = 'template' | 'silent' | 'human';
export type ChatOptOutBehavior = 'confirm' | 'human';

export interface ChatAgentAdvancedSettings {
  sessionExpiryAction: ChatSessionExpiryAction;
  fallbackMessage: string;
  maxFallbackAttempts: number;
  stopKeywords: string[];
  optOutBehavior: ChatOptOutBehavior;
  optOutConfirmationMessage: string;
  escalationKeywords: string[];
}

export interface Agent {
  id: string;
  config: AgentConfiguration;
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
  deployedAt?: string;
  metrics: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    avgDuration: number;
    avgLatency: number;
    completionRate: number;
  };
  version: number;
}

export interface CallTranscript {
  id: string;
  agentId: string;
  timestamp: string;
  duration: number;
  status: CallStatus;
  /** Session-level intent classification (not per-message). */
  intent?: string;
  /** Session-level sentiment classification (not per-message). */
  sentiment?: SentimentType;
  messages: Array<
    | {
        role: 'user' | 'agent';
        content: string;
        timestamp: string;
      }
    | {
        role: 'tool';
        timestamp: string;
        toolName: string;
        status: 'success' | 'error';
        input?: string;
        output?: string;
      }
  >;
  metadata: {
    phoneNumber?: string;
    campaignId?: string;
    cost: number;
    latency: number;
  };
  tags: string[];
  notes?: string;
}

export interface PerformanceMetric {
  date: string;
  calls: number;
  successful: number;
  failed: number;
  avgDuration: number;
  avgLatency: number;
  cost: number;
}

export interface IntentAnalysis {
  intent: string;
  count: number;
  successRate: number;
  avgDuration: number;
}

export interface PromptSuggestion {
  id: string;
  type: 'clarity' | 'edge_case' | 'tone' | 'examples' | 'structure';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  currentText?: string;
  suggestedText?: string;
  impact: string;
}

export interface ABTest {
  id: string;
  name: string;
  agentId: string;
  variantA: {
    name: string;
    config: Partial<AgentConfiguration>;
    calls: number;
    successRate: number;
    avgDuration: number;
  };
  variantB: {
    name: string;
    config: Partial<AgentConfiguration>;
    calls: number;
    successRate: number;
    avgDuration: number;
  };
  status: 'running' | 'completed' | 'paused';
  startedAt: string;
  completedAt?: string;
  winner?: 'A' | 'B' | 'inconclusive';
}

export interface FailurePattern {
  type: string;
  count: number;
  percentage: number;
  examples: string[];
  suggestedFix: string;
}
