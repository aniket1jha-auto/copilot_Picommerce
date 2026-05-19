'use client';

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  TriangleAlert,
} from 'lucide-react';
import { ChannelIcon } from '@/components/common/ChannelIcon';
import { formatINR, formatCount, formatPercent } from '@/utils/format';
import { useRecommendationsStore } from '@/store/recommendationsStore';
import { RecommendationCard } from '@/components/campaign/recommendations/RecommendationCard';
import type { Campaign, ChannelType } from '@/types';

/**
 * Shared campaign-detail sections.
 *
 * Extracted out of the old monolithic CampaignDetail.tsx so the same
 * blocks can render on:
 *   1. /campaigns/:id — slim view (Live Performance + AI Insights)
 *   2. /observe/performance — full view minus AI Insights
 *
 * All sections take a Campaign as input but the demo numbers
 * (sub-segments, channel rows, variants, AI insights) are hardcoded
 * for the mock — same as the old file. When a real backend lands,
 * each section becomes the natural data-binding seam.
 */

/* ─── Types ───────────────────────────────────────────────────────────── */

interface SubSegmentStep {
  channel: ChannelType;
  sent: number;
  delivered: number;
  responded: number;
  converted: number;
  cost: number;
}

interface SubSegment {
  name: string;
  users: number;
  contacted: number;
  responded: number;
  converted: number;
  spend: number;
  costPerConv: number;
  status: 'healthy' | 'warning' | 'critical';
  steps: SubSegmentStep[];
}

interface ChannelRow {
  channel: ChannelType;
  sent: number;
  delivered: number;
  delRate: number;
  openedAnswered: number;
  converted: number;
  convRate: number;
  cost: number;
  costPerConv: number;
  isBest: boolean;
}

interface ContentVariant {
  name: string;
  channel: ChannelType;
  trafficReceived: number;
  sent: number;
  opened: number;
  converted: number;
  convRate: number;
  status: 'winner' | 'testing' | 'concluded';
}

interface AutoAppliedInsight {
  id: string;
  title: string;
  description: string;
  action: string;
  impact: string;
  appliedAt: string;
}

// PendingInsight / PendingStatus removed — see useRecommendationsStore
// for the canonical recommendation shape.

type SortKey =
  | 'name'
  | 'users'
  | 'contacted'
  | 'responded'
  | 'converted'
  | 'convRate'
  | 'spend'
  | 'costPerConv';
type SortDir = 'asc' | 'desc';

/* ─── Demo data — unchanged from the old CampaignDetail ───────────────── */

const SUB_SEGMENTS: SubSegment[] = [
  {
    name: 'High Value + WhatsApp',
    users: 12400,
    contacted: 11780,
    responded: 4120,
    converted: 1142,
    spend: 85600,
    costPerConv: 75,
    status: 'healthy',
    steps: [
      { channel: 'whatsapp', sent: 12400, delivered: 11780, responded: 4120, converted: 820, cost: 8060 },
      { channel: 'ai_voice', sent: 7660, delivered: 6510, responded: 2280, converted: 248, cost: 45960 },
      { channel: 'field_executive', sent: 5230, delivered: 5230, responded: 3140, converted: 74, cost: 31580 },
    ],
  },
  {
    name: 'WhatsApp — Morning Responders',
    users: 8200,
    contacted: 7790,
    responded: 2960,
    converted: 577,
    spend: 53300,
    costPerConv: 92,
    status: 'healthy',
    steps: [
      { channel: 'whatsapp', sent: 8200, delivered: 7790, responded: 2960, converted: 380, cost: 5330 },
      { channel: 'sms', sent: 4830, delivered: 4590, responded: 920, converted: 112, cost: 1208 },
      { channel: 'ai_voice', sent: 3670, delivered: 3120, responded: 1090, converted: 85, cost: 22020 },
    ],
  },
  {
    name: 'WhatsApp — Evening Responders',
    users: 6800,
    contacted: 6460,
    responded: 2380,
    converted: 439,
    spend: 44200,
    costPerConv: 101,
    status: 'healthy',
    steps: [
      { channel: 'whatsapp', sent: 6800, delivered: 6460, responded: 2380, converted: 290, cost: 4420 },
      { channel: 'sms', sent: 4080, delivered: 3876, responded: 780, converted: 89, cost: 1020 },
      { channel: 'ai_voice', sent: 3096, delivered: 2632, responded: 920, converted: 60, cost: 18576 },
    ],
  },
  {
    name: 'Push + SMS — App Users',
    users: 7600,
    contacted: 7030,
    responded: 1820,
    converted: 370,
    spend: 38100,
    costPerConv: 103,
    status: 'healthy',
    steps: [
      { channel: 'push_notification', sent: 7600, delivered: 7258, responded: 1820, converted: 190, cost: 380 },
      { channel: 'sms', sent: 5438, delivered: 5166, responded: 1030, converted: 112, cost: 1360 },
      { channel: 'ai_voice', sent: 4136, delivered: 3516, responded: 1230, converted: 68, cost: 24816 },
    ],
  },
  {
    name: 'SMS Only — No App',
    users: 5400,
    contacted: 4590,
    responded: 412,
    converted: 83,
    spend: 21600,
    costPerConv: 260,
    status: 'warning',
    steps: [
      { channel: 'sms', sent: 5400, delivered: 4590, responded: 412, converted: 42, cost: 1350 },
      { channel: 'ai_voice', sent: 4178, delivered: 3551, responded: 1244, converted: 41, cost: 20268 },
    ],
  },
  {
    name: 'AI Voice Only',
    users: 3800,
    contacted: 3610,
    responded: 1444,
    converted: 292,
    spend: 63840,
    costPerConv: 219,
    status: 'healthy',
    steps: [
      { channel: 'ai_voice', sent: 3800, delivered: 3610, responded: 1444, converted: 220, cost: 22800 },
      { channel: 'sms', sent: 2166, delivered: 2058, responded: 410, converted: 72, cost: 542 },
    ],
  },
];

