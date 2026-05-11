'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Copy, RefreshCcw, Info, AlertTriangle, Zap, Link2 } from 'lucide-react';

import type { ChannelType } from '@/types';
import type { CampaignData } from './CampaignWizard';
import { ChannelIcon } from '@/components/common/ChannelIcon';
import { usePhaseData } from '@/hooks/usePhaseData';
import { channels, PLATFORM_REACHABILITY_RATES } from '@/data/channels';
import { generateSmartSubSegments } from '@/utils/smartCampaignPlan';
import { formatINR, formatChannelCost } from '@/utils/format';
import { VoiceAgentPicker } from './VoiceAgentPicker';
import { Modal } from '@/components/common/Modal';
import {
  ChannelContentEditor,
  makeInitialVariant,
} from './ChannelContentEditor';
import type { ContentVariant, TestingConfig, AnyChannelContent } from './ChannelContentEditor';
import { loadContentTemplates } from '@/utils/contentTemplatesStore';
import type { ContentTemplateRow, TemplateChannel } from '@/types/contentLibrary';
import { Link as RouterLink } from 'react-router-dom';

const EVENT_CATALOG: Array<{ source: CampaignData['schedule']['event']['source']; name: string }> = [
  { source: 'app', name: 'app_opened' },
  { source: 'app', name: 'button_clicked' },
  { source: 'web', name: 'page_viewed' },
  { source: 'web', name: 'form_submitted' },
  { source: 'payments', name: 'payment_failed' },
  { source: 'payments', name: 'payment_completed' },
  { source: 'crm', name: 'kyc_completed' },
  { source: 'crm', name: 'profile_updated' },
];

function slugifyId(input: string): string {
  const s = input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return s || 'draft';
}

function generateSecretLike(): string {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  }
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center">
      <Info size={14} className="text-text-secondary" />
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-72 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs leading-relaxed text-text-secondary shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}

