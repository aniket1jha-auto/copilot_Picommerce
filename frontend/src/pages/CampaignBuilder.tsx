import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, ChevronRight, ChevronLeft, Rocket, Save, Pencil, Check } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePhaseData } from '@/hooks/usePhaseData';
import { CopilotChatPane } from '@/components/campaign/copilot/CopilotChatPane';
import { synthesizeJourney } from '@/components/campaign/copilot/journeySynth';
import { useCopilotStore } from '@/store/copilotStore';
import { JourneyBuilderStep } from '@/components/campaign/journey/JourneyBuilderStep';
import { buildPrebuiltJourney } from '@/components/campaign/journey/journeyTemplates';
import type {
  CampaignJourneyState,
  EntryTriggerNodeData,
  JourneyFlowNode,
} from '@/components/campaign/journey/journeyTypes';
import { ENTRY_TRIGGER_KINDS } from '@/components/campaign/journey/journeyTypes';
import type { CampaignData } from '@/components/campaign/CampaignWizard';
import type { BuildingState } from '@/components/campaign/copilot/copilotFlow';
import type { Campaign } from '@/types';
import { useToast } from '@/components/ui';
import { useRecommendationsStore } from '@/store/recommendationsStore';
import { useCampaignStore } from '@/store/campaignStore';

/**
 * Unified copilot-first campaign builder.
 *
 * The journey canvas IS the campaign. Audience + schedule live on the
 * Entry node. Chat is a right-side drawer that talks to the same store
 * the canvas reads from — every chat update synthesises a journey graph
 * and merges audience/name back onto the canvas. Manual canvas edits
 * (drag, connect, configure individual nodes) take precedence and aren't
 * blown away unless the copilot explicitly redraws the step skeleton.
 */

const INITIAL_CAMPAIGN_DATA: CampaignData = {
  campaignType: 'journey',
  goal: { description: '', goals: [], goalsOperator: 'or', tentativeBudget: '' },
  name: '',
  segmentId: '',
  channels: [],
  waterfallConfig: {},
  journey: buildPrebuiltJourney('blank'),
  content: {},
  senderConfig: {},
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
  highIntent: { enabled: false, criteria: [], estimatedCount: 0 },
};

function findEntryNode(journey: CampaignJourneyState): JourneyFlowNode | undefined {
  return journey.nodes.find((n) =>
    (ENTRY_TRIGGER_KINDS as readonly string[]).includes(String((n.data as { kind?: string }).kind)),
  );
}

/** Stable signature of the chat-driven step skeleton — channel + template + wait. */
function stepSignature(steps: BuildingState['steps']): string {
  return steps
    .map((s) => `${s.channel}|${s.templateId ?? ''}|${s.waitBeforeHours ?? 0}|${s.fallback ?? ''}`)
    .join('§');
}

interface CampaignBuilderProps {
  /**
   * 'create' (default) — empty journey, "Review & launch" CTA, copilot
   * surfaces opener. 'edit' — seeds from an existing campaign and swaps
   * the CTA to "Save changes". Same canvas + chat surface in both modes
   * so users only ever learn one mental model.
   */
  mode?: 'create' | 'edit';
  /** Existing campaign to load when mode === 'edit'. */
  seedCampaign?: Campaign;
}

/**
 * Seed a CampaignData from a fully-fledged Campaign. Note that the
 * mock Campaign type doesn't currently store its journey graph, so we
 * start from a blank canvas and let the user / copilot rebuild it.
 * Audience metadata flows onto the Entry node so the campaign's
 * context is visible immediately.
 */