const CHANNEL_ROWS: ChannelRow[] = [
  {
    channel: 'whatsapp',
    sent: 27400,
    delivered: 26030,
    delRate: 95.0,
    openedAnswered: 20824,
    converted: 2158,
    convRate: 7.9,
    cost: 17810,
    costPerConv: 8.25,
    isBest: true,
  },
  {
    channel: 'push_notification',
    sent: 7600,
    delivered: 7258,
    delRate: 95.5,
    openedAnswered: 3193,
    converted: 274,
    convRate: 3.6,
    cost: 2280,
    costPerConv: 8.32,
    isBest: false,
  },
  {
    channel: 'sms',
    sent: 10600,
    delivered: 9530,
    delRate: 89.9,
    openedAnswered: 5002,
    converted: 179,
    convRate: 1.7,
    cost: 2650,
    costPerConv: 14.8,
    isBest: false,
  },
  {
    channel: 'ai_voice',
    sent: 3800,
    delivered: 3610,
    delRate: 95.0,
    openedAnswered: 1444,
    converted: 292,
    convRate: 7.7,
    cost: 9500,
    costPerConv: 32.5,
    isBest: false,
  },
];

const CONTENT_VARIANTS: ContentVariant[] = [
  {
    name: 'Variant A — Primary',
    channel: 'whatsapp',
    trafficReceived: 34,
    sent: 9180,
    opened: 7344,
    converted: 505,
    convRate: 5.5,
    status: 'concluded',
  },
  {
    name: 'Variant B — Casual',
    channel: 'whatsapp',
    trafficReceived: 52,
    sent: 14040,
    opened: 11793,
    converted: 955,
    convRate: 6.8,
    status: 'winner',
  },
  {
    name: 'Variant C — Urgency',
    channel: 'whatsapp',
    trafficReceived: 14,
    sent: 3780,
    opened: 3024,
    converted: 178,
    convRate: 4.7,
    status: 'concluded',
  },
];

const AUTO_APPLIED_INSIGHTS: AutoAppliedInsight[] = [
  {
    id: 'auto-1',
    title: 'Content variant auto-optimization',
    description: 'Variant B auto-promoted for WhatsApp channel',
    action: 'Shifted 100% traffic to Variant B after it outperformed A by 24%',
    impact: 'Conversion rate improved from 5.5% to 6.8% (+24%)',
    appliedAt: 'Apr 4, 8:00 AM',
  },
  {
    id: 'auto-2',
    title: 'Send time optimization',
    description: 'Adjusted WhatsApp send times for Evening Responders',
    action: 'Shifted delivery window from 2–4 PM to 5–7 PM based on engagement patterns',
    impact: 'Open rate improved by 18% for this sub-segment',
    appliedAt: 'Apr 5, 10:00 AM',
  },
  {
    id: 'auto-3',
    title: 'Channel fallback acceleration',
    description: 'Reduced wait time for SMS fallback in SMS-Only group',
    action: 'Wait time reduced from 48h to 24h — historical data shows 92% of SMS responses come within 24h',
    impact: 'Campaign completion time reduced by ~24h for 6,200 users',
    appliedAt: 'Apr 4, 2:00 PM',
  },
];