function SearchableEventSelect({
  label,
  placeholder,
  value,
  selectedSource,
  onSelect,
}: {
  label: string;
  placeholder: string;
  value: string;
  selectedSource: CampaignData['schedule']['event']['source'] | null;
  onSelect: (eventName: string, source: CampaignData['schedule']['event']['source']) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const selectedMeta = EVENT_CATALOG.find((e) => e.name === value);

  const filtered = useMemo(() => {
    const base = EVENT_CATALOG.filter((e) => e.name.toLowerCase().includes(q.trim().toLowerCase()));
    if (!selectedSource) return base;
    const preferred = base.filter((e) => e.source === selectedSource);
    const rest = base.filter((e) => e.source !== selectedSource);
    return [...preferred, ...rest];
  }, [q, selectedSource]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      const k = e.source;
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-left text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
        >
          <span className="min-w-0 truncate">
            {value ? (
              <span className="inline-flex items-center gap-2">
                <span className="truncate">{value}</span>
                {selectedMeta && (
                  <span className="shrink-0 rounded-full border border-[#E5E7EB] bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                    {selectedMeta.source.toUpperCase()}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-text-secondary">{placeholder}</span>
            )}
          </span>
          <ChevronDown size={16} className={open ? 'rotate-180 text-text-secondary transition-transform' : 'text-text-secondary transition-transform'} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              className="absolute z-20 mt-2 w-full rounded-lg border border-[#E5E7EB] bg-white p-2 shadow-lg"
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={placeholder}
                className="mb-2 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
              />

              <div className="max-h-56 overflow-auto">
                {grouped.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-text-secondary">No matching events.</div>
                ) : (
                  grouped.map(([source, items]) => (
                    <div key={source} className="py-1">
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                        {String(source).toUpperCase()}
                      </div>
                      {items.map((e) => (
                        <button
                          key={`${e.source}:${e.name}`}
                          type="button"
                          onClick={() => {
                            onSelect(e.name, e.source);
                            setOpen(false);
                            setQ('');
                          }}
                          className={[
                            'flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-[#F9FAFB]',
                            e.name === value ? 'bg-cyan/10' : '',
                          ].join(' ')}
                        >
                          <span className="truncate text-text-primary">{e.name}</span>
                          <span className="ml-2 rounded-full border border-[#E5E7EB] bg-white px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                            {e.source.toUpperCase()}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SimpleDropdownSelect<T extends string>({
  label,
  placeholder,
  value,
  options,
  onChange,
  rightLink,
}: {
  label: string;
  placeholder: string;
  value: T | '';
  options: Array<{ value: T; label: string; metaRight?: React.ReactNode }>;
  onChange: (v: T) => void;
  rightLink?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-text-secondary">{label}</label>
        {rightLink}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-left text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
        >
          <span className={selected ? 'truncate' : 'truncate text-text-secondary'}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown size={16} className={open ? 'rotate-180 text-text-secondary transition-transform' : 'text-text-secondary transition-transform'} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              className="absolute z-20 mt-2 w-full rounded-lg border border-[#E5E7EB] bg-white p-2 shadow-lg"
            >
              <div className="max-h-56 overflow-auto">
                {options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={[
                      'flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-[#F9FAFB]',
                      o.value === value ? 'bg-cyan/10' : '',
                    ].join(' ')}
                  >
                    <span className="truncate text-text-primary">{o.label}</span>
                    {o.metaRight && <span className="shrink-0">{o.metaRight}</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContentScheduleStepProps {
  campaignData: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
  /**
   * Which slice of the step to render. Phase 4.x splits the original
   * combined "Content & Schedule" step into two:
   *   - 'schedule' renders the schedule mode picker, the per-mode details,
   *     and the Smart + AI window/goal-focus configuration. The
   *     "Generate suggested plan" button is intentionally hidden here.
   *   - 'content'  renders channels & message content (non-smart_ai modes)
   *     OR the auto-generated plan (smart_ai). Plan generation fires on
   *     mount when smart_ai is selected and no plan exists yet.
   *   - 'all' (default) keeps the original behavior — used by anything
   *     that hasn't migrated to the split.
   */
  view?: 'schedule' | 'content' | 'all';
}

const SMS_ACCOUNTS = ['Paytm SMS — Primary', 'Paytm SMS — Transactional', 'Custom'] as const;
const SMS_SENDER_IDS: Record<(typeof SMS_ACCOUNTS)[number], Array<{ id: string; type: 'Promotional' | 'Transactional' | 'OTP' }>> = {
  'Paytm SMS — Primary': [
    { id: 'PAYTM1', type: 'Promotional' },
    { id: 'PYTMTX', type: 'Transactional' },
  ],
  'Paytm SMS — Transactional': [{ id: 'PYTMTX', type: 'Transactional' }],
  Custom: [{ id: 'PAYTM1', type: 'Promotional' }],
};

const WABAS = [
  { id: '104XXXXXX', name: 'Paytm Financial Services' },
  { id: '107XXXXXX', name: 'Paytm Payments Bank' },
] as const;
const WABA_NUMBERS: Record<(typeof WABAS)[number]['id'], Array<{ number: string; display: string; status: 'active' | 'pending' }>> = {
  '104XXXXXX': [{ number: '+91 98XXX XXXXX', display: 'Paytm Support', status: 'active' }],
  '107XXXXXX': [{ number: '+91 97XXX XXXXX', display: 'Paytm Collections', status: 'pending' }],
};

const RCS_AGENTS = [
  { name: 'Paytm Official', verified: true },
  { name: 'Paytm Offers Agent', verified: true },
  { name: 'Paytm Test Agent', verified: false },
] as const;
const RCS_SENDERS: Record<(typeof RCS_AGENTS)[number]['name'], Array<{ label: string; note: string }>> = {
  'Paytm Official': [
    { label: '+91 98XXX XXXXX', note: 'Jio, Airtel, Vi' },
    { label: 'Short code 52XXX', note: 'Airtel only' },
  ],
  'Paytm Offers Agent': [{ label: '+91 99XXX XXXXX', note: 'Jio, Airtel, Vi' }],
  'Paytm Test Agent': [{ label: '+91 96XXX XXXXX', note: 'Jio only' }],
};

const VOICE_ACCOUNTS = ['Paytm Voice — Plivo Primary', 'Paytm Voice — Exotel Backup', 'CINFRA Internal'] as const;
const VOICE_NUMBERS: Record<(typeof VOICE_ACCOUNTS)[number], Array<{ number: string; label: string; type: 'Outbound' | 'IVR' | 'Toll-free' }>> = {
  'Paytm Voice — Plivo Primary': [{ number: '+91 80XXX XXXXX', label: 'KYC Outreach', type: 'Outbound' }],
  'Paytm Voice — Exotel Backup': [{ number: '+91 1800-XXX-XXX', label: 'Support Line', type: 'Toll-free' }],
  'CINFRA Internal': [{ number: '+91 81XXX XXXXX', label: 'Internal DID', type: 'Outbound' }],
};
// ─── Historical conversion rates (Day 30+) ───────────────────────────────────

const HISTORICAL_CONVERSION: Partial<Record<ChannelType, number>> = {
  sms: 2.1,
  whatsapp: 6.8,
  rcs: 4.2,
  ai_voice: 8.5,
};

const CONVERSION_LABEL: Partial<Record<ChannelType, string>> = {
  sms: 'avg conversion',
  whatsapp: 'avg conversion',
  rcs: 'avg conversion',
  ai_voice: 'avg conversion',
};

// ─── Utility helpers ──────────────────────────────────────────────────────────
// Currency + per-channel cost formatters live in @/utils/format and are
// imported above. Three local copies were consolidated in Phase 1.7.

// ─── AI recommendation logic ──────────────────────────────────────────────────

type RecommendationStatus = 'recommended' | 'consider' | 'not_recommended';

interface ChannelRecommendation {
  status: RecommendationStatus;
  reason: string;
}

function getChannelRecommendation(
  channelId: ChannelType,
  segmentSize: number,
  reachCount: number,
  reachPercent: number,
  conversionRate: number | null,
  tentativeBudget: number,
): ChannelRecommendation {
  const channelCost = channels.find((c) => c.id === channelId)?.unitCost ?? 0;
  const totalChannelCost = channelCost * segmentSize;

  // Low reachability — strong negative signal
  if (reachPercent < 15) {
    return {
      status: 'not_recommended',
      reason: `Low reachability — only ${reachPercent.toFixed(0)}% of your segment can be reached via this channel`,
    };
  }

  // Budget check — single channel consuming >50% of tentative budget
  if (tentativeBudget > 0 && totalChannelCost > tentativeBudget * 0.5) {
    const pctOfBudget = Math.round((totalChannelCost / tentativeBudget) * 100);
    return {
      status: 'not_recommended',
      reason: `High cost — ${formatINR(totalChannelCost)} would consume ~${pctOfBudget}% of your ${formatINR(tentativeBudget)} budget`,
    };
  }

  // Strong conversion history
  if (conversionRate !== null && conversionRate > 5) {
    return {
      status: 'recommended',
      reason: `Strong conversion history — ${conversionRate.toFixed(1)}% avg ${CONVERSION_LABEL[channelId] ?? 'avg conversion'} for this segment type`,
    };
  }

  // High reachability — good signal even without conversion data
  if (reachPercent > 60) {
    return {
      status: 'recommended',
      reason: `High reachability — ${reachPercent.toFixed(0)}% of your segment (${reachCount.toLocaleString('en-AE')} users) can be reached`,
    };
  }

  // Moderate reachability
  if (reachPercent >= 30) {
    return {
      status: 'consider',
      reason: `Moderate reachability — reaches ${reachPercent.toFixed(0)}% of your segment. Effective as part of a multi-channel sequence`,
    };
  }

  // Default
  return {
    status: 'consider',
    reason: `Reaches ${reachPercent.toFixed(0)}% of your segment (${reachCount.toLocaleString('en-AE')} users). Consider pairing with higher-reach channels`,
  };
}

function RecommendationBadge({ recommendation }: { recommendation: ChannelRecommendation }) {
  const { status, reason } = recommendation;

  const config = {
    recommended: {
      dot: 'bg-emerald-500',
      text: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
      label: 'Recommended',
    },
    consider: {
      dot: 'bg-amber-400',
      text: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
      label: 'Consider',
    },
    not_recommended: {
      dot: 'bg-red-400',
      text: 'text-red-600',
      bg: 'bg-red-50 border-red-200',
      label: 'Not recommended',
    },
  }[status];

  return (
    <span
      className={`group relative inline-flex cursor-default items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${config.bg} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} />
      {config.label}
      {/* Tooltip */}
      <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-1.5 hidden w-64 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-normal leading-relaxed text-text-secondary shadow-lg group-hover:block">
        {reason}
      </span>
    </span>
  );
}

// ─── ChannelRow ───────────────────────────────────────────────────────────────

interface ChannelRowProps {
  channelDef: (typeof channels)[number];
  isSelected: boolean;
  reachCount: number | null;
  reachPercent: number | null;
  conversionRate: number | null;
  conversionLabel: string;
  recommendation: ChannelRecommendation | null;
  isExpanded: boolean;
  onToggle: () => void;
  onExpandToggle: () => void;
  senderSummary: { text: string; isSet: boolean };
  showScrollToSender: boolean;
  onSenderBlockConsumed: () => void;
  senderBlock: React.ReactNode;
  // Content config props
  audienceSize: number;
  variants: ContentVariant[];
  testing: TestingConfig;
  onVariantsChange: (v: ContentVariant[]) => void;
  onTestingChange: (t: TestingConfig) => void;
  onPrimaryContentChange: (c: AnyChannelContent) => void;
}

function channelKindTag(channelDef: (typeof channels)[number]): string {
  if (channelDef.id === 'ai_voice') return 'Voice';
  return channelDef.type === 'physical' ? 'Physical' : 'Digital';
}

function ChannelRow({
  channelDef,
  isSelected,
  reachCount,
  reachPercent,
  conversionRate,
  conversionLabel,
  recommendation,
  isExpanded,
  onToggle,
  onExpandToggle,
  senderSummary,
  showScrollToSender,
  onSenderBlockConsumed,
  senderBlock,
  audienceSize,
  variants,
  testing,
  onVariantsChange,
  onTestingChange,
  onPrimaryContentChange,
}: ChannelRowProps) {
  const [insightOpen, setInsightOpen] = useState(false);
  const costLabel = formatChannelCost(channelDef.id, channelDef.unitCost);
  const senderRef = useRef<HTMLDivElement | null>(null);
  const [senderPulse, setSenderPulse] = useState(false);

  useEffect(() => {
    if (!isExpanded || !showScrollToSender) return;
    window.setTimeout(() => {
      senderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setSenderPulse(true);
      window.setTimeout(() => setSenderPulse(false), 900);
      onSenderBlockConsumed();
    }, 30);
  }, [isExpanded, showScrollToSender, onSenderBlockConsumed]);

  const borderColor = recommendation
    ? { recommended: '#10B981', consider: '#F59E0B', not_recommended: '#EF4444' }[recommendation.status]
    : '#E5E7EB';

  const insightTextClass = recommendation
    ? {
        recommended: 'text-emerald-700',
        consider: 'text-amber-800',
        not_recommended: 'text-red-600',
      }[recommendation.status]
    : 'text-text-secondary';

  const statsLine = (
    <p className="text-[11px] leading-snug text-text-secondary">
      <span className="font-medium text-text-secondary">
        Sender:{' '}
        <span className={senderSummary.isSet ? 'text-text-secondary' : 'text-amber-700 font-semibold'}>
          {senderSummary.text}
        </span>
      </span>
      <span className="mx-1.5 text-[#D1D5DB]">·</span>
      <span className="font-medium text-text-primary/90">{costLabel}</span>
      <span className="mx-1.5 text-[#D1D5DB]">·</span>
      {reachCount !== null && reachPercent !== null ? (
        <>
          <span>{reachCount.toLocaleString('en-AE')} reachable</span>
          <span className="mx-1.5 text-[#D1D5DB]">·</span>
          <span>{reachPercent.toFixed(0)}% reach</span>
        </>
      ) : (
        <>
          <span>Reach —</span>
        </>
      )}
      {conversionRate !== null && (
        <>
          <span className="mx-1.5 text-[#D1D5DB]">·</span>
          <span className="font-medium text-emerald-700">{conversionRate.toFixed(1)}% conv</span>
          <span> {conversionLabel}</span>
        </>
      )}
    </p>
  );

  return (
    <div
      className={[
        'rounded-xl border-2 transition-all overflow-hidden',
        isSelected ? 'bg-white shadow-sm' : 'bg-[#FAFBFC]',
      ].join(' ')}
      style={{
        borderColor: isSelected ? '#00BAF2' : borderColor,
        borderLeftWidth: '4px',
        borderLeftColor: isSelected ? '#00BAF2' : borderColor,
      }}
    >
      <div className="p-4">
        {/* Row 1 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <button
              type="button"
              onClick={onToggle}
              aria-label={isSelected ? `Deselect ${channelDef.name}` : `Select ${channelDef.name}`}
              className="shrink-0"
            >
              <span
                className={[
                  'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                  isSelected ? 'border-cyan bg-cyan' : 'border-[#D1D5DB] bg-white hover:border-[#9CA3AF]',
                ].join(' ')}
              >
                {isSelected && (
                  <svg viewBox="0 0 10 8" fill="none" className="h-3 w-3">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </button>
            <span className="shrink-0">
              <ChannelIcon channel={channelDef.id} size={20} />
            </span>
            <span className={['truncate text-sm font-bold', isSelected ? 'text-text-primary' : 'text-text-secondary'].join(' ')}>
              {channelDef.name}
            </span>
            <span className="shrink-0 rounded bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-medium text-text-secondary">
              {channelKindTag(channelDef)}
            </span>
          </div>
          {recommendation && <RecommendationBadge recommendation={recommendation} />}
        </div>

        {/* Row 2 */}
        <div className="mt-1.5">{statsLine}</div>

        {/* Row 3 */}
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {recommendation ? (
              <button
                type="button"
                onClick={() => setInsightOpen((v) => !v)}
                className="w-full text-left"
              >
                <span className={`text-[11px] leading-snug ${insightTextClass}`}>
                  <span className="font-semibold">AI: </span>
                  <span className={insightOpen ? '' : 'line-clamp-1'}>{recommendation.reason}</span>
                  <span className="ml-1 inline text-text-secondary">{insightOpen ? ' ▴' : ' ▾'}</span>
                </span>
              </button>
            ) : (
              <span className="text-[11px] text-text-secondary">&nbsp;</span>
            )}
          </div>
          <button
            type="button"
            onClick={onExpandToggle}
            className={[
              'shrink-0 whitespace-nowrap text-xs font-semibold transition-colors',
              isExpanded ? 'text-cyan' : 'text-cyan hover:underline',
            ].join(' ')}
          >
            {isExpanded ? 'Hide ↑' : 'Configure →'}
          </button>
        </div>

        {isSelected && !senderSummary.isSet && (
          <div className="mt-2 flex items-start gap-2 text-xs text-amber-700">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>Sender not configured — campaign cannot send via this channel</span>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-[#E5E7EB] bg-white px-4 py-4">
          {!isSelected && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              This channel is not enabled yet. Select it above to include in your campaign.
            </div>
          )}
          <div
            ref={senderRef}
            className={[
              'mb-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 transition-shadow',
              senderPulse ? 'ring-2 ring-cyan/25 shadow-sm' : '',
            ].join(' ')}
          >
            {senderBlock}
          </div>
          <ChannelContentEditor
            channel={channelDef.id}
            audienceSize={audienceSize}
            variants={variants}
            testing={testing}
            onVariantsChange={onVariantsChange}
            onTestingChange={onTestingChange}
            onPrimaryContentChange={onPrimaryContentChange}
            mode="template_only"
          />
        </div>
      )}
    </div>
  );
}

// ─── ContentScheduleStep (simple send: channels + content + schedule) ───────

export function ContentScheduleStep({ campaignData, onUpdate, view = 'all' }: ContentScheduleStepProps) {
  const showSchedule = view === 'schedule' || view === 'all';
  const showContent = view === 'content' || view === 'all';
  const { segments, isAtLeast } = usePhaseData();

  const selectedSegment = segments.find((s) => s.id === campaignData.segmentId);
  const segmentSize = selectedSegment?.size ?? 0;
  const tentativeBudget = parseFloat(campaignData.goal.tentativeBudget) || 0;

  const allowedChannels = useMemo(
    () => new Set<ChannelType>(['sms', 'whatsapp', 'rcs', 'ai_voice']),
    [],
  );
  const contentChannels = useMemo(
    () => channels.filter((c) => allowedChannels.has(c.id)),
    [allowedChannels],
  );

  // Expanded channel (content editor open)
  const [expandedChannel, setExpandedChannel] = useState<ChannelType | null>(null);
  const [scrollToSenderChannel, setScrollToSenderChannel] = useState<ChannelType | null>(null);
  const [smartPlanNotice, setSmartPlanNotice] = useState<string | null>(null);
  const [smartPlanExpandedId, setSmartPlanExpandedId] = useState<string | null>(null);
  const [smartPlanEditingId, setSmartPlanEditingId] = useState<string | null>(null);
  const [webhookTestOpen, setWebhookTestOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 1200);
    return () => window.clearTimeout(t);
  }, [copied]);

  // Per-channel variant state
  const [channelVariants, setChannelVariants] = useState<Record<string, ContentVariant[]>>(() => {
    const initial: Record<string, ContentVariant[]> = {};
    for (const ch of contentChannels) {
      initial[ch.id] = [makeInitialVariant(ch.id)];
    }
    return initial;
  });

  // Per-channel testing state
  const [channelTesting, setChannelTesting] = useState<Record<string, TestingConfig>>(() => {
    const initial: Record<string, TestingConfig> = {};
    for (const ch of contentChannels) {
      initial[ch.id] = { enabled: false, randomnessFactor: 30 };
    }
    return initial;
  });

  // If older state contains disallowed channels, strip them here.
  useEffect(() => {
    const filtered = campaignData.channels.filter((c) => allowedChannels.has(c));
    if (filtered.length !== campaignData.channels.length) onUpdate({ channels: filtered });
  }, [allowedChannels, campaignData.channels, onUpdate]);

  // Auto-select recommended channels on mount when none are selected yet
  useEffect(() => {
    if (campaignData.channels.length > 0 || !selectedSegment) return;

    const threshold = segmentSize * 0.2;

    const recommended = contentChannels
      .map((ch) => {
        const segReach = selectedSegment.reachability?.[ch.id as keyof typeof selectedSegment.reachability];
        const reachCount =
          segReach !== undefined
            ? segReach
            : Math.round(segmentSize * PLATFORM_REACHABILITY_RATES[ch.id]);
        return { id: ch.id, reachCount };
      })
      .filter((ch) => ch.reachCount > threshold)
      .sort((a, b) => b.reachCount - a.reachCount)
      .map((ch) => ch.id as ChannelType);

    if (recommended.length > 0) {
      onUpdate({ channels: recommended });
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleChannel(channelId: ChannelType) {
    const isSelected = campaignData.channels.includes(channelId);
    const updated = isSelected
      ? campaignData.channels.filter((c) => c !== channelId)
      : [...campaignData.channels, channelId];
    onUpdate({ channels: updated });
  }

  function handleConfigureClick(channelId: ChannelType) {
    setExpandedChannel(channelId);
    setScrollToSenderChannel(channelId);
  }

  function updateSenderConfig(channelId: ChannelType, patch: Record<string, unknown>) {
    const prevFor = (campaignData.senderConfig?.[channelId] ?? {}) as Record<string, unknown>;
    onUpdate({
      senderConfig: {
        ...(campaignData.senderConfig ?? {}),
        [channelId]: { ...prevFor, ...patch },
      },
    });
  }

  function getVariants(channelId: ChannelType): ContentVariant[] {
    return channelVariants[channelId] ?? [makeInitialVariant(channelId)];
  }

  function getTesting(channelId: ChannelType): TestingConfig {
    return channelTesting[channelId] ?? { enabled: false, randomnessFactor: 30 };
  }

  function handleVariantsChange(channelId: ChannelType, variants: ContentVariant[]) {
    setChannelVariants((prev) => ({ ...prev, [channelId]: variants }));
  }

  function handleTestingChange(channelId: ChannelType, testing: TestingConfig) {
    setChannelTesting((prev) => ({ ...prev, [channelId]: testing }));
  }

  function handlePrimaryContentChange(channelId: ChannelType, content: AnyChannelContent) {
    onUpdate({
      content: {
        ...campaignData.content,
        [channelId]: content,
      },
    });
  }

  // Compute reachability values for a channel
  function getReachData(channelId: ChannelType): { count: number | null; percent: number | null } {
    if (!isAtLeast('day1')) return { count: null, percent: null };
    const segReach = selectedSegment?.reachability?.[channelId as keyof typeof selectedSegment.reachability];
    const count =
      segReach !== undefined
        ? segReach
        : Math.round(segmentSize * PLATFORM_REACHABILITY_RATES[channelId]);
    const percent = segmentSize > 0 ? (count / segmentSize) * 100 : PLATFORM_REACHABILITY_RATES[channelId] * 100;
    return { count, percent };
  }

  const smartEstimatedCost = useMemo(() => {
    if (!segmentSize || segmentSize <= 0) return null;
    let sum = 0;
    for (const id of campaignData.channels) {
      const c = channels.find((x) => x.id === id);
      if (c) sum += c.unitCost * segmentSize;
    }
    return sum;
  }, [campaignData.channels, segmentSize]);

  const smartPlanSubSegments = useMemo(() => {
    const raw = (campaignData.waterfallConfig as Record<string, unknown> | undefined)?.subSegments;
    return Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : null;
  }, [campaignData.waterfallConfig]);

  function updateSmartPlanSubSegment(id: string, patch: Record<string, unknown>) {
    if (!smartPlanSubSegments) return;
    const next = smartPlanSubSegments.map((ss) =>
      String(ss.id) === id ? { ...ss, ...patch } : ss,
    );
    onUpdate({
      waterfallConfig: {
        ...(campaignData.waterfallConfig as Record<string, unknown>),
        subSegments: next,
      },
    });
  }

  function ScheduleModeCard({
    id,
    title,
    description,
  }: {
    id: CampaignData['schedule']['type'];
    title: string;
    description: string;
  }) {
    const selected = campaignData.schedule.type === id;
    return (
      <button
        type="button"
        onClick={() => onUpdate({ schedule: { ...campaignData.schedule, type: id } })}
        className={[
          'relative w-full rounded-lg border bg-white px-4 py-3 text-left transition-all',
          selected ? 'border-cyan ring-1 ring-cyan/30' : 'border-[#E5E7EB] hover:border-[#D1D5DB]',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text-primary">{title}</div>
            <div className="mt-0.5 text-[11px] text-text-secondary">{description}</div>
          </div>
          {selected && (
            <span className="shrink-0 rounded-full bg-cyan px-2 py-0.5 text-[10px] font-semibold text-white">
              SELECTED
            </span>
          )}
        </div>
      </button>
    );
  }

  const costLine =
    campaignData.channels.length === 0
      ? 'Select channels to see estimate'
      : segmentSize <= 0
        ? 'Set your audience to see estimate'
        : smartEstimatedCost !== null
          ? `AED ${smartEstimatedCost.toFixed(2)}`
          : '—';

  // Plan generation — used by both the explicit button (legacy 'all' view)
  // and the auto-fire effect when the user lands on the Channel & Content
  // step in Smart + AI mode.
  function generateSmartPlan(): { ok: boolean; reason?: string; count?: number } {
    if (campaignData.channels.length === 0) {
      return { ok: false, reason: 'Select at least one channel to generate a plan.' };
    }
    const planSegmentSize = selectedSegment?.size ?? 0;
    if (planSegmentSize <= 0) {
      return { ok: false, reason: 'Set your audience (Step 2) to generate a plan.' };
    }
    const budgetInput = campaignData.goal.tentativeBudget || '';
    const tentativeBudgetParsed = budgetInput
      ? parseFloat(budgetInput.replace(/[AEDaed,\s]/g, "")) *
        (budgetInput.toLowerCase().includes('l')
          ? 100000
          : budgetInput.toLowerCase().includes('k')
            ? 1000
            : 1)
      : 0;
    const subSegments = generateSmartSubSegments({
      selectedChannels: campaignData.channels,
      segmentSize: planSegmentSize,
      highIntentEnabled: campaignData.highIntent.enabled,
      highIntentCount: campaignData.highIntent.estimatedCount,
      tentativeBudget: tentativeBudgetParsed,
    });
    onUpdate({
      waterfallConfig: {
        ...(campaignData.waterfallConfig as Record<string, unknown>),
        subSegments,
        generatedAt: new Date().toISOString(),
      },
    });
    return { ok: subSegments.length > 0, count: subSegments.length };
  }

  // Auto-fire plan generation on mount when arriving at the Channel & Content
  // step in Smart + AI mode and no plan exists yet.
  useEffect(() => {
    if (
      view === 'content' &&
      campaignData.schedule.type === 'smart_ai' &&
      (!smartPlanSubSegments || smartPlanSubSegments.length === 0)
    ) {
      const result = generateSmartPlan();
      if (!result.ok && result.reason) {
        setSmartPlanNotice(result.reason);
      } else if (result.ok && result.count) {
        setSmartPlanNotice(`Generated ${result.count} sub-segments.`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, campaignData.schedule.type]);

  // Step header — shown when this component is acting as a single step. When
  // split into Schedule / Channel & Content, the wizard's stepper provides
  // the page-level context, so we use a per-view title instead.
  const stepTitle =
    view === 'schedule'
      ? 'Schedule'
      : view === 'content'
        ? 'Channel & Content'
        : 'Content & Schedule';
  const stepSubtitle =
    view === 'schedule'
      ? 'Choose when and how this campaign runs. Smart + AI generates the cohort, channel, and timing plan in the next step.'
      : view === 'content'
        ? campaignData.schedule.type === 'smart_ai'
          ? 'Auto-generated cohort + channel + timing plan based on your audience and the schedule window.'
          : 'Enable channels and configure message variants for each.'
        : 'Enable channels, configure message variants for each, then set when this campaign runs.';

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-text-primary">{stepTitle}</h2>
        <p className="mt-1 text-sm text-text-secondary">{stepSubtitle}</p>
      </div>

      {showSchedule && (
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
        <h3 className="text-sm font-semibold text-text-primary">When &amp; how should we send?</h3>
        <p className="mt-0.5 text-xs text-text-secondary">
          Choose delivery mode first. Smart mode generates a cohort + channel + timing plan you can refine in the journey canvas.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ScheduleModeCard id="one-time" title="One time" description="Send to this segment once at a specific time." />
          <ScheduleModeCard id="recurring" title="Recurring" description="Repeat send on a schedule (daily, weekly, monthly)." />
          <ScheduleModeCard id="event" title="Event-based" description="Trigger when a user performs an action — sign-up, purchase, KYC step — or when an external system fires a webhook." />
          <ScheduleModeCard id="smart_ai" title="Smart + AI" description="Set a window. Our intelligence engine designs the sub-cohort + channel + timing plan with fallbacks." />
        </div>
      </div>
      )}

      {showSchedule && campaignData.schedule.type !== 'smart_ai' && (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Campaign schedule</h3>
              <p className="mt-0.5 text-xs text-text-secondary">When should this campaign run?</p>
            </div>
          </div>

          {campaignData.schedule.type === 'one-time' ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-secondary">Date</label>
                <input
                  type="date"
                  value={campaignData.schedule.date}
                  onChange={(e) => onUpdate({ schedule: { ...campaignData.schedule, date: e.target.value } })}
                  className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-secondary">Time</label>
                <input
                  type="time"
                  value={campaignData.schedule.time}
                  onChange={(e) => onUpdate({ schedule: { ...campaignData.schedule, time: e.target.value } })}
                  className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                />
              </div>
            </div>
          ) : campaignData.schedule.type === 'recurring' ? (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-secondary">Frequency</label>
                <select
                  value={campaignData.schedule.recurringFrequency}
                  onChange={(e) =>
                    onUpdate({
                      schedule: {
                        ...campaignData.schedule,
                        recurringFrequency: e.target.value as CampaignData['schedule']['recurringFrequency'],
                      },
                    })
                  }
                  className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-secondary">
                  {campaignData.schedule.recurringFrequency === 'monthly' ? 'Day of month' : 'Day of week'}
                </label>
                <select
                  value={campaignData.schedule.recurringDay}
                  onChange={(e) => onUpdate({ schedule: { ...campaignData.schedule, recurringDay: e.target.value } })}
                  className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                >
                  {campaignData.schedule.recurringFrequency === 'monthly' ? (
                    <>
                      <option value="1">1st</option>
                      <option value="5">5th</option>
                      <option value="10">10th</option>
                      <option value="15">15th</option>
                      <option value="20">20th</option>
                      <option value="25">25th</option>
                      <option value="last">Last day</option>
                    </>
                  ) : (
                    <>
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="sunday">Sunday</option>
                    </>
                  )}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-secondary">Time</label>
                <input
                  type="time"
                  value={campaignData.schedule.recurringTime}
                  onChange={(e) => onUpdate({ schedule: { ...campaignData.schedule, recurringTime: e.target.value } })}
                  className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                />
              </div>
            </div>
          ) : campaignData.schedule.type === 'event' ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                <p className="text-xs font-semibold text-text-primary">Trigger method</p>
                <p className="mt-0.5 text-xs text-text-secondary">Choose how this campaign should be triggered.</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {(
                    [
                      {
                        id: 'event' as const,
                        title: 'Event',
                        description: 'Trigger when a user performs an event in your platform',
                        icon: <Zap size={16} className="text-cyan" />,
                      },
                      {
                        id: 'webhook' as const,
                        title: 'Webhook / API',
                        description: 'Trigger by calling an API endpoint or sending a webhook',
                        icon: <Link2 size={16} className="text-cyan" />,
                      },
                    ] as const
                  ).map((opt) => {
                    const selected = campaignData.schedule.event.triggerMethod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          // switching clears respective fields
                          if (opt.id === 'event') {
                            onUpdate({
                              schedule: {
                                ...campaignData.schedule,
                                event: {
                                  ...campaignData.schedule.event,
                                  triggerMethod: 'event',
                                  source: 'app',
                                  webhook: { ...campaignData.schedule.event.webhook, bearerToken: '', hmacSecret: '' },
                                },
                              },
                            });
                          } else {
                            onUpdate({
                              schedule: {
                                ...campaignData.schedule,
                                event: {
                                  ...campaignData.schedule.event,
                                  triggerMethod: 'webhook',
                                  source: 'webhook',
                                  eventName: '',
                                  match: 'every',
                                  nthOccurrence: 2,
                                },
                              },
                            });
                          }
                        }}
                        className={[
                          'relative w-full rounded-lg border bg-white px-4 py-3 text-left transition-all',
                          selected ? 'border-cyan ring-1 ring-cyan/30' : 'border-[#E5E7EB] hover:border-[#D1D5DB]',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {opt.icon}
                              <div className="text-sm font-semibold text-text-primary">{opt.title}</div>
                            </div>
                            <div className="mt-1 text-[11px] text-text-secondary">{opt.description}</div>
                          </div>
                          {selected && (
                            <span className="shrink-0 rounded-full bg-cyan px-2 py-0.5 text-[10px] font-semibold text-white">
                              SELECTED
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {campaignData.schedule.event.triggerMethod === 'event' ? (
                <>
                  <SearchableEventSelect
                    label="Event name"
                    placeholder="Search or select an event..."
                    value={campaignData.schedule.event.eventName}
                    selectedSource={campaignData.schedule.event.source === 'webhook' ? null : campaignData.schedule.event.source}
                    onSelect={(eventName, source) => {
                      onUpdate({
                        schedule: {
                          ...campaignData.schedule,
                          event: {
                            ...campaignData.schedule.event,
                            eventName,
                            source,
                          },
                        },
                      });
                    }}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <SimpleDropdownSelect
                      label="Match condition"
                      placeholder="Select match…"
                      value={campaignData.schedule.event.match}
                      options={[
                        { value: 'every', label: 'Every time' },
                        { value: 'first', label: 'First time only' },
                        { value: 'nth', label: 'Nth occurrence' },
                      ]}
                      onChange={(v) =>
                        onUpdate({ schedule: { ...campaignData.schedule, event: { ...campaignData.schedule.event, match: v } } })
                      }
                    />
                    {campaignData.schedule.event.match === 'nth' ? (
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-text-secondary">Nth</label>
                        <input
                          type="number"
                          min={2}
                          value={campaignData.schedule.event.nthOccurrence}
                          onChange={(e) =>
                            onUpdate({
                              schedule: {
                                ...campaignData.schedule,
                                event: { ...campaignData.schedule.event, nthOccurrence: Math.max(2, Number(e.target.value || 2)) },
                              },
                            })
                          }
                          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                        />
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>
                </>
              ) : (
                <>
                  {(() => {
                    const cid = slugifyId(campaignData.name);
                    const url = `https://api.platform.com/webhooks/trigger/${cid}`;
                    const auth = campaignData.schedule.event.webhook.authMethod;
                    const bearer = campaignData.schedule.event.webhook.bearerToken;
                    const hmac = campaignData.schedule.event.webhook.hmacSecret;

                    const curl = [
                      `curl -X POST '${url}' \\`,
                      `  -H 'Content-Type: application/json' \\`,
                      auth === 'bearer' ? `  -H 'Authorization: Bearer ${bearer || '<token>'}' \\` : null,
                      auth === 'hmac_sha256' ? `  -H 'X-Signature: <hmac-sha256>' \\` : null,
                      `  -d '{\"user_id\":\"u_123\",\"event\":\"webhook_trigger\",\"amount\":1999}'`,
                    ]
                      .filter(Boolean)
                      .join('\n');

                    return (
                      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-text-secondary">Your endpoint</label>
                          <div className="flex gap-2">
                            <input
                              readOnly
                              value={url}
                              className="w-full rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] px-3 py-2 text-sm text-text-primary"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(url);
                                  setCopied('Copied');
                                } catch {
                                  setCopied('Copy failed');
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-text-primary hover:bg-[#F9FAFB]"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                          {copied && <p className="mt-1 text-[10px] text-text-secondary">{copied}</p>}
                        </div>

                        <div className="mt-4">
                          <label className="text-xs font-medium text-text-secondary">Auth method</label>
                          <div className="mt-2 inline-flex w-full rounded-lg border border-[#E5E7EB] bg-white p-1">
                            {([
                              { id: 'bearer', label: 'Bearer Token' },
                              { id: 'hmac_sha256', label: 'HMAC Secret' },
                            ] as const).map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() =>
                                  onUpdate({
                                    schedule: {
                                      ...campaignData.schedule,
                                      event: {
                                        ...campaignData.schedule.event,
                                        webhook: { ...campaignData.schedule.event.webhook, authMethod: opt.id },
                                      },
                                    },
                                  })
                                }
                                className={[
                                  'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                                  auth === opt.id ? 'bg-cyan text-white' : 'text-text-secondary hover:text-text-primary',
                                ].join(' ')}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {auth === 'bearer' ? (
                          <div className="mt-3 flex flex-col gap-1">
                            <label className="text-xs font-medium text-text-secondary">Bearer token</label>
                            <div className="flex gap-2">
                              <input
                                type="password"
                                value={bearer}
                                onChange={(e) =>
                                  onUpdate({
                                    schedule: {
                                      ...campaignData.schedule,
                                      event: {
                                        ...campaignData.schedule.event,
                                        webhook: { ...campaignData.schedule.event.webhook, bearerToken: e.target.value },
                                      },
                                    },
                                  })
                                }
                                placeholder="Token"
                                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdate({
                                    schedule: {
                                      ...campaignData.schedule,
                                      event: {
                                        ...campaignData.schedule.event,
                                        webhook: { ...campaignData.schedule.event.webhook, bearerToken: generateSecretLike() },
                                      },
                                    },
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-text-primary hover:bg-[#F9FAFB]"
                              >
                                <RefreshCcw size={16} />
                                Regenerate
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-col gap-1">
                            <label className="text-xs font-medium text-text-secondary">HMAC secret</label>
                            <div className="flex gap-2">
                              <input
                                type="password"
                                value={hmac}
                                onChange={(e) =>
                                  onUpdate({
                                    schedule: {
                                      ...campaignData.schedule,
                                      event: {
                                        ...campaignData.schedule.event,
                                        webhook: { ...campaignData.schedule.event.webhook, hmacSecret: e.target.value },
                                      },
                                    },
                                  })
                                }
                                placeholder="Secret"
                                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdate({
                                    schedule: {
                                      ...campaignData.schedule,
                                      event: {
                                        ...campaignData.schedule.event,
                                        webhook: { ...campaignData.schedule.event.webhook, hmacSecret: generateSecretLike() },
                                      },
                                    },
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-text-primary hover:bg-[#F9FAFB]"
                              >
                                <RefreshCcw size={16} />
                                Regenerate
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setWebhookTestOpen(true)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-text-primary hover:bg-[#F9FAFB]"
                          >
                            Send test request
                          </button>
                        </div>

                        <Modal isOpen={webhookTestOpen} onClose={() => setWebhookTestOpen(false)} title="Send test request">
                          <div className="space-y-3">
                            <p className="text-sm text-text-secondary">
                              Use this sample cURL to send a test request to your endpoint.
                            </p>
                            <pre className="max-h-64 overflow-auto rounded-lg border border-[#E5E7EB] bg-[#0B1220] p-3 text-xs text-white">
{curl}
                            </pre>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(curl);
                                    setCopied('Copied cURL');
                                  } catch {
                                    setCopied('Copy failed');
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-text-primary hover:bg-[#F9FAFB]"
                              >
                                <Copy size={16} />
                                Copy cURL
                              </button>
                            </div>
                          </div>
                        </Modal>
                      </div>
                    );
                  })()}
                </>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-text-secondary">Delay after event</label>
                  <input
                    type="number"
                    min={0}
                    value={campaignData.schedule.event.delayMinutes}
                    onChange={(e) =>
                      onUpdate({
                        schedule: {
                          ...campaignData.schedule,
                          event: { ...campaignData.schedule.event, delayMinutes: Math.max(0, Number(e.target.value || 0)) },
                        },
                      })
                    }
                    className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                  />
                  <p className="text-[10px] text-text-secondary">minutes</p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-text-secondary">Timezone</label>
                  <select
                    value={campaignData.schedule.event.timezone}
                    onChange={(e) =>
                      onUpdate({
                        schedule: {
                          ...campaignData.schedule,
                          event: { ...campaignData.schedule.event, timezone: e.target.value as CampaignData['schedule']['event']['timezone'] },
                        },
                      })
                    }
                    className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-text-secondary">End date (optional)</label>
                  <input
                    type="date"
                    value={campaignData.schedule.event.endDate}
                    onChange={(e) =>
                      onUpdate({
                        schedule: { ...campaignData.schedule, event: { ...campaignData.schedule.event, endDate: e.target.value } },
                      })
                    }
                    className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-text-secondary">Send only between</label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={campaignData.schedule.event.windowStart}
                      onChange={(e) =>
                        onUpdate({
                          schedule: {
                            ...campaignData.schedule,
                            event: { ...campaignData.schedule.event, windowStart: e.target.value },
                          },
                        })
                      }
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                    />
                    <input
                      type="time"
                      value={campaignData.schedule.event.windowEnd}
                      onChange={(e) =>
                        onUpdate({
                          schedule: {
                            ...campaignData.schedule,
                            event: { ...campaignData.schedule.event, windowEnd: e.target.value },
                          },
                        })
                      }
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                    />
                  </div>
                  <p className="text-[10px] text-text-secondary">Quiet hours are enforced outside this window.</p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-text-secondary">Frequency cap</label>
                  <select
                    value={campaignData.schedule.event.frequencyCap}
                    onChange={(e) =>
                      onUpdate({
                        schedule: {
                          ...campaignData.schedule,
                          event: {
                            ...campaignData.schedule.event,
                            frequencyCap: e.target.value as CampaignData['schedule']['event']['frequencyCap'],
                          },
                        },
                      })
                    }
                    className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                  >
                    <option value="once">Once per user (ever)</option>
                    <option value="once_per_day">Once per user (per day)</option>
                    <option value="cooldown">Cooldown</option>
                  </select>
                  {campaignData.schedule.event.frequencyCap === 'cooldown' && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-text-secondary">Cooldown</span>
                      <input
                        type="number"
                        min={1}
                        value={campaignData.schedule.event.cooldownHours}
                        onChange={(e) =>
                          onUpdate({
                            schedule: {
                              ...campaignData.schedule,
                              event: {
                                ...campaignData.schedule.event,
                                cooldownHours: Math.max(1, Number(e.target.value || 1)),
                              },
                            },
                          })
                        }
                        className="w-24 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                      />
                      <span className="text-xs text-text-secondary">hours</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">Re-entry</p>
                    <p className="mt-0.5 text-[11px] text-text-secondary">
                      Allow users to re-enter when the event happens again (subject to caps).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate({
                        schedule: {
                          ...campaignData.schedule,
                          event: { ...campaignData.schedule.event, allowReentry: !campaignData.schedule.event.allowReentry },
                        },
                      })
                    }
                    className={[
                      'inline-flex h-7 w-12 items-center rounded-full border transition-colors',
                      campaignData.schedule.event.allowReentry ? 'border-cyan bg-cyan/15' : 'border-[#E5E7EB] bg-white',
                    ].join(' ')}
                    aria-pressed={campaignData.schedule.event.allowReentry}
                  >
                    <span
                      className={[
                        'h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                        campaignData.schedule.event.allowReentry ? 'translate-x-6' : 'translate-x-1',
                      ].join(' ')}
                    />
                  </button>
                </div>
              </div>
            </div>
          ) : null}


          <div className="my-4 border-t border-[#E5E7EB]" />
          <h3 className="text-sm font-semibold text-text-primary">Estimated cost</h3>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
            <div
              className="h-full rounded-full bg-cyan transition-all duration-300"
              style={{ width: segmentSize > 0 && smartEstimatedCost ? '55%' : '0%' }}
            />
          </div>
          <dl className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-text-secondary">Channels selected</dt>
              <dd className="font-medium text-text-primary">{campaignData.channels.length}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-text-secondary">Audience size</dt>
              <dd className="font-medium text-text-primary">{segmentSize > 0 ? `${segmentSize.toLocaleString('en-AE')} users` : '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-text-secondary">Est. total cost</dt>
              <dd className="font-semibold text-text-primary">{costLine}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[10px] leading-relaxed text-text-secondary">
            Cost is estimated based on per-message rates × audience size per channel.
          </p>
        </div>
      )}

      {(showSchedule || showContent) && campaignData.schedule.type === 'smart_ai' && (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
        {showSchedule && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Smart campaign setup</h3>
              <p className="mt-0.5 text-xs text-text-secondary">
                Set the window and constraints. AI will optimize delivery and suggest a channel + follow up sequence.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,60%)_minmax(0,40%)]">
            {/* Campaign window */}
            <div className="rounded-lg border border-[#E5E7EB] bg-white">
              <div className="border-b border-[#E5E7EB] px-4 py-3">
                <p className="text-xs font-semibold text-text-primary">Campaign window</p>
              </div>
              <div className="px-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-text-secondary">Start</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={campaignData.schedule.startDate}
                        onChange={(e) => onUpdate({ schedule: { ...campaignData.schedule, startDate: e.target.value } })}
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                      />
                      <input
                        type="time"
                        value={campaignData.schedule.startTime}
                        onChange={(e) => onUpdate({ schedule: { ...campaignData.schedule, startTime: e.target.value } })}
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-text-secondary">End</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={campaignData.schedule.endDate}
                        onChange={(e) => onUpdate({ schedule: { ...campaignData.schedule, endDate: e.target.value } })}
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                      />
                      <input
                        type="time"
                        value={campaignData.schedule.endTime}
                        onChange={(e) => onUpdate({ schedule: { ...campaignData.schedule, endTime: e.target.value } })}
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-medium text-text-secondary">Goal focus</p>
                  <div className="mt-2 inline-flex rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-1">
                    {[
                      { id: 'start_ai', label: 'Start + AI' },
                      { id: 'all_round', label: 'All round' },
                      { id: 'custom', label: 'Custom' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          onUpdate({
                            schedule: {
                              ...campaignData.schedule,
                              smartGoalFocus: opt.id as CampaignData['schedule']['smartGoalFocus'],
                            },
                          })
                        }
                        className={[
                          'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                          campaignData.schedule.smartGoalFocus === opt.id
                            ? 'bg-cyan text-white'
                            : 'text-text-secondary hover:text-text-primary',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Constraints & budget */}
            <div className="rounded-lg border border-[#E5E7EB] bg-white">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
                <p className="text-xs font-semibold text-text-primary">Constraints &amp; budget</p>
                <div className="text-xs font-semibold text-text-primary">
                  {(parseFloat(campaignData.goal.tentativeBudget) || 0).toLocaleString('en-AE')}
                </div>
              </div>
              <div className="px-4 py-4">
                <p className="text-xs font-medium text-text-secondary">Max budget</p>
                <input
                  type="range"
                  min={0}
                  max={500000}
                  step={10000}
                  value={parseFloat(campaignData.goal.tentativeBudget) || 0}
                  onChange={(e) => onUpdate({ goal: { ...campaignData.goal, tentativeBudget: String(e.target.value) } })}
                  className="mt-2 w-full accent-cyan"
                />

                <div className="mt-4">
                  <p className="text-xs font-medium text-text-secondary">Channels</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {[
                      { id: 'ai_voice' as const, label: 'Voice' },
                      { id: 'whatsapp' as const, label: 'WA' },
                      { id: 'sms' as const, label: 'SMS' },
                      { id: 'rcs' as const, label: 'RCS' },
                    ].map((ch) => {
                      const selected = campaignData.channels.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => toggleChannel(ch.id)}
                          className={[
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                            selected
                              ? 'border-cyan bg-cyan/10 text-cyan'
                              : 'border-[#E5E7EB] bg-white text-text-secondary hover:bg-[#F9FAFB]',
                          ].join(' ')}
                        >
                          <ChannelIcon channel={ch.id} size={13} />
                          {ch.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-text-secondary">Sequence is derived by default based on reach.</p>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-text-secondary">Channel order</p>
                    <button type="button" className="text-[11px] font-semibold text-cyan hover:underline">
                      Why choose this sequence?
                    </button>
                  </div>
                  <div className="mt-2 space-y-1">
                    {campaignData.channels.length === 0 ? (
                      <p className="text-xs text-text-secondary">Select channels to define priority.</p>
                    ) : (
                      campaignData.channels.map((ch, idx) => (
                        <div
                          key={ch}
                          className="flex items-center justify-between rounded-md border border-[#E5E7EB] bg-[#FAFAFA] px-2 py-1.5"
                        >
                          <span className="text-xs font-medium text-text-primary">
                            {idx + 1}. {ch === 'whatsapp' ? 'WA' : ch === 'ai_voice' ? 'Voice' : ch.toUpperCase()}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => {
                                const next = [...campaignData.channels];
                                [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                onUpdate({ channels: next });
                              }}
                              className="rounded px-2 py-0.5 text-xs text-text-secondary hover:bg-white disabled:opacity-40"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={idx === campaignData.channels.length - 1}
                              onClick={() => {
                                const next = [...campaignData.channels];
                                [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                                onUpdate({ channels: next });
                              }}
                              className="rounded px-2 py-0.5 text-xs text-text-secondary hover:bg-white disabled:opacity-40"
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Intelligence engine */}
          <div className="mt-4 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Campaign intelligence engine</p>
                <p className="mt-0.5 text-xs text-amber-800/90">
                  AI weighs segment reach, primary channel, timing windows, and follow-up chances per your priority for the segment.
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold text-amber-700">Monthly baseline</p>
                <p className="text-[11px] text-amber-800/90">Personalization in 4 weeks</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-md border border-amber-200 bg-white px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Segment size</p>
                <p className="mt-0.5 text-sm font-semibold text-text-primary">{segmentSize.toLocaleString('en-AE')}</p>
              </div>
              <div className="rounded-md border border-amber-200 bg-white px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Priority channels</p>
                <p className="mt-0.5 text-sm font-semibold text-text-primary">{campaignData.channels.length || '—'}</p>
              </div>
              <div className="rounded-md border border-amber-200 bg-white px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Est. cost</p>
                <p className="mt-0.5 text-sm font-semibold text-text-primary">
                  {smartEstimatedCost != null ? `AED ${smartEstimatedCost.toFixed(0)}` : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-4">
            <p className="text-xs font-semibold text-text-primary">How Smart mode works</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-text-secondary">
              <li>Split the segment into callable + reachable groups based on channel reachability.</li>
              <li>Assign an optimal channel sequence based on your priority and cost constraints.</li>
              <li>Plan pacing within the campaign window so users don’t get spammed.</li>
              <li>Produce a draft journey you can refine in the canvas (edit steps, wait, and escalation).</li>
            </ol>
          </div>
        </>
        )}

        {showContent && !showSchedule && (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Campaign plan</h3>
              <p className="mt-0.5 text-xs text-text-secondary">
                Auto-generated based on your audience, channels, and the schedule window. Each
                sub-segment follows a tailored sequence — edit any row to refine.
              </p>
            </div>
          </div>
        )}

        {view === 'all' && (
          <button
            type="button"
            onClick={() => {
              setSmartPlanNotice(null);
              if (campaignData.channels.length === 0) {
                setSmartPlanNotice('Select at least one channel to generate a plan.');
                return;
              }
              const planSegmentSize = selectedSegment?.size ?? 0;
              if (planSegmentSize <= 0) {
                setSmartPlanNotice('Set your audience (Step 2) to generate a plan.');
                return;
              }

              const budgetInput = campaignData.goal.tentativeBudget || '';
              const tentativeBudgetParsed = budgetInput
                ? parseFloat(budgetInput.replace(/[AEDaed,\s]/g, "")) *
                  (budgetInput.toLowerCase().includes('l')
                    ? 100000
                    : budgetInput.toLowerCase().includes('k')
                      ? 1000
                      : 1)
                : 0;

              const subSegments = generateSmartSubSegments({
                selectedChannels: campaignData.channels,
                segmentSize: planSegmentSize,
                highIntentEnabled: campaignData.highIntent.enabled,
                highIntentCount: campaignData.highIntent.estimatedCount,
                tentativeBudget: tentativeBudgetParsed,
              });

              if (subSegments.length === 0) {
                setSmartPlanNotice('No plan could be generated for the current selection.');
              } else {
                setSmartPlanNotice(`Generated ${subSegments.length} sub-segments.`);
              }

              onUpdate({
                waterfallConfig: {
                  ...(campaignData.waterfallConfig as Record<string, unknown>),
                  subSegments,
                  generatedAt: new Date().toISOString(),
                },
              });
            }}
            className="mt-4 flex w-full items-center justify-center rounded-lg bg-cyan py-3 text-sm font-semibold text-white shadow-sm hover:bg-cyan/90"
          >
            Generate suggested plan &amp; primary draft
          </button>
        )}

        {showContent && smartPlanNotice && (
          <p className="mt-2 text-xs text-text-secondary">{smartPlanNotice}</p>
        )}

        {showContent && smartPlanSubSegments && smartPlanSubSegments.length > 0 && (
            <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white">
              <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-text-primary">Campaign Plan</p>
                  <p className="mt-0.5 text-[11px] text-text-secondary">
                    Optimized based on channel reachability, user value, response patterns. Each sub-segment follows a customized outreach journey.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-text-secondary">
                    {smartPlanSubSegments.length} sub-segments
                  </p>
                  <p className="text-[11px] font-semibold text-text-primary">
                    {segmentSize > 0 ? `${segmentSize.toLocaleString('en-AE')} users` : '—'}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[#E5E7EB]">
                {smartPlanSubSegments.slice(0, 8).map((ss) => {
                  const id = String(ss.id ?? '');
                  const isExpanded = smartPlanExpandedId === id;
                  const isEditing = smartPlanEditingId === id;
                  return (
                    <SmartPlanSubSegmentRow
                      key={id}
                      ss={ss}
                      expanded={isExpanded}
                      editing={isEditing}
                      availableChannels={contentChannels.map((c) => c.id)}
                      onToggleExpand={() => {
                        setSmartPlanExpandedId(isExpanded ? null : id);
                        if (isExpanded) setSmartPlanEditingId(null);
                      }}
                      onToggleEdit={() => {
                        if (!isExpanded) setSmartPlanExpandedId(id);
                        setSmartPlanEditingId(isEditing ? null : id);
                      }}
                      onPatch={(patch) => updateSmartPlanSubSegment(id, patch)}
                    />
                  );
                })}

                {smartPlanSubSegments.length > 8 && (
                  <div className="px-4 py-3 text-xs text-text-secondary">Showing first 8 sub-segments.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showContent && campaignData.schedule.type !== 'smart_ai' && (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <h3 className="text-sm font-semibold text-text-primary">Channels &amp; message content</h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            Select channels and expand each row to compose variants and testing.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {[...contentChannels]
              .sort((a, b) => {
                const aSelected = campaignData.channels.includes(a.id) ? 0 : 1;
                const bSelected = campaignData.channels.includes(b.id) ? 0 : 1;
                return aSelected - bSelected;
              })
              .map((ch) => {
                const isSelected = campaignData.channels.includes(ch.id);
                const { count: reachCount, percent: reachPercent } = getReachData(ch.id);
                const conversionRate = isAtLeast('day30') ? (HISTORICAL_CONVERSION[ch.id] ?? null) : null;
                const convLabel = CONVERSION_LABEL[ch.id] ?? 'avg conversion';
                const sc = campaignData.senderConfig?.[ch.id];

                const senderSummary: { text: string; isSet: boolean } = (() => {
                  if (ch.id === 'sms') {
                    const v = (sc as any)?.sms?.senderId as string | undefined;
                    return v ? { text: v, isSet: true } : { text: 'Not set', isSet: false };
                  }
                  if (ch.id === 'whatsapp') {
                    const v = (sc as any)?.whatsapp?.phoneNumber as string | undefined;
                    return v ? { text: v, isSet: true } : { text: 'Not set', isSet: false };
                  }
                  if (ch.id === 'rcs') {
                    const v = (sc as any)?.rcs?.sender as string | undefined;
                    return v ? { text: v, isSet: true } : { text: 'Not set', isSet: false };
                  }
                  if (ch.id === 'ai_voice') {
                    const v = (sc as any)?.ai_voice?.callerNumber as string | undefined;
                    return v ? { text: v, isSet: true } : { text: 'Not set', isSet: false };
                  }
                  return { text: 'Not set', isSet: false };
                })();

                const recommendation =
                  reachCount !== null && reachPercent !== null
                    ? getChannelRecommendation(
                        ch.id,
                        segmentSize,
                        reachCount,
                        reachPercent,
                        conversionRate,
                        tentativeBudget,
                      )
                    : null;

                return (
                  <ChannelRow
                    key={ch.id}
                    channelDef={ch}
                    isSelected={isSelected}
                    reachCount={reachCount}
                    reachPercent={reachPercent}
                    conversionRate={conversionRate}
                    conversionLabel={convLabel}
                    recommendation={recommendation}
                    isExpanded={expandedChannel === ch.id}
                    onToggle={() => toggleChannel(ch.id)}
                    onExpandToggle={() => handleConfigureClick(ch.id)}
                    senderSummary={senderSummary}
                    showScrollToSender={scrollToSenderChannel === ch.id}
                    onSenderBlockConsumed={() =>
                      setScrollToSenderChannel((prev) => (prev === ch.id ? null : prev))
                    }
                    senderBlock={(() => {
                      if (ch.id === 'sms') {
                        const account = ((sc as any)?.sms?.account as string | undefined) ?? '';
                        const senderId = ((sc as any)?.sms?.senderId as string | undefined) ?? '';
                        const senderOptions = account && (SMS_SENDER_IDS as any)[account] ? (SMS_SENDER_IDS as any)[account] : [];

                        // auto-select if single option
                        const autoSelect =
                          account && senderOptions.length === 1 && !senderId ? senderOptions[0].id : null;
                        if (autoSelect) {
                          window.setTimeout(() => {
                            updateSenderConfig('sms', { sms: { account, senderId: autoSelect } });
                          }, 0);
                        }

                        const autoHint =
                          account && senderOptions.length === 1
                            ? (
                                <span className="text-[11px] font-semibold text-cyan">
                                  Auto-selected ·{' '}
                                  <span className="font-semibold hover:underline">Change</span>
                                </span>
                              )
                            : null;

                        const badge = (t: string) => (
                          <span className="rounded-full border border-[#E5E7EB] bg-white px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                            {t}
                          </span>
                        );

                        return (
                          <div className="flex flex-col gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                              Sender configuration
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <SimpleDropdownSelect
                                label="Account"
                                placeholder="Select SMS account..."
                                value={(account as any) || ''}
                                options={SMS_ACCOUNTS.map((a) => ({ value: a, label: a }))}
                                onChange={(v) => updateSenderConfig('sms', { sms: { account: v, senderId: '' } })}
                                rightLink={
                                  <button type="button" className="text-xs font-semibold text-cyan hover:underline">
                                    Manage accounts →
                                  </button>
                                }
                              />
                              <SimpleDropdownSelect
                                label="Sender ID"
                                placeholder="Select sender ID..."
                                value={(senderId as any) || ''}
                                options={senderOptions.map((s: any) => ({
                                  value: s.id,
                                  label: s.id,
                                  metaRight: badge(s.type),
                                }))}
                                onChange={(v) => updateSenderConfig('sms', { sms: { account, senderId: v } })}
                                rightLink={autoHint}
                              />
                            </div>
                            <p className="text-[11px] text-text-secondary">
                              Must match DLT registered sender ID for this content type
                            </p>
                          </div>
                        );
                      }

                      if (ch.id === 'whatsapp') {
                        const waba = ((sc as any)?.whatsapp?.waba as string | undefined) ?? '';
                        const phoneNumber = ((sc as any)?.whatsapp?.phoneNumber as string | undefined) ?? '';
                        const messageType = ((sc as any)?.whatsapp?.messageType as 'template' | 'session' | undefined) ?? 'template';
                        const numbers = waba && (WABA_NUMBERS as any)[waba] ? (WABA_NUMBERS as any)[waba] : [];

                        // auto-select if single
                        if (waba && numbers.length === 1 && !phoneNumber) {
                          window.setTimeout(() => {
                            updateSenderConfig('whatsapp', { whatsapp: { waba, phoneNumber: numbers[0].number, messageType } });
                          }, 0);
                        }

                        const autoHint =
                          waba && numbers.length === 1
                            ? (
                                <span className="text-[11px] font-semibold text-cyan">
                                  Auto-selected ·{' '}
                                  <span className="font-semibold hover:underline">Change</span>
                                </span>
                              )
                            : null;

                        const statusDot = (s: 'active' | 'pending') => (
                          <span className="inline-flex items-center gap-1">
                            <span className={['h-1.5 w-1.5 rounded-full', s === 'active' ? 'bg-emerald-500' : 'bg-amber-400'].join(' ')} />
                            <span className="text-[10px] font-semibold text-text-secondary">{s === 'active' ? 'Active' : 'Pending'}</span>
                          </span>
                        );

                        return (
                          <div className="flex flex-col gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                              Sender configuration
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <SimpleDropdownSelect
                                label="WhatsApp Business Account"
                                placeholder="Select WABA..."
                                value={(waba as any) || ''}
                                options={WABAS.map((w) => ({ value: w.id, label: `${w.name} (ID: ${w.id})` }))}
                                onChange={(v) => updateSenderConfig('whatsapp', { whatsapp: { waba: v, phoneNumber: '', messageType } })}
                                rightLink={
                                  <button type="button" className="text-xs font-semibold text-cyan hover:underline">
                                    Manage WABAs →
                                  </button>
                                }
                              />
                              <SimpleDropdownSelect
                                label="Phone number"
                                placeholder="Select number..."
                                value={(phoneNumber as any) || ''}
                                options={numbers.map((n: any) => ({
                                  value: n.number,
                                  label: `${n.number} · ${n.display}`,
                                  metaRight: statusDot(n.status),
                                }))}
                                onChange={(v) => updateSenderConfig('whatsapp', { whatsapp: { waba, phoneNumber: v, messageType } })}
                                rightLink={autoHint}
                              />
                            </div>

                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-text-secondary">Message type</label>
                                <InfoTooltip text="Only available within 24-hour user-initiated conversation window" />
                              </div>
                              <div className="inline-flex w-full rounded-lg border border-[#E5E7EB] bg-white p-1">
                                {([
                                  { id: 'template', label: 'Template message' },
                                  { id: 'session', label: 'Session message' },
                                ] as const).map((opt) => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => updateSenderConfig('whatsapp', { whatsapp: { waba, phoneNumber, messageType: opt.id } })}
                                    className={[
                                      'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                                      messageType === opt.id ? 'bg-cyan text-white' : 'text-text-secondary hover:text-text-primary',
                                    ].join(' ')}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (ch.id === 'rcs') {
                        const agent = ((sc as any)?.rcs?.agent as string | undefined) ?? '';
                        const sender = ((sc as any)?.rcs?.sender as string | undefined) ?? '';
                        const fallback = ((sc as any)?.rcs?.fallback as 'sms' | 'none' | undefined) ?? 'sms';
                        const senders = agent && (RCS_SENDERS as any)[agent] ? (RCS_SENDERS as any)[agent] : [];

                        if (agent && senders.length === 1 && !sender) {
                          window.setTimeout(() => updateSenderConfig('rcs', { rcs: { agent, sender: senders[0].label, fallback } }), 0);
                        }

                        const autoHint =
                          agent && senders.length === 1
                            ? (
                                <span className="text-[11px] font-semibold text-cyan">
                                  Auto-selected ·{' '}
                                  <span className="font-semibold hover:underline">Change</span>
                                </span>
                              )
                            : null;

                        return (
                          <div className="flex flex-col gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                              Sender configuration
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <SimpleDropdownSelect
                                label="RCS Agent"
                                placeholder="Select RCS agent..."
                                value={(agent as any) || ''}
                                options={RCS_AGENTS.map((a) => ({
                                  value: a.name,
                                  label: a.verified ? `${a.name} ✓` : a.name,
                                }))}
                                onChange={(v) => updateSenderConfig('rcs', { rcs: { agent: v, sender: '', fallback } })}
                                rightLink={
                                  <button type="button" className="text-xs font-semibold text-cyan hover:underline">
                                    Manage agents →
                                  </button>
                                }
                              />
                              <SimpleDropdownSelect
                                label="Sender"
                                placeholder="Select sender..."
                                value={(sender as any) || ''}
                                options={senders.map((s: any) => ({
                                  value: s.label,
                                  label: s.label,
                                  metaRight: (
                                    <span className="text-[10px] font-semibold text-text-secondary">{s.note}</span>
                                  ),
                                }))}
                                onChange={(v) => updateSenderConfig('rcs', { rcs: { agent, sender: v, fallback } })}
                                rightLink={autoHint}
                              />
                            </div>
                            <p className="text-[11px] text-text-secondary">
                              RCS delivery falls back to SMS if recipient device is not RCS-enabled
                            </p>

                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-text-secondary">Fallback if RCS undelivered</label>
                                <InfoTooltip text="Message will not be delivered if recipient device doesn't support RCS" />
                              </div>
                              <div className="inline-flex w-full rounded-lg border border-[#E5E7EB] bg-white p-1">
                                {([
                                  { id: 'sms', label: 'SMS fallback' },
                                  { id: 'none', label: 'No fallback' },
                                ] as const).map((opt) => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => updateSenderConfig('rcs', { rcs: { agent, sender, fallback: opt.id } })}
                                    className={[
                                      'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                                      fallback === opt.id ? 'bg-cyan text-white' : 'text-text-secondary hover:text-text-primary',
                                    ].join(' ')}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                              {fallback === 'sms' && (
                                <p className="mt-1 text-[11px] text-text-secondary">
                                  Will use the SMS sender configured in this campaign. If SMS is not enabled, add it as a channel first.
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // ai_voice
                      const account = ((sc as any)?.ai_voice?.account as string | undefined) ?? '';
                      const callerNumber = ((sc as any)?.ai_voice?.callerNumber as string | undefined) ?? '';
                      const agentId = ((sc as any)?.ai_voice?.agentId as string | undefined) ?? '';
                      const retry = ((sc as any)?.ai_voice?.retry as any) ?? {
                        enabled: false,
                        maxRetries: 2,
                        delayValue: 30,
                        delayUnit: 'minutes',
                        retryOn: { noAnswer: true, busy: true, networkError: true },
                      };

                      const numbers = account && (VOICE_NUMBERS as any)[account] ? (VOICE_NUMBERS as any)[account] : [];
                      if (account && numbers.length === 1 && !callerNumber) {
                        window.setTimeout(() => updateSenderConfig('ai_voice', { ai_voice: { account, callerNumber: numbers[0].number, agentId, retry } }), 0);
                      }

                      const autoHint =
                        account && numbers.length === 1
                          ? (
                              <span className="text-[11px] font-semibold text-cyan">
                                Auto-selected ·{' '}
                                <span className="font-semibold hover:underline">Change</span>
                              </span>
                            )
                          : null;

                      const badge = (t: string) => (
                        <span className="rounded-full border border-[#E5E7EB] bg-white px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                          {t}
                        </span>
                      );

                      return (
                        <div className="flex flex-col gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                            Caller configuration
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <SimpleDropdownSelect
                              label="Voice account"
                              placeholder="Select voice account..."
                              value={(account as any) || ''}
                              options={VOICE_ACCOUNTS.map((a) => ({ value: a, label: a }))}
                              onChange={(v) =>
                                updateSenderConfig('ai_voice', {
                                  ai_voice: { account: v, callerNumber: '', agentId, retry },
                                })
                              }
                              rightLink={
                                <button type="button" className="text-xs font-semibold text-cyan hover:underline">
                                  Manage accounts →
                                </button>
                              }
                            />
                            <SimpleDropdownSelect
                              label="Caller number (DID)"
                              placeholder="Select number..."
                              value={(callerNumber as any) || ''}
                              options={numbers.map((n: any) => ({
                                value: n.number,
                                label: `${n.number} · ${n.label}`,
                                metaRight: badge(n.type),
                              }))}
                              onChange={(v) =>
                                updateSenderConfig('ai_voice', {
                                  ai_voice: { account, callerNumber: v, agentId, retry },
                                })
                              }
                              rightLink={autoHint}
                            />
                          </div>
                          <p className="text-[11px] text-text-secondary">
                            Ensure this number is approved for outbound campaigns with your telecom provider
                          </p>

                          <VoiceAgentPicker
                            agentId={agentId}
                            onChange={(v) =>
                              updateSenderConfig('ai_voice', {
                                ai_voice: { account, callerNumber, agentId: v, retry },
                              })
                            }
                          />

                          <div className="rounded-lg border border-[#E5E7EB] bg-white p-3">
                            <button
                              type="button"
                              onClick={() => updateSenderConfig('ai_voice', { ai_voice: { account, callerNumber, agentId, retry: { ...retry, enabled: !retry.enabled } } })}
                              className="flex w-full items-center justify-between text-left"
                            >
                              <span className="text-xs font-semibold text-text-primary">Retry settings</span>
                              <ChevronDown
                                size={16}
                                className={retry.enabled ? 'rotate-180 text-text-secondary transition-transform' : 'text-text-secondary transition-transform'}
                              />
                            </button>
                            <AnimatePresence initial={false}>
                              {retry.enabled && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.14 }}
                                  className="mt-3 overflow-hidden"
                                >
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1">
                                      <label className="text-xs font-medium text-text-secondary">Max retries</label>
                                      <input
                                        type="number"
                                        min={0}
                                        max={5}
                                        value={retry.maxRetries}
                                        onChange={(e) =>
                                          updateSenderConfig('ai_voice', {
                                            ai_voice: {
                                              account,
                                              callerNumber,
                                              agentId,
                                              retry: { ...retry, maxRetries: Math.min(5, Math.max(0, Number(e.target.value || 0))) },
                                            },
                                          })
                                        }
                                        className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <label className="text-xs font-medium text-text-secondary">Retry delay</label>
                                      <div className="flex gap-2">
                                        <input
                                          type="number"
                                          min={1}
                                          value={retry.delayValue}
                                          onChange={(e) =>
                                            updateSenderConfig('ai_voice', {
                                              ai_voice: {
                                                account,
                                                callerNumber,
                                                agentId,
                                                retry: { ...retry, delayValue: Math.max(1, Number(e.target.value || 1)) },
                                              },
                                            })
                                          }
                                          className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
                                        />
                                        <SimpleDropdownSelect
                                          label=""
                                          placeholder="Unit"
                                          value={retry.delayUnit}
                                          options={[
                                            { value: 'minutes' as any, label: 'minutes' },
                                            { value: 'hours' as any, label: 'hours' },
                                          ]}
                                          onChange={(v) =>
                                            updateSenderConfig('ai_voice', {
                                              ai_voice: {
                                                account,
                                                callerNumber,
                                                agentId,
                                                retry: { ...retry, delayUnit: v },
                                              },
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-3">
                                    <p className="text-xs font-medium text-text-secondary">Retry on</p>
                                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-secondary">
                                      {[
                                        { key: 'noAnswer', label: 'No answer' },
                                        { key: 'busy', label: 'Busy' },
                                        { key: 'networkError', label: 'Network error' },
                                      ].map((x) => (
                                        <label key={x.key} className="inline-flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={Boolean(retry.retryOn?.[x.key])}
                                            onChange={(e) =>
                                              updateSenderConfig('ai_voice', {
                                                ai_voice: {
                                                  account,
                                                  callerNumber,
                                                  agentId,
                                                  retry: {
                                                    ...retry,
                                                    retryOn: { ...retry.retryOn, [x.key]: e.target.checked },
                                                  },
                                                },
                                              })
                                            }
                                          />
                                          {x.label}
                                        </label>
                                      ))}
                                    </div>
                                    <p className="mt-2 text-[11px] text-text-secondary">
                                      Each retry attempt counts as a separate call for billing
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })()}
                    audienceSize={segmentSize > 0 ? segmentSize : 45000}
                    variants={getVariants(ch.id)}
                    testing={getTesting(ch.id)}
                    onVariantsChange={(v) => handleVariantsChange(ch.id, v)}
                    onTestingChange={(t) => handleTestingChange(ch.id, t)}
                    onPrimaryContentChange={(c) => handlePrimaryContentChange(ch.id, c)}
                  />
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Smart-plan sub-segment row (expandable + editable) ───────────────────────

const TIMING_OPTIONS = [
  'Send immediately',
  '9–11 AM IST',
  '11 AM–2 PM IST',
  '2–5 PM IST',
  '5–9 PM IST',
  'Sat–Sun, 11 AM–6 PM',
];

const FALLBACK_WAIT_OPTIONS = ['12h', '24h', '48h', '72h', '96h'];

function channelDisplayName(ch: string): string {
  if (ch === 'ai_voice') return 'AI Voice';
  if (ch === 'whatsapp') return 'WhatsApp';
  return String(ch).toUpperCase();
}

interface SmartPlanRowProps {
  ss: Record<string, unknown>;
  expanded: boolean;
  editing: boolean;
  availableChannels: ChannelType[];
  onToggleExpand: () => void;
  onToggleEdit: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
}

function SmartPlanSubSegmentRow({
  ss,
  expanded,
  editing,
  availableChannels,
  onToggleExpand,
  onToggleEdit,
  onPatch,
}: SmartPlanRowProps) {
  const name = String(ss.name ?? 'Sub-segment');
  const reason = String(ss.reason ?? '');
  const userCount = Number(ss.userCount ?? 0);
  const percentage = Number(ss.percentage ?? 0);
  const estimatedCost = Number(ss.estimatedCost ?? 0);
  const primaryChannel = (ss.primaryChannel as ChannelType | undefined) ?? 'sms';
  const tags = Array.isArray(ss.tags) ? (ss.tags as unknown[]).map((t) => String(t)) : [];
  const journey = Array.isArray(ss.journey) ? (ss.journey as Array<Record<string, unknown>>) : [];
  const fallbackStep = journey[1];
  const fallbackChannel = fallbackStep
    ? (String(fallbackStep.channelId) as ChannelType)
    : null;
  const primaryWait = journey[0] ? String(journey[0].waitDuration ?? '—') : '—';
  const timing = typeof ss.timing === 'string' ? (ss.timing as string) : '—';
  const conversionPct = typeof ss.conversionPct === 'number' ? (ss.conversionPct as number) : null;

  const isCustomTiming = typeof ss.timing === 'string' && !TIMING_OPTIONS.includes(ss.timing as string);

  function patchPrimaryChannel(next: ChannelType) {
    const updatedJourney = journey.length > 0
      ? journey.map((step, idx) => (idx === 0 ? { ...step, channelId: next } : step))
      : [{ channelId: next, waitDuration: '48h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '6h' }];
    onPatch({ primaryChannel: next, journey: updatedJourney });
  }

  function patchFallbackChannel(next: ChannelType) {
    if (journey.length === 0) return;
    const updated = journey.length === 1
      ? [...journey, { channelId: next, waitDuration: '48h', triggerCondition: 'no_response', maxRetries: 1, retryGap: '6h' }]
      : journey.map((step, idx) => (idx === 1 ? { ...step, channelId: next } : step));
    onPatch({ journey: updated });
  }

  function patchPrimaryWait(next: string) {
    if (journey.length === 0) return;
    const updated = journey.map((step, idx) => (idx === 0 ? { ...step, waitDuration: next } : step));
    onPatch({ journey: updated });
  }

  function patchStepTemplate(stepIdx: number, templateId: string | undefined) {
    if (journey.length === 0 || stepIdx < 0 || stepIdx >= journey.length) return;
    const updated = journey.map((step, idx) =>
      idx === stepIdx ? { ...step, templateId } : step,
    );
    onPatch({ journey: updated });
  }

  return (
    <div className="px-4 py-3">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <ChevronDown
            size={14}
            className={[
              'shrink-0 text-text-secondary transition-transform',
              expanded ? 'rotate-0' : '-rotate-90',
            ].join(' ')}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{name}</p>
            <p className="mt-0.5 truncate text-xs text-text-secondary">{reason}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold text-text-primary">
            {userCount.toLocaleString('en-AE')} users · {percentage ? `${percentage}%` : '—'}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">AED {estimatedCost.toFixed(0)}</p>
        </div>
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
          <ChannelIcon channel={primaryChannel} size={12} />
          {channelDisplayName(primaryChannel)}
        </span>
        {tags.slice(0, 3).map((t) => (
          <span
            key={t}
            className="rounded-full border border-[#E5E7EB] bg-white px-2 py-0.5 text-[11px] font-medium text-text-secondary"
          >
            {t}
          </span>
        ))}
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="mt-3 flex flex-col gap-3">
          {/* Edit toggle */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onToggleEdit}
              className={[
                'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                editing
                  ? 'border-cyan/40 bg-cyan/10 text-cyan'
                  : 'border-[#E5E7EB] bg-white text-text-secondary hover:border-[#D1D5DB] hover:text-text-primary',
              ].join(' ')}
            >
              {editing ? 'Done' : 'Edit'}
            </button>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-[#E5E7EB] bg-white p-3 sm:grid-cols-3">
            <SmartPlanDetail label="Sub-cohort" value={name} />
            <SmartPlanDetail
              label="Size"
              value={`${userCount.toLocaleString('en-AE')} · ${percentage ? `${percentage}%` : '—'}`}
            />
            <SmartPlanDetail
              label="Primary channel"
              value={
                editing ? (
                  <select
                    value={primaryChannel}
                    onChange={(e) => patchPrimaryChannel(e.target.value as ChannelType)}
                    className="w-full rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {availableChannels.map((ch) => (
                      <option key={ch} value={ch}>
                        {channelDisplayName(ch)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <ChannelIcon channel={primaryChannel} size={12} />
                    {channelDisplayName(primaryChannel)}
                  </span>
                )
              }
            />
            <SmartPlanDetail
              label="Timing"
              value={
                editing ? (
                  <select
                    value={isCustomTiming ? '__custom' : timing}
                    onChange={(e) => {
                      if (e.target.value === '__custom') return;
                      onPatch({ timing: e.target.value });
                    }}
                    className="w-full rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {isCustomTiming && <option value="__custom">{timing}</option>}
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
            <SmartPlanDetail
              label="Fallback channel"
              value={
                editing ? (
                  <select
                    value={fallbackChannel ?? ''}
                    onChange={(e) => patchFallbackChannel(e.target.value as ChannelType)}
                    disabled={journey.length === 0}
                    className="w-full rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                  >
                    {!fallbackChannel && <option value="">None</option>}
                    {availableChannels
                      .filter((ch) => ch !== primaryChannel)
                      .map((ch) => (
                        <option key={ch} value={ch}>
                          {channelDisplayName(ch)}
                        </option>
                      ))}
                  </select>
                ) : fallbackChannel ? (
                  <span className="inline-flex items-center gap-1.5">
                    <ChannelIcon channel={fallbackChannel} size={12} />
                    {channelDisplayName(fallbackChannel)} after {primaryWait}
                  </span>
                ) : (
                  'None'
                )
              }
            />
            <SmartPlanDetail
              label={fallbackChannel ? 'Wait before fallback' : 'Wait'}
              value={
                editing ? (
                  <select
                    value={primaryWait}
                    onChange={(e) => patchPrimaryWait(e.target.value)}
                    disabled={journey.length === 0}
                    className="w-full rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                  >
                    {FALLBACK_WAIT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  primaryWait
                )
              }
            />
            <SmartPlanDetail
              label="Conversion (est.)"
              value={conversionPct !== null && conversionPct > 0 ? `${conversionPct.toFixed(1)}%` : '—'}
            />
          </div>

          {/* Per-channel templates from the content library. Visible whenever
              the row is expanded — pickable in any state, not gated by Edit. */}
          <div className="rounded-lg border border-[#E5E7EB] bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                Message templates
              </p>
              <span className="text-[10px] text-text-tertiary">
                Pulled from content library
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {journey.length === 0 ? (
                <p className="col-span-full text-[11px] italic text-text-tertiary">
                  No journey steps yet.
                </p>
              ) : (
                journey.map((step, idx) => {
                  const stepChannel = (step.channelId as ChannelType | undefined) ?? primaryChannel;
                  const stepTemplateId =
                    typeof step.templateId === 'string' ? (step.templateId as string) : undefined;
                  return (
                    <SmartPlanTemplatePicker
                      key={`${idx}-${stepChannel}`}
                      stepIdx={idx}
                      channel={stepChannel}
                      templateId={stepTemplateId}
                      onChange={patchStepTemplate}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SmartPlanDetail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      <span className="truncate text-xs font-medium text-text-primary">{value}</span>
    </div>
  );
}

const TEMPLATE_CHANNELS: ChannelType[] = ['whatsapp', 'sms', 'rcs'];

function isTemplateChannel(channel: ChannelType): channel is TemplateChannel {
  return (TEMPLATE_CHANNELS as ChannelType[]).includes(channel);
}

interface SmartPlanTemplatePickerProps {
  /** Position in the journey (0 = primary, 1 = fallback). */
  stepIdx: number;
  channel: ChannelType;
  templateId: string | undefined;
  onChange: (stepIdx: number, templateId: string | undefined) => void;
}

/**
 * Per-channel template picker rendered inside an expanded SmartPlan row.
 * Reads from the same content library store the manual wizard uses so the
 * Smart + AI flow stays in sync with anything created in /content-library.
 */
function SmartPlanTemplatePicker({
  stepIdx,
  channel,
  templateId,
  onChange,
}: SmartPlanTemplatePickerProps) {
  const [templates, setTemplates] = useState<ContentTemplateRow[]>([]);
  useEffect(() => {
    setTemplates(loadContentTemplates());
  }, []);

  if (!isTemplateChannel(channel)) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
          {channelDisplayName(channel)} template
        </span>
        <span className="text-[11px] italic text-text-tertiary">
          {channel === 'ai_voice'
            ? 'Voice script configured on the AI Voice agent.'
            : 'Templates not available for this channel.'}
        </span>
      </div>
    );
  }

  const filtered = templates.filter(
    (t) => t.channel === channel && t.status === 'approved',
  );
  const selected = templates.find((t) => t.id === templateId);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
          {channelDisplayName(channel)} template
        </span>
        <RouterLink
          to="/content-library"
          className="shrink-0 text-[10px] font-semibold text-cyan hover:underline"
        >
          Open library →
        </RouterLink>
      </div>
      <select
        value={templateId ?? ''}
        onChange={(e) => onChange(stepIdx, e.target.value || undefined)}
        className="min-w-0 rounded-md border border-[#E5E7EB] bg-white px-2 py-1.5 text-xs text-text-primary focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan/30"
      >
        <option value="">Select template…</option>
        {filtered.length === 0 && (
          <option value="" disabled>
            No approved templates yet
          </option>
        )}
        {filtered.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {selected && (
        <p className="line-clamp-2 text-[11px] leading-snug text-text-secondary">
          {selected.bodyPreview}
        </p>
      )}
    </div>
  );
}
