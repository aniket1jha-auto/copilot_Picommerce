'use client';

import { useMemo, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Pause,
  Pencil,
  TrendingUp,
  Users,
  Wallet,
  Calendar,
  ChevronRight,
  CheckCircle2,
  TriangleAlert,
  Bot,
  ExternalLink,
} from 'lucide-react';
import { usePhaseData } from '@/hooks/usePhaseData';
import { useAgentStore } from '@/store/agentStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ChannelIcon } from '@/components/common/ChannelIcon';
import { EmptyState } from '@/components/common/EmptyState';

import { Toast } from '@/components/common/Toast';
import { Waveform } from '@/components/ui';
import { formatINR, formatCount, formatPercent, formatROI } from '@/utils/format';
import type { Campaign, ChannelType } from '@/types';

// ─── Demo Data Types ─────────────────────────────────────────────────────────

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
  contacted: number;    // users who received at least one message (delivered)
  responded: number;    // users who engaged (opened, clicked, answered)
  converted: number;    // users who completed goal event
  spend: number;
  costPerConv: number;  // spend / converted
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
  trafficReceived: number;   // % of traffic this variant actually received (cumulative, final)
  sent: number;
  opened: number;
  converted: number;
  convRate: number;
  status: 'winner' | 'testing' | 'concluded';  // winner = auto-promoted, concluded = stopped receiving traffic
}

// ─── Hardcoded Demo Data ──────────────────────────────────────────────────────

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
    name: 'WhatsApp \u2014 Morning Responders',
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
    name: 'WhatsApp \u2014 Evening Responders',
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
    name: 'Push + SMS \u2014 App Users',
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
    name: 'SMS Only \u2014 No App',
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

// Content Variant test lifecycle:
// Phase 1 (first 48h): Equal test split — 34% / 33% / 33% across 3 variants
// Phase 2 (after 48h): Platform evaluates — Variant B wins, gets all remaining traffic
// Variant A & C stop receiving new traffic (test concluded)
// Final numbers reflect cumulative sends across both phases
const CONTENT_VARIANTS: ContentVariant[] = [
  {
    name: 'Variant A \u2014 Primary',
    channel: 'whatsapp',
    trafficReceived: 34,      // received 34% during test phase, then stopped
    sent: 9180,
    opened: 7344,
    converted: 505,
    convRate: 5.5,
    status: 'concluded',
  },
  {
    name: 'Variant B \u2014 Casual',
    channel: 'whatsapp',
    trafficReceived: 52,      // received 33% during test + all remaining traffic after winning
    sent: 14040,
    opened: 11793,
    converted: 955,
    convRate: 6.8,
    status: 'winner',
  },
  {
    name: 'Variant C \u2014 Urgency',
    channel: 'whatsapp',
    trafficReceived: 14,      // received 33% during test phase, then stopped early (worst performer)
    sent: 3780,
    opened: 3024,
    converted: 178,
    convRate: 4.7,
    status: 'concluded',
  },
];

// ─── AI Insights ──────────────────────────────────────────────────────────────

interface AutoAppliedInsight {
  id: string;
  title: string;
  description: string;
  action: string;
  impact: string;
  appliedAt: string;
  icon: 'success' | 'info';
}

interface PendingInsight {
  id: string;
  title: string;
  description: string;
  recommendation: string;
  estimatedImpact: string;
  risk: 'low' | 'medium';
  status: 'pending' | 'approved' | 'dismissed';
}

