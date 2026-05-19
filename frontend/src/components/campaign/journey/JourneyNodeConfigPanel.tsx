'use client';

import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { usePhaseData } from '@/hooks/usePhaseData';
import { MOCK_CONTENT_TEMPLATES } from '@/data/mock/contentLibraryTemplates';
import type { ContentTemplateRow } from '@/types/contentLibrary';
import type {
  JourneyFlowNode,
  JourneyNodeData,
  VoiceAgentNodeData,
  ChatAgentNodeData,
  WhatsAppMessageNodeData,
  SmsNodeData,
  WaitNodeData,
  ConditionNodeData,
  AbSplitNodeData,
  ApiWebhookNodeData,
  UpdateContactNodeData,
  EntryTriggerNodeData,
  EmailNodeData,
  PushNodeData,
  RcsMessageNodeData,
  InAppMessageNodeData,
} from './journeyTypes';
import { VOICE_OUTPUT_HANDLES, CHAT_OUTPUT_HANDLES } from './journeyConstants';
import { mergeJourneyNodeData, templateVariableSlots } from './journeyMerge';
import { ChannelContentEditor } from '@/components/campaign/ChannelContentEditor';

const CONTACT_ATTRS = [
  'contact.name',
  'contact.phone',
  'contact.email',
  'outstanding_amount',
  'dpd_bucket',
  'last_payment_date',
  'wallet_balance',
];

const CONDITION_ATTRS = ['dpd_bucket', 'last_app_open', 'kyc_steps_completed', 'spend_3m', 'ltv', 'campaign_response_rate'];
const OPERATORS = ['equals', 'not equals', '>', '<', 'contains', 'is true', 'is false'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#F3F4F6] py-3 last:border-0">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{title}</p>
      {children}
    </div>
  );
}

function templateStatusClass(status: ContentTemplateRow['status']) {
  switch (status) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-800';
    case 'pending_approval':
      return 'bg-amber-50 text-amber-800';
    case 'rejected':
      return 'bg-red-50 text-red-800';
    default:
      return 'bg-gray-100 text-text-secondary';
  }
}

interface JourneyNodeConfigPanelProps {
  node: JourneyFlowNode | null;
  onClose: () => void;
  onPatch: (nodeId: string, nextData: JourneyNodeData) => void;
  /** Used for ChannelContentEditor traffic split estimates */
  audienceSize?: number;
}

