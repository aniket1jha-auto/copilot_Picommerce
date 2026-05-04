'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { ChannelType } from '@/types';
import { SetupStep } from './SetupStep';
import { AudienceStep } from './AudienceStep';
import { ReviewStep } from './ReviewStep';
import { ContentScheduleStep } from './ContentScheduleStep';
import { JourneyBuilderStep } from './journey/JourneyBuilderStep';
import { SlimStepper } from './SlimStepper';
import type { CampaignJourneyState } from './journey/journeyTypes';
import { buildPrebuiltJourney } from './journey/journeyTemplates';
import { useCampaignStore } from '@/store/campaignStore';
import { usePhaseData } from '@/hooks/usePhaseData';
import { useToast } from '@/components/ui';

export interface HighIntentCriterion {
  id: string;
  label: string;
  attribute: string;
  operator: string;
  value: string;
  selected: boolean;
  source: 'ai_suggested' | 'custom';
}

export interface CampaignGoal {
  id: string;
  eventName: string;
  segmentType: 'realtime' | 'batch';
  description: string;
}

export type CampaignType = 'simple_send' | 'journey';

export interface CampaignData {
  campaignType: CampaignType;
  goal: {
    description: string;       // overall campaign description
    goals: CampaignGoal[];     // multiple conversion goals
    goalsOperator: 'and' | 'or'; // logic between multiple goals
    tentativeBudget: string;
  };
  name: string;
  segmentId: string;
  channels: ChannelType[];
  waterfallConfig: Record<string, unknown>;
  journey: CampaignJourneyState;
  content: Partial<Record<ChannelType, unknown>>;
  senderConfig: Partial<
    Record<
      ChannelType,
      {
        sms?: { account: string; senderId: string };
        whatsapp?: { waba: string; phoneNumber: string; messageType: 'template' | 'session' };
        rcs?: { agent: string; sender: string; fallback: 'sms' | 'none' };
        ai_voice?: {
          account: string;
          callerNumber: string;
          /** Real agentStore agent ID; replaces the old free-text `voiceAgent` field (Phase 3.8). */
          agentId: string;
          /** Fallback behavior — how to handle no-answer / agent error. */
          fallback?: {
            onNoAnswer: 'retry' | 'sms' | 'skip';
            onAgentError: 'sms' | 'skip';
          };
          retry: {
            enabled: boolean;
            maxRetries: number;
            delayValue: number;
            delayUnit: 'minutes' | 'hours';
            retryOn: { noAnswer: boolean; busy: boolean; networkError: boolean };
          };
        };
      }
    >
  >;
  schedule: {
    type: 'one-time' | 'recurring' | 'event' | 'smart_ai';
    date: string;
    time: string;
    recurringFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    recurringDay: string;
    recurringTime: string;
    event: {
      source: 'app' | 'web' | 'crm' | 'payments' | 'custom' | 'webhook';
      triggerMethod: 'event' | 'webhook';
      eventName: string;
      match: 'every' | 'first' | 'nth';
      nthOccurrence: number;
      delayMinutes: number;
      dedupeWindowValue: number;
      dedupeWindowUnit: 'seconds' | 'minutes';
      timezone: 'Asia/Kolkata' | 'UTC';
      daysOfWeek: Array<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'>;
      windowStart: string; // HH:mm
      windowEnd: string; // HH:mm
      frequencyCap: 'once' | 'once_per_day' | 'cooldown';
      cooldownHours: number;
      maxEntriesPerUser: number | null;
      allowReentry: boolean;
      endDate: string; // optional ISO date
      webhook: {
        authMethod: 'bearer' | 'hmac_sha256';
        bearerToken: string;
        hmacSecret: string;
      };
    };
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    smartGoalFocus: 'start_ai' | 'all_round' | 'custom';
  };
  voiceConfig: Record<string, unknown>;
  highIntent: {
    enabled: boolean;
    criteria: HighIntentCriterion[];
    estimatedCount: number; // estimated users matching high-intent criteria
  };
}

const INITIAL_DATA: CampaignData = {
  campaignType: 'simple_send',
  goal: {
    description: '',
    goals: [],
    goalsOperator: 'or',
    tentativeBudget: '',
  },
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
  highIntent: {
    enabled: false,
    criteria: [],
    estimatedCount: 0,
  },
};

interface Step {
  label: string;
  shortLabel: string;
}