const AUTO_APPLIED_INSIGHTS: AutoAppliedInsight[] = [
  {
    id: 'auto-1',
    title: 'Content variant auto-optimization',
    description: 'Variant B auto-promoted for WhatsApp channel',
    action: 'Shifted 100% traffic to Variant B after it outperformed A by 24%',
    impact: 'Conversion rate improved from 5.5% to 6.8% (+24%)',
    appliedAt: 'Apr 4, 8:00 AM',
    icon: 'success',
  },
  {
    id: 'auto-2',
    title: 'Send time optimization',
    description: 'Adjusted WhatsApp send times for Evening Responders',
    action: 'Shifted delivery window from 2–4 PM to 5–7 PM based on engagement patterns',
    impact: 'Open rate improved by 18% for this sub-segment',
    appliedAt: 'Apr 5, 10:00 AM',
    icon: 'success',
  },
  {
    id: 'auto-3',
    title: 'Channel fallback acceleration',
    description: 'Reduced wait time for SMS fallback in SMS-Only group',
    action: 'Wait time reduced from 48h to 24h — historical data shows 92% of SMS responses come within 24h',
    impact: 'Campaign completion time reduced by ~24h for 6,200 users',
    appliedAt: 'Apr 4, 2:00 PM',
    icon: 'success',
  },
];

const INITIAL_PENDING_INSIGHTS: PendingInsight[] = [
  {
    id: 'pending-1',
    title: 'Pause underperforming sub-segment',
    description: "SMS Only — No App sub-segment has 1.5% conversion (60% below campaign average)",
    recommendation: 'Pause SMS outreach for this sub-segment and reallocate budget to AI Voice, which shows 7.2% conversion for similar profiles',
    estimatedImpact: 'Save ~AED 8,400 in SMS costs, potentially convert 40+ additional users via AI Voice',
    risk: 'low',
    status: 'pending',
  },
  {
    id: 'pending-2',
    title: 'Add field executive for high-value non-converters',
    description: '412 high-value users (LTV > AED 15K) have not converted after 3 channel touchpoints',
    recommendation: 'Create field executive tasks for these users — they represent AED 61.8L in potential LTV',
    estimatedImpact: 'Based on field exec completion rate of 22%, expect ~90 additional conversions',
    risk: 'medium',
    status: 'pending',
  },
  {
    id: 'pending-3',
    title: 'Extend campaign for weekend responders',
    description: 'Weekend Active sub-segment shows 40% of engagement on Sat–Sun, but campaign ends Friday',
    recommendation: 'Extend campaign by 3 days to capture weekend engagement spike',
    estimatedImpact: 'Estimated 120–180 additional conversions from weekend activity',
    risk: 'low',
    status: 'pending',
  },
];

// ─── Helper Components ────────────────────────────────────────────────────────

function TrendArrow({ up }: { up: boolean }) {
  return up ? (
    <ArrowUpRight size={14} className="text-success" />
  ) : (
    <ArrowDownRight size={14} className="text-error" />
  );
}

function roiColorClass(roi: number): string {
  if (roi >= 3) return 'text-[#27AE60]';
  if (roi >= 1) return 'text-[#F2994A]';
  return 'text-[#EB5757]';
}

type SortKey = 'name' | 'users' | 'contacted' | 'responded' | 'converted' | 'convRate' | 'spend' | 'costPerConv';
type SortDir = 'asc' | 'desc';