// Pending recommendations now live in `useRecommendationsStore`.
// See src/store/recommendationsStore.ts.

const CHANNEL_SPEND_CONFIG = [
  { channel: 'whatsapp' as const, label: 'WhatsApp', pct: 42, color: '#25D366' },
  { channel: 'sms' as const, label: 'SMS', pct: 18, color: '#8B5CF6' },
  { channel: 'ai_voice' as const, label: 'AI Voice', pct: 32, color: '#00BAF2' },
  { channel: 'push_notification' as const, label: 'Push', pct: 1, color: '#F2994A' },
  { channel: 'field_executive' as const, label: 'Field', pct: 7, color: '#EB5757' },
];

const VARIANT_CHART_DATA = [
  { label: 'A', convRate: 5.5, isWinner: false },
  { label: 'B', convRate: 6.8, isWinner: true },
  { label: 'C', convRate: 4.7, isWinner: false },
];

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function TrendArrow({ up }: { up: boolean }) {
  return up ? (
    <ArrowUpRight size={14} className="text-success" />
  ) : (
    <ArrowDownRight size={14} className="text-error" />
  );
}

function channelLabel(ch: ChannelType): string {
  const labels: Record<ChannelType, string> = {
    whatsapp: 'WhatsApp',
    sms: 'SMS',
    rcs: 'RCS',
    ai_voice: 'AI Voice',
    field_executive: 'Field Executive',
    push_notification: 'Push',
    in_app_banner: 'In-App Banner',
    facebook_ads: 'Facebook Ads',
    instagram_ads: 'Instagram Ads',
  };
  return labels[ch] ?? ch;
}

/* ─── Section: Live Performance Summary (KPI tiles) ──────────────────── */

export function CampaignKPISummary({ campaign }: { campaign: Campaign }) {
  const totalReached = campaign.metrics.delivered;
  const audienceSize =
    (campaign as unknown as { audience: { totalUsers?: number; size?: number } }).audience.totalUsers ??
    (campaign as unknown as { audience: { size?: number } }).audience.size ??
    45000;
  const reachedPct = audienceSize > 0 ? (totalReached / audienceSize) * 100 : 0;
  const totalSpend = campaign.budget.spent;
  const budget = campaign.budget.allocated;
  const spendPct = budget > 0 ? (totalSpend / budget) * 100 : 0;
  const roi = (campaign as unknown as { roi?: number }).roi ?? 4.1;
  const deliveryRate =
    campaign.metrics.sent > 0 ? (campaign.metrics.delivered / campaign.metrics.sent) * 100 : 0;
  const convRate = totalReached > 0 ? (campaign.metrics.converted / totalReached) * 100 : 0;

  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">
        Live Performance Summary
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KPICard
          label="Contacted"
          value={formatCount(totalReached)}
          sub={`of ${formatCount(audienceSize)} users (${formatPercent(reachedPct)})`}
          trendUp
          progress={reachedPct}
        />
        <KPICard
          label="Spend"
          value={formatINR(totalSpend)}
          sub={`${formatPercent(spendPct)} of budget`}
          trendUp
          progress={spendPct}
        />
        <KPICard
          label="Converted"
          value={formatCount(campaign.metrics.converted)}
          sub={`${formatPercent(convRate)} of contacted`}
          trendUp
        />
        <KPICard
          label="ROI"
          value={`${roi.toFixed(1)}x`}
          sub={roi >= 3 ? 'Strong' : roi >= 1 ? 'Positive' : 'Negative'}
          trendUp={roi >= 1}
          highlight
        />
        <KPICard
          label="Delivery Rate"
          value={formatPercent(deliveryRate)}
          sub={deliveryRate >= 90 ? 'Excellent' : 'Below avg'}
          trendUp={deliveryRate >= 90}
        />
        <KPICard
          label="Conv Rate"
          value={formatPercent(convRate)}
          sub={convRate >= 5 ? 'Above avg' : 'Below avg'}
          trendUp={convRate >= 5}
        />
      </div>
    </section>
  );
}

