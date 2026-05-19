import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Rocket,
  Users,
  Target,
  Calendar,
  Radio,
  Workflow,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, useToast } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { ChannelIcon } from '@/components/common/ChannelIcon';
import { usePhaseData } from '@/hooks/usePhaseData';
import { useCampaignStore } from '@/store/campaignStore';
import { useCopilotStore } from '@/store/copilotStore';
import {
  type CampaignData,
} from '@/components/campaign/CampaignWizard';
import { buildPrebuiltJourney } from '@/components/campaign/journey/journeyTemplates';
import { validateJourney } from '@/components/campaign/journey/journeyValidation';
import { ENTRY_TRIGGER_KINDS } from '@/components/campaign/journey/journeyTypes';
import type {
  EntryTriggerNodeData,
  Goal,
  JourneyFlowNode,
  JourneyNodeKind,
} from '@/components/campaign/journey/journeyTypes';
import type { ChannelType } from '@/types';

/**
 * Campaign Copilot — Review & Launch.
 *
 * Read-only summary of everything the user has assembled in the
 * canvas + chat. Shows the campaign's meta in a 2×2 "Campaign so far"
 * grid (Audience / Goal / Schedule / Channels), a condensed journey
 * preview that scales to huge journeys, and a single "Launch campaign"
 * primary CTA at the bottom.
 *
 * The old version of this page tried to re-render the journey canvas
 * here — that surfaced the "Start from template / Start from scratch"
 * starter modal because the canvas thought it was empty. We dropped
 * the canvas entirely; the user goes back to the builder to make
 * structural edits.
 */

interface ReviewLocationState {
  campaignDraft?: Partial<CampaignData>;
}

const SCHEDULE_LABEL: Record<string, string> = {
  smart_ai: 'Smart + AI',
  recurring: 'Recurring',
  'one-time': 'One time',
  event: 'Event-based',
};

const GOAL_TYPE_LABEL: Record<string, string> = {
  conversion: 'Conversion',
  engagement: 'Engagement',
  delivery: 'Delivery',
  custom: 'Custom',
};

const NODE_KIND_LABEL: Partial<Record<JourneyNodeKind, string>> = {
  whatsapp_message: 'WhatsApp',
  sms: 'SMS',
  rcs_message: 'RCS',
  email: 'Email',
  push: 'Push',
  in_app: 'In-App',
  voice_agent: 'Voice agent',
  chat_agent: 'Chat agent',
  wait: 'Wait',
  condition: 'Condition',
  ab_split: 'A/B split',
  api_webhook: 'API webhook',
  update_contact: 'Update contact',
  goto: 'Go to',
  exit: 'Exit',
  note: 'Note',
};

/** Map a journey node kind to a channel for the channel summary card. */
const KIND_TO_CHANNEL: Partial<Record<JourneyNodeKind, ChannelType>> = {
  whatsapp_message: 'whatsapp',
  sms: 'sms',
  rcs_message: 'rcs',
  email: 'whatsapp', // no dedicated email ChannelType; fall back
  push: 'push_notification',
  in_app: 'in_app_banner',
  voice_agent: 'ai_voice',
};

const JOURNEY_PREVIEW_LIMIT = 6;