function wizardSteps(campaignType: CampaignType): Step[] {
  if (campaignType === 'journey') {
    return [
      { label: 'Setup', shortLabel: '1' },
      { label: 'Audience', shortLabel: '2' },
      { label: 'Build Flow', shortLabel: '3' },
      { label: 'Review', shortLabel: '4' },
    ];
  }
  // simple_send — Content & Schedule split into two focused steps.
  return [
    { label: 'Setup', shortLabel: '1' },
    { label: 'Audience', shortLabel: '2' },
    { label: 'Schedule', shortLabel: '3' },
    { label: 'Channel & Content', shortLabel: '4' },
    { label: 'Review', shortLabel: '5' },
  ];
}

interface StepNavProps {
  currentStep: number;
  totalSteps: number;
  steps: Step[];
}

function StepNav({ currentStep, totalSteps, steps }: StepNavProps) {
  return (
    <nav aria-label="Campaign wizard steps">
      <ol className="flex items-center gap-0">
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <li key={step.label} className="flex flex-1 items-center">
              <div className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    isCompleted
                      ? 'bg-cyan text-white'
                      : isCurrent
                        ? 'bg-cyan text-white ring-2 ring-cyan ring-offset-2'
                        : 'bg-[#E5E7EB] text-text-secondary',
                  ].join(' ')}
                >
                  {isCompleted ? <Check size={14} strokeWidth={2.5} /> : stepNum}
                </div>
                <span
                  className={[
                    'text-xs font-medium transition-colors',
                    isCurrent
                      ? 'text-cyan'
                      : isCompleted
                        ? 'text-text-primary'
                        : 'text-text-secondary',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </div>
              {index < totalSteps - 1 && (
                <div
                  className={[
                    'h-[2px] flex-1 transition-colors',
                    isCompleted ? 'bg-cyan' : 'bg-[#E5E7EB]',
                  ].join(' ')}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 48 : -48,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -48 : 48,
    opacity: 0,
  }),
};

interface CampaignWizardProps {
  initialData?: Partial<CampaignData>;
  /** Optional step (1-based) to land on directly. Defaults to 1. */
  initialStep?: number;
}

export function CampaignWizard({ initialData, initialStep }: CampaignWizardProps = {}) {
  const navigate = useNavigate();
  const createCampaign = useCampaignStore((s) => s.createCampaign);
  const { segments } = usePhaseData();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(initialStep ?? 1);
  const [direction, setDirection] = useState(1);
  const [campaignData, setCampaignData] = useState<CampaignData>(() => ({
    ...INITIAL_DATA,
    ...initialData,
    campaignType: initialData?.campaignType ?? INITIAL_DATA.campaignType,
    goal: { ...INITIAL_DATA.goal, ...initialData?.goal },
    schedule: { ...INITIAL_DATA.schedule, ...initialData?.schedule },
    highIntent: { ...INITIAL_DATA.highIntent, ...initialData?.highIntent },
    content: { ...INITIAL_DATA.content, ...initialData?.content },
    voiceConfig: { ...INITIAL_DATA.voiceConfig, ...initialData?.voiceConfig },
    journey:
      initialData?.journey?.nodes != null
        ? {
            nodes: initialData.journey.nodes,
            edges: initialData.journey.edges ?? [],
          }
        : INITIAL_DATA.journey,
  }));

  const steps = wizardSteps(campaignData.campaignType);
  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps;

  function handleUpdate(updates: Partial<CampaignData>) {
    setCampaignData((prev) => ({ ...prev, ...updates }));
  }

  function handleNext() {
    if (isLastStep) {
      handleLaunch();
      return;
    }
    setDirection(1);
    setCurrentStep((s) => Math.min(s + 1, totalSteps));
  }

  /**
   * Phase 3.7 — real launch handler. Persists the campaign via campaignStore,
   * shows a toast, and navigates to the new campaign's detail page.
   */
  function handleLaunch() {
    const segment = segments.find((s) => s.id === campaignData.segmentId);
    const segmentSize = segment?.size ?? 0;
    // Reachable: average per-channel reachability across selected channels.
    const segmentReachable = (() => {
      if (!segment?.reachability || campaignData.channels.length === 0) {
        return segmentSize;
      }
      const sum = campaignData.channels
        .map((ch) => segment.reachability![ch] ?? 0)
        .reduce((a, b) => a + b, 0);
      return Math.round(sum / campaignData.channels.length);
    })();

    const aiVoiceCfg = campaignData.senderConfig.ai_voice?.ai_voice;
    const aiVoiceConfig =
      campaignData.channels.includes('ai_voice') && aiVoiceCfg?.agentId
        ? {
            agentId: aiVoiceCfg.agentId,
            fallback: aiVoiceCfg.fallback ?? {
              onNoAnswer: 'retry' as const,
              onAgentError: 'sms' as const,
            },
            retry: aiVoiceCfg.retry,
          }
        : undefined;

    // Cheap launch validation — surfaces as toasts, doesn't block.
    if (campaignData.channels.includes('ai_voice') && !aiVoiceConfig) {
      toast({
        kind: 'warning',
        title: 'No voice agent attached',
        body: 'AI Voice channel selected but no agent connected. Add one in Content & Schedule.',
      });
      return;
    }

    const budget = parseFloat(campaignData.goal.tentativeBudget) || 0;
    const scheduledAt = (() => {
      if (campaignData.schedule.type === 'one-time' && campaignData.schedule.date) {
        const t = campaignData.schedule.time || '10:00';
        return `${campaignData.schedule.date}T${t}:00`;
      }
      return undefined;
    })();

    const campaign = createCampaign({
      name: campaignData.name || 'Untitled Campaign',
      segmentId: campaignData.segmentId,
      segmentName: segment?.name ?? 'Unknown segment',
      segmentSize,
      segmentReachable,
      channels: campaignData.channels,
      budgetAllocated: Math.round(budget * 100_000), // tentativeBudget is entered in lakh
      scheduledAt,
      aiVoiceConfig,
    });

    toast({
      kind: 'success',
      title: `Campaign "${campaign.name}" created`,
      body: scheduledAt
        ? `Scheduled. ${segmentReachable.toLocaleString('en-IN')} contacts queued.`
        : `Saved as draft. Review and launch from the campaign detail.`,
    });

    navigate(`/campaigns/${campaign.id}`);
  }

  function handleBack() {
    if (currentStep === 1) return;
    setDirection(-1);
    setCurrentStep((s) => Math.max(s - 1, 1));
  }

  const stepProps = {
    campaignData,
    onUpdate: handleUpdate,
  };

  function handleStepJump(target: number) {
    if (target >= currentStep) return;
    setDirection(-1);
    setCurrentStep(target);
  }

  function handleSaveDraft() {
    toast({
      kind: 'success',
      title: 'Draft saved',
      body: 'Your journey is saved locally. You can pick up where you left off.',
    });
  }

  const isJourneyStep = currentStep === 3 && campaignData.campaignType === 'journey';

  if (isJourneyStep) {
    // Journey step takes over the whole wizard chrome — slim stepper + full-bleed canvas
    // + docked footer live inside JourneyBuilderStep. Negative margins reclaim page padding
    // so the canvas is genuinely edge-to-edge inside the main content area.
    return (
      <div className="-mx-8 -mb-5 flex flex-col" style={{ height: 'calc(100vh - 124px)' }}>
        <div className="shrink-0 border-b border-border-subtle bg-surface">
          <SlimStepper currentStep={currentStep} steps={steps} onStepClick={handleStepJump} />
        </div>
        <div className="min-h-0 flex-1">
          <JourneyBuilderStep
            {...stepProps}
            onBack={handleBack}
            onNext={handleNext}
            onSaveDraft={handleSaveDraft}
            isLastStep={isLastStep}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Step navigation */}
      <div className="rounded-xl bg-white p-6 ring-1 ring-[#E5E7EB]">
        <StepNav currentStep={currentStep} totalSteps={totalSteps} steps={steps} />
      </div>

      {/* Step content */}
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-[#E5E7EB]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${currentStep}-${campaignData.campaignType}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="p-6"
          >
            {currentStep === 1 && <SetupStep {...stepProps} />}
            {currentStep === 2 && <AudienceStep {...stepProps} />}
            {currentStep === 3 && campaignData.campaignType === 'simple_send' && (
              <ContentScheduleStep {...stepProps} view="schedule" />
            )}
            {currentStep === 4 && campaignData.campaignType === 'simple_send' && (
              <ContentScheduleStep {...stepProps} view="content" />
            )}
            {/* Journey campaigns only have 4 steps: their step 3 is the
                journey canvas (handled in the early-return above), and
                step 4 is Review. */}
            {currentStep === 4 && campaignData.campaignType === 'journey' && (
              <ReviewStep {...stepProps} />
            )}
            {currentStep === 5 && campaignData.campaignType === 'simple_send' && (
              <ReviewStep {...stepProps} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="inline-flex items-center rounded-md border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center rounded-md bg-cyan px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {isLastStep ? 'Launch Campaign' : 'Next'}
        </button>
      </div>

    </div>
  );
}