// ─── Main Component ───────────────────────────────────────────────────────────

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { campaigns, isDay0, isDay1 } = usePhaseData();

  const campaign = useMemo(
    () => campaigns.find((c) => c.id === id),
    [campaigns, id],
  );

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ message, type, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  // Sub-segment expand state
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [perfView, setPerfView] = useState<'subsegment' | 'channel'>('subsegment');
  const toggleRow = useCallback((i: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  // Sub-segment sort state
  const [sortKey, setSortKey] = useState<SortKey>('converted');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pending insight statuses
  const [pendingStatuses, setPendingStatuses] = useState<Record<string, PendingInsight['status']>>(
    () => Object.fromEntries(INITIAL_PENDING_INSIGHTS.map((p) => [p.id, p.status])),
  );

  const handleApprovePending = useCallback((id: string) => {
    setPendingStatuses((prev) => ({ ...prev, [id]: 'approved' }));
    showToast('Recommendation applied', 'success');
  }, [showToast]);

  const handleDismissPending = useCallback((id: string) => {
    setPendingStatuses((prev) => ({ ...prev, [id]: 'dismissed' }));
    showToast('Recommendation dismissed', 'info');
  }, [showToast]);

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
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [sortKey, sortDir]);

  // ─── Empty / Loading States ────────────────────────────────────────────────

  if (isDay0 || isDay1) {
    return (
      <>
        <div className="mb-6">
          <Link
            to="/campaigns"
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-cyan"
          >
            <ArrowLeft size={14} />
            Back to Campaigns
          </Link>
        </div>
        <div className="rounded-lg bg-white ring-1 ring-[#E5E7EB]">
          <EmptyState
            icon={Wallet}
            title="No campaigns available"
            description="Campaigns will appear here once you launch your first outreach."
            ctaLabel="Create Campaign"
            ctaHref="/campaigns/new"
          />
        </div>
      </>
    );
  }

  if (!campaign) {
    return (
      <>
        <div className="mb-4">
          <Link
            to="/campaigns"
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-cyan"
          >
            <ArrowLeft size={14} />
            Back to Campaigns
          </Link>
        </div>
        <div className="rounded-lg bg-white p-8 text-center ring-1 ring-[#E5E7EB]">
          <p className="text-sm font-semibold text-text-primary">Campaign not found</p>
          <p className="mt-1 text-sm text-text-secondary">No campaign with ID &quot;{id}&quot; exists.</p>
        </div>
      </>
    );
  }

  // ─── Derived values from campaign ─────────────────────────────────────────

  const anomaly = campaign.anomaly;
  const hasAnomaly = !!anomaly;

  const launchDate = (campaign as unknown as { launchedAt?: string }).launchedAt
    ?? campaign.createdAt;
  const launchFormatted = new Date(launchDate).toLocaleDateString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const completedAt = (campaign as unknown as { completedAt?: string }).completedAt;
  const durationLabel = (() => {
    if (launchDate && completedAt) {
      const days = Math.round(
        (new Date(completedAt).getTime() - new Date(launchDate).getTime()) / 86400000,
      );
      return `Completed in ${days} days`;
    }
    if (launchDate) {
      const days = Math.round(
        (Date.now() - new Date(launchDate).getTime()) / 86400000,
      );
      return `Running for ${days} day${days !== 1 ? 's' : ''}`;
    }
    return 'Not started';
  })();

  // KPI values — blend campaign real data + hardcoded demo display
  const totalReached = campaign.metrics.delivered;
  const audienceSize = (campaign as unknown as { audience: { totalUsers?: number; size?: number } }).audience.totalUsers
    ?? (campaign as unknown as { audience: { size?: number } }).audience.size
    ?? 45000;
  const reachedPct = audienceSize > 0 ? (totalReached / audienceSize) * 100 : 0;

  const totalSpend = campaign.budget.spent;
  const roi = (campaign as unknown as { roi?: number }).roi ?? 4.1;
  const deliveryRate = campaign.metrics.sent > 0
    ? (campaign.metrics.delivered / campaign.metrics.sent) * 100
    : 0;
  const convRate = totalReached > 0
    ? (campaign.metrics.converted / totalReached) * 100
    : 0;

  const anomalyBg =
    (anomaly as unknown as { severity?: string })?.severity === 'critical'
      ? 'bg-red-50 border-red-300 text-red-900'
      : 'bg-amber-50 border-amber-300 text-amber-900';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="flex flex-col gap-8 pb-12"
    >
      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={hideToast}
      />

      {/* Back link */}
      <div>
        <Link
          to="/campaigns"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-cyan transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Campaigns
        </Link>
      </div>

      {/* ── Section 1: Campaign Header ─────────────────────────────────────── */}
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: title + meta */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                {campaign.name}
              </h1>
              <StatusBadge status={campaign.status} />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                Launched {launchFormatted}
              </span>
              <span className="flex items-center gap-1.5">
                <TrendingUp size={13} />
                {durationLabel}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={13} />
                {campaign.channels.map((ch) => (
                  <ChannelIcon key={ch} channel={ch} size={12} />
                ))}
              </span>
            </div>
            <AttachedAgentChip campaign={campaign} />
          </div>

          {/* Right: action buttons */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              to={`/campaigns/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <Pencil size={14} />
              Edit Campaign
            </Link>
            <button
              type="button"
              onClick={() => showToast('Campaign paused successfully', 'warning')}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
            >
              <Pause size={14} />
              Pause Campaign
            </button>
            <button
              type="button"
              onClick={() => showToast('Campaign duplicated', 'info')}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-text-primary ring-1 ring-[#E5E7EB] transition-colors hover:bg-gray-50"
            >
              <Copy size={14} />
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => showToast('Report export started', 'success')}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-text-primary ring-1 ring-[#E5E7EB] transition-colors hover:bg-gray-50"
            >
              <Download size={14} />
              Export Report
            </button>
          </div>
        </div>

        {/* Anomaly banner */}
        {hasAnomaly && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 flex items-start gap-3 rounded-lg border px-4 py-3 ${anomalyBg}`}
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <span className="text-sm font-semibold">Delivery Anomaly Detected</span>
              <p className="mt-0.5 text-sm">
                {(anomaly as unknown as { description?: string })?.description
                  ?? (anomaly as unknown as { message?: string })?.message}
              </p>
            </div>
          </motion.div>
        )}
      </section>

      {/* ── Section 2: Live Performance Summary ───────────────────────────── */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Live Performance Summary
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* Total Contacted */}
          <KPICard
            label="Contacted"
            value={formatCount(totalReached)}
            sub={`of ${formatCount(audienceSize)} users (${formatPercent(reachedPct)})`}
            trendUp
            progress={reachedPct}
          />
          {/* Total Spend */}
          <KPICard
            label="Total Spend"
            value={formatINR(totalSpend)}
            sub={`of ${formatINR(campaign.budget.allocated)} allocated`}
            trendUp={false}
            progress={campaign.budget.allocated > 0 ? (campaign.budget.spent / campaign.budget.allocated) * 100 : 0}
          />
          {/* Converted */}
          <KPICard
            label="Converted"
            value={formatCount(campaign.metrics.converted)}
            sub={`${formatPercent(convRate)} conversion rate`}
            trendUp
          />
          {/* Blended ROI */}
          <KPICard
            label="Blended ROI"
            value={formatROI(roi)}
            sub="above 3.5x avg"
            trendUp={roi >= 3.5}
            highlight
          />
          {/* Delivery Rate */}
          <KPICard
            label="Delivery Rate"
            value={formatPercent(deliveryRate)}
            sub={`${formatCount(campaign.metrics.delivered)} delivered`}
            trendUp={deliveryRate >= 88}
            progress={deliveryRate}
          />
          {/* Conversion Rate */}
          <KPICard
            label="Conversion Rate"
            value={formatPercent(convRate)}
            sub={`${formatCount(campaign.metrics.converted)} converted`}
            trendUp={convRate >= 4}
            progress={Math.min(100, convRate * 10)}
          />
        </div>
      </section>

      {/* ── Campaign Health Card ───────────────────────────────────────────── */}
      <CampaignHealthCard deliveryRate={deliveryRate} engagementRate={34} convRate={convRate} />

      {/* ── Section 3: Performance Table (Sub-segment / Channel toggle) ── */}
      <section>
        {/* Spend Distribution stacked bar */}
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
                      className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary whitespace-nowrap ${key ? 'cursor-pointer select-none hover:text-text-primary' : ''}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {key && sortKey === key && (
                          sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                        )}
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
                  {['Channel', 'Sent', 'Delivered', 'Del. Rate', 'Engaged', 'Converted', 'Conv. Rate', 'Cost', 'Cost / Conv'].map((h) => (
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
                {CHANNEL_ROWS.map((row) => (
                  <tr
                    key={row.channel}
                    className={`border-b border-[#F3F4F6] last:border-0 transition-colors ${row.isBest ? 'bg-green-50' : 'hover:bg-[#F7F9FC]'}`}
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
                      <span className={`font-medium ${row.delRate >= 90 ? 'text-success' : 'text-warning'}`}>
                        {formatPercent(row.delRate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatCount(row.openedAnswered)}</td>
                    <td className="px-4 py-3 font-medium text-text-primary">{formatCount(row.converted)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${row.convRate >= 5 ? 'text-success' : row.convRate >= 3 ? 'text-warning' : 'text-error'}`}>
                        {formatPercent(row.convRate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatINR(row.cost)}</td>
                    <td className="px-4 py-3 font-medium text-text-primary">{formatINR(row.costPerConv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </section>


      {/* ── Section 6: Content Variant Performance ────────────────────────── */}
      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Content Variant Performance
        </h2>
        <p className="mb-4 text-xs text-text-secondary">
          WhatsApp A/B test — 3 variants tested with equal split for first 48h. Variant B won with 6.8% conversion (24% higher than A).
          All remaining traffic auto-directed to Variant B from{' '}
          <span className="font-medium text-text-primary">Apr 4, 8:00 AM</span>.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
          {/* Left: variant bar chart */}
          <VariantBarChart />
          {/* Right: table */}
          <div className="rounded-xl bg-white ring-1 ring-[#E5E7EB] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7F9FC]">
                  {['Variant', 'Channel', 'Traffic Received', 'Sent', 'Opened', 'Converted', 'Conv Rate', 'Status'].map((h) => (
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
                    className={`border-b border-[#F3F4F6] last:border-0 transition-colors ${v.status === 'winner' ? 'bg-green-50' : v.status === 'concluded' ? 'bg-[#FAFAFA]' : 'hover:bg-[#F7F9FC]'}`}
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">{v.name}</td>
                    <td className="px-4 py-3">
                      <ChannelIcon channel={v.channel} size={13} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#E5E7EB]">
                          <div
                            className={`h-full rounded-full ${v.status === 'winner' ? 'bg-green-500' : 'bg-gray-400'}`}
                            style={{ width: `${v.trafficReceived}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-secondary">{v.trafficReceived}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatCount(v.sent)}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatCount(v.opened)}</td>
                    <td className="px-4 py-3 font-medium text-text-primary">{formatCount(v.converted)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${v.convRate >= 6 ? 'text-success' : v.convRate >= 5 ? 'text-warning' : 'text-error'}`}>
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
          </div>{/* end table wrapper */}
        </div>{/* end 2-col grid */}
      </section>

      {/* ── Section 8: AI Companion Insights ──────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-text-secondary">
          AI Companion Insights
        </h2>
        <p className="mb-6 text-xs text-text-secondary">
          Automatically generated from campaign performance data.
        </p>

        {/* AI Impact Summary — how the campaign improved */}
        <div className="mb-6 rounded-xl bg-gradient-to-r from-[#002970]/5 to-[#00BAF2]/5 ring-1 ring-[#00BAF2]/20 p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan/10">
              <TrendingUp size={14} className="text-cyan" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Campaign Improvement from AI Optimizations</p>
              <p className="text-[11px] text-text-secondary">Comparing metrics before and after AI companion actions were applied</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Conversion Rate */}
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

            {/* Cost per Conversion */}
            <div className="rounded-lg bg-white p-4 ring-1 ring-[#E5E7EB]">
              <p className="mb-2 text-xs font-medium text-text-secondary">Cost per Conversion</p>
              <div className="flex items-end gap-2">
                <span className="text-xs text-text-secondary line-through">AED 182</span>
                <span className="text-[#27AE60]">→</span>
                <span className="text-xl font-bold text-[#27AE60]">AED 118</span>
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

            {/* Campaign Cost vs Budget */}
            <div className="rounded-lg bg-white p-4 ring-1 ring-[#E5E7EB]">
              <p className="mb-2 text-xs font-medium text-text-secondary">Campaign Cost vs Budget</p>
              <div className="flex items-end gap-2">
                <span className="text-xl font-bold text-text-primary">AED 3.06L</span>
                <span className="text-xs text-text-secondary">of AED 5L budget</span>
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
              <p className="mt-1.5 text-[10px] text-[#27AE60] font-medium">Within budget — AED 1.94L remaining</p>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-text-secondary">
            AI optimizations (variant auto-promotion, send time adjustment, fallback acceleration) contributed to a
            <span className="font-semibold text-[#27AE60]"> +56% conversion rate improvement</span> and
            <span className="font-semibold text-[#27AE60]"> 35% reduction in cost per conversion</span>,
            while keeping total spend within the tentative budget.
          </p>
        </div>

        {/* Auto-Applied sub-section */}
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

        {/* Pending Approval sub-section */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <TriangleAlert size={15} className="text-amber-500" />
            <span className="text-sm font-semibold text-text-primary">
              Needs Your Approval
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                {INITIAL_PENDING_INSIGHTS.filter((p) => pendingStatuses[p.id] === 'pending').length}
              </span>
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {INITIAL_PENDING_INSIGHTS.map((insight) => (
                <PendingInsightCard
                  key={insight.id}
                  insight={insight}
                  status={pendingStatuses[insight.id]}
                  onApprove={() => handleApprovePending(insight.id)}
                  onDismiss={() => handleDismissPending(insight.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

// ─── Visual Sub-Components ────────────────────────────────────────────────────

interface HealthIndicator {
  label: string;
  value: number;       // 0–100
  display: string;     // e.g. "96%"
  rating: string;      // e.g. "Excellent"
  color: string;       // tailwind bg class for bar fill
  dot: string;         // tailwind text class for dot
}

function CampaignHealthCard({
  deliveryRate,
  engagementRate,
  convRate,
}: {
  deliveryRate: number;
  engagementRate: number;
  convRate: number;
}) {
  const indicators: HealthIndicator[] = [
    {
      label: 'Delivery',
      value: deliveryRate,
      display: formatPercent(deliveryRate),
      rating: deliveryRate >= 90 ? 'Excellent' : deliveryRate >= 75 ? 'Good' : 'Below avg',
      color: deliveryRate >= 90 ? 'bg-[#27AE60]' : deliveryRate >= 75 ? 'bg-[#00BAF2]' : 'bg-[#F2994A]',
      dot: deliveryRate >= 90 ? 'text-[#27AE60]' : deliveryRate >= 75 ? 'text-[#00BAF2]' : 'text-[#F2994A]',
    },
    {
      label: 'Engagement',
      value: engagementRate,
      display: formatPercent(engagementRate),
      rating: engagementRate >= 40 ? 'Excellent' : engagementRate >= 25 ? 'Good' : 'Below avg',
      color: engagementRate >= 40 ? 'bg-[#27AE60]' : engagementRate >= 25 ? 'bg-[#00BAF2]' : 'bg-[#F2994A]',
      dot: engagementRate >= 40 ? 'text-[#27AE60]' : engagementRate >= 25 ? 'text-[#00BAF2]' : 'text-[#F2994A]',
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
            <span className="w-24 shrink-0 text-xs font-medium text-text-secondary">{ind.label}</span>
            <span className="w-12 shrink-0 text-xs font-semibold text-text-primary">{ind.display}</span>
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

const CHANNEL_SPEND_CONFIG = [
  { channel: 'whatsapp' as const,         label: 'WhatsApp', pct: 42, color: '#25D366' },
  { channel: 'sms' as const,              label: 'SMS',      pct: 18, color: '#8B5CF6' },
  { channel: 'ai_voice' as const,         label: 'AI Voice', pct: 32, color: '#00BAF2' },
  { channel: 'push_notification' as const,label: 'Push',     pct: 1,  color: '#F2994A' },
  { channel: 'field_executive' as const,  label: 'Field',    pct: 7,  color: '#EB5757' },
];

function SpendDistributionBar() {
  return (
    <div className="mb-4 rounded-xl bg-white p-4 ring-1 ring-[#E5E7EB] shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Spend Distribution</p>
      {/* Stacked bar */}
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
      {/* Legend */}
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

const VARIANT_CHART_DATA = [
  { label: 'A', convRate: 5.5, isWinner: false },
  { label: 'B', convRate: 6.8, isWinner: true },
  { label: 'C', convRate: 4.7, isWinner: false },
];

function VariantBarChart() {
  const maxRate = 8; // y-axis max
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-[#E5E7EB] shadow-sm flex flex-col">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">Conv Rate Comparison</p>
      <p className="mb-4 text-[10px] text-text-secondary">By variant</p>
      <div className="flex flex-1 items-end justify-around gap-2">
        {VARIANT_CHART_DATA.map((v) => {
          const heightPct = (v.convRate / maxRate) * 100;
          return (
            <div key={v.label} className="flex flex-col items-center gap-1.5 flex-1">
              <span className={`text-[10px] font-semibold ${v.isWinner ? 'text-[#27AE60]' : 'text-text-secondary'}`}>
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
                <span className={`text-xs font-bold ${v.isWinner ? 'text-[#27AE60]' : 'text-text-secondary'}`}>
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

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string;
  sub: string;
  trendUp: boolean;
  highlight?: boolean;
  progress?: number;
}

function KPICard({ label, value, sub, trendUp, highlight, progress }: KPICardProps) {
  const clampedProgress = progress !== undefined ? Math.min(100, Math.max(0, progress)) : undefined;
  return (
    <div className={`rounded-xl p-4 ring-1 ${highlight ? 'bg-navy/5 ring-navy/20' : 'bg-white ring-[#E5E7EB]'} shadow-sm`}>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`text-xl font-bold tracking-tight ${highlight ? 'text-navy' : 'text-text-primary'}`}>
        {value}
      </p>
      {clampedProgress !== undefined && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
          <motion.div
            className={`h-full rounded-full ${highlight ? 'bg-navy' : trendUp ? 'bg-[#27AE60]' : 'bg-[#F2994A]'}`}
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

interface SubSegmentRowProps {
  seg: SubSegment;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function SubSegmentRow({ seg, isExpanded, onToggle }: SubSegmentRowProps) {
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
            // bar width: cr scaled so that 15% conv rate = 100% bar width
            const barW = Math.min(100, (cr / 15) * 100);
            return (
              <div className="relative flex items-center">
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 rounded-sm bg-green-100"
                  style={{ width: `${barW}%`, minWidth: barW > 0 ? '4px' : '0' }}
                />
                <span className={`relative z-10 font-semibold ${cr >= 5 ? 'text-success' : cr >= 3 ? 'text-warning' : 'text-error'}`}>
                  {formatPercent(cr)}
                </span>
              </div>
            );
          })()}
        </td>
        <td className="px-4 py-3 text-text-secondary">{formatINR(seg.spend)}</td>
        <td className="px-4 py-3">
          <span className={`font-medium ${seg.costPerConv <= 100 ? 'text-success' : seg.costPerConv <= 200 ? 'text-warning' : 'text-error'}`}>
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

      {/* Expanded step detail */}
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
                            <span className="font-medium text-text-primary">{channelLabel(step.channel)}</span>
                          </div>
                        </td>
                        <td className="py-1.5 pr-6 text-text-secondary">{formatCount(step.sent)}</td>
                        <td className="py-1.5 pr-6 text-text-secondary">{formatCount(step.delivered)}</td>
                        <td className="py-1.5 pr-6 text-text-secondary">{formatCount(step.responded)}</td>
                        <td className="py-1.5 pr-6 font-semibold text-text-primary">{formatCount(step.converted)}</td>
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

function PendingInsightCard({
  insight,
  status,
  onApprove,
  onDismiss,
}: {
  insight: PendingInsight;
  status: PendingInsight['status'];
  onApprove: () => void;
  onDismiss: () => void;
}) {
  if (status === 'approved') {
    return (
      <motion.div
        layout
        key={insight.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="rounded-xl border border-green-200 bg-green-50 border-l-4 border-l-green-500 pl-4 pr-4 py-3.5"
      >
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={14} className="shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-semibold text-text-primary">{insight.title}</p>
            <p className="mt-0.5 text-xs text-text-secondary">Applied</p>
          </div>
          <span className="ml-auto inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
            Applied
          </span>
        </div>
      </motion.div>
    );
  }

  if (status === 'dismissed') {
    return (
      <motion.div
        layout
        key={insight.id}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="rounded-xl border border-[#E5E7EB] bg-[#F7F9FC] border-l-4 border-l-gray-300 pl-4 pr-4 py-3.5"
      >
        <div className="flex items-center gap-2.5">
          <TriangleAlert size={14} className="shrink-0 text-gray-400" />
          <div>
            <p className="text-sm font-semibold text-gray-400 line-through">{insight.title}</p>
            <p className="mt-0.5 text-xs text-gray-400">Dismissed</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      key={insight.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="rounded-xl border border-amber-200 bg-amber-50 border-l-4 border-l-amber-500 pl-4 pr-4 py-4"
    >
      <div className="flex items-start gap-2.5">
        <TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-600" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary leading-snug">{insight.title}</p>
          <p className="mt-0.5 text-xs text-text-secondary">{insight.description}</p>

          <div className="mt-3 rounded-lg bg-white/70 border border-amber-100 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 mb-1">
              Recommendation
            </p>
            <p className="text-xs text-text-secondary">{insight.recommendation}</p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
              Est. Impact: {insight.estimatedImpact}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                insight.risk === 'low'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
              }`}
            >
              Risk: {insight.risk === 'low' ? 'Low' : 'Medium'}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onApprove}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
            >
              <CheckCircle2 size={12} />
              Approve
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-text-secondary ring-1 ring-[#E5E7EB] transition-colors hover:bg-gray-50 hover:text-text-primary"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

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

// suppress unused import warnings — roiColorClass is used in sub-segment row
void roiColorClass;

/**
 * Cross-section link to the voice agent attached to this campaign — Phase 3.12.
 * Surfaces aiVoiceConfig.agentId as a chip with the agent's identity and a
 * link to the agent detail page.
 */
function AttachedAgentChip({ campaign }: { campaign: Campaign }) {
  const cfg = campaign.aiVoiceConfig;
  const agent = useAgentStore((s) => (cfg?.agentId ? s.getAgentById(cfg.agentId) : undefined));
  if (!cfg || !agent) return null;
  return (
    <Link
      to={`/agents/${agent.id}`}
      className="mt-1 inline-flex items-center gap-2 self-start rounded-md border border-border-subtle bg-surface-raised px-2.5 h-7 text-[12px] text-text-primary hover:border-accent transition-colors"
      title="Open agent"
    >
      <Bot size={12} className="text-accent" />
      <Waveform seed={agent.id} bars={3} height={9} />
      <span className="font-medium">{agent.config.name}</span>
      <span className="text-text-tertiary tabular-nums">v{agent.version}</span>
      <ExternalLink size={11} className="text-text-tertiary" />
    </Link>
  );
}
