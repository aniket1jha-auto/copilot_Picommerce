'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Trash2,
  Copy,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import type { ChannelType } from '@/types';
import type { CampaignData } from './CampaignWizard';
import type { WaterfallStep } from '@/components/waterfall/WaterfallStepList';
import { ChannelIcon } from '@/components/common/ChannelIcon';
import { Toast } from '@/components/common/Toast';
import { channels as ALL_CHANNELS, PLATFORM_REACHABILITY_RATES } from '@/data/channels';
import { usePhaseData } from '@/hooks/usePhaseData';
import { formatINR } from '@/utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubSegment {
  id: string;
  name: string;
  userCount: number;
  percentage: number;
  tags: string[];
  primaryChannel: ChannelType;
  journey: WaterfallStep[];
  estimatedCost: number;
  group: string;
  reason: string; // why this sub-segment was created
  /** Window when the sequence runs (e.g. "9-11 AM IST"). Used in the details strip. */
  timing?: string;
  /** Estimated conversion rate (0-100). Used in the details strip. */
  conversionPct?: number;
}

interface CampaignPlanStepProps {
  campaignData: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
}

type SortOption = 'users_desc' | 'cost_desc' | 'journey_length_desc';

// ─── Constants ────────────────────────────────────────────────────────────────

const WAIT_DURATION_OPTIONS = [
  { value: '6h', label: '6 hours' },
  { value: '12h', label: '12 hours' },
  { value: '24h', label: '24 hours' },
  { value: '48h', label: '48 hours' },
  { value: '72h', label: '72 hours' },
  { value: '96h', label: '96 hours' },
  { value: '7d', label: '7 days' },
];

const TRIGGER_CONDITION_OPTIONS = [
  { value: 'no_response', label: 'No Response' },
  { value: 'seen_no_action', label: 'Seen No Action' },
  { value: 'partial_engagement', label: 'Partial Engagement' },
  { value: 'after_wait_period', label: 'After Wait Period' },
];

const RETRY_GAP_OPTIONS = [
  { value: '1h', label: '1h' },
  { value: '3h', label: '3h' },
  { value: '6h', label: '6h' },
  { value: '12h', label: '12h' },
  { value: '24h', label: '24h' },
  { value: '48h', label: '48h' },
];

const RESPONSE_RATE_BY_DURATION: Record<string, number> = {
  '6h': 12,
  '12h': 22,
  '24h': 38,
  '48h': 52,
  '72h': 61,
  '96h': 67,
  '7d': 78,
};


// ─── Helpers ──────────────────────────────────────────────────────────────────

// formatINR consolidated to @/utils/format (Phase 1.7).
// formatINRCompact and formatINR were near-identical; standardized on the
// shared utility's precision (.toFixed(1) with stripTrailingZero).
const formatINRCompact = formatINR;

function getChannelColor(channelId: ChannelType): string {
  const ch = ALL_CHANNELS.find((c) => c.id === channelId);
  return ch?.color ?? '#6366F1';
}

function getChannelName(channelId: ChannelType): string {
  const ch = ALL_CHANNELS.find((c) => c.id === channelId);
  return ch?.name ?? channelId;
}

function getChannelUnitCost(channelId: ChannelType): number {
  const ch = ALL_CHANNELS.find((c) => c.id === channelId);
  return ch?.unitCost ?? 0;
}

function computeJourneyCost(journey: WaterfallStep[], userCount: number): number {
  let remaining = userCount;
  let cost = 0;
  for (const step of journey) {
    cost += getChannelUnitCost(step.channelId) * remaining;
    const responseRate = RESPONSE_RATE_BY_DURATION[step.waitDuration] ?? 38;
    remaining = Math.round(remaining * (1 - responseRate / 100));
  }
  return cost;
}

// ─── computeSubSegments ───────────────────────────────────────────────────────