/* ─── Section: Campaign Health ───────────────────────────────────────── */

export function CampaignHealthSection({ campaign }: { campaign: Campaign }) {
  const totalReached = campaign.metrics.delivered;
  const deliveryRate =
    campaign.metrics.sent > 0 ? (campaign.metrics.delivered / campaign.metrics.sent) * 100 : 0;
  const convRate = totalReached > 0 ? (campaign.metrics.converted / totalReached) * 100 : 0;

  const indicators = [
    {
      label: 'Delivery',
      value: deliveryRate,
      display: formatPercent(deliveryRate),
      rating: deliveryRate >= 90 ? 'Excellent' : deliveryRate >= 75 ? 'Good' : 'Below avg',
      color:
        deliveryRate >= 90 ? 'bg-[#27AE60]' : deliveryRate >= 75 ? 'bg-[#00BAF2]' : 'bg-[#F2994A]',
      dot:
        deliveryRate >= 90 ? 'text-[#27AE60]' : deliveryRate >= 75 ? 'text-[#00BAF2]' : 'text-[#F2994A]',
    },
    {
      label: 'Engagement',
      value: 34,
      display: formatPercent(34),
      rating: 'Good',
      color: 'bg-[#00BAF2]',
      dot: 'text-[#00BAF2]',
    },
    {
      label: 'Conversion',
      value: Math.min(100, convRate * 5),
      display: formatPercent(convRate),
      rating: convRate >= 8 ? 'Excellent' : convRate >= 4 ? 'Above avg' : 'Below avg',
      color: convRate >= 8 ? 'bg-[#27AE60]' : convRate >= 4 ? 'bg-[#00BAF2]' : 'bg-[#F2994A]',
      dot: convRate >= 8 ? 'text-[#27AE60]' : convRate >= 4 ? 'text-[#00BAF2]' : 'text-[#F2994A]',
    },
  ];

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-[#E5E7EB] shadow-sm">
      <p className="mb-4 text-sm font-semibold text-text-primary">Campaign Health</p>
      <div className="flex flex-col gap-3.5">
        {indicators.map((ind) => (
          <div key={ind.label} className="flex items-center gap-3">
            <span className={`text-lg leading-none ${ind.dot}`}>●</span>
            <span className="w-24 shrink-0 text-xs font-medium text-text-secondary">
              {ind.label}
            </span>
            <span className="w-12 shrink-0 text-xs font-semibold text-text-primary">
              {ind.display}
            </span>
            <div className="flex-1 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
              <motion.div
                className={`h-full rounded-full ${ind.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${ind.value}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-xs text-text-secondary">{ind.rating}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Section: Performance Breakdown (Sub-segment / Channel toggle) ── */

export function CampaignPerformanceBreakdown() {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [perfView, setPerfView] = useState<'subsegment' | 'channel'>('subsegment');
  const [sortKey, setSortKey] = useState<SortKey>('converted');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleRow = useCallback((i: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return key;
      }
      setSortDir('desc');
      return key;
    });
  }, []);

  const sortedSubSegments = useMemo(() => {
    return [...SUB_SEGMENTS].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (sortKey === 'convRate') {
        av = a.users > 0 ? a.converted / a.users : 0;
        bv = b.users > 0 ? b.converted / b.users : 0;
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      const cmp =
        typeof av === 'string'
          ? av.localeCompare(bv as string)
          : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [sortKey, sortDir]);

  return (
    <section>
      <SpendDistributionBar />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Performance Breakdown
        </h2>
        <div className="flex rounded-lg border border-[#E5E7EB] bg-[#F7F9FC] p-0.5">
          <button
            type="button"
            onClick={() => setPerfView('subsegment')}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              perfView === 'subsegment'
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            By Sub-segment
          </button>
          <button
            type="button"
            onClick={() => setPerfView('channel')}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              perfView === 'channel'
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            By Channel
          </button>
        </div>
      </div>

      {perfView === 'subsegment' && (
        <div className="rounded-xl bg-white ring-1 ring-[#E5E7EB] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7F9FC]">
                  {(
                    [
                      { key: 'name', label: 'Sub-segment' },
                      { key: 'users', label: 'Users' },
                      { key: 'contacted', label: 'Contacted' },
                      { key: 'responded', label: 'Engaged' },
                      { key: 'converted', label: 'Converted' },
                      { key: 'convRate', label: 'Conv Rate' },
                      { key: 'spend', label: 'Spend' },
                      { key: 'costPerConv', label: 'Cost/Conv' },
                      { key: null, label: 'Status' },
                    ] as { key: SortKey | null; label: string }[]
                  ).map(({ key, label }) => (
                    <th
                      key={label}
                      onClick={key ? () => handleSort(key) : undefined}
                      className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary whitespace-nowrap ${
                        key ? 'cursor-pointer select-none hover:text-text-primary' : ''
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {key &&
                          sortKey === key &&
                          (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {sortedSubSegments.map((seg, i) => (
                  <SubSegmentRow
                    key={seg.name}
                    seg={seg}
                    index={i}
                    isExpanded={expandedRows.has(i)}
                    onToggle={() => toggleRow(i)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {perfView === 'channel' && (
        <div className="rounded-xl bg-white ring-1 ring-[#E5E7EB] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7F9FC]">
                  {['Channel', 'Sent', 'Delivered', 'Del. Rate', 'Engaged', 'Converted', 'Conv. Rate', 'Cost', 'Cost / Conv'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {CHANNEL_ROWS.map((row) => (
                  <tr
                    key={row.channel}
                    className={`border-b border-[#F3F4F6] last:border-0 transition-colors ${
                      row.isBest ? 'bg-green-50' : 'hover:bg-[#F7F9FC]'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ChannelIcon channel={row.channel} size={14} />
                        <span className="font-medium capitalize text-text-primary">
                          {channelLabel(row.channel)}
                        </span>
                        {row.isBest && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                            Best
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatCount(row.sent)}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatCount(row.delivered)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-medium ${
                          row.delRate >= 90 ? 'text-success' : 'text-warning'
                        }`}
                      >
                        {formatPercent(row.delRate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatCount(row.openedAnswered)}</td>
                    <td className="px-4 py-3 font-medium text-text-primary">{formatCount(row.converted)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold ${
                          row.convRate >= 5
                            ? 'text-success'
                            : row.convRate >= 3
                              ? 'text-warning'
                              : 'text-error'
                        }`}
                      >
                        {formatPercent(row.convRate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatINR(row.cost)}</td>
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {formatINR(row.costPerConv)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

/* ─── Section: Content Variant Performance ────────────────────────────── */

export function CampaignContentVariants() {
  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-text-secondary">
        Content Variant Performance
      </h2>
      <p className="mb-4 text-xs text-text-secondary">
        WhatsApp A/B test — 3 variants tested with equal split for first 48h. Variant B won with
        6.8% conversion (24% higher than A). All remaining traffic auto-directed to Variant B from{' '}
        <span className="font-medium text-text-primary">Apr 4, 8:00 AM</span>.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        <VariantBarChart />
        <div className="rounded-xl bg-white ring-1 ring-[#E5E7EB] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7F9FC]">
                  {[
                    'Variant',
                    'Channel',
                    'Traffic Received',
                    'Sent',
                    'Opened',
                    'Converted',
                    'Conv Rate',
                    'Status',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CONTENT_VARIANTS.map((v) => (
                  <tr
                    key={v.name}
                    className={`border-b border-[#F3F4F6] last:border-0 transition-colors ${
                      v.status === 'winner'
                        ? 'bg-green-50'
                        : v.status === 'concluded'
                          ? 'bg-[#FAFAFA]'
                          : 'hover:bg-[#F7F9FC]'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">{v.name}</td>
                    <td className="px-4 py-3">
                      <ChannelIcon channel={v.channel} size={13} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#E5E7EB]">
                          <div
                            className={`h-full rounded-full ${
                              v.status === 'winner' ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${v.trafficReceived}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-secondary">{v.trafficReceived}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatCount(v.sent)}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatCount(v.opened)}</td>
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {formatCount(v.converted)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold ${
                          v.convRate >= 6
                            ? 'text-success'
                            : v.convRate >= 5
                              ? 'text-warning'
                              : 'text-error'
                        }`}
                      >
                        {formatPercent(v.convRate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {v.status === 'winner' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          <CheckCircle2 size={10} />
                          Winner
                        </span>
                      ) : v.status === 'concluded' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                          Test concluded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E0F4FD] px-2.5 py-0.5 text-xs font-semibold text-[#00BAF2]">
                          Testing
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Section: AI Companion Insights ──────────────────────────────────── */

interface AIInsightsProps {
  /**
   * The campaign these insights belong to. Used to scope
   * recommendations + build the "open in copilot" link.
   */
  campaignId?: string;
  onDismiss?: (id: string) => void;
}

export function CampaignAIInsights({ campaignId, onDismiss }: AIInsightsProps) {
  const recs = useRecommendationsStore((s) =>
    campaignId ? s.forCampaign(campaignId) : s.recommendations,
  );
  const dismissRec = useRecommendationsStore((s) => s.dismiss);

  const pendingRecs = useMemo(() => recs.filter((r) => r.status === 'pending'), [recs]);
  const appliedRecs = useMemo(() => recs.filter((r) => r.status === 'applied'), [recs]);

  const handleDismiss = useCallback(
    (id: string) => {
      dismissRec(id);
      onDismiss?.(id);
    },
    [dismissRec, onDismiss],
  );

  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-text-secondary">
        AI Companion Insights
      </h2>
      <p className="mb-6 text-xs text-text-secondary">
        Automatically generated from campaign performance data.
      </p>

      {/* Impact summary */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-[#002970]/5 to-[#00BAF2]/5 ring-1 ring-[#00BAF2]/20 p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan/10">
            <TrendingUp size={14} className="text-cyan" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Campaign Improvement from AI Optimizations
            </p>
            <p className="text-[11px] text-text-secondary">
              Comparing metrics before and after AI companion actions were applied
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-white p-4 ring-1 ring-[#E5E7EB]">
            <p className="mb-2 text-xs font-medium text-text-secondary">Conversion Rate</p>
            <div className="flex items-end gap-2">
              <span className="text-xs text-text-secondary line-through">4.1%</span>
              <span className="text-[#27AE60]">→</span>
              <span className="text-xl font-bold text-[#27AE60]">6.4%</span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E5E7EB]">
                <motion.div
                  className="h-full rounded-full bg-[#27AE60]"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <span className="shrink-0 rounded-full bg-[#27AE60]/10 px-2 py-0.5 text-[10px] font-bold text-[#27AE60]">
                +56%
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 ring-1 ring-[#E5E7EB]">
            <p className="mb-2 text-xs font-medium text-text-secondary">Cost per Conversion</p>
            <div className="flex items-end gap-2">
              <span className="text-xs text-text-secondary line-through">₹182</span>
              <span className="text-[#27AE60]">→</span>
              <span className="text-xl font-bold text-[#27AE60]">₹118</span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E5E7EB]">
                <motion.div
                  className="h-full rounded-full bg-[#27AE60]"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                />
              </div>
              <span className="shrink-0 rounded-full bg-[#27AE60]/10 px-2 py-0.5 text-[10px] font-bold text-[#27AE60]">
                -35%
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 ring-1 ring-[#E5E7EB]">
            <p className="mb-2 text-xs font-medium text-text-secondary">Campaign Cost vs Budget</p>
            <div className="flex items-end gap-2">
              <span className="text-xl font-bold text-text-primary">₹3.06L</span>
              <span className="text-xs text-text-secondary">of ₹5L budget</span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E5E7EB]">
                <motion.div
                  className="h-full rounded-full bg-cyan"
                  initial={{ width: 0 }}
                  animate={{ width: '61%' }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                />
              </div>
              <span className="shrink-0 rounded-full bg-cyan/10 px-2 py-0.5 text-[10px] font-bold text-cyan">
                61%
              </span>
            </div>
            <p className="mt-1.5 text-[10px] text-[#27AE60] font-medium">
              Within budget — ₹1.94L remaining
            </p>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-text-secondary">
          AI optimizations (variant auto-promotion, send time adjustment, fallback acceleration)
          contributed to a{' '}
          <span className="font-semibold text-[#27AE60]"> +56% conversion rate improvement</span> and{' '}
          <span className="font-semibold text-[#27AE60]"> 35% reduction in cost per conversion</span>,
          while keeping total spend within the tentative budget.
        </p>
      </div>

      {/* Auto-applied */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 size={15} className="text-green-600" />
          <span className="text-sm font-semibold text-text-primary">
            Auto-Applied by Platform
            <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700">
              {AUTO_APPLIED_INSIGHTS.length}
            </span>
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {AUTO_APPLIED_INSIGHTS.map((insight) => (
            <AutoAppliedInsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>

      {/* Pending approval — clicking a card opens the recommendation in
          the copilot chat inside the campaign builder. */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <TriangleAlert size={15} className="text-amber-500" />
          <span className="text-sm font-semibold text-text-primary">
            Needs Your Approval
            <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
              {pendingRecs.length}
            </span>
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {pendingRecs.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                mode="link"
                applyHref={
                  campaignId
                    ? `/campaigns/${campaignId}/edit?recommendationId=${rec.id}`
                    : '#'
                }
                onDismiss={() => handleDismiss(rec.id)}
              />
            ))}
          </AnimatePresence>
          {pendingRecs.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center">
              <CheckCircle2 size={20} className="mx-auto mb-1.5 text-green-600" />
              <p className="text-[12px] text-text-secondary">
                Nothing waiting for your approval. New recommendations show up here as the
                campaign runs.
              </p>
            </div>
          )}
        </div>

        {/* Recently applied — small inline trail so the user sees that
            their approvals actually landed. */}
        {appliedRecs.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              Recently applied
            </p>
            <div className="flex flex-col gap-2">
              {appliedRecs.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} mode="inline" />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Visual sub-components ──────────────────────────────────────────── */

function KPICard({
  label,
  value,
  sub,
  trendUp,
  highlight,
  progress,
}: {
  label: string;
  value: string;
  sub: string;
  trendUp: boolean;
  highlight?: boolean;
  progress?: number;
}) {
  const clampedProgress = progress !== undefined ? Math.min(100, Math.max(0, progress)) : undefined;
  return (
    <div
      className={`rounded-xl p-4 ring-1 ${
        highlight ? 'bg-navy/5 ring-navy/20' : 'bg-white ring-[#E5E7EB]'
      } shadow-sm`}
    >
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p
        className={`text-xl font-bold tracking-tight ${
          highlight ? 'text-navy' : 'text-text-primary'
        }`}
      >
        {value}
      </p>
      {clampedProgress !== undefined && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
          <motion.div
            className={`h-full rounded-full ${
              highlight ? 'bg-navy' : trendUp ? 'bg-[#27AE60]' : 'bg-[#F2994A]'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${clampedProgress}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </div>
      )}
      <div className="mt-1 flex items-center gap-1">
        <TrendArrow up={trendUp} />
        <span className={`text-xs ${trendUp ? 'text-success' : 'text-error'}`}>{sub}</span>
      </div>
    </div>
  );
}

function SpendDistributionBar() {
  return (
    <div className="mb-4 rounded-xl bg-white p-4 ring-1 ring-[#E5E7EB] shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Spend Distribution
      </p>
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {CHANNEL_SPEND_CONFIG.map((seg, i) => (
          <motion.div
            key={seg.channel}
            className="h-full"
            style={{ backgroundColor: seg.color, width: 0 }}
            animate={{ width: `${seg.pct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.06 }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {CHANNEL_SPEND_CONFIG.map((seg) => (
          <div key={seg.channel} className="flex items-center gap-1.5">
            <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-text-secondary">{seg.label}</span>
            <span className="text-xs font-semibold text-text-primary">{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VariantBarChart() {
  const maxRate = 8;
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-[#E5E7EB] shadow-sm flex flex-col">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Conv Rate Comparison
      </p>
      <p className="mb-4 text-[10px] text-text-secondary">By variant</p>
      <div className="flex flex-1 items-end justify-around gap-2">
        {VARIANT_CHART_DATA.map((v) => {
          const heightPct = (v.convRate / maxRate) * 100;
          return (
            <div key={v.label} className="flex flex-col items-center gap-1.5 flex-1">
              <span
                className={`text-[10px] font-semibold ${
                  v.isWinner ? 'text-[#27AE60]' : 'text-text-secondary'
                }`}
              >
                {v.convRate}%
              </span>
              <div className="w-full relative flex items-end" style={{ height: '80px' }}>
                <motion.div
                  className={`w-full rounded-t-sm ${v.isWinner ? 'bg-[#27AE60]' : 'bg-[#CBD5E1]'}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className={`text-xs font-bold ${
                    v.isWinner ? 'text-[#27AE60]' : 'text-text-secondary'
                  }`}
                >
                  {v.label}
                  {v.isWinner && ' ★'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubSegmentRow({
  seg,
  isExpanded,
  onToggle,
}: {
  seg: SubSegment;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-b border-[#F3F4F6] transition-colors hover:bg-[#F7F9FC]"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown size={14} className="shrink-0 text-text-secondary" />
            ) : (
              <ChevronRight size={14} className="shrink-0 text-text-secondary" />
            )}
            <span className="font-medium text-text-primary">{seg.name}</span>
            {seg.status === 'warning' && (
              <TriangleAlert size={13} className="shrink-0 text-amber-500" />
            )}
            {seg.status === 'critical' && (
              <AlertTriangle size={13} className="shrink-0 text-red-500" />
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-text-secondary">{formatCount(seg.users)}</td>
        <td className="px-4 py-3 text-text-secondary">{formatCount(seg.contacted)}</td>
        <td className="px-4 py-3 text-text-secondary">{formatCount(seg.responded)}</td>
        <td className="px-4 py-3 font-medium text-text-primary">{formatCount(seg.converted)}</td>
        <td className="px-4 py-3">
          {(() => {
            const cr = seg.users > 0 ? (seg.converted / seg.users) * 100 : 0;
            const barW = Math.min(100, (cr / 15) * 100);
            return (
              <div className="relative flex items-center">
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 rounded-sm bg-green-100"
                  style={{ width: `${barW}%`, minWidth: barW > 0 ? '4px' : '0' }}
                />
                <span
                  className={`relative z-10 font-semibold ${
                    cr >= 5 ? 'text-success' : cr >= 3 ? 'text-warning' : 'text-error'
                  }`}
                >
                  {formatPercent(cr)}
                </span>
              </div>
            );
          })()}
        </td>
        <td className="px-4 py-3 text-text-secondary">{formatINR(seg.spend)}</td>
        <td className="px-4 py-3">
          <span
            className={`font-medium ${
              seg.costPerConv <= 100
                ? 'text-success'
                : seg.costPerConv <= 200
                  ? 'text-warning'
                  : 'text-error'
            }`}
          >
            {formatINR(seg.costPerConv)}
          </span>
        </td>
        <td className="px-4 py-3">
          {seg.status === 'healthy' ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2 size={12} />
              Healthy
            </span>
          ) : seg.status === 'warning' ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
              <TriangleAlert size={12} />
              Warning
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-error">
              <AlertTriangle size={12} />
              Critical
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {isExpanded ? (
            <ChevronUp size={14} className="text-text-secondary" />
          ) : (
            <ChevronDown size={14} className="text-text-secondary" />
          )}
        </td>
      </tr>

      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <td colSpan={10} className="bg-[#F7F9FC] px-4 py-3">
              <div className="pl-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Step-by-Step Journey
                </p>
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      {['Channel', 'Sent', 'Delivered', 'Engaged', 'Converted', 'Cost'].map((h) => (
                        <th key={h} className="pb-1.5 pr-6 text-left font-semibold text-text-secondary">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {seg.steps.map((step, si) => (
                      <tr key={si} className="border-b border-[#F3F4F6] last:border-0">
                        <td className="py-1.5 pr-6">
                          <div className="flex items-center gap-1.5">
                            <ChannelIcon channel={step.channel} size={11} />
                            <span className="font-medium text-text-primary">
                              {channelLabel(step.channel)}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 pr-6 text-text-secondary">{formatCount(step.sent)}</td>
                        <td className="py-1.5 pr-6 text-text-secondary">{formatCount(step.delivered)}</td>
                        <td className="py-1.5 pr-6 text-text-secondary">{formatCount(step.responded)}</td>
                        <td className="py-1.5 pr-6 font-semibold text-text-primary">
                          {formatCount(step.converted)}
                        </td>
                        <td className="py-1.5 pr-6 text-text-secondary">{formatINR(step.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

function AutoAppliedInsightCard({ insight }: { insight: AutoAppliedInsight }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="rounded-xl border border-green-200 bg-green-50 pl-4 pr-4 py-4 border-l-4 border-l-green-500"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-green-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary leading-snug">{insight.title}</p>
            <p className="mt-0.5 text-xs text-text-secondary">{insight.description}</p>
            <p className="mt-2 text-xs text-text-secondary">
              <span className="font-medium text-text-primary">Action: </span>
              {insight.action}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
                Impact: {insight.impact}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[11px] text-text-secondary whitespace-nowrap">
          <Clock size={11} />
          {insight.appliedAt}
        </div>
      </div>
    </motion.div>
  );
}

// PendingInsightCard removed — rendering now goes through the shared
// RecommendationCard component in components/campaign/recommendations/.