function campaignToBuilderData(campaign: Campaign): CampaignData {
  const journey = buildPrebuiltJourney('blank');
  const entry = journey.nodes.find((n) =>
    (ENTRY_TRIGGER_KINDS as readonly string[]).includes(String((n.data as { kind?: string }).kind)),
  );
  if (entry) {
    entry.data = {
      ...entry.data,
      audienceId: campaign.audience.segmentId,
      audienceName: campaign.audience.segmentName,
      audienceSize: campaign.audience.size,
    };
  }
  return {
    ...INITIAL_CAMPAIGN_DATA,
    name: campaign.name,
    segmentId: campaign.audience.segmentId,
    channels: campaign.channels,
    journey,
  };
}

export function CampaignBuilder({ mode = 'create', seedCampaign }: CampaignBuilderProps = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { segments } = usePhaseData();
  const { toast } = useToast();

  const building = useCopilotStore((s) => s.building);
  const setHandedOff = useCopilotStore((s) => s.setHandedOff);

  const isEditing = mode === 'edit' && !!seedCampaign;

  /**
   * Deep link from the campaign detail page: when a user clicks a
   * pending recommendation card on /campaigns/:id, we navigate here
   * with ?recommendationId=… so the copilot pane opens straight to
   * the Recommendations tab with that rec scrolled into view.
   */
  const initialRecommendationId = searchParams.get('recommendationId') ?? undefined;

  const [campaignData, setCampaignData] = useState<CampaignData>(() =>
    isEditing && seedCampaign ? campaignToBuilderData(seedCampaign) : INITIAL_CAMPAIGN_DATA,
  );
  // Auto-open the chat drawer when arriving with a rec to look at.
  const [chatOpen, setChatOpen] = useState(true);

  const updateCampaign = useCallback((updates: Partial<CampaignData>) => {
    setCampaignData((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Sync chat → canvas. We re-synthesize the journey only when the
   * chat-driven step skeleton changes (channel/template/wait/fallback).
   * Manual canvas edits to existing nodes are preserved because they
   * don't touch the signature. Audience + name flow through on every
   * change since they live on the Entry node and root campaign state.
   */
  const lastSigRef = useRef<string>('');
  useEffect(() => {
    const sig = stepSignature(building.steps);
    const skeletonChanged = sig !== lastSigRef.current;

    setCampaignData((prev) => {
      let nextJourney = prev.journey;

      if (skeletonChanged) {
        const synthed = synthesizeJourney(building.steps);
        nextJourney = synthed;
        lastSigRef.current = sig;
      }

      // Merge audience into the Entry node — but only fields the chat
       // has an opinion on. This keeps edit-mode seeds intact when the
       // copilot store hasn't picked anything yet.
      const entry = findEntryNode(nextJourney);
      if (entry) {
        const cur = entry.data as unknown as EntryTriggerNodeData;
        const wantAudienceId = building.segmentId ?? cur.audienceId;
        const wantName =
          building.segmentName ??
          segments.find((s) => s.id === wantAudienceId)?.name ??
          cur.audienceName;
        const wantSize =
          building.segmentSize ??
          segments.find((s) => s.id === wantAudienceId)?.size ??
          cur.audienceSize;
        const wantSchedule = building.scheduleType ?? cur.scheduleMode;

        // Merge the structured goal that the copilot parsed out of
        // free text. Like audience, we patch into the existing first
        // goal rather than replacing — that way the user's manual
        // tweaks in the panel survive subsequent chat messages.
        const existingGoal = cur.goals?.[0];
        let nextGoals = cur.goals;
        if (building.goal) {
          const merged = {
            id: existingGoal?.id ?? `goal-${Date.now().toString(36)}`,
            type: building.goal.type ?? existingGoal?.type ?? 'conversion',
            event: building.goal.event ?? existingGoal?.event ?? '',
            eventLabel: building.goal.eventLabel ?? existingGoal?.eventLabel ?? '',
            eventChannel: building.goal.eventChannel ?? existingGoal?.eventChannel ?? null,
            propertyFilters: existingGoal?.propertyFilters ?? [],
            targetValue: building.goal.targetValue || existingGoal?.targetValue || 0,
            targetUnit: building.goal.targetUnit ?? existingGoal?.targetUnit ?? 'percent',
            description:
              building.goal.description ||
              existingGoal?.description ||
              building.goalDescription ||
              '',
          };
          nextGoals = [merged, ...(cur.goals?.slice(1) ?? [])];
        }

        const goalChanged =
          JSON.stringify(cur.goals?.[0] ?? null) !== JSON.stringify(nextGoals?.[0] ?? null);
        const needsMerge =
          cur.audienceId !== wantAudienceId ||
          cur.audienceName !== wantName ||
          cur.audienceSize !== wantSize ||
          cur.scheduleMode !== wantSchedule ||
          goalChanged;
        if (needsMerge) {
          nextJourney = {
            ...nextJourney,
            nodes: nextJourney.nodes.map((n) =>
              n.id === entry.id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      audienceId: wantAudienceId,
                      audienceName: wantName,
                      audienceSize: wantSize,
                      scheduleMode: wantSchedule,
                      goals: nextGoals,
                    },
                  }
                : n,
            ),
          };
        }
      }

      return {
        ...prev,
        journey: nextJourney,
        name: building.name ?? prev.name,
        segmentId: building.segmentId ?? prev.segmentId,
        // Only narrow `channels` to what the chat captured when the
        // chat actually has steps — otherwise we'd wipe edit-mode
        // seeds the moment this effect runs.
        channels:
          building.steps.length > 0
            ? ([...new Set(building.steps.map((s) => s.channel))] as CampaignData['channels'])
            : prev.channels,
        goal: {
          ...prev.goal,
          description: building.goalDescription ?? prev.goal.description,
        },
        schedule: {
          ...prev.schedule,
          type: building.scheduleType ?? prev.schedule.type,
        },
      };
    });
  }, [building, segments]);

  function handoffToReview() {
    setHandedOff(true);
    navigate('/campaigns/copilot/review', { state: { campaignDraft: campaignData } });
  }

  function handleSaveChanges() {
    if (!seedCampaign) return;
    // Mock: in a real backend this would PATCH the campaign with the
    // updated journey, audience, channels, etc.
    toast({
      kind: 'success',
      title: 'Changes saved',
      body: `${campaignData.name || seedCampaign.name} updated. Future runs will use the new journey.`,
    });
    navigate(`/campaigns/${seedCampaign.id}`);
  }

  /**
   * Save as draft — persists the current builder state as a draft
   * campaign in the campaign store and bounces the user back to the
   * campaigns list. In edit mode this is a toast-only "saved" stub
   * since there's no diff persistence in the mock.
   */
  const createCampaign = useCampaignStore((s) => s.createCampaign);
  function handleSaveAsDraft() {
    const entry = findEntryNode(campaignData.journey);
    const entryData = entry?.data as unknown as EntryTriggerNodeData | undefined;
    const segId = entryData?.audienceId ?? campaignData.segmentId ?? '';
    const seg = segments.find((s) => s.id === segId);
    const segmentSize = entryData?.audienceSize ?? seg?.size ?? 0;
    const segmentReachable = segmentSize; // mock: assume fully reachable

    if (isEditing && seedCampaign) {
      toast({
        kind: 'success',
        title: 'Draft saved',
        body: `${campaignData.name || seedCampaign.name} — your changes are kept locally. Launch from Review when ready.`,
      });
      return;
    }

    const campaign = createCampaign({
      name: campaignData.name || 'Untitled Campaign',
      segmentId: segId,
      segmentName: entryData?.audienceName ?? seg?.name ?? 'Unknown segment',
      segmentSize,
      segmentReachable,
      channels: [...new Set(campaignData.channels)],
      budgetAllocated: 0,
      // No scheduledAt → store assigns 'draft' status.
    });
    toast({
      kind: 'success',
      title: 'Saved as draft',
      body: `${campaign.name} is in your drafts. Open it any time to keep editing.`,
    });
    navigate('/campaigns');
  }

  /* ─── Inline-editable name ────────────────────────────────────────── */
  const [nameEditing, setNameEditing] = useState(false);
  const [draftName, setDraftName] = useState(campaignData.name);
  // Keep the inline editor in sync if name changes from elsewhere
  // (e.g. the copilot setting the name via chat).
  useEffect(() => {
    if (!nameEditing) setDraftName(campaignData.name);
  }, [campaignData.name, nameEditing]);

  function commitName() {
    const next = draftName.trim();
    if (next && next !== campaignData.name) {
      updateCampaign({ name: next });
    }
    setNameEditing(false);
  }

  const audienceChip = useMemo(() => {
    const entry = findEntryNode(campaignData.journey);
    if (!entry) return null;
    const d = entry.data as unknown as EntryTriggerNodeData;
    if (!d.audienceName) return null;
    return `${d.audienceName} · ${(d.audienceSize ?? 0).toLocaleString()} contacts`;
  }, [campaignData.journey]);

  /**
   * Goal gate — Review & launch (and Save changes, while we're at it)
   * are disabled until the campaign has a primary goal with both a
   * type and an event picked.
   */
  const goalIsSet = useMemo(() => {
    const entry = findEntryNode(campaignData.journey);
    if (!entry) return false;
    const d = entry.data as unknown as EntryTriggerNodeData;
    const g = d.goals?.[0];
    return !!(g && g.type && g.event);
  }, [campaignData.journey]);

  const launchDisabledReason = !goalIsSet ? 'Set a campaign goal to continue.' : undefined;

  /**
   * Channel-mismatch recommendation. When the goal targets a specific
   * channel (e.g. "WhatsApp delivered") but the journey has no node
   * for that channel, surface a pending recommendation. `upsertPending`
   * is id-stable so this effect can run on every render without
   * duplicating cards.
   */
  const upsertPending = useRecommendationsStore((s) => s.upsertPending);
  useEffect(() => {
    if (!seedCampaign?.id) return; // recommendations are campaign-scoped
    const entry = findEntryNode(campaignData.journey);
    const goal = (entry?.data as unknown as EntryTriggerNodeData | undefined)?.goals?.[0];
    if (!goal || !goal.event) return;
    const ch = goal.eventChannel;
    if (!ch || ch === 'any') return;

    // Map goal channel → journey node kind.
    const KIND_BY_CHANNEL: Record<string, string> = {
      whatsapp: 'whatsapp_message',
      sms: 'sms',
      rcs: 'rcs_message',
      voice: 'voice_agent',
      email: 'email',
    };
    const needsKind = KIND_BY_CHANNEL[ch];
    if (!needsKind) return;

    const hasNode = campaignData.journey.nodes.some(
      (n) => (n.data as { kind?: string }).kind === needsKind,
    );
    if (hasNode) return;

    const channelLabel = ch.charAt(0).toUpperCase() + ch.slice(1);
    upsertPending({
      id: `mismatch-${seedCampaign.id}-${ch}`,
      campaignId: seedCampaign.id,
      kind: 'flow',
      title: `Your goal targets ${channelLabel} but there's no ${channelLabel} node yet`,
      description: `Goal "${goal.eventLabel}" measures ${channelLabel} traffic. Add a ${channelLabel} step to the journey so the metric has events to count.`,
      recommendation: `Add a ${channelLabel} message node before the exit.`,
      estimatedImpact: 'Unblocks goal measurement',
      risk: 'low',
    });
  }, [campaignData.journey, seedCampaign?.id, upsertPending]);

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={
          /* Editable name with pencil. Subtle on hover, clear once editing. */
          nameEditing ? (
            <div className="flex items-center gap-2">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') setNameEditing(false);
                }}
                placeholder="Untitled campaign"
                autoFocus
                className="w-full min-w-[280px] rounded-md border-b-2 border-cyan bg-transparent text-[22px] font-semibold leading-tight text-text-primary outline-none placeholder:text-text-tertiary"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={commitName}
                aria-label="Save name"
                className="rounded-md p-1 text-cyan transition-colors hover:bg-cyan/10"
              >
                <Check size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraftName(campaignData.name);
                setNameEditing(true);
              }}
              className="group inline-flex items-center gap-2 text-left"
              title="Rename campaign"
            >
              <span className="truncate">
                {campaignData.name?.trim() ||
                  (isEditing ? seedCampaign!.name : 'Untitled campaign')}
              </span>
              <Pencil
                size={14}
                className="shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
              />
            </button>
          )
        }
        subtitle={
          isEditing
            ? "Edit the journey on the canvas. Open chat to ask the copilot for changes in plain English."
            : 'Edit the journey on the canvas. Open chat to plan, pivot, or add steps in plain English.'
        }
        actions={
          <div className="flex items-center gap-2">
            {audienceChip && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan/10 px-2.5 py-1 text-[11.5px] font-medium text-cyan">
                {audienceChip}
              </span>
            )}
            <button
              type="button"
              onClick={() =>
                navigate(isEditing && seedCampaign ? `/campaigns/${seedCampaign.id}` : '/campaigns')
              }
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:border-[#D1D5DB] hover:text-text-primary"
              aria-label="Exit"
            >
              <X size={13} />
              Exit
            </button>
            <button
              type="button"
              onClick={handleSaveAsDraft}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:border-[#D1D5DB] hover:text-text-primary"
            >
              <Save size={13} />
              Save as draft
            </button>
            {isEditing ? (
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={!goalIsSet}
                title={launchDisabledReason}
                className="inline-flex items-center gap-1.5 rounded-md bg-cyan px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-cyan"
              >
                <Save size={13} />
                Save changes
              </button>
            ) : (
              <button
                type="button"
                onClick={handoffToReview}
                disabled={!goalIsSet}
                title={launchDisabledReason}
                className="inline-flex items-center gap-1.5 rounded-md bg-cyan px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-cyan"
              >
                <Rocket size={13} />
                Review and launch
              </button>
            )}
          </div>
        }
      />

      {/*
        Canvas + copilot share ONE rounded card with a single dividing
        border. No grid gap → no slice of page background showing
        between them. When the chat is collapsed, the right side
        becomes a slim vertical "open" rail instead of a button in
        the header. `flex-1` claims every pixel the parent gives us —
        no hand-tuned `calc(100vh - …)` heuristic, no dead space at
        the bottom of the viewport.
      */}
      <div
        className="flex min-h-0 flex-1 overflow-hidden rounded-xl bg-white ring-1 ring-[#E5E7EB]"
      >
        {/* Canvas — the campaign itself */}
        <div className="relative min-w-0 flex-1">
          <JourneyBuilderStep
            campaignData={campaignData}
            onUpdate={updateCampaign}
            hideFooter
            hideStarter
          />
        </div>

        {/* Right side — either the full copilot pane or a slim rail. */}
        {chatOpen ? (
          <div
            className="relative flex flex-col border-l border-[#E5E7EB]"
            style={{ width: 380, transition: 'width 220ms ease' }}
          >
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="Collapse copilot"
              className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <ChevronRight size={15} />
            </button>
            <CopilotChatPane
              onFinalize={() => handoffToReview()}
              campaignId={seedCampaign?.id}
              initialRecommendationId={initialRecommendationId}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            aria-label="Open copilot"
            className="group flex w-9 shrink-0 cursor-pointer flex-col items-center justify-center border-l border-[#E5E7EB] bg-white text-text-tertiary transition-colors hover:bg-cyan/5 hover:text-cyan"
          >
            <ChevronLeft size={16} />
            <span
              className="mt-2 text-[11px] font-medium tracking-wide text-text-tertiary group-hover:text-cyan"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Open copilot
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