export function CampaignCopilotReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { segments } = usePhaseData();
  const createCampaign = useCampaignStore((s) => s.createCampaign);
  const resetCopilot = useCopilotStore((s) => s.reset);

  const draft = useMemo(() => {
    const st = location.state as ReviewLocationState | null;
    return st?.campaignDraft;
  }, [location.state]);

  // Hitting the URL directly with no draft → bounce back to the builder.
  useEffect(() => {
    if (!draft) navigate('/campaigns/new', { replace: true });
  }, [draft, navigate]);

  const campaign = useMemo(() => seedCampaignData(draft), [draft]);

  // Resolve segment for richer audience info (reach + reachability).
  const segment = segments.find((s) => s.id === campaign.segmentId);

  // Pull the goal off the entry node (Phase: goal-on-entry-node).
  const entry: JourneyFlowNode | undefined = campaign.journey.nodes.find((n) =>
    (ENTRY_TRIGGER_KINDS as readonly string[]).includes(String((n.data as { kind?: string }).kind)),
  );
  const entryData = entry?.data as unknown as EntryTriggerNodeData | undefined;
  const goal: Goal | undefined = entryData?.goals?.[0];

  // Validation runs on every render so the Launch button knows when to disable.
  const validation = useMemo(
    () => validateJourney(campaign.journey.nodes, campaign.journey.edges),
    [campaign.journey.nodes, campaign.journey.edges],
  );
  const hasGoal = !!(goal && goal.type && goal.event);
  const launchReady = validation.issues.length === 0 && hasGoal;

  function handleLaunch() {
    const segmentSize = segment?.size ?? entryData?.audienceSize ?? 0;
    const segmentReachable = segmentSize; // mock — assume reachability ≈ size

    const created = createCampaign({
      name: campaign.name || 'Untitled Campaign',
      segmentId: campaign.segmentId,
      segmentName: segment?.name ?? entryData?.audienceName ?? 'Unknown segment',
      segmentSize,
      segmentReachable,
      channels: campaign.channels,
      budgetAllocated: 0,
    });
    toast({
      kind: 'success',
      title: `${created.name} launched`,
      body: 'Campaign is live. Monitor performance under Observe → Performance.',
    });
    resetCopilot();
    navigate(`/campaigns/${created.id}`);
  }

  if (!draft) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="flex flex-col gap-6 pb-12"
    >
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-cyan transition-colors"
        >
          <ArrowLeft size={14} />
          Back to builder
        </button>

        <PageHeader
          title={
            <div className="flex items-center gap-3">
              <span>{campaign.name || 'Untitled Campaign'}</span>
              <span className="inline-flex items-center rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
                Draft
              </span>
            </div>
          }
          subtitle="Review the campaign before launch. Use Back to builder to change anything."
          actions={
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Rocket size={14} />}
              disabled={!launchReady}
              onClick={handleLaunch}
              title={
                !hasGoal
                  ? 'Set a campaign goal to continue.'
                  : validation.issues.length > 0
                    ? `${validation.issues.length} issue${validation.issues.length === 1 ? '' : 's'} to resolve.`
                    : undefined
              }
            >
              Launch campaign
            </Button>
          }
        />
      </div>

      {/* Validation banner — shown only if there's something to fix. */}
      {!launchReady && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              {validation.issues.length > 0 || !hasGoal ? 'A few things to resolve' : 'Almost ready'}
            </p>
            <ul className="mt-1 list-disc pl-4 text-[12.5px] text-amber-800">
              {!hasGoal && <li>Set a campaign goal on the entry node.</li>}
              {validation.issues.map((iss) => (
                <li key={iss.id}>{iss.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ─── Campaign so far ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Campaign so far
          </h2>
          <p className="mt-0.5 text-[12px] text-text-tertiary">
            Quick read of the most important pieces. Open the builder if you need full detail.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetaCard
            icon={Users}
            label="Audience"
            primary={entryData?.audienceName ?? segment?.name ?? '—'}
            secondary={
              entryData?.audienceSize !== undefined
                ? `${entryData.audienceSize.toLocaleString()} contacts`
                : segment?.size
                  ? `${segment.size.toLocaleString()} contacts`
                  : 'No audience selected'
            }
            tone={entryData?.audienceId ? 'set' : 'missing'}
          />
          <MetaCard
            icon={Target}
            label="Goal"
            primary={goal && goal.type && goal.event ? GOAL_TYPE_LABEL[goal.type] : '—'}
            secondary={
              goal && goal.event ? `on ${goal.eventLabel || goal.event}` : 'No goal set'
            }
            tone={hasGoal ? 'set' : 'missing'}
          />
          <MetaCard
            icon={Calendar}
            label="Schedule"
            primary={SCHEDULE_LABEL[entryData?.scheduleMode ?? 'one-time'] ?? '—'}
            secondary={scheduleHint(entryData)}
            tone={entryData?.scheduleMode ? 'set' : 'missing'}
          />
          <MetaCard
            icon={Radio}
            label="Channels"
            primary={
              campaign.channels.length > 0
                ? `${campaign.channels.length} channel${campaign.channels.length === 1 ? '' : 's'}`
                : '—'
            }
            secondary={
              campaign.channels.length > 0 ? (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  {campaign.channels.slice(0, 4).map((ch) => (
                    <span
                      key={ch}
                      className="inline-flex items-center gap-1 rounded-full bg-cyan/10 px-1.5 py-0.5 text-[10.5px] font-medium text-cyan"
                    >
                      <ChannelIcon channel={ch} size={10} />
                      {channelShort(ch)}
                    </span>
                  ))}
                  {campaign.channels.length > 4 && (
                    <span className="text-[10.5px] text-text-tertiary">
                      +{campaign.channels.length - 4}
                    </span>
                  )}
                </span>
              ) : (
                'No channels yet'
              )
            }
            tone={campaign.channels.length > 0 ? 'set' : 'missing'}
          />
        </div>
      </section>

      {/* Optional goal description (only renders when present — adds context for reviewers) */}
      {goal?.description && (
        <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
            Why this matters
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-text-primary">{goal.description}</p>
        </section>
      )}

      {/* ─── Journey overview ────────────────────────────────────────────── */}
      <JourneyOverview
        nodes={campaign.journey.nodes}
        edgeCount={campaign.journey.edges.length}
      />

      {/* ─── Bottom CTAs ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-[#D1D5DB] hover:text-text-primary"
        >
          <ArrowLeft size={14} />
          Back to builder
        </button>
        <Button
          variant="primary"
          size="md"
          iconLeft={<Rocket size={14} />}
          disabled={!launchReady}
          onClick={handleLaunch}
        >
          Launch campaign
        </Button>
      </div>
    </motion.div>
  );
}

/* ─── MetaCard ────────────────────────────────────────────────────────── */

function MetaCard({
  icon: Icon,
  label,
  primary,
  secondary,
  tone,
}: {
  icon: typeof Users;
  label: string;
  primary: React.ReactNode;
  secondary: React.ReactNode;
  tone: 'set' | 'missing';
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-[#E5E7EB] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
          <Icon size={12} className={tone === 'set' ? 'text-cyan' : 'text-text-tertiary'} />
          {label}
        </span>
        {tone === 'set' ? (
          <CheckCircle2 size={13} className="text-success" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-amber-400" aria-label="Missing" />
        )}
      </div>
      <p className="text-[15px] font-semibold leading-tight text-text-primary">{primary}</p>
      <div className="text-[12px] text-text-secondary">{secondary}</div>
    </div>
  );
}

/* ─── JourneyOverview ─────────────────────────────────────────────────── */

function JourneyOverview({
  nodes,
  edgeCount,
}: {
  nodes: JourneyFlowNode[];
  edgeCount: number;
}) {
  /**
   * Show the journey as a horizontal pill chain. We skip the entry
   * and exit nodes since those are implicit, and we cap the visible
   * pills at JOURNEY_PREVIEW_LIMIT — anything beyond that collapses
   * into a "+N more" badge. The user can expand to see the full
   * chain for review (still read-only).
   */
  const meaningful = useMemo(
    () =>
      nodes.filter((n) => {
        const kind = String((n.data as { kind?: string }).kind ?? '');
        return kind !== 'entry_trigger' && kind !== 'exit' && kind !== 'note';
      }),
    [nodes],
  );

  const [expanded, setExpanded] = useState(false);
  const showing = expanded ? meaningful : meaningful.slice(0, JOURNEY_PREVIEW_LIMIT);
  const hiddenCount = Math.max(0, meaningful.length - JOURNEY_PREVIEW_LIMIT);

  return (
    <section className="rounded-lg border border-[#E5E7EB] bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <Workflow size={14} className="text-cyan" />
            Journey
          </h3>
          <p className="mt-0.5 text-[12px] text-text-tertiary">
            {meaningful.length} step{meaningful.length === 1 ? '' : 's'} · {edgeCount}{' '}
            connection{edgeCount === 1 ? '' : 's'}
          </p>
        </div>
        {meaningful.length > JOURNEY_PREVIEW_LIMIT && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-cyan hover:underline"
          >
            {expanded ? (
              <>
                Collapse
                <ChevronUp size={12} />
              </>
            ) : (
              <>
                Show all {meaningful.length}
                <ChevronDown size={12} />
              </>
            )}
          </button>
        )}
      </div>

      {meaningful.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-3 py-4 text-center text-[12px] text-text-secondary">
          No steps yet. Head back to the builder and ask the copilot for a journey.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {showing.map((n, idx) => {
            const kind = String((n.data as { kind?: string }).kind ?? '') as JourneyNodeKind;
            const label = NODE_KIND_LABEL[kind] ?? kind;
            const customLabel = (n.data as { label?: string }).label;
            return (
              <span key={n.id} className="inline-flex items-center gap-1.5">
                <StepPill kind={kind} label={label} customLabel={customLabel} />
                {idx < showing.length - 1 && <span className="text-text-tertiary">→</span>}
              </span>
            );
          })}
          {!expanded && hiddenCount > 0 && (
            <>
              <span className="text-text-tertiary">→</span>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] font-medium text-cyan hover:border-cyan/40"
              >
                +{hiddenCount} more
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function StepPill({
  kind,
  label,
  customLabel,
}: {
  kind: JourneyNodeKind;
  label: string;
  customLabel?: string;
}) {
  const channel = KIND_TO_CHANNEL[kind];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11.5px] font-medium text-text-primary"
      title={customLabel ?? label}
    >
      {channel ? (
        <ChannelIcon channel={channel} size={11} />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-cyan" aria-hidden />
      )}
      <span className="max-w-[120px] truncate">{customLabel || label}</span>
    </span>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function channelShort(ch: ChannelType): string {
  const map: Partial<Record<ChannelType, string>> = {
    whatsapp: 'WhatsApp',
    sms: 'SMS',
    rcs: 'RCS',
    ai_voice: 'Voice',
    push_notification: 'Push',
    in_app_banner: 'In-App',
    facebook_ads: 'FB Ads',
    instagram_ads: 'IG Ads',
    field_executive: 'Field',
  };
  return map[ch] ?? ch;
}

function scheduleHint(entry: EntryTriggerNodeData | undefined): string {
  if (!entry) return 'Not scheduled';
  if (entry.scheduleMode === 'smart_ai') return 'AI picks the best time per contact';
  if (entry.scheduleMode === 'recurring') {
    return `${entry.recurringFrequency} · ${entry.recurringDay}s @ ${entry.recurringTime}`;
  }
  if (entry.scheduleMode === 'event') {
    return entry.eventName ? `On "${entry.eventName}"` : 'On a behavioral event';
  }
  if (entry.scheduleMode === 'one-time') {
    return entry.startDate ? `Starts ${entry.startDate} ${entry.startTime}` : 'Run once on launch';
  }
  return 'Not scheduled';
}

function seedCampaignData(draft: Partial<CampaignData> | undefined): CampaignData {
  // Defaults sufficient for the summary cards to render anything the
  // draft is missing. The builder already filled in the meaningful
  // pieces (name, segment, channels, journey).
  const baseJourney = draft?.journey?.nodes
    ? { nodes: draft.journey.nodes, edges: draft.journey.edges ?? [] }
    : buildPrebuiltJourney('blank');

  return {
    campaignType: 'journey',
    name: draft?.name ?? 'Untitled Campaign',
    segmentId: draft?.segmentId ?? '',
    channels: draft?.channels ?? [],
    waterfallConfig: {},
    content: {},
    senderConfig: {},
    goal: {
      description: '',
      goals: [],
      goalsOperator: 'or',
      tentativeBudget: '',
    },
    schedule: {
      type: 'smart_ai',
      date: '',
      time: '10:00',
      recurringFrequency: 'weekly',
      recurringDay: 'monday',
      recurringTime: '10:00',
      event: {
        source: 'app',
        triggerMethod: 'event',
        eventName: '',
        match: 'every',
        nthOccurrence: 2,
        delayMinutes: 0,
        dedupeWindowValue: 30,
        dedupeWindowUnit: 'seconds',
        timezone: 'Asia/Kolkata',
        daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'],
        windowStart: '09:00',
        windowEnd: '20:00',
        frequencyCap: 'cooldown',
        cooldownHours: 24,
        maxEntriesPerUser: null,
        allowReentry: true,
        endDate: '',
        webhook: { authMethod: 'bearer', bearerToken: '', hmacSecret: '' },
      },
      startDate: '',
      startTime: '10:00',
      endDate: '',
      endTime: '19:00',
      smartGoalFocus: 'start_ai',
    },
    voiceConfig: {},
    highIntent: {
      enabled: false,
      criteria: [],
      estimatedCount: 0,
    },
    journey: baseJourney,
  };
}
