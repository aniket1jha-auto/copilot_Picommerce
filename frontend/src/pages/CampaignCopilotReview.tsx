import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Rocket } from 'lucide-react';
import { useToast } from '@/components/ui';
import { usePhaseData } from '@/hooks/usePhaseData';
import { useCampaignStore } from '@/store/campaignStore';
import { useCopilotStore } from '@/store/copilotStore';
import {
  CampaignWizard as _wizardForType,
  type CampaignData,
} from '@/components/campaign/CampaignWizard';
import { JourneyBuilderStep } from '@/components/campaign/journey/JourneyBuilderStep';
import { buildPrebuiltJourney } from '@/components/campaign/journey/journeyTemplates';

// Suppress unused-import noise — we only need the type from the wizard module.
void _wizardForType;

interface CopilotReviewLocationState {
  campaignDraft?: Partial<CampaignData>;
}

/**
 * Campaign Copilot — review step.
 *
 * Renders the same journey canvas component the wizard uses, but with its
 * own minimal chrome: a copilot-styled header (no Setup/Audience/Build/Review
 * stepper) and footer actions wired to "Back to Copilot" and "Launch".
 *
 * The copilot flow is intentionally NOT the manual wizard. We don't want
 * users to fall into Setup/Audience steps from here.
 */
export function CampaignCopilotReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { segments } = usePhaseData();
  const createCampaign = useCampaignStore((s) => s.createCampaign);
  const resetCopilot = useCopilotStore((s) => s.reset);

  const draftFromState = useMemo(() => {
    const st = location.state as CopilotReviewLocationState | null;
    return st?.campaignDraft;
  }, [location.state]);

  // No draft => user landed here directly. Send them back to the chat.
  useEffect(() => {
    if (!draftFromState) {
      navigate('/campaigns/copilot', { replace: true });
    }
  }, [draftFromState, navigate]);

  const [campaignData, setCampaignData] = useState<CampaignData>(() =>
    seedCampaignData(draftFromState),
  );

  function handleUpdate(patch: Partial<CampaignData>) {
    setCampaignData((prev) => ({ ...prev, ...patch }));
  }

  function handleBackToChat() {
    navigate('/campaigns/copilot');
  }

  function handleLaunch() {
    const segment = segments.find((s) => s.id === campaignData.segmentId);
    const segmentSize = segment?.size ?? 0;
    const segmentReachable = (() => {
      if (!segment?.reachability || campaignData.channels.length === 0) {
        return segmentSize;
      }
      const sum = campaignData.channels
        .map((ch) => segment.reachability![ch] ?? 0)
        .reduce((a, b) => a + b, 0);
      return Math.round(sum / campaignData.channels.length);
    })();

    const campaign = createCampaign({
      name: campaignData.name || 'Untitled Campaign',
      segmentId: campaignData.segmentId,
      segmentName: segment?.name ?? 'Unknown segment',
      segmentSize,
      segmentReachable,
      channels: campaignData.channels,
      budgetAllocated: 0,
    });

    toast({
      kind: 'success',
      title: `Campaign "${campaign.name}" created`,
      body: 'Saved as draft. Review and launch from the campaign detail.',
    });

    // Clear the copilot session so the next visit to /campaigns/copilot
    // starts fresh.
    resetCopilot();
    navigate(`/campaigns/${campaign.id}`);
  }

  function handleSaveDraft() {
    toast({
      kind: 'success',
      title: 'Draft saved',
      body: 'Pick up where you left off — your journey is saved locally.',
    });
  }

  const segmentForDisplay = segments.find((s) => s.id === campaignData.segmentId);

  return (
    <div
      className="-mx-8 -mb-5 flex flex-col"
      style={{ height: 'calc(100vh - 124px)' }}
    >
      <CopilotReviewHeader
        campaignName={campaignData.name || 'Untitled Campaign'}
        onBack={handleBackToChat}
        onLaunch={handleLaunch}
      />
      <CampaignContextStrip
        name={campaignData.name || 'Untitled Campaign'}
        goal={campaignData.goal?.description || ''}
        audienceName={segmentForDisplay?.name}
        audienceSize={segmentForDisplay?.size}
      />
      <div className="min-h-0 flex-1">
        <JourneyBuilderStep
          campaignData={campaignData}
          onUpdate={handleUpdate}
          onBack={handleBackToChat}
          onNext={handleLaunch}
          onSaveDraft={handleSaveDraft}
          isLastStep
        />
      </div>
    </div>
  );
}

function seedCampaignData(draft: Partial<CampaignData> | undefined): CampaignData {
  // Defaults sufficient for the canvas to render. The chat already filled
  // in the meaningful pieces (name, segment, channels, journey).
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
    ...draft,
    // The spread above might overwrite our resolved journey with a partial
    // value; force the resolved one back in last.
    journey: baseJourney,
  } as unknown as CampaignData;
}

interface ContextStripProps {
  name: string;
  goal: string;
  audienceName: string | undefined;
  audienceSize: number | undefined;
}

function CampaignContextStrip({
  name,
  goal,
  audienceName,
  audienceSize,
}: ContextStripProps) {
  return (
    <div className="shrink-0 border-b border-[#E5E7EB] bg-gradient-to-r from-cyan/5 via-purple-50/40 to-transparent px-6 py-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ContextField label="Name" value={name} />
        <ContextField label="Goal" value={goal} />
        <ContextField
          label="Audience"
          value={
            audienceName
              ? `${audienceName} · ${(audienceSize ?? 0).toLocaleString('en-IN')} contacts`
              : undefined
          }
        />
      </div>
    </div>
  );
}

function ContextField({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  const filled = !!value;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
          {label}
        </span>
        <span
          className={`h-1.5 w-1.5 rounded-full ${filled ? 'bg-green-500' : 'bg-[#E5E7EB]'}`}
          aria-hidden
        />
      </div>
      <div
        className={`mt-0.5 truncate text-[13px] ${
          filled ? 'text-text-primary' : 'text-text-tertiary italic'
        }`}
        title={filled ? value : undefined}
      >
        {filled ? value : 'Not set'}
      </div>
    </div>
  );
}

interface HeaderProps {
  campaignName: string;
  onBack: () => void;
  onLaunch: () => void;
}

function CopilotReviewHeader({ campaignName, onBack, onLaunch }: HeaderProps) {
  return (
    <header className="shrink-0 border-b border-[#E5E7EB] bg-white">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Campaign Copilot"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-text-secondary transition-colors hover:border-[#D1D5DB] hover:text-text-primary"
          >
            <ArrowLeft size={14} />
            Back to Copilot
          </button>
          <div className="min-w-0 flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cyan/15 to-purple-100">
              <Sparkles size={13} className="text-cyan" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-text-primary truncate">
                {campaignName}
              </div>
              <div className="text-[10.5px] text-text-secondary">
                Review the journey · changes here apply to this campaign only
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onLaunch}
          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-cyan to-purple-500 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_12px_-4px_rgba(34,179,229,0.55)] transition-shadow hover:shadow-[0_6px_16px_-4px_rgba(34,179,229,0.7)]"
        >
          <Rocket size={14} />
          Launch campaign
        </button>
      </div>
    </header>
  );
}
