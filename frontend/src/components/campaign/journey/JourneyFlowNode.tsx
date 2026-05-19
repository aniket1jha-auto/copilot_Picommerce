import { memo, useState } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import {
  Target,
  DoorOpen,
  Phone,
  MessageCircle,
  MessageSquare,
  Mail,
  Smartphone,
  Bell,
  Clock,
  GitBranch,
  Split,
  Webhook,
  Database,
  StickyNote,
  CornerDownRight,
  Bot,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import type {
  JourneyFlowNode as JourneyRFNode,
  JourneyNodeData,
  ConditionNodeData,
  WaitNodeData,
  AbSplitNodeData,
  VoiceAgentNodeData,
  ChatAgentNodeData,
  EntryTriggerNodeData,
} from './journeyTypes';
import { ENTRY_TRIGGER_KINDS } from './journeyTypes';
import { VOICE_OUTPUT_HANDLES, CHAT_OUTPUT_HANDLES } from './journeyConstants';

/* ─── Tier classification ─────────────────────────────────────────── */

const ENTRY_KIND_SET = new Set<string>([...ENTRY_TRIGGER_KINDS]);
const MESSAGE_KINDS = new Set([
  'sms',
  'whatsapp_message',
  'email',
  'rcs_message',
  'push',
  'in_app',
]);
const AGENT_KINDS = new Set(['voice_agent', 'chat_agent']);

function isEntryKind(kind: string) {
  return ENTRY_KIND_SET.has(kind);
}

/* ─── Shared bits ─────────────────────────────────────────────────── */

const PORT_CLS =
  '!h-2 !w-2 !min-h-0 !min-w-0 !border-2 !border-white !bg-brand-500 !rounded-full';

function StatusDot({ configured }: { configured: boolean }) {
  return (
    <span
      className={[
        'h-2 w-2 shrink-0 rounded-full',
        configured ? 'bg-success' : 'bg-warning',
      ].join(' ')}
      title={configured ? 'Configured' : 'Needs configuration'}
      aria-label={configured ? 'Configured' : 'Needs configuration'}
    />
  );
}

function shellSelectionRing(selected: boolean) {
  // Selected nodes get a brand-500 ring + lift; unselected nodes keep their tier border.
  return selected
    ? '-translate-y-px ring-2 ring-brand-500 ring-offset-1 ring-offset-canvas shadow-[var(--shadow-md)]'
    : '';
}

/* ─── Channel meta (header chip on message nodes) ──────────────────── */

interface ChannelMeta {
  Icon: LucideIcon;
  label: string;
  tint: string; // bg + text classes for the icon chip
}

const CHANNEL_META: Record<string, ChannelMeta> = {
  sms: { Icon: MessageSquare, label: 'SMS', tint: 'bg-blue-50 text-blue-700' },
  whatsapp_message: {
    Icon: MessageCircle,
    label: 'WHATSAPP',
    tint: 'bg-emerald-50 text-emerald-700',
  },
  email: { Icon: Mail, label: 'EMAIL', tint: 'bg-bg-muted text-text-secondary' },
  rcs_message: { Icon: Smartphone, label: 'RCS', tint: 'bg-brand-50 text-brand-700' },
  push: { Icon: Bell, label: 'PUSH', tint: 'bg-warning-soft text-warning' },
  in_app: { Icon: Smartphone, label: 'IN-APP', tint: 'bg-bg-muted text-text-secondary' },
};

/* ─── Logic meta (icon + uppercase label) ──────────────────────────── */

const LOGIC_META: Record<string, { Icon: LucideIcon; label: string }> = {
  wait: { Icon: Clock, label: 'WAIT' },
  condition: { Icon: GitBranch, label: 'CONDITION' },
  ab_split: { Icon: Split, label: 'SPLIT' },
  api_webhook: { Icon: Webhook, label: 'API' },
  update_contact: { Icon: Database, label: 'UPDATE' },
  crm_sync: { Icon: Database, label: 'CRM SYNC' },
  note: { Icon: StickyNote, label: 'NOTE' },
  goto: { Icon: CornerDownRight, label: 'GO TO' },
};

/* ─── Helpers ─────────────────────────────────────────────────────── */

function messagePreview(data: JourneyNodeData): string | null {
  const variants = (data as { variants?: Array<{ content?: { body?: string } }> }).variants;
  if (!variants || !variants.length) return null;
  const body = variants[0]?.content?.body ?? '';
  if (!body) return null;
  const trimmed = body.replace(/\s+/g, ' ').trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}

function templateName(data: JourneyNodeData): string | null {
  const variants = (data as { variants?: Array<{ label?: string; isPrimary?: boolean }> }).variants;
  if (!variants || !variants.length) return null;
  const primary = variants.find((v) => v.isPrimary) ?? variants[0];
  return primary?.label ?? null;
}

function conditionPreview(c: ConditionNodeData) {
  if (!c.conditions.length) return 'Set condition';
  const parts = c.conditions.map((row) => `${row.attribute} ${row.operator} ${row.value}`.trim());
  return c.logic === 'or' ? parts.join(' OR ') : parts.join(' AND ');
}

function waitPreview(w: WaitNodeData) {
  if (w.waitType === 'duration') return `${w.durationValue} ${w.durationUnit}`;
  if (w.waitType === 'datetime') return `Until ${w.untilDate} ${w.untilTime}`;
  if (w.waitType === 'event') return `Until: ${w.eventKey}`;
  return `Up to ${w.optimalMaxValue} ${w.optimalMaxUnit} (optimal)`;
}

function splitPreview(a: AbSplitNodeData) {
  return a.variants.map((v) => `${v.percent}%`).join(' / ');
}

function entrySubLabel(e: EntryTriggerNodeData) {
  if (e.when === 'campaign_start') {
    return e.startDate ? `Starts ${e.startDate} ${e.startTime}` : 'Set campaign start date';
  }
  if (e.when === 'behavioral_event') {
    return e.eventName.trim() ? `On "${e.eventName}"` : 'Set behavioral event';
  }
  return `${e.recurringFrequency} · ${e.recurringDay}s @ ${e.recurringTime}`;
}

/**
 * One-line goal summary for the entry node card.
 * Format mirrors EntryGoalEditor.summarizeGoal so users see the same
 * shape whether they're reading the chip or the panel.
 */
function entryGoalChip(e: EntryTriggerNodeData): string | null {
  const g = e.goals?.[0];
  if (!g || !g.type || !g.event) return null;
  const filters =
    g.propertyFilters.length > 0
      ? ` (${g.propertyFilters
          .filter((f) => f.property && f.value)
          .map((f) => `${f.property} ${shortOp(f.operator)} ${f.value}`)
          .join(', ')})`
      : '';
  return `${g.type} on ${g.eventLabel || g.event}${filters}`;
}

function shortOp(op: string): string {
  switch (op) {
    case 'equals':
      return '=';
    case 'not_equals':
      return '≠';
    case 'gt':
      return '>';
    case 'gte':
      return '≥';
    case 'lt':
      return '<';
    case 'lte':
      return '≤';
    case 'contains':
      return '∋';
    default:
      return op;
  }
}

/* ─── Inline-editable label ────────────────────────────────────────── */

function NodeTitle({
  id,
  label,
  className,
}: {
  id: string;
  label: string;
  className?: string;
}) {
  const { setNodes } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  const commit = () => {
    const next = draft.trim() || label;
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: next } } : n)),
    );
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className={[
          'w-full border-b border-brand-500 bg-transparent outline-none',
          className,
        ].join(' ')}
      />
    );
  }
  return (
    <button
      type="button"
      onDoubleClick={() => {
        setDraft(label);
        setEditing(true);
      }}
      className={['block w-full truncate text-left', className].join(' ')}
    >
      {label}
    </button>
  );
}