export function JourneyNodeConfigPanel({ node, onClose, onPatch, audienceSize = 10_000 }: JourneyNodeConfigPanelProps) {
  const agents = useAgentStore((s) => s.agents);
  const { segments } = usePhaseData();
  const deployedVoice = agents.filter((a) => a.config.type === 'voice' && a.status === 'deployed');
  const deployedChat = agents.filter((a) => a.config.type === 'chat' && a.status === 'deployed');

  // No node selected → render nothing. Previously we kept a `w-0`
  // placeholder to animate the slide-in transition, but that stub
  // still rendered a white `bg-surface` sliver inside the canvas
  // card on some layouts. We accept losing the slide animation
  // in exchange for a clean empty state.
  if (!node) return null;

  const d = node.data as unknown as JourneyNodeData;
  const patch = (p: Partial<JourneyNodeData>) => onPatch(node.id, mergeJourneyNodeData(d, p));

  return (
    <aside className="flex h-full w-[420px] shrink-0 flex-col border-l border-border-subtle bg-surface shadow-[var(--shadow-lg)] transition-[width] duration-300">
      <div className="flex items-start justify-between gap-2 border-b border-border-subtle bg-surface px-4 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="text-[18px] leading-none">{d.icon}</span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">{d.typeLabel}</p>
            <p className="truncate text-[13px] font-semibold text-text-primary">{d.label}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="rounded-md p-1 text-text-tertiary hover:bg-surface-raised hover:text-text-primary"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <Section title="Node name">
          <input
            value={d.label}
            onChange={(e) => patch({ label: e.target.value })}
            className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 text-sm text-text-primary outline-none focus:border-cyan"
          />
        </Section>

        {d.kind === 'entry_trigger' && (
          <>
            <Section title="Audience">
              <p className="mb-2 text-[11px] leading-snug text-text-secondary">
                Pick the segment that enters this journey. Create new segments in Audiences.
              </p>
              <select
                value={(d as EntryTriggerNodeData).audienceId ?? ''}
                onChange={(e) => {
                  const segId = e.target.value || undefined;
                  const seg = segments.find((s) => s.id === segId);
                  patch({
                    audienceId: segId,
                    audienceName: seg?.name,
                    audienceSize: seg?.size,
                  } as Partial<EntryTriggerNodeData>);
                }}
                className="w-full rounded-md border border-[#E5E7EB] bg-white px-2 py-2 text-sm"
              >
                <option value="">Select audience…</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.size.toLocaleString()} contacts
                  </option>
                ))}
              </select>
              {(d as EntryTriggerNodeData).audienceId && (
                <p className="mt-1.5 text-[11px] text-text-secondary">
                  Estimated reach: {((d as EntryTriggerNodeData).audienceSize ?? 0).toLocaleString()} contacts
                </p>
              )}
              <Link to="/audiences" className="mt-2 inline-block text-xs font-medium text-cyan hover:underline">
                Manage segments →
              </Link>
            </Section>
            <Section title="Schedule mode">
              <p className="mb-2 text-[11px] leading-snug text-text-secondary">
                Decide when contacts in this audience enter the journey.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'smart_ai', label: 'Smart + AI', hint: 'Best time per contact' },
                    { id: 'recurring', label: 'Recurring', hint: 'Daily / weekly / monthly' },
                    { id: 'one-time', label: 'One time', hint: 'Run once on a date' },
                    { id: 'event', label: 'Event-based', hint: 'On a behavioral event' },
                  ] as const
                ).map((opt) => {
                  const active = ((d as EntryTriggerNodeData).scheduleMode ?? 'one-time') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        // Keep legacy `when` in sync so existing wizards/preview still work.
                        const whenMap: Record<typeof opt.id, EntryTriggerNodeData['when']> = {
                          'smart_ai': 'campaign_start',
                          'one-time': 'campaign_start',
                          'recurring': 'recurring',
                          'event': 'behavioral_event',
                        };
                        patch({
                          scheduleMode: opt.id,
                          when: whenMap[opt.id],
                        } as Partial<EntryTriggerNodeData>);
                      }}
                      className={`flex flex-col items-start gap-0.5 rounded-md border px-2.5 py-1.5 text-left transition-colors ${
                        active
                          ? 'border-cyan bg-cyan/5 text-text-primary'
                          : 'border-[#E5E7EB] bg-white text-text-secondary hover:border-[#D1D5DB] hover:text-text-primary'
                      }`}
                    >
                      <span className="text-[12.5px] font-medium">{opt.label}</span>
                      <span className="text-[10.5px] text-text-tertiary">{opt.hint}</span>
                    </button>
                  );
                })}
              </div>
            </Section>
            <Section title="When users enter">
              <p className="mb-2 text-[11px] leading-snug text-text-secondary">
                Schedule for this journey is defined here (not in a separate wizard step).
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="entryWhen"
                  checked={(d as EntryTriggerNodeData).when === 'campaign_start'}
                  onChange={() => patch({ when: 'campaign_start' } as Partial<EntryTriggerNodeData>)}
                />
                On campaign start date
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="entryWhen"
                  checked={(d as EntryTriggerNodeData).when === 'behavioral_event'}
                  onChange={() => patch({ when: 'behavioral_event' } as Partial<EntryTriggerNodeData>)}
                />
                On behavioral event
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="entryWhen"
                  checked={(d as EntryTriggerNodeData).when === 'recurring'}
                  onChange={() => patch({ when: 'recurring' } as Partial<EntryTriggerNodeData>)}
                />
                Recurring
              </label>
              {(d as EntryTriggerNodeData).when === 'campaign_start' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-text-secondary">
                    Date
                    <input
                      type="date"
                      value={(d as EntryTriggerNodeData).startDate}
                      onChange={(e) => patch({ startDate: e.target.value } as Partial<EntryTriggerNodeData>)}
                      className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-[11px] text-text-secondary">
                    Time
                    <input
                      type="time"
                      value={(d as EntryTriggerNodeData).startTime}
                      onChange={(e) => patch({ startTime: e.target.value } as Partial<EntryTriggerNodeData>)}
                      className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                    />
                  </label>
                </div>
              )}
              {(d as EntryTriggerNodeData).when === 'behavioral_event' && (
                <label className="mt-3 block text-[11px] text-text-secondary">
                  Event name
                  <input
                    value={(d as EntryTriggerNodeData).eventName}
                    onChange={(e) => patch({ eventName: e.target.value } as Partial<EntryTriggerNodeData>)}
                    className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1.5 text-sm"
                    placeholder="e.g. payment_missed"
                  />
                </label>
              )}
              {(d as EntryTriggerNodeData).when === 'recurring' && (
                <div className="mt-3 space-y-2">
                  <label className="block text-[11px] text-text-secondary">
                    Frequency
                    <select
                      value={(d as EntryTriggerNodeData).recurringFrequency}
                      onChange={(e) =>
                        patch({
                          recurringFrequency: e.target.value as EntryTriggerNodeData['recurringFrequency'],
                        } as Partial<EntryTriggerNodeData>)
                      }
                      className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1.5 text-sm"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>
                  <label className="block text-[11px] text-text-secondary">
                    Day
                    <input
                      value={(d as EntryTriggerNodeData).recurringDay}
                      onChange={(e) => patch({ recurringDay: e.target.value } as Partial<EntryTriggerNodeData>)}
                      className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1.5 text-sm"
                      placeholder="monday"
                    />
                  </label>
                  <label className="block text-[11px] text-text-secondary">
                    Time
                    <input
                      type="time"
                      value={(d as EntryTriggerNodeData).recurringTime}
                      onChange={(e) => patch({ recurringTime: e.target.value } as Partial<EntryTriggerNodeData>)}
                      className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1.5 text-sm"
                    />
                  </label>
                </div>
              )}
            </Section>
          </>
        )}

        {d.kind === 'voice_agent' && (
          <>
            <Section title="Agent">
              <select
                value={(d as VoiceAgentNodeData).agentId ?? ''}
                onChange={(e) => patch({ agentId: e.target.value || null } as Partial<VoiceAgentNodeData>)}
                className="w-full rounded-md border border-[#E5E7EB] bg-white px-2 py-2 text-sm"
              >
                <option value="">Select voice agent…</option>
                {deployedVoice.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.config.name}
                    {a.config.useCase ? ` — ${a.config.useCase}` : ''} — {a.config.conversationSettings.language}
                  </option>
                ))}
              </select>
              <Link to="/agents" className="mt-2 inline-block text-xs font-medium text-cyan hover:underline">
                Create new agent →
              </Link>
            </Section>
            <Section title="Call script / prompt reference">
              <input
                value={(d as VoiceAgentNodeData).callScriptRef}
                onChange={(e) => patch({ callScriptRef: e.target.value } as Partial<VoiceAgentNodeData>)}
                className="w-full rounded-md border border-[#E5E7EB] px-2 py-2 text-sm"
                placeholder="e.g. recovery_v3 / prompt doc link"
              />
            </Section>
            <Section title="Call settings">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-text-secondary">
                  Start
                  <input
                    type="time"
                    value={(d as VoiceAgentNodeData).callingWindowStart}
                    onChange={(e) => patch({ callingWindowStart: e.target.value } as Partial<VoiceAgentNodeData>)}
                    className="mt-0.5 w-full rounded border border-[#E5E7EB] px-1 py-1 text-xs"
                  />
                </label>
                <label className="text-[11px] text-text-secondary">
                  End
                  <input
                    type="time"
                    value={(d as VoiceAgentNodeData).callingWindowEnd}
                    onChange={(e) => patch({ callingWindowEnd: e.target.value } as Partial<VoiceAgentNodeData>)}
                    className="mt-0.5 w-full rounded border border-[#E5E7EB] px-1 py-1 text-xs"
                  />
                </label>
              </div>
              <label className="mt-2 block text-[11px] text-text-secondary">
                Max attempts
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={(d as VoiceAgentNodeData).maxAttempts}
                  onChange={(e) => patch({ maxAttempts: Number(e.target.value) || 1 } as Partial<VoiceAgentNodeData>)}
                  className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                />
              </label>
              <label className="mt-2 block text-[11px] text-text-secondary">
                Retry interval
                <select
                  value={(d as VoiceAgentNodeData).retryInterval}
                  onChange={(e) => patch({ retryInterval: e.target.value } as Partial<VoiceAgentNodeData>)}
                  className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1.5 text-sm"
                >
                  <option value="1h">1 hour</option>
                  <option value="2h">2 hours</option>
                  <option value="4h">4 hours</option>
                  <option value="next_day">Next day</option>
                </select>
              </label>
              <label className="mt-2 block text-[11px] text-text-secondary">
                Timezone
                <select
                  value={(d as VoiceAgentNodeData).timezone}
                  onChange={(e) => patch({ timezone: e.target.value } as Partial<VoiceAgentNodeData>)}
                  className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1.5 text-sm"
                >
                  <option value="Asia/Kolkata">IST (Asia/Kolkata)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">US Eastern</option>
                </select>
              </label>
            </Section>
            <Section title="Output mapping">
              <p className="mb-2 text-[11px] leading-snug text-text-secondary">
                Connect each output handle on the node to a downstream step. The journey branches automatically based on
                the call result.
              </p>
              <div className="space-y-2">
                {VOICE_OUTPUT_HANDLES.map((h) => (
                  <label key={h.id} className="block text-[11px] text-text-secondary">
                    {(d as VoiceAgentNodeData).dispositionLabels[h.id] ?? h.label}
                    <input
                      value={(d as VoiceAgentNodeData).dispositionLabels[h.id] ?? h.label}
                      onChange={(e) =>
                        patch({
                          dispositionLabels: {
                            ...(d as VoiceAgentNodeData).dispositionLabels,
                            [h.id]: e.target.value,
                          },
                        } as Partial<VoiceAgentNodeData>)
                      }
                      className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1 text-xs"
                    />
                    <span className="mt-0.5 block text-[10px] text-text-secondary">→ connect on canvas</span>
                  </label>
                ))}
              </div>
            </Section>
            <Section title="Recording">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(d as VoiceAgentNodeData).recordCalls}
                  onChange={(e) => patch({ recordCalls: e.target.checked } as Partial<VoiceAgentNodeData>)}
                />
                Enable call recording
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(d as VoiceAgentNodeData).storeTranscript}
                  onChange={(e) => patch({ storeTranscript: e.target.checked } as Partial<VoiceAgentNodeData>)}
                />
                Store transcript
              </label>
            </Section>
          </>
        )}

        {d.kind === 'chat_agent' && (
          <>
            <Section title="Deploy channel">
              <select
                value={(d as ChatAgentNodeData).deployChannel}
                onChange={(e) =>
                  patch({
                    deployChannel: e.target.value as ChatAgentNodeData['deployChannel'],
                  } as Partial<ChatAgentNodeData>)
                }
                className="w-full rounded-md border border-[#E5E7EB] bg-white px-2 py-2 text-sm"
              >
                <option value="whatsapp_chat">WhatsApp Chat</option>
                <option value="in_app_chat">In-App Chat</option>
              </select>
            </Section>
            <Section title="Agent">
              <select
                value={(d as ChatAgentNodeData).agentId ?? ''}
                onChange={(e) => patch({ agentId: e.target.value || null } as Partial<ChatAgentNodeData>)}
                className="w-full rounded-md border border-[#E5E7EB] bg-white px-2 py-2 text-sm"
              >
                <option value="">Select chat agent…</option>
                {deployedChat.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.config.name} — {a.config.chatChannel ?? 'whatsapp'}
                    {a.config.useCase ? ` — ${a.config.useCase}` : ''}
                  </option>
                ))}
              </select>
              {deployedChat.length === 0 && (
                <p className="mt-1 text-[11px] text-text-secondary">No deployed chat agents yet.</p>
              )}
              <Link to="/agents" className="mt-2 inline-block text-xs font-medium text-cyan hover:underline">
                Create new agent →
              </Link>
            </Section>
            <Section title="Trigger settings">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="chatTrig"
                  checked={(d as ChatAgentNodeData).triggerMode === 'immediate'}
                  onChange={() => patch({ triggerMode: 'immediate' } as Partial<ChatAgentNodeData>)}
                />
                Immediately when contact reaches this step
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="chatTrig"
                  checked={(d as ChatAgentNodeData).triggerMode === 'after_delivery'}
                  onChange={() => patch({ triggerMode: 'after_delivery' } as Partial<ChatAgentNodeData>)}
                />
                After previous message is delivered
              </label>
              {(d as ChatAgentNodeData).triggerMode === 'after_delivery' && (
                <label className="mt-2 block text-[11px] text-text-secondary">
                  Delay (minutes)
                  <input
                    type="number"
                    min={0}
                    value={(d as ChatAgentNodeData).afterDeliveryMinutes}
                    onChange={(e) =>
                      patch({ afterDeliveryMinutes: Number(e.target.value) || 0 } as Partial<ChatAgentNodeData>)
                    }
                    className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                  />
                </label>
              )}
              <label className="mt-2 block text-[11px] text-text-secondary">
                Session timeout (hours)
                <input
                  type="number"
                  min={1}
                  value={(d as ChatAgentNodeData).sessionTimeoutHours}
                  onChange={(e) =>
                    patch({ sessionTimeoutHours: Number(e.target.value) || 24 } as Partial<ChatAgentNodeData>)
                  }
                  className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                />
                <span className="mt-1 block text-[10px] text-text-secondary">
                  If the customer does not reply within this window, route to No Response.
                </span>
              </label>
            </Section>
            <Section title="Output mapping">
              <p className="mb-2 text-[11px] text-text-secondary">
                Connect each outcome handle on the canvas to the next step.
              </p>
              {CHAT_OUTPUT_HANDLES.map((h) => (
                <label key={h.id} className="mb-2 block text-[11px] text-text-secondary">
                  {(d as ChatAgentNodeData).outputLabels[h.id] ?? h.label}
                  <input
                    value={(d as ChatAgentNodeData).outputLabels[h.id] ?? h.label}
                    onChange={(e) =>
                      patch({
                        outputLabels: { ...(d as ChatAgentNodeData).outputLabels, [h.id]: e.target.value },
                      } as Partial<ChatAgentNodeData>)
                    }
                    className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1 text-xs"
                  />
                </label>
              ))}
            </Section>
          </>
        )}

        {d.kind === 'whatsapp_message' && (
          <>
            <Section title="Template">
              <select
                value={(d as WhatsAppMessageNodeData).templateId ?? ''}
                onChange={(e) => patch({ templateId: e.target.value || null } as Partial<WhatsAppMessageNodeData>)}
                className="w-full rounded-md border border-[#E5E7EB] bg-white px-2 py-2 text-sm"
              >
                <option value="">Select template…</option>
                {MOCK_CONTENT_TEMPLATES.filter((t) => t.channel === 'whatsapp').map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.status})
                  </option>
                ))}
              </select>
              {(d as WhatsAppMessageNodeData).templateId && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {(() => {
                    const tpl = MOCK_CONTENT_TEMPLATES.find((x) => x.id === (d as WhatsAppMessageNodeData).templateId);
                    if (!tpl) return null;
                    return (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${templateStatusClass(tpl.status)}`}>
                        {tpl.status.replace('_', ' ')}
                      </span>
                    );
                  })()}
                </div>
              )}
              <Link to="/content-library" className="mt-2 inline-block text-xs font-medium text-cyan hover:underline">
                Go to Content Library →
              </Link>
            </Section>
            <Section title="Personalization">
              {(() => {
                const tpl = MOCK_CONTENT_TEMPLATES.find((x) => x.id === (d as WhatsAppMessageNodeData).templateId);
                const slots = tpl ? templateVariableSlots(tpl.bodyPreview) : [];
                if (!slots.length) {
                  return <p className="text-xs text-text-secondary">Select a template to map variables.</p>;
                }
                return slots.map((slot) => (
                  <label key={slot} className="mb-2 block text-[11px] text-text-secondary">
                    {slot}
                    <select
                      value={(d as WhatsAppMessageNodeData).variableMap[slot] ?? ''}
                      onChange={(e) =>
                        patch({
                          variableMap: { ...(d as WhatsAppMessageNodeData).variableMap, [slot]: e.target.value },
                        } as Partial<WhatsAppMessageNodeData>)
                      }
                      className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                    >
                      <option value="">Map to attribute…</option>
                      {CONTACT_ATTRS.map((attr) => (
                        <option key={attr} value={attr}>
                          {attr}
                        </option>
                      ))}
                    </select>
                  </label>
                ));
              })()}
            </Section>
            <Section title="Send timing">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="waTime"
                  checked={(d as WhatsAppMessageNodeData).sendTiming === 'immediate'}
                  onChange={() => patch({ sendTiming: 'immediate' } as Partial<WhatsAppMessageNodeData>)}
                />
                Send immediately
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="waTime"
                  checked={(d as WhatsAppMessageNodeData).sendTiming === 'scheduled'}
                  onChange={() => patch({ sendTiming: 'scheduled' } as Partial<WhatsAppMessageNodeData>)}
                />
                Wait until time of day
              </label>
              {(d as WhatsAppMessageNodeData).sendTiming === 'scheduled' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={(d as WhatsAppMessageNodeData).scheduledTime}
                    onChange={(e) => patch({ scheduledTime: e.target.value } as Partial<WhatsAppMessageNodeData>)}
                    className="rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                  />
                  <select
                    value={(d as WhatsAppMessageNodeData).scheduledTz}
                    onChange={(e) => patch({ scheduledTz: e.target.value } as Partial<WhatsAppMessageNodeData>)}
                    className="rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                  >
                    <option value="Asia/Kolkata">IST</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              )}
            </Section>
            <Section title="Message copy & A/B tests">
              <ChannelContentEditor
                channel="whatsapp"
                audienceSize={audienceSize}
                variants={(d as WhatsAppMessageNodeData).variants}
                testing={(d as WhatsAppMessageNodeData).testing}
                onVariantsChange={(variants) => patch({ variants } as Partial<WhatsAppMessageNodeData>)}
                onTestingChange={(testing) => patch({ testing } as Partial<WhatsAppMessageNodeData>)}
                onPrimaryContentChange={() => {}}
              />
            </Section>
          </>
        )}

        {d.kind === 'sms' && (
          <>
            <Section title="Message">
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={(d as SmsNodeData).mode === 'template'}
                    onChange={() => patch({ mode: 'template' } as Partial<SmsNodeData>)}
                  />
                  Template
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={(d as SmsNodeData).mode === 'custom'}
                    onChange={() => patch({ mode: 'custom' } as Partial<SmsNodeData>)}
                  />
                  Write message
                </label>
              </div>
              {(d as SmsNodeData).mode === 'template' ? (
                <select
                  value={(d as SmsNodeData).templateId ?? ''}
                  onChange={(e) => patch({ templateId: e.target.value || null } as Partial<SmsNodeData>)}
                  className="mt-2 w-full rounded-md border border-[#E5E7EB] px-2 py-2 text-sm"
                >
                  <option value="">Select SMS template…</option>
                  {MOCK_CONTENT_TEMPLATES.filter((t) => t.channel === 'sms').map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <textarea
                  value={(d as SmsNodeData).customBody}
                  onChange={(e) => patch({ customBody: e.target.value } as Partial<SmsNodeData>)}
                  rows={4}
                  className="mt-2 w-full rounded-md border border-[#E5E7EB] px-2 py-2 text-sm"
                  placeholder="SMS body…"
                />
              )}
              <Link to="/content-library" className="mt-2 inline-block text-xs font-medium text-cyan hover:underline">
                Go to Content Library →
              </Link>
            </Section>
            <Section title="Variable mapping">
              {(() => {
                const sms = d as SmsNodeData;
                const tpl = MOCK_CONTENT_TEMPLATES.find((x) => x.id === sms.templateId);
                const slots = sms.mode === 'template' && tpl ? templateVariableSlots(tpl.bodyPreview) : [];
                if (sms.mode === 'custom') {
                  return <p className="text-xs text-text-secondary">Map variables when using a template.</p>;
                }
                if (!slots.length) return <p className="text-xs text-text-secondary">Select a template first.</p>;
                return slots.map((slot) => (
                  <label key={slot} className="mb-2 block text-[11px] text-text-secondary">
                    {slot}
                    <select
                      value={sms.variableMap[slot] ?? ''}
                      onChange={(e) =>
                        patch({
                          variableMap: { ...sms.variableMap, [slot]: e.target.value },
                        } as Partial<SmsNodeData>)
                      }
                      className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                    >
                      <option value="">Attribute…</option>
                      {CONTACT_ATTRS.map((attr) => (
                        <option key={attr} value={attr}>
                          {attr}
                        </option>
                      ))}
                    </select>
                  </label>
                ));
              })()}
            </Section>
            <Section title="Compliance">
              <label className="text-[11px] text-text-secondary">
                DLT Template ID (India)
                <input
                  value={(d as SmsNodeData).dltTemplateId}
                  onChange={(e) => patch({ dltTemplateId: e.target.value } as Partial<SmsNodeData>)}
                  className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                  placeholder="Required for India routes"
                />
              </label>
            </Section>
            <Section title="Message copy & A/B tests">
              <ChannelContentEditor
                channel="sms"
                audienceSize={audienceSize}
                variants={(d as SmsNodeData).variants}
                testing={(d as SmsNodeData).testing}
                onVariantsChange={(variants) => patch({ variants } as Partial<SmsNodeData>)}
                onTestingChange={(testing) => patch({ testing } as Partial<SmsNodeData>)}
                onPrimaryContentChange={() => {}}
              />
            </Section>
          </>
        )}

        {d.kind === 'email' && (
          <Section title="Message copy & A/B tests">
            <ChannelContentEditor
              channel="push_notification"
              audienceSize={audienceSize}
              variants={(d as EmailNodeData).variants}
              testing={(d as EmailNodeData).testing}
              onVariantsChange={(variants) => patch({ variants } as Partial<EmailNodeData>)}
              onTestingChange={(testing) => patch({ testing } as Partial<EmailNodeData>)}
              onPrimaryContentChange={() => {}}
            />
          </Section>
        )}

        {d.kind === 'push' && (
          <Section title="Message copy & A/B tests">
            <ChannelContentEditor
              channel="push_notification"
              audienceSize={audienceSize}
              variants={(d as PushNodeData).variants}
              testing={(d as PushNodeData).testing}
              onVariantsChange={(variants) => patch({ variants } as Partial<PushNodeData>)}
              onTestingChange={(testing) => patch({ testing } as Partial<PushNodeData>)}
              onPrimaryContentChange={() => {}}
            />
          </Section>
        )}

        {d.kind === 'rcs_message' && (
          <Section title="Message copy & A/B tests">
            <ChannelContentEditor
              channel="rcs"
              audienceSize={audienceSize}
              variants={(d as RcsMessageNodeData).variants}
              testing={(d as RcsMessageNodeData).testing}
              onVariantsChange={(variants) => patch({ variants } as Partial<RcsMessageNodeData>)}
              onTestingChange={(testing) => patch({ testing } as Partial<RcsMessageNodeData>)}
              onPrimaryContentChange={() => {}}
            />
          </Section>
        )}

        {d.kind === 'in_app' && (
          <Section title="Message copy & A/B tests">
            <ChannelContentEditor
              channel="in_app_banner"
              audienceSize={audienceSize}
              variants={(d as InAppMessageNodeData).variants}
              testing={(d as InAppMessageNodeData).testing}
              onVariantsChange={(variants) => patch({ variants } as Partial<InAppMessageNodeData>)}
              onTestingChange={(testing) => patch({ testing } as Partial<InAppMessageNodeData>)}
              onPrimaryContentChange={() => {}}
            />
          </Section>
        )}

        {d.kind === 'wait' && (
          <Section title="Wait">
            <div className="space-y-2 text-sm">
              {(['duration', 'datetime', 'event', 'optimal'] as const).map((wt) => (
                <label key={wt} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="waitType"
                    checked={(d as WaitNodeData).waitType === wt}
                    onChange={() => patch({ waitType: wt } as Partial<WaitNodeData>)}
                  />
                  {wt === 'duration' && 'Fixed duration'}
                  {wt === 'datetime' && 'Until date & time'}
                  {wt === 'event' && 'Until an event occurs'}
                  {wt === 'optimal' && 'Until optimal send time'}
                </label>
              ))}
            </div>
            {(d as WaitNodeData).waitType === 'duration' && (
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={(d as WaitNodeData).durationValue}
                  onChange={(e) => patch({ durationValue: Number(e.target.value) || 1 } as Partial<WaitNodeData>)}
                  className="w-24 rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                />
                <select
                  value={(d as WaitNodeData).durationUnit}
                  onChange={(e) =>
                    patch({ durationUnit: e.target.value as WaitNodeData['durationUnit'] } as Partial<WaitNodeData>)
                  }
                  className="flex-1 rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </div>
            )}
            {(d as WaitNodeData).waitType === 'datetime' && (
              <div className="mt-2 flex flex-col gap-2">
                <input
                  type="date"
                  value={(d as WaitNodeData).untilDate}
                  onChange={(e) => patch({ untilDate: e.target.value } as Partial<WaitNodeData>)}
                  className="rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                />
                <input
                  type="time"
                  value={(d as WaitNodeData).untilTime}
                  onChange={(e) => patch({ untilTime: e.target.value } as Partial<WaitNodeData>)}
                  className="rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                />
              </div>
            )}
            {(d as WaitNodeData).waitType === 'event' && (
              <div className="mt-2 space-y-2">
                <select
                  value={(d as WaitNodeData).eventKey}
                  onChange={(e) => patch({ eventKey: e.target.value } as Partial<WaitNodeData>)}
                  className="w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                >
                  <option value="payment_made">Payment made</option>
                  <option value="link_clicked">Link clicked</option>
                  <option value="message_opened">Message opened</option>
                  <option value="form_submitted">Form submitted</option>
                  <option value="custom">Custom event…</option>
                </select>
                {(d as WaitNodeData).eventKey === 'custom' && (
                  <input
                    placeholder="Event name"
                    className="w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                    onChange={(e) => patch({ eventKey: e.target.value } as Partial<WaitNodeData>)}
                  />
                )}
                <label className="text-[11px] text-text-secondary">
                  Timeout — continue after (days)
                  <input
                    type="number"
                    min={1}
                    value={(d as WaitNodeData).eventTimeoutDays}
                    onChange={(e) =>
                      patch({ eventTimeoutDays: Number(e.target.value) || 1 } as Partial<WaitNodeData>)
                    }
                    className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                  />
                </label>
              </div>
            )}
            {(d as WaitNodeData).waitType === 'optimal' && (
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={(d as WaitNodeData).optimalMaxValue}
                  onChange={(e) => patch({ optimalMaxValue: Number(e.target.value) || 1 } as Partial<WaitNodeData>)}
                  className="w-24 rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                />
                <input
                  value={(d as WaitNodeData).optimalMaxUnit}
                  onChange={(e) => patch({ optimalMaxUnit: e.target.value } as Partial<WaitNodeData>)}
                  className="flex-1 rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                  placeholder="hours"
                />
              </div>
            )}
          </Section>
        )}

        {d.kind === 'condition' && (
          <>
            <Section title="Condition builder">
              {(d as ConditionNodeData).conditions.map((row, idx) => (
                <div key={idx} className="mb-2 rounded-md border border-[#E5E7EB] p-2">
                  <div className="grid gap-2">
                    <select
                      value={row.attribute}
                      onChange={(e) => {
                        const next = [...(d as ConditionNodeData).conditions];
                        next[idx] = { ...row, attribute: e.target.value };
                        patch({ conditions: next } as Partial<ConditionNodeData>);
                      }}
                      className="rounded border border-[#E5E7EB] px-1 py-1 text-xs"
                    >
                      {CONDITION_ATTRS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                    <select
                      value={row.operator}
                      onChange={(e) => {
                        const next = [...(d as ConditionNodeData).conditions];
                        next[idx] = { ...row, operator: e.target.value };
                        patch({ conditions: next } as Partial<ConditionNodeData>);
                      }}
                      className="rounded border border-[#E5E7EB] px-1 py-1 text-xs"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                    <input
                      value={row.value}
                      onChange={(e) => {
                        const next = [...(d as ConditionNodeData).conditions];
                        next[idx] = { ...row, value: e.target.value };
                        patch({ conditions: next } as Partial<ConditionNodeData>);
                      }}
                      className="rounded border border-[#E5E7EB] px-2 py-1 text-xs"
                      placeholder="Value"
                    />
                  </div>
                </div>
              ))}
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  className="text-xs font-medium text-cyan hover:underline"
                  onClick={() =>
                    patch({
                      conditions: [
                        ...(d as ConditionNodeData).conditions,
                        { attribute: 'dpd_bucket', operator: 'equals', value: '' },
                      ],
                    } as Partial<ConditionNodeData>)
                  }
                >
                  + Add condition
                </button>
                <select
                  value={(d as ConditionNodeData).logic}
                  onChange={(e) => patch({ logic: e.target.value as 'and' | 'or' } as Partial<ConditionNodeData>)}
                  className="rounded border border-[#E5E7EB] px-2 py-0.5 text-xs"
                >
                  <option value="and">AND</option>
                  <option value="or">OR</option>
                </select>
              </div>
            </Section>
            <Section title="Output paths">
              {(d as ConditionNodeData).pathLabels.map((pl, i) => (
                <label key={i} className="mb-2 block text-[11px] text-text-secondary">
                  Path {i + 1}
                  <input
                    value={pl}
                    onChange={(e) => {
                      const labels = [...(d as ConditionNodeData).pathLabels];
                      labels[i] = e.target.value;
                      patch({ pathLabels: labels } as Partial<ConditionNodeData>);
                    }}
                    className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1 text-xs"
                  />
                </label>
              ))}
              {(d as ConditionNodeData).pathLabels.length < 5 && (
                <button
                  type="button"
                  className="text-xs font-medium text-cyan hover:underline"
                  onClick={() => {
                    const cd = d as ConditionNodeData;
                    const last = cd.conditions[cd.conditions.length - 1] ?? {
                      attribute: 'dpd_bucket',
                      operator: 'equals',
                      value: '',
                    };
                    patch({
                      pathLabels: [...cd.pathLabels, `Path ${cd.pathLabels.length + 1}`],
                      conditions: [...cd.conditions, { ...last }],
                    } as Partial<ConditionNodeData>);
                  }}
                >
                  + Add path
                </button>
              )}
            </Section>
            <Section title="Preview">
              <p className="text-xs leading-relaxed text-text-primary">
                {(d as ConditionNodeData).conditions
                  .map((c) => `${c.attribute} ${c.operator} ${c.value}`.trim())
                  .join(` ${(d as ConditionNodeData).logic.toUpperCase()} `)}
              </p>
            </Section>
          </>
        )}

        {d.kind === 'ab_split' && (
          <Section title="Variants">
            <p className="mb-2 text-[11px] text-text-secondary">Variant count</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {([2, 3] as const).map((n) => (
                <label key={n} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="vc"
                    checked={(d as AbSplitNodeData).variantCount === n}
                    onChange={() => {
                      const base = Array.from({ length: n }, (_, i) => ({
                        label: `Variant ${String.fromCharCode(65 + i)}`,
                        percent: n === 2 ? 50 : Math.floor(100 / n),
                      }));
                      if (n === 3) base[2].percent = 100 - base[0].percent - base[1].percent;
                      patch({ variantCount: n, variants: base } as Partial<AbSplitNodeData>);
                    }}
                  />
                  {n}
                </label>
              ))}
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="vc"
                  checked={(d as AbSplitNodeData).variantCount === 'custom'}
                  onChange={() => patch({ variantCount: 'custom' } as Partial<AbSplitNodeData>)}
                />
                Custom
              </label>
            </div>
            {(d as AbSplitNodeData).variantCount === 'custom' && (
              <label className="mt-2 block text-[11px] text-text-secondary">
                Number of variants
                <input
                  type="number"
                  min={2}
                  max={8}
                  value={(d as AbSplitNodeData).customCount}
                  onChange={(e) => {
                    const c = Math.min(8, Math.max(2, Number(e.target.value) || 2));
                    const variants = Array.from({ length: c }, (_, i) => ({
                      label: `Variant ${String.fromCharCode(65 + i)}`,
                      percent: Math.floor(100 / c),
                    }));
                    const rem = 100 - variants.reduce((s, v) => s + v.percent, 0);
                    variants[variants.length - 1].percent += rem;
                    patch({ customCount: c, variants } as Partial<AbSplitNodeData>);
                  }}
                  className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                />
              </label>
            )}
            <div className="mt-3 space-y-2">
              {(d as AbSplitNodeData).variants.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={v.label}
                    onChange={(e) => {
                      const variants = [...(d as AbSplitNodeData).variants];
                      variants[i] = { ...v, label: e.target.value };
                      patch({ variants } as Partial<AbSplitNodeData>);
                    }}
                    className="flex-1 rounded border border-[#E5E7EB] px-2 py-1 text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={v.percent}
                    onChange={(e) => {
                      const variants = [...(d as AbSplitNodeData).variants];
                      variants[i] = { ...v, percent: Number(e.target.value) || 0 };
                      patch({ variants } as Partial<AbSplitNodeData>);
                    }}
                    className="w-16 rounded border border-[#E5E7EB] px-1 py-1 text-xs"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-text-secondary">
              Total:{' '}
              {(d as AbSplitNodeData).variants.reduce((s, v) => s + v.percent, 0) +
                ((d as AbSplitNodeData).holdoutEnabled ? (d as AbSplitNodeData).holdoutPercent : 0)}
              % (must be 100%)
            </p>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={(d as AbSplitNodeData).holdoutEnabled}
                onChange={(e) => patch({ holdoutEnabled: e.target.checked } as Partial<AbSplitNodeData>)}
              />
              Include holdout (receives nothing)
            </label>
            {(d as AbSplitNodeData).holdoutEnabled && (
              <input
                type="number"
                min={0}
                max={100}
                value={(d as AbSplitNodeData).holdoutPercent}
                onChange={(e) => patch({ holdoutPercent: Number(e.target.value) || 0 } as Partial<AbSplitNodeData>)}
                className="mt-2 w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
              />
            )}
            <p className="mt-3 text-[11px] font-semibold text-text-secondary">Winner selection</p>
            <label className="mt-1 flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="win"
                checked={(d as AbSplitNodeData).winnerMode === 'manual'}
                onChange={() => patch({ winnerMode: 'manual' } as Partial<AbSplitNodeData>)}
              />
              Manual — I will pick the winner
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="win"
                checked={(d as AbSplitNodeData).winnerMode === 'auto'}
                onChange={() => patch({ winnerMode: 'auto' } as Partial<AbSplitNodeData>)}
              />
              Auto — promote at confidence %
            </label>
            {(d as AbSplitNodeData).winnerMode === 'auto' && (
              <input
                type="number"
                min={80}
                max={99}
                value={(d as AbSplitNodeData).autoConfidence}
                onChange={(e) => patch({ autoConfidence: Number(e.target.value) || 95 } as Partial<AbSplitNodeData>)}
                className="mt-2 w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
              />
            )}
            <select
              value={(d as AbSplitNodeData).winnerMetric}
              onChange={(e) =>
                patch({ winnerMetric: e.target.value as AbSplitNodeData['winnerMetric'] } as Partial<AbSplitNodeData>)
              }
              className="mt-2 w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
            >
              <option value="conversion">Conversion rate</option>
              <option value="click">Click rate</option>
              <option value="open">Open rate</option>
            </select>
          </Section>
        )}

        {d.kind === 'api_webhook' && (
          <>
            <Section title="Request">
              <div className="flex gap-2 text-sm">
                {(['GET', 'POST', 'PUT'] as const).map((m) => (
                  <label key={m} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="meth"
                      checked={(d as ApiWebhookNodeData).method === m}
                      onChange={() => patch({ method: m } as Partial<ApiWebhookNodeData>)}
                    />
                    {m}
                  </label>
                ))}
              </div>
              <label className="mt-2 block text-[11px] text-text-secondary">
                URL
                <input
                  value={(d as ApiWebhookNodeData).url}
                  onChange={(e) => patch({ url: e.target.value } as Partial<ApiWebhookNodeData>)}
                  className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1 text-sm"
                  placeholder="https://"
                />
              </label>
              <p className="mt-2 text-[10px] text-text-secondary">Headers</p>
              {(d as ApiWebhookNodeData).headers.map((h, i) => (
                <div key={i} className="mb-1 flex gap-1">
                  <input
                    value={h.key}
                    onChange={(e) => {
                      const headers = [...(d as ApiWebhookNodeData).headers];
                      headers[i] = { ...h, key: e.target.value };
                      patch({ headers } as Partial<ApiWebhookNodeData>);
                    }}
                    className="w-1/3 rounded border border-[#E5E7EB] px-1 py-0.5 text-xs"
                    placeholder="Key"
                  />
                  <input
                    value={h.value}
                    onChange={(e) => {
                      const headers = [...(d as ApiWebhookNodeData).headers];
                      headers[i] = { ...h, value: e.target.value };
                      patch({ headers } as Partial<ApiWebhookNodeData>);
                    }}
                    className="flex-1 rounded border border-[#E5E7EB] px-1 py-0.5 text-xs"
                    placeholder="Value"
                  />
                </div>
              ))}
              <button
                type="button"
                className="mt-1 text-xs text-cyan hover:underline"
                onClick={() =>
                  patch({
                    headers: [...(d as ApiWebhookNodeData).headers, { key: '', value: '' }],
                  } as Partial<ApiWebhookNodeData>)
                }
              >
                + Add header
              </button>
              <label className="mt-2 block text-[11px] text-text-secondary">
                Body (JSON)
                <textarea
                  value={(d as ApiWebhookNodeData).bodyJson}
                  onChange={(e) => patch({ bodyJson: e.target.value } as Partial<ApiWebhookNodeData>)}
                  rows={5}
                  className="mt-0.5 w-full rounded border border-[#E5E7EB] px-2 py-1 font-mono text-xs"
                />
              </label>
              <p className="mt-1 text-[10px] text-text-secondary">Insert:</p>
              <div className="flex flex-wrap gap-1">
                {['{{contact.phone}}', '{{contact.name}}', '{{campaign.id}}'].map((tok) => (
                  <button
                    key={tok}
                    type="button"
                    className="rounded border border-[#E5E7EB] px-1.5 py-0.5 font-mono text-[10px] hover:bg-[#F9FAFB]"
                    onClick={() =>
                      patch({
                        bodyJson: `${(d as ApiWebhookNodeData).bodyJson}${tok}`,
                      } as Partial<ApiWebhookNodeData>)
                    }
                  >
                    {tok}
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Response mapping">
              {(d as ApiWebhookNodeData).responseMap.map((row, i) => (
                <div key={i} className="mb-1 flex gap-1">
                  <input
                    value={row.path}
                    onChange={(e) => {
                      const responseMap = [...(d as ApiWebhookNodeData).responseMap];
                      responseMap[i] = { ...row, path: e.target.value };
                      patch({ responseMap } as Partial<ApiWebhookNodeData>);
                    }}
                    className="w-1/2 rounded border border-[#E5E7EB] px-1 py-0.5 text-xs"
                    placeholder="$.data.score"
                  />
                  <input
                    value={row.attribute}
                    onChange={(e) => {
                      const responseMap = [...(d as ApiWebhookNodeData).responseMap];
                      responseMap[i] = { ...row, attribute: e.target.value };
                      patch({ responseMap } as Partial<ApiWebhookNodeData>);
                    }}
                    className="flex-1 rounded border border-[#E5E7EB] px-1 py-0.5 text-xs"
                    placeholder="attribute"
                  />
                </div>
              ))}
              <button
                type="button"
                className="mt-1 text-xs text-cyan hover:underline"
                onClick={() =>
                  patch({
                    responseMap: [...(d as ApiWebhookNodeData).responseMap, { path: '', attribute: '' }],
                  } as Partial<ApiWebhookNodeData>)
                }
              >
                + Add mapping
              </button>
            </Section>
            <Section title="On failure">
              {(['continue', 'stop', 'error_path'] as const).map((m) => (
                <label key={m} className="mt-1 flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="fail"
                    checked={(d as ApiWebhookNodeData).onFailure === m}
                    onChange={() => patch({ onFailure: m } as Partial<ApiWebhookNodeData>)}
                  />
                  {m === 'continue' && 'Continue journey'}
                  {m === 'stop' && 'Stop contact at this step'}
                  {m === 'error_path' && 'Route to error path'}
                </label>
              ))}
            </Section>
          </>
        )}

        {d.kind === 'update_contact' && (
          <Section title="Attribute updates">
            {(d as UpdateContactNodeData).updates.map((u, i) => (
              <div key={i} className="mb-2 flex flex-col gap-1 rounded border border-[#E5E7EB] p-2">
                <select
                  value={u.attribute}
                  onChange={(e) => {
                    const updates = [...(d as UpdateContactNodeData).updates];
                    updates[i] = { ...u, attribute: e.target.value };
                    patch({ updates } as Partial<UpdateContactNodeData>);
                  }}
                  className="rounded border border-[#E5E7EB] px-1 py-1 text-xs"
                >
                  {CONTACT_ATTRS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <input
                  value={u.value}
                  onChange={(e) => {
                    const updates = [...(d as UpdateContactNodeData).updates];
                    updates[i] = { ...u, value: e.target.value };
                    patch({ updates } as Partial<UpdateContactNodeData>);
                  }}
                  className="rounded border border-[#E5E7EB] px-2 py-1 text-xs"
                />
                <select
                  value={u.mode}
                  onChange={(e) => {
                    const updates = [...(d as UpdateContactNodeData).updates];
                    updates[i] = { ...u, mode: e.target.value as 'set' | 'increment' | 'append' };
                    patch({ updates } as Partial<UpdateContactNodeData>);
                  }}
                  className="rounded border border-[#E5E7EB] px-1 py-1 text-xs"
                >
                  <option value="set">Set value</option>
                  <option value="increment">Increment</option>
                  <option value="append">Append to list</option>
                </select>
              </div>
            ))}
            <button
              type="button"
              className="text-xs text-cyan hover:underline"
              onClick={() =>
                patch({
                  updates: [...(d as UpdateContactNodeData).updates, { attribute: 'tags', value: '', mode: 'set' }],
                } as Partial<UpdateContactNodeData>)
              }
            >
              + Add update
            </button>
          </Section>
        )}

        {![
          'voice_agent',
          'chat_agent',
          'whatsapp_message',
          'sms',
          'wait',
          'condition',
          'ab_split',
          'api_webhook',
          'update_contact',
        ].includes(d.kind) && (
          <Section title="Details">
            <p className="text-xs leading-relaxed text-text-secondary">
              Configure this step in context of your campaign. Connect handles on the canvas to define what happens
              next.
            </p>
          </Section>
        )}
      </div>
    </aside>
  );
}
