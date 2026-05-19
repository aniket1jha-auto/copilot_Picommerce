'use client';

import { useCallback, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  Copy,
  Download,
  ExternalLink,
  Pause,
  Pencil,
  TrendingUp,
  Users,
  Wallet,
  Bot,
} from 'lucide-react';
import { usePhaseData } from '@/hooks/usePhaseData';
import { useAgentStore } from '@/store/agentStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ChannelIcon } from '@/components/common/ChannelIcon';
import { EmptyState } from '@/components/common/EmptyState';
import { Toast } from '@/components/common/Toast';
import { Waveform } from '@/components/ui';
import { CampaignKPISummary, CampaignAIInsights } from '@/components/campaign/detail/CampaignSections';
import type { Campaign } from '@/types';

/**
 * Campaign detail — the page the user lands on after clicking a campaign
 * card on /campaigns.
 *
 * Phase: post-Observe-restructure. Now shows ONLY:
 *   • Header (title, status, action buttons + Detailed analysis CTA)
 *   • Anomaly banner (if present)
 *   • Live Performance Summary (KPI tiles)
 *   • AI Companion Insights
 *
 * The full analytical breakdown (Campaign Health, Sub-segment / Channel
 * tables, Content Variant Performance) moved to /observe/performance,
 * reachable via the "Detailed analysis →" CTA on this page.
 */
export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { campaigns, isDay0, isDay1 } = usePhaseData();

  const campaign = useMemo(() => campaigns.find((c) => c.id === id), [campaigns, id]);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'warning';
    visible: boolean;
  }>({
    message: '',
    type: 'success',
    visible: false,
  });

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
      setToast({ message, type, visible: true });
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  /* ─── Empty / loading states ───────────────────────────────────────── */

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
          <p className="mt-1 text-sm text-text-secondary">
            No campaign with ID &quot;{id}&quot; exists.
          </p>
        </div>
      </>
    );
  }

  /* ─── Derived values ───────────────────────────────────────────────── */

  const anomaly = campaign.anomaly;
  const hasAnomaly = !!anomaly;

  const launchDate =
    (campaign as unknown as { launchedAt?: string }).launchedAt ?? campaign.createdAt;
  const launchFormatted = new Date(launchDate).toLocaleDateString('en-IN', {
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
      const days = Math.round((Date.now() - new Date(launchDate).getTime()) / 86400000);
      return `Running for ${days} day${days !== 1 ? 's' : ''}`;
    }
    return 'Not started';
  })();

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
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

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

      {/* Campaign header — title + actions + "Detailed analysis →" CTA */}
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

          {/* Right side — action buttons. "Detailed analysis →" is the primary
              CTA per the new Observe restructure; everything else stays as
              secondary action buttons. */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              to={`/campaigns/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-text-primary ring-1 ring-[#E5E7EB] transition-colors hover:bg-gray-50"
            >
              <Pencil size={14} />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => showToast('Campaign paused successfully', 'warning')}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
            >
              <Pause size={14} />
              Pause
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
              Export
            </button>
            <Link
              to={`/observe/performance?campaignId=${campaign.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <BarChart3 size={14} />
              Detailed analysis
            </Link>
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
                {(anomaly as unknown as { description?: string })?.description ??
                  (anomaly as unknown as { message?: string })?.message}
              </p>
            </div>
          </motion.div>
        )}
      </section>

      {/* Live Performance Summary */}
      <CampaignKPISummary campaign={campaign} />

      {/* AI Companion Insights — pending recs link into the campaign
          builder's copilot pane, where the user can approve and apply. */}
      <CampaignAIInsights
        campaignId={campaign.id}
        onDismiss={() => showToast('Recommendation dismissed', 'info')}
      />
    </motion.div>
  );
}

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