/* ═══ Tier renderers ═════════════════════════════════════════════════ */

function TriggerNode({ id, data, selected }: { id: string; data: JourneyNodeData; selected: boolean }) {
  const isExit = data.kind === 'exit';
  const entry = !isExit && isEntryKind(data.kind) ? (data as EntryTriggerNodeData) : null;

  return (
    <div
      className={[
        'relative w-[200px] rounded-lg border-2 bg-surface-raised px-3.5 py-3 shadow-[var(--shadow-sm)] transition-transform',
        isExit ? 'border-text-tertiary' : 'border-brand-500',
        shellSelectionRing(selected),
      ].join(' ')}
    >
      {/* Input port — Exit only */}
      {isExit && <Handle type="target" position={Position.Left} className={PORT_CLS} />}

      <div className="flex items-start gap-2">
        <span
          className={[
            'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
            isExit ? 'bg-bg-muted text-text-secondary' : 'bg-brand-500 text-white',
          ].join(' ')}
          aria-hidden
        >
          {isExit ? <DoorOpen size={16} /> : <Target size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
            {isExit ? 'EXIT' : 'ENTRY TRIGGER'}
          </p>
          <NodeTitle
            id={id}
            label={data.label}
            className="mt-0.5 text-[14px] font-semibold text-text-primary"
          />
          {entry && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-secondary">
              {entrySubLabel(entry)}
            </p>
          )}
          {/* Goal chip — extra line below schedule / event summary.
              Shows "🎯 No goal set" in muted state if unset; in either
              case clicking the node opens the panel and the user can
              navigate to the Goal section. */}
          {entry &&
            (() => {
              const summary = entryGoalChip(entry);
              return (
                <p
                  className={[
                    'mt-1 line-clamp-2 text-[11px] leading-snug',
                    summary ? 'text-text-secondary' : 'text-text-tertiary italic',
                  ].join(' ')}
                  title={summary ?? 'Click the entry node to set a goal'}
                >
                  🎯 {summary ?? 'No goal set'}
                </p>
              );
            })()}
        </div>
      </div>

      <div className="mt-2 flex items-center">
        <StatusDot configured={!!data.configured} />
      </div>

      {/* Output port — Entry only */}
      {!isExit && <Handle type="source" position={Position.Right} id="out" className={PORT_CLS} />}
    </div>
  );
}