function computeSubSegments(
  selectedChannels: ChannelType[],
  segmentSize: number,
  highIntentEnabled: boolean,
  highIntentCount: number,
  tentativeBudget: number,
): SubSegment[] {
  // Use demo data for a realistic 45K segment with standard channels
  const useDemo =
    segmentSize === 0 ||
    (selectedChannels.includes('whatsapp') &&
      selectedChannels.includes('sms') &&
      (selectedChannels.includes('ai_voice') || selectedChannels.includes('push_notification')));

  if (useDemo || segmentSize > 0) {
    const base = segmentSize > 0 ? segmentSize : 45000;
    const scale = base / 45000;

    const demoSegments: SubSegment[] = [
      {
        id: 'ss-1',
        name: 'High Value + WhatsApp',
        userCount: Math.round(8100 * scale),
        percentage: 18,
        tags: ['high-value', 'whatsapp-first', 'accelerated'],
        primaryChannel: 'whatsapp',
        journey: [
          { channelId: 'whatsapp', waitDuration: '24h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '12h' },
          { channelId: 'ai_voice', waitDuration: '48h', triggerCondition: 'no_response', maxRetries: 2, retryGap: '24h' },
          { channelId: 'field_executive', waitDuration: '72h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '48h' },
        ],
        estimatedCost: Math.round(142000 * scale),
        group: 'high-value',
        reason: 'High LTV, WhatsApp reachable, accelerated sequence to maximise reach',
        timing: 'Send immediately',
        conversionPct: 12.4,
      },
      {
        id: 'ss-2',
        name: 'WhatsApp \u2014 Morning Responders',
        userCount: Math.round(7400 * scale),
        percentage: 16,
        tags: ['whatsapp-first', 'morning-responder'],
        primaryChannel: 'whatsapp',
        journey: [
          { channelId: 'whatsapp', waitDuration: '48h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '12h' },
          { channelId: 'sms', waitDuration: '72h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '6h' },
          { channelId: 'ai_voice', waitDuration: '72h', triggerCondition: 'no_response', maxRetries: 2, retryGap: '24h' },
        ],
        estimatedCost: Math.round(68000 * scale),
        group: 'whatsapp-first',
        reason: 'WhatsApp reachable, peak engagement 9\u201311 AM, 6.8% conversion',
        timing: '9\u201311 AM IST',
        conversionPct: 6.8,
      },
      {
        id: 'ss-3',
        name: 'WhatsApp \u2014 Evening Responders',
        userCount: Math.round(5200 * scale),
        percentage: 12,
        tags: ['whatsapp-first', 'evening-responder'],
        primaryChannel: 'whatsapp',
        journey: [
          { channelId: 'whatsapp', waitDuration: '48h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '12h' },
          { channelId: 'sms', waitDuration: '72h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '6h' },
          { channelId: 'ai_voice', waitDuration: '72h', triggerCondition: 'no_response', maxRetries: 2, retryGap: '24h' },
        ],
        estimatedCost: Math.round(48000 * scale),
        group: 'whatsapp-first',
        reason: 'WhatsApp reachable, peak engagement 5\u20139 PM, evening delivery',
        timing: '5\u20139 PM IST',
        conversionPct: 5.9,
      },
      {
        id: 'ss-4',
        name: 'WhatsApp \u2014 Weekend Active',
        userCount: Math.round(4800 * scale),
        percentage: 11,
        tags: ['whatsapp-first', 'weekend-active'],
        primaryChannel: 'whatsapp',
        journey: [
          { channelId: 'whatsapp', waitDuration: '48h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '12h' },
          { channelId: 'push_notification', waitDuration: '72h', triggerCondition: 'no_response', maxRetries: 2, retryGap: '6h' },
          { channelId: 'sms', waitDuration: '72h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '6h' },
        ],
        estimatedCost: Math.round(35000 * scale),
        group: 'whatsapp-first',
        reason: 'Weekend active, has app, push as cheaper fallback before SMS',
        timing: 'Sat–Sun, 11 AM–6 PM',
        conversionPct: 5.2,
      },
      {
        id: 'ss-5',
        name: 'Push + SMS \u2014 App Users',
        userCount: Math.round(5800 * scale),
        percentage: 13,
        tags: ['push-first', 'has-app'],
        primaryChannel: 'push_notification',
        journey: [
          { channelId: 'push_notification', waitDuration: '12h', triggerCondition: 'no_response', maxRetries: 2, retryGap: '6h' },
          { channelId: 'sms', waitDuration: '48h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '6h' },
          { channelId: 'ai_voice', waitDuration: '72h', triggerCondition: 'no_response', maxRetries: 2, retryGap: '24h' },
        ],
        estimatedCost: Math.round(42000 * scale),
        group: 'push-first',
        reason: 'No WhatsApp, has app, push-first (5x cheaper than SMS)',
        timing: '10 AM–8 PM IST',
        conversionPct: 4.1,
      },
      {
        id: 'ss-6',
        name: 'SMS Only \u2014 No App',
        userCount: Math.round(6200 * scale),
        percentage: 14,
        tags: ['sms-first', 'no-app'],
        primaryChannel: 'sms',
        journey: [
          { channelId: 'sms', waitDuration: '48h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '6h' },
          { channelId: 'ai_voice', waitDuration: '72h', triggerCondition: 'no_response', maxRetries: 2, retryGap: '24h' },
        ],
        estimatedCost: Math.round(38000 * scale),
        group: 'sms-first',
        reason: 'No WhatsApp or app, SMS-only reachable, AI Voice fallback',
        timing: '10 AM–7 PM IST',
        conversionPct: 3.8,
      },
      {
        id: 'ss-7',
        name: 'SMS \u2014 Tier 3 Cities',
        userCount: Math.round(4200 * scale),
        percentage: 9,
        tags: ['sms-first', 'tier3'],
        primaryChannel: 'sms',
        journey: [
          { channelId: 'sms', waitDuration: '72h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '6h' },
          { channelId: 'ai_voice', waitDuration: '72h', triggerCondition: 'no_response', maxRetries: 2, retryGap: '24h' },
        ],
        estimatedCost: Math.round(26000 * scale),
        group: 'sms-first',
        reason: 'Tier 3 cities, slower response patterns, cost-efficient 2-step sequence',
        timing: '11 AM–6 PM IST',
        conversionPct: 3.1,
      },
      {
        id: 'ss-8',
        name: 'AI Voice Only',
        userCount: Math.round(3300 * scale),
        percentage: 7,
        tags: ['voice-first'],
        primaryChannel: 'ai_voice',
        journey: [
          { channelId: 'ai_voice', waitDuration: '72h', triggerCondition: 'no_response', maxRetries: 2, retryGap: '24h' },
          { channelId: 'sms', waitDuration: '72h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '6h' },
        ],
        estimatedCost: Math.round(22000 * scale),
        group: 'voice-first',
        reason: 'Phone-only reachable, AI Voice primary (8.5% conv), SMS follow-up',
        timing: '11 AM–7 PM IST',
        conversionPct: 8.5,
      },
    ];

    // Filter to only include sub-segments whose primary channel is selected
    // (or high-value which always appears if high-intent is on)
    const filtered = demoSegments.filter((ss) => {
      if (ss.group === 'high-value') return highIntentEnabled || selectedChannels.includes('whatsapp');
      return selectedChannels.includes(ss.primaryChannel);
    });

    // Filter journey steps to only use selected channels
    const withFilteredJourneys = filtered.map((ss) => {
      const filteredJourney = selectedChannels.length > 0
        ? ss.journey.filter((step) => selectedChannels.includes(step.channelId))
        : ss.journey;
      const journey = filteredJourney.length > 0 ? filteredJourney : ss.journey.slice(0, 1);
      return {
        ...ss,
        journey,
        estimatedCost: computeJourneyCost(journey, ss.userCount),
      };
    });

    // Budget constraint
    const totalCost = withFilteredJourneys.reduce((acc, ss) => acc + ss.estimatedCost, 0);
    if (tentativeBudget > 0 && totalCost > tentativeBudget) {
      // Remove field_executive and ai_voice from non-high-value segments
      return withFilteredJourneys.map((ss) => {
        if (ss.group === 'high-value') return ss;
        const trimmed = ss.journey.filter(
          (step) => step.channelId !== 'field_executive',
        );
        const journey = trimmed.length > 0 ? trimmed : ss.journey.slice(0, 1);
        return {
          ...ss,
          journey,
          estimatedCost: computeJourneyCost(journey, ss.userCount),
          tags: [...ss.tags, 'budget-optimized'],
        };
      });
    }

    return withFilteredJourneys;
  }

  // Generic computation for non-demo scenarios
  if (selectedChannels.length === 0 || segmentSize === 0) return [];

  const segments: SubSegment[] = [];
  let remainingUsers = segmentSize;

  if (highIntentEnabled && highIntentCount > 0) {
    const count = Math.min(highIntentCount, segmentSize);
    remainingUsers -= count;
    const journey: WaterfallStep[] = selectedChannels.map((ch) => ({
      channelId: ch,
      waitDuration: '24h',
      triggerCondition: 'no_response',
      maxRetries: 1,
      retryGap: '6h',
    }));
    segments.push({
      id: 'ss-hi',
      name: 'High Value',
      userCount: count,
      percentage: Math.round((count / segmentSize) * 100),
      tags: ['high-value'],
      primaryChannel: selectedChannels[0],
      journey,
      estimatedCost: computeJourneyCost(journey, count),
      group: 'high-value',
      reason: 'High-value users identified from your sub-segment criteria. Accelerated sequence with shorter wait times and all channels to maximise conversion.',
    });
  }

  const sortedChannels = [...selectedChannels].sort((a, b) => {
    const ra = Math.round(segmentSize * PLATFORM_REACHABILITY_RATES[a]);
    const rb = Math.round(segmentSize * PLATFORM_REACHABILITY_RATES[b]);
    return rb - ra;
  });

  sortedChannels.forEach((primaryChannel, idx) => {
    const reach = Math.round(remainingUsers * PLATFORM_REACHABILITY_RATES[primaryChannel]);
    const morning = Math.round(reach * 0.6);
    const evening = reach - morning;

    const fallbacks = sortedChannels.filter((ch) => ch !== primaryChannel);

    const morningJourney: WaterfallStep[] = [
      { channelId: primaryChannel, waitDuration: '48h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '6h' },
      ...fallbacks.slice(0, 2).map((ch) => ({
        channelId: ch,
        waitDuration: '72h' as const,
        triggerCondition: 'no_response',
        maxRetries: 1 as const,
        retryGap: '6h',
      })),
    ];

    const eveningJourney: WaterfallStep[] = [
      { channelId: primaryChannel, waitDuration: '48h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '6h' },
      ...fallbacks.slice(0, 2).map((ch) => ({
        channelId: ch,
        waitDuration: '72h' as const,
        triggerCondition: 'no_response',
        maxRetries: 1 as const,
        retryGap: '6h',
      })),
    ];

    const groupKey = `${primaryChannel.replace('_', '')}-first`;

    const chName = getChannelName(primaryChannel);
    if (morning > 0) {
      segments.push({
        id: `ss-${idx}-morning`,
        name: `${chName} — Morning Responders`,
        userCount: morning,
        percentage: Math.round((morning / segmentSize) * 100),
        tags: [`${primaryChannel}-first`, 'morning-responder'],
        primaryChannel,
        journey: morningJourney,
        estimatedCost: computeJourneyCost(morningJourney, morning),
        group: groupKey,
        reason: `Users reachable on ${chName} who historically engage most in morning hours (9-11 AM). ${chName} used as primary channel, with ${fallbacks.slice(0, 2).map((c) => getChannelName(c)).join(' and ')} as fallbacks.`,
        timing: '9–11 AM IST',
        conversionPct: 6.0,
      });
    }

    if (evening > 0) {
      segments.push({
        id: `ss-${idx}-evening`,
        name: `${chName} — Evening Responders`,
        userCount: evening,
        percentage: Math.round((evening / segmentSize) * 100),
        tags: [`${primaryChannel}-first`, 'evening-responder'],
        primaryChannel,
        journey: eveningJourney,
        estimatedCost: computeJourneyCost(eveningJourney, evening),
        group: groupKey,
        reason: `Users reachable on ${chName} who historically engage most in evening hours (5-9 PM). Same channel sequence as morning group but messages scheduled for evening delivery.`,
        timing: '5–9 PM IST',
        conversionPct: 5.5,
      });
    }
  });

  return segments;
}

// ─── Sub-cohort details strip (read-only summary + editable timing) ─────────

interface SubCohortDetailsProps {
  ss: SubSegment;
  editable: boolean;
  onTimingChange: (timing: string) => void;
}

const TIMING_OPTIONS = [
  'Send immediately',
  '9–11 AM IST',
  '11 AM–2 PM IST',
  '2–5 PM IST',
  '5–9 PM IST',
  'Sat–Sun, 11 AM–6 PM',
];

function SubCohortDetails({ ss, editable, onTimingChange }: SubCohortDetailsProps) {
  const fallback = ss.journey[1];
  const primaryStep = ss.journey[0];
  const fallbackLabel = fallback
    ? `${getChannelName(fallback.channelId)} after ${primaryStep?.waitDuration ?? '—'}`
    : 'None';
  const conv = ss.conversionPct ?? 0;
  const timing = ss.timing ?? '—';
  const isCustomTiming = ss.timing && !TIMING_OPTIONS.includes(ss.timing);

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg border border-[#E5E7EB] bg-white p-3 sm:grid-cols-3">
      <DetailField label="Sub-cohort" value={ss.name} />
      <DetailField
        label="Size"
        value={`${ss.userCount.toLocaleString('en-AE')} · ${ss.percentage}%`}
      />
      <DetailField
        label="Primary channel"
        value={
          <span className="inline-flex items-center gap-1.5 text-text-primary">
            <ChannelIcon channel={ss.primaryChannel} size={12} />
            {getChannelName(ss.primaryChannel)}
          </span>
        }
      />
      <DetailField
        label="Timing"
        value={
          editable ? (
            <select
              value={isCustomTiming ? '__custom' : ss.timing ?? ''}
              onChange={(e) => {
                if (e.target.value === '__custom') return;
                onTimingChange(e.target.value);
              }}
              className="w-full rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {!ss.timing && <option value="">Select timing…</option>}
              {isCustomTiming && <option value="__custom">{ss.timing}</option>}
              {TIMING_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            timing
          )
        }
      />
      <DetailField label="Fallback" value={fallbackLabel} />
      <DetailField
        label="Conversion (est.)"
        value={conv > 0 ? `${conv.toFixed(1)}%` : '—'}
      />
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      <span className="truncate text-xs font-medium text-text-primary">{value}</span>
    </div>
  );
}

// ─── Journey Summary (inline chips) ──────────────────────────────────────────

function JourneySummary({ journey }: { journey: WaterfallStep[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {journey.map((step, idx) => (
        <span key={idx} className="flex items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2 py-0.5 text-[11px] font-medium text-text-primary">
            <ChannelIcon channel={step.channelId} size={10} />
            {getChannelName(step.channelId)}
          </span>
          {idx < journey.length - 1 && (
            <span className="text-[10px] text-text-secondary">
              →{' '}
              <span className="font-medium text-text-primary">{step.waitDuration}</span>
              {' '}→
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── Journey Timeline (read-only) ────────────────────────────────────────────

function JourneyTimeline({ journey }: { journey: WaterfallStep[] }) {
  return (
    <div className="flex flex-col py-2">
      {journey.map((step, idx) => {
        const color = getChannelColor(step.channelId);
        const triggerLabel =
          TRIGGER_CONDITION_OPTIONS.find((o) => o.value === step.triggerCondition)?.label ??
          step.triggerCondition;
        const isLast = idx === journey.length - 1;

        return (
          <div key={idx} className="flex gap-3">
            {/* Spine */}
            <div className="flex flex-col items-center">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {idx + 1}
              </div>
              {!isLast && (
                <div className="mt-1 w-px flex-1 bg-[#E5E7EB]" style={{ minHeight: 28 }} />
              )}
            </div>

            {/* Content */}
            <div className="mb-3 flex-1">
              <div className="flex items-center gap-2">
                <ChannelIcon channel={step.channelId} size={12} />
                <span className="text-sm font-medium text-text-primary">
                  {getChannelName(step.channelId)}
                </span>
                {step.maxRetries > 0 && (
                  <span className="text-xs text-text-secondary">
                    {step.maxRetries === 1
                      ? `1 retry after ${step.retryGap}`
                      : `${step.maxRetries} retries, ${step.retryGap} apart`}
                  </span>
                )}
              </div>
              {!isLast && (
                <p className="mt-0.5 text-xs text-text-secondary">
                  Wait {step.waitDuration} · If: {triggerLabel} ↓
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* END node */}
      <div className="flex gap-3">
        <div className="flex w-6 flex-col items-center">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#E5E7EB] bg-[#F9FAFB] text-[8px] font-bold uppercase tracking-wide text-text-secondary">
            END
          </div>
        </div>
        <div className="flex items-center pb-1">
          <span className="text-xs text-text-secondary">End of journey</span>
        </div>
      </div>
    </div>
  );
}

// ─── Journey Editor (editable timeline) ──────────────────────────────────────

interface JourneyEditorProps {
  journey: WaterfallStep[];
  availableChannels: ChannelType[];
  onChange: (updated: WaterfallStep[]) => void;
}

function JourneyEditor({ journey, availableChannels, onChange }: JourneyEditorProps) {
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) {
        setAddOpen(false);
      }
    }
    if (addOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [addOpen]);

  function updateStep(idx: number, updated: WaterfallStep) {
    const next = journey.map((s, i) => (i === idx ? updated : s));
    onChange(next);
  }

  function moveStep(idx: number, dir: 'up' | 'down') {
    const next = [...journey];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  function removeStep(idx: number) {
    if (journey.length <= 1) return;
    onChange(journey.filter((_, i) => i !== idx));
  }

  function addStep(channelId: ChannelType) {
    onChange([...journey, { channelId, waitDuration: '48h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '6h' }]);
    setAddOpen(false);
  }

  return (
    <div className="flex flex-col py-2">
      {journey.map((step, idx) => {
        const color = getChannelColor(step.channelId);
        const isLast = idx === journey.length - 1;

        return (
          <div key={idx} className="flex gap-3">
            {/* Spine */}
            <div className="flex flex-col items-center">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {idx + 1}
              </div>
              {!isLast && (
                <div className="mt-1 w-px flex-1 bg-[#E5E7EB]" style={{ minHeight: 32 }} />
              )}
            </div>

            {/* Card */}
            <div className="mb-3 flex-1 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ChannelIcon channel={step.channelId} size={12} />
                  <span className="text-sm font-medium text-text-primary">
                    {getChannelName(step.channelId)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveStep(idx, 'up')}
                    disabled={idx === 0}
                    className="rounded p-0.5 text-text-secondary hover:bg-white hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => moveStep(idx, 'down')}
                    disabled={isLast}
                    className="rounded p-0.5 text-text-secondary hover:bg-white hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    onClick={() => removeStep(idx)}
                    disabled={journey.length <= 1}
                    className="rounded p-0.5 text-text-secondary hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-2 flex flex-wrap gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">
                    Wait
                  </label>
                  <select
                    value={step.waitDuration}
                    onChange={(e) => updateStep(idx, { ...step, waitDuration: e.target.value })}
                    className="rounded border border-[#E5E7EB] bg-white px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {WAIT_DURATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">
                    Trigger
                  </label>
                  <select
                    value={step.triggerCondition}
                    onChange={(e) => updateStep(idx, { ...step, triggerCondition: e.target.value })}
                    className="rounded border border-[#E5E7EB] bg-white px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {TRIGGER_CONDITION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">
                    Retries
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={step.maxRetries}
                    onChange={(e) => updateStep(idx, { ...step, maxRetries: Math.min(5, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
                    className="w-16 rounded border border-[#E5E7EB] bg-white px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                {step.maxRetries > 0 && (
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">
                      Retry Gap
                    </label>
                    <select
                      value={step.retryGap}
                      onChange={(e) => updateStep(idx, { ...step, retryGap: e.target.value })}
                      className="rounded border border-[#E5E7EB] bg-white px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      {RETRY_GAP_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Add step */}
      <div className="relative ml-9 mt-1" ref={addRef}>
        <button
          onClick={() => setAddOpen((p) => !p)}
          className="flex items-center gap-1.5 rounded-md border border-dashed border-[#D1D5DB] px-3 py-1.5 text-xs text-text-secondary hover:border-cyan-400 hover:text-cyan-500"
        >
          <Plus size={11} />
          Add Step
        </button>
        {addOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
            {availableChannels.map((ch) => (
              <button
                key={ch}
                onClick={() => addStep(ch)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-primary hover:bg-[#F9FAFB]"
              >
                <ChannelIcon channel={ch} size={11} />
                {getChannelName(ch)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Three-dot menu ───────────────────────────────────────────────────────────

interface ThreeDotMenuProps {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ThreeDotMenu({ onEdit, onDuplicate, onDelete }: ThreeDotMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex h-7 w-7 items-center justify-center rounded text-text-secondary hover:bg-[#F3F4F6] hover:text-text-primary"
        aria-label="More actions"
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[160px] rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-primary hover:bg-[#F9FAFB]"
          >
            <Pencil size={12} />
            Edit Journey
          </button>
          <button
            onClick={() => { onDuplicate(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-primary hover:bg-[#F9FAFB]"
          >
            <Copy size={12} />
            Duplicate
          </button>
          <div className="my-1 border-t border-[#E5E7EB]" />
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── SubSegmentRow ────────────────────────────────────────────────────────────

interface SubSegmentRowProps {
  ss: SubSegment;
  viewMode: 'none' | 'view' | 'edit';
  onViewToggle: () => void;
  onEditToggle: () => void;
  availableChannels: ChannelType[];
  onJourneyChange: (journey: WaterfallStep[]) => void;
  onTimingChange: (timing: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function SubSegmentRow({
  ss,
  viewMode,
  onViewToggle,
  onEditToggle,
  availableChannels,
  onJourneyChange,
  onTimingChange,
  onDuplicate,
  onDelete,
}: SubSegmentRowProps) {
  const isExpanded = viewMode !== 'none';

  return (
    <div className="border-b border-[#E5E7EB] last:border-b-0">
      {/* Header — always visible */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-[#F9FAFB] transition-colors"
        onClick={onViewToggle}
      >
        {/* Channel icon */}
        <ChannelIcon channel={ss.primaryChannel} size={18} />

        {/* Name + reason */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-text-primary">{ss.name}</span>
            <span className="rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-xs font-medium text-text-secondary">
              {ss.userCount.toLocaleString('en-AE')} users · {ss.percentage}%
            </span>
            <span className="text-xs font-medium text-text-secondary">
              {formatINR(ss.estimatedCost)}
            </span>
          </div>
          {ss.reason && (
            <p className="mt-0.5 text-xs text-text-secondary truncate">
              {ss.reason}
            </p>
          )}
        </div>

        {/* Expand chevron */}
        <ChevronRight size={16} className={['shrink-0 text-text-secondary transition-transform', isExpanded ? 'rotate-90' : ''].join(' ')} />
      </div>

      {/* Expanded content — journey summary, actions, detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key={`expand-${ss.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden border-t border-[#F3F4F6] bg-[#FAFBFC]"
          >
            <div className="px-4 py-3">
              {/* Journey summary + tags + actions */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <JourneySummary journey={ss.journey} />
                  {ss.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ss.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-[#E5E7EB] bg-white px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={onEditToggle}
                    className={[
                      'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      viewMode === 'edit'
                        ? 'border-violet-300 bg-violet-50 text-violet-700'
                        : 'border-[#E5E7EB] bg-white text-text-secondary hover:border-[#D1D5DB] hover:text-text-primary',
                    ].join(' ')}
                  >
                    <Pencil size={11} />
                    {viewMode === 'edit' ? 'Done' : 'Edit'}
                  </button>
                  <ThreeDotMenu onEdit={onEditToggle} onDuplicate={onDuplicate} onDelete={onDelete} />
                </div>
              </div>

              {/* Sub-cohort details strip */}
              <div className="mt-3">
                <SubCohortDetails
                  ss={ss}
                  editable={viewMode === 'edit'}
                  onTimingChange={onTimingChange}
                />
              </div>

              {/* Journey detail or editor */}
              <div className="mt-3">
                {viewMode === 'edit' ? (
                  <JourneyEditor journey={ss.journey} availableChannels={availableChannels} onChange={onJourneyChange} />
                ) : (
                  <JourneyTimeline journey={ss.journey} />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Create Sub-segment Panel ─────────────────────────────────────────────────

interface CreatePanelProps {
  availableChannels: ChannelType[];
  onClose: () => void;
  onCreate: (name: string, userCount: number, journey: WaterfallStep[]) => void;
}

function CreatePanel({ availableChannels, onClose, onCreate }: CreatePanelProps) {
  const [name, setName] = useState('');
  const [userCount, setUserCount] = useState('');
  const [journey, setJourney] = useState<WaterfallStep[]>([
    { channelId: availableChannels[0] ?? 'sms', waitDuration: '48h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '6h' },
  ]);

  const count = parseInt(userCount, 10);
  const canCreate = name.trim().length > 0 && count > 0 && journey.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="rounded-xl border border-violet-200 bg-violet-50 p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Create Sub-segment</h3>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-text-secondary hover:text-text-primary"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Name</label>
            <input
              type="text"
              placeholder="e.g., High Value VIP"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">User Count</label>
            <input
              type="number"
              placeholder="e.g., 5000"
              min={1}
              value={userCount}
              onChange={(e) => setUserCount(e.target.value)}
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-text-secondary">Channel Journey</label>
          <div className="rounded-lg border border-[#E5E7EB] bg-white p-3">
            <JourneyEditor
              journey={journey}
              availableChannels={availableChannels}
              onChange={setJourney}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-text-secondary hover:bg-[#F9FAFB]"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (canCreate) onCreate(name.trim(), count, journey);
            }}
            disabled={!canCreate}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Sub-segment
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main CampaignPlanStep ────────────────────────────────────────────────────

export function CampaignPlanStep({ campaignData, onUpdate }: CampaignPlanStepProps) {
  const { segments } = usePhaseData();
  const selectedSegment = segments.find((s) => s.id === campaignData.segmentId);
  const segmentSize = selectedSegment?.size ?? 45000;
  const budgetInput = campaignData.goal.tentativeBudget || '';
  const tentativeBudget = budgetInput ? parseFloat(budgetInput.replace(/[AEDaed,\s]/g, "")) * (budgetInput.toLowerCase().includes('l') ? 100000 : budgetInput.toLowerCase().includes('k') ? 1000 : 1) : 0;
  const selectedChannels = campaignData.channels;

  // Compute once on mount (deterministic)
  const initialSubSegments = useMemo(
    () =>
      computeSubSegments(
        selectedChannels,
        segmentSize,
        campaignData.highIntent.enabled,
        campaignData.highIntent.estimatedCount,
        tentativeBudget,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [subSegments, setSubSegments] = useState<SubSegment[]>(initialSubSegments);

  // Propagate to campaignData
  useEffect(() => {
    onUpdate({ waterfallConfig: { subSegments } as unknown as Record<string, unknown> });
    // Only when subSegments changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subSegments]);

  // UI state
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<ChannelType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('users_desc');
  const [expandedSegments, setExpandedSegments] = useState<
    Record<string, 'none' | 'view' | 'edit'>
  >(() => {
    // All collapsed by default to avoid information overload
    const state: Record<string, 'none' | 'view' | 'edit'> = {};
    for (const ss of initialSubSegments) {
      state[ss.id] = 'none';
    }
    return state;
  });
  const [showCreate, setShowCreate] = useState(false);
  const [showAllSegments, setShowAllSegments] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });

  // Channel filter dropdown
  const [channelFilterOpen, setChannelFilterOpen] = useState(false);
  const channelFilterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (channelFilterRef.current && !channelFilterRef.current.contains(e.target as Node)) {
        setChannelFilterOpen(false);
      }
    }
    if (channelFilterOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [channelFilterOpen]);

  // Sort dropdown
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    if (sortOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sortOpen]);

  function showToast(message: string) {
    setToast({ message, visible: true });
  }

  // Filtered + sorted sub-segments
  const filteredAndSorted = useMemo(() => {
    let list = subSegments.filter((ss) => {
      if (search && !ss.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (channelFilter !== 'all' && ss.primaryChannel !== channelFilter) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'users_desc') return b.userCount - a.userCount;
      if (sortBy === 'cost_desc') return b.estimatedCost - a.estimatedCost;
      if (sortBy === 'journey_length_desc') return b.journey.length - a.journey.length;
      return 0;
    });

    return list;
  }, [subSegments, search, channelFilter, sortBy]);

  const totalUsers = subSegments.reduce((acc, s) => acc + s.userCount, 0);
  const totalCost = subSegments.reduce((acc, s) => acc + s.estimatedCost, 0);
  const budgetPct = tentativeBudget > 0 ? Math.min(100, Math.round((totalCost / tentativeBudget) * 100)) : null;

  // Handlers

  function toggleViewMode(id: string) {
    setExpandedSegments((prev) => ({
      ...prev,
      [id]: prev[id] === 'view' ? 'none' : 'view',
    }));
  }

  function toggleEditMode(id: string) {
    setExpandedSegments((prev) => ({
      ...prev,
      [id]: prev[id] === 'edit' ? 'none' : 'edit',
    }));
  }

  function handleJourneyChange(id: string, journey: WaterfallStep[]) {
    setSubSegments((prev) =>
      prev.map((ss) =>
        ss.id === id
          ? { ...ss, journey, estimatedCost: computeJourneyCost(journey, ss.userCount) }
          : ss,
      ),
    );
  }

  function handleTimingChange(id: string, timing: string) {
    setSubSegments((prev) =>
      prev.map((ss) => (ss.id === id ? { ...ss, timing } : ss)),
    );
  }

  function handleDuplicate(ss: SubSegment) {
    const newSs: SubSegment = {
      ...ss,
      id: `ss-dup-${Date.now()}`,
      name: `${ss.name} (copy)`,
    };
    setSubSegments((prev) => {
      const idx = prev.findIndex((s) => s.id === ss.id);
      const next = [...prev];
      next.splice(idx + 1, 0, newSs);
      return next;
    });
    showToast(`Duplicated "${ss.name}"`);
  }

  function handleDelete(id: string) {
    setSubSegments((prev) => prev.filter((s) => s.id !== id));
  }

  function handleCreate(name: string, userCount: number, journey: WaterfallStep[]) {
    const newSs: SubSegment = {
      id: `ss-new-${Date.now()}`,
      name,
      userCount,
      percentage: Math.round((userCount / (totalUsers + userCount)) * 100),
      tags: ['custom'],
      primaryChannel: journey[0]?.channelId ?? 'sms',
      journey,
      estimatedCost: computeJourneyCost(journey, userCount),
      group: `${(journey[0]?.channelId ?? 'sms').replace('_', '')}-first`,
      reason: 'Manually created sub-segment with a custom journey.',
    };
    setSubSegments((prev) => [...prev, newSs]);
    setShowCreate(false);
    showToast(`Created sub-segment "${name}"`);
  }

  const sortLabels: Record<SortOption, string> = {
    users_desc: 'Users (most first)',
    cost_desc: 'Cost (highest first)',
    journey_length_desc: 'Journey length (longest first)',
  };


  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Campaign Plan</h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-text-secondary">
              <span className="font-semibold text-text-primary">{subSegments.length}</span> sub-segments
            </span>
            <span className="text-[#E5E7EB]">|</span>
            <span className="text-text-secondary">
              <span className="font-semibold text-text-primary">{totalUsers.toLocaleString('en-AE')}</span> users
            </span>
            <span className="text-[#E5E7EB]">|</span>
            <span className="font-semibold text-cyan">{formatINR(totalCost)}</span>
            {budgetPct !== null && (
              <span className="text-xs text-text-secondary">of {formatINRCompact(tentativeBudget)} ({budgetPct}%)</span>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Optimized based on channel reachability, user value, response patterns
          {tentativeBudget > 0 ? ', and budget constraints' : ''}.
          Each sub-segment follows a customized outreach journey.
        </p>
      </div>

      {/* ── Action bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            type="text"
            placeholder="Search sub-segments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        {/* Channel filter */}
        <div className="relative" ref={channelFilterRef}>
          <button
            onClick={() => setChannelFilterOpen((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-text-secondary hover:border-[#D1D5DB] hover:text-text-primary"
          >
            {channelFilter === 'all' ? (
              'Filter by channel'
            ) : (
              <>
                <ChannelIcon channel={channelFilter} size={10} />
                {getChannelName(channelFilter)}
              </>
            )}
            <ChevronDown size={12} />
          </button>
          {channelFilterOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
              <button
                onClick={() => { setChannelFilter('all'); setChannelFilterOpen(false); }}
                className="flex w-full items-center px-3 py-2 text-left text-xs text-text-primary hover:bg-[#F9FAFB]"
              >
                All channels
              </button>
              {selectedChannels.map((ch) => (
                <button
                  key={ch}
                  onClick={() => { setChannelFilter(ch); setChannelFilterOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-primary hover:bg-[#F9FAFB]"
                >
                  <ChannelIcon channel={ch} size={11} />
                  {getChannelName(ch)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-text-secondary hover:border-[#D1D5DB] hover:text-text-primary"
          >
            Sort: {sortLabels[sortBy].split(' ')[0]}
            <ChevronDown size={12} />
          </button>
          {sortOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
              {(Object.entries(sortLabels) as [SortOption, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setSortBy(val); setSortOpen(false); }}
                  className={[
                    'flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-[#F9FAFB]',
                    sortBy === val ? 'text-cyan-600 font-semibold' : 'text-text-primary',
                  ].join(' ')}
                >
                  {label}
                  {sortBy === val && <Check size={11} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Create */}
          <button
            onClick={() => setShowCreate((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-text-primary hover:border-[#D1D5DB] hover:bg-[#F9FAFB]"
          >
            <Plus size={12} />
            Create Sub-segment
          </button>
        </div>
      </div>

      {/* ── Create Panel ── */}
      <AnimatePresence>
        {showCreate && (
          <CreatePanel
            availableChannels={selectedChannels.length > 0 ? selectedChannels : ['sms', 'whatsapp']}
            onClose={() => setShowCreate(false)}
            onCreate={handleCreate}
          />
        )}
      </AnimatePresence>

      {/* ── Flat list of sub-segments ── */}
      {filteredAndSorted.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
            {(showAllSegments ? filteredAndSorted : filteredAndSorted.slice(0, 8)).map((ss) => (
              <SubSegmentRow
                key={ss.id}
                ss={ss}
                viewMode={expandedSegments[ss.id] ?? 'none'}
                onViewToggle={() => toggleViewMode(ss.id)}
                onEditToggle={() => toggleEditMode(ss.id)}
                availableChannels={selectedChannels.length > 0 ? selectedChannels : ALL_CHANNELS.map((c) => c.id)}
                onJourneyChange={(journey) => handleJourneyChange(ss.id, journey)}
                onTimingChange={(timing) => handleTimingChange(ss.id, timing)}
                onDuplicate={() => handleDuplicate(ss)}
                onDelete={() => handleDelete(ss.id)}
              />
            ))}
          </div>
          {filteredAndSorted.length > 8 && !showAllSegments && (
            <button
              type="button"
              onClick={() => setShowAllSegments(true)}
              className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2.5 text-sm font-medium text-cyan transition-colors hover:bg-[#F9FAFB]"
            >
              View All {filteredAndSorted.length} Sub-segments
            </button>
          )}
          {filteredAndSorted.length > 8 && showAllSegments && (
            <button
              type="button"
              onClick={() => setShowAllSegments(false)}
              className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-[#F9FAFB]"
            >
              Show Less
            </button>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-[#E5E7EB] py-12 text-center text-sm text-text-secondary">
          No sub-segments match your filters.
        </div>
      )}

      {/* ── Toast ── */}
      <Toast
        message={toast.message}
        type="success"
        visible={toast.visible}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </div>
  );
}