function MessageNode({ id, data, selected }: { id: string; data: JourneyNodeData; selected: boolean }) {
  const meta = CHANNEL_META[data.kind] ?? CHANNEL_META.sms;
  const { Icon } = meta;
  const tmpl = templateName(data);
  const preview = messagePreview(data);
  const hasContent = !!preview;

  return (
    <div
      className={[
        'relative w-[240px] rounded-lg border border-border-default bg-surface shadow-[var(--shadow-xs)] transition-transform',
        shellSelectionRing(selected),
      ].join(' ')}
    >
      <Handle type="target" position={Position.Left} className={PORT_CLS} />

      {/* Header strip */}
      <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2">
        <span
          className={[
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
            meta.tint,
          ].join(' ')}
          aria-hidden
        >
          <Icon size={14} strokeWidth={1.75} />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
          {meta.label}
        </span>
        <span className="ml-auto">
          <StatusDot configured={!!data.configured} />
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <NodeTitle
          id={id}
          label={tmpl ?? data.label}
          className="block text-[13px] font-semibold text-text-primary"
        />
        {hasContent ? (
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-text-secondary">
            {preview}
          </p>
        ) : (
          <p className="mt-1 text-[12px] font-medium text-brand-600">Select template</p>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="out" className={PORT_CLS} />
    </div>
  );
}

function AgentNode({ id, data, selected }: { id: string; data: JourneyNodeData; selected: boolean }) {
  const isVoice = data.kind === 'voice_agent';
  const voiceData = isVoice ? (data as VoiceAgentNodeData) : null;
  const chatData = data.kind === 'chat_agent' ? (data as ChatAgentNodeData) : null;
  const getAgentById = useAgentStore((s) => s.getAgentById);
  const agent = (() => {
    if (voiceData?.agentId) return getAgentById(voiceData.agentId);
    if (chatData?.agentId) return getAgentById(chatData.agentId);
    return undefined;
  })();

  const dispositionLabel = (idKey: string, fallback: string) => {
    if (voiceData) return voiceData.dispositionLabels?.[idKey] ?? fallback;
    if (chatData) return chatData.outputLabels?.[idKey] ?? fallback;
    return fallback;
  };

  const handles = isVoice ? VOICE_OUTPUT_HANDLES : CHAT_OUTPUT_HANDLES;
  const callsLabel = (() => {
    if (!agent?.metrics) return null;
    const total = agent.metrics.totalCalls ?? 0;
    const successPct = agent.metrics.completionRate
      ? Math.round(agent.metrics.completionRate)
      : null;
    if (!total) return null;
    const totalShort = total >= 1000 ? `${(total / 1000).toFixed(1)}K` : `${total}`;
    return successPct != null
      ? `${totalShort} calls · ${successPct}% success`
      : `${totalShort} calls`;
  })();

  return (
    <div
      className={[
        'group relative w-[260px] rounded-lg border border-brand-200 shadow-[var(--shadow-sm)] transition-all',
        'bg-[linear-gradient(135deg,var(--bg-surface)_0%,var(--brand-50)_100%)]',
        'hover:shadow-[var(--shadow-md),var(--shadow-focus)]',
        shellSelectionRing(selected),
      ].join(' ')}
    >
      <Handle type="target" position={Position.Left} className={PORT_CLS} />

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-brand-100 px-3 py-2">
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-500 text-white"
          aria-hidden
        >
          {isVoice ? <Phone size={14} strokeWidth={2} /> : <Bot size={14} strokeWidth={2} />}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-700">
          {isVoice ? 'VOICE AGENT' : 'CHAT AGENT'}
        </span>
        <span className="ml-auto">
          <StatusDot configured={!!data.configured} />
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        {agent ? (
          <>
            <NodeTitle
              id={id}
              label={agent.config.name}
              className="block text-[13px] font-semibold text-text-primary"
            />
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <ChipBadge>{agent.config.model}</ChipBadge>
              {isVoice ? (
                <ChipBadge>{agent.config.voice}</ChipBadge>
              ) : chatData ? (
                <ChipBadge>
                  {chatData.deployChannel === 'whatsapp_chat' ? 'WA Chat' : 'In-App'}
                </ChipBadge>
              ) : null}
            </div>
            {callsLabel && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-text-secondary">
                <Phone size={10} strokeWidth={2} className="opacity-70" />
                <span className="tabular-nums">{callsLabel}</span>
              </p>
            )}
          </>
        ) : (
          <>
            <NodeTitle
              id={id}
              label={data.label}
              className="block text-[13px] font-semibold text-text-primary"
            />
            <p className="mt-1 text-[12px] font-medium text-brand-600">Select agent</p>
          </>
        )}
      </div>

      {/* Outcome ports — labeled inline rows */}
      <div className="border-t border-brand-100 px-3 py-1">
        {handles.map((h) => (
          <div
            key={h.id}
            className="relative flex h-7 items-center justify-between text-[11px] text-text-tertiary"
          >
            <span className="truncate pr-3">{dispositionLabel(h.id, h.label)}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={h.id}
              className={PORT_CLS}
              style={{ top: '50%', right: -4 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function LogicNode({ data, selected }: { data: JourneyNodeData; selected: boolean }) {
  const meta = LOGIC_META[data.kind] ?? { Icon: GitBranch, label: data.kind.toUpperCase() };
  const { Icon } = meta;

  // Concise readout
  const readout = (() => {
    if (data.kind === 'wait') return waitPreview(data as WaitNodeData);
    if (data.kind === 'condition') return conditionPreview(data as ConditionNodeData);
    if (data.kind === 'ab_split') return splitPreview(data as AbSplitNodeData);
    return data.label;
  })();

  // Multi-handle for condition + split
  const multiHandles = (() => {
    if (data.kind === 'condition') {
      const c = data as ConditionNodeData;
      return c.pathLabels.map((label, i) => ({ id: `path_${i}`, label }));
    }
    if (data.kind === 'ab_split') {
      const a = data as AbSplitNodeData;
      return a.variants.map((v, i) => ({ id: `var_${i}`, label: v.label }));
    }
    return null;
  })();

  return (
    <div
      className={[
        'relative w-[180px] rounded-md border border-dashed border-border-default bg-bg-subtle transition-transform',
        shellSelectionRing(selected),
      ].join(' ')}
    >
      <Handle type="target" position={Position.Left} className={PORT_CLS} />

      <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-2">
        <Icon size={14} strokeWidth={1.75} className="shrink-0 text-text-secondary" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
          {meta.label}
        </span>
        <span className="ml-auto">
          <StatusDot configured={!!data.configured} />
        </span>
      </div>

      <div className="px-3 pb-2">
        <p className="line-clamp-2 text-[12px] leading-snug text-text-primary">{readout}</p>
      </div>

      {multiHandles ? (
        <div className="border-t border-dashed border-border-subtle px-3 py-1">
          {multiHandles.map((h) => (
            <div
              key={h.id}
              className="relative flex h-6 items-center justify-between text-[11px] text-text-tertiary"
            >
              <span className="truncate pr-3">{h.label}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={h.id}
                className={PORT_CLS}
                style={{ top: '50%', right: -4 }}
              />
            </div>
          ))}
        </div>
      ) : (
        <Handle type="source" position={Position.Right} id="out" className={PORT_CLS} />
      )}
    </div>
  );
}

function ChipBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center rounded border border-brand-100 bg-surface px-1.5 text-[10px] font-medium text-text-secondary">
      {children}
    </span>
  );
}

/* ═══ Dispatch ═══════════════════════════════════════════════════════ */

export const JourneyFlowNode = memo(function JourneyFlowNode(props: NodeProps<JourneyRFNode>) {
  const { id, selected } = props;
  const data = props.data as unknown as JourneyNodeData;

  if (isEntryKind(data.kind) || data.kind === 'exit') {
    return <TriggerNode id={id} data={data} selected={!!selected} />;
  }
  if (MESSAGE_KINDS.has(data.kind)) {
    return <MessageNode id={id} data={data} selected={!!selected} />;
  }
  if (AGENT_KINDS.has(data.kind)) {
    return <AgentNode id={id} data={data} selected={!!selected} />;
  }
  return <LogicNode data={data} selected={!!selected} />;
});
