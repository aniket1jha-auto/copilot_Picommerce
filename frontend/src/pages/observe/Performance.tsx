'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, useToast } from '@/components/ui';
import { EmptyState } from '@/components/common/EmptyState';
import { usePhaseData } from '@/hooks/usePhaseData';
import {
  CampaignKPISummary,
  CampaignHealthSection,
  CampaignPerformanceBreakdown,
  CampaignContentVariants,
} from '@/components/campaign/detail/CampaignSections';
import { BarChart3 } from 'lucide-react';

/**
 * Observe → Performance.
 *
 * The "detailed analysis" of a campaign that used to live inline on
 * /campaigns/:id. Same sections, minus the AI Companion Insights
 * (which now stays uniquely on the campaign detail page).
 *
 * The campaign under review is selected via a dropdown in the page
 * header. When arriving from the "Detailed analysis →" CTA on the
 * campaign detail page, the query param `?campaignId=…` pre-selects
 * the right campaign.
 */
export function Performance() {
  const { campaigns, isDay0, isDay1 } = usePhaseData();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const selectableCampaigns = useMemo(
    () => campaigns.filter((c) => c.status !== 'draft'),
    [campaigns],
  );

  // Resolve the active campaign: ?campaignId=… → first available → none.
  const requestedId = searchParams.get('campaignId');
  const activeCampaign = useMemo(() => {
    if (requestedId) {
      const match = selectableCampaigns.find((c) => c.id === requestedId);
      if (match) return match;
    }
    return selectableCampaigns[0];
  }, [selectableCampaigns, requestedId]);

  function setActive(id: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('campaignId', id);
      return next;
    });
  }

  function handleExport() {
    if (!activeCampaign) return;
    toast({
      kind: 'success',
      title: 'Report export started',
      body: `Generating PDF + CSV for ${activeCampaign.name}. You'll get a download notification.`,
    });
  }

  /* ─── Empty / phase-gated states ───────────────────────────────────── */

  if (isDay0 || isDay1 || selectableCampaigns.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Performance"
          subtitle="Detailed analysis of how your campaigns are running."
        />
        <div className="rounded-lg bg-white ring-1 ring-[#E5E7EB]">
          <EmptyState
            icon={BarChart3}
            title="No campaign performance to show yet"
            description="Once you launch a campaign, its detailed analytics will be available here."
            ctaLabel="Create campaign"
            ctaHref="/campaigns/new"
          />
        </div>
      </div>
    );
  }

  if (!activeCampaign) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Performance" />
        <div className="rounded-lg bg-white p-6 text-sm text-text-secondary ring-1 ring-[#E5E7EB]">
          No campaign available to display.
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="flex flex-col gap-8 pb-12"
    >
      <PageHeader
        title="Performance"
        subtitle="Detailed analysis of how your campaigns are running."
        actions={
          <div className="flex items-center gap-2">
            {/* Campaign picker — controls which campaign's analytics renders below. */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="performance-campaign-picker"
                className="text-[12px] font-medium text-text-secondary"
              >
                Campaign
              </label>
              <select
                id="performance-campaign-picker"
                value={activeCampaign.id}
                onChange={(e) => setActive(e.target.value)}
                className="min-w-[240px] rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-text-primary focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
              >
                {selectableCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Download size={14} />}
              onClick={handleExport}
            >
              Export report
            </Button>
          </div>
        }
      />

      {/* Live Performance Summary */}
      <CampaignKPISummary campaign={activeCampaign} />

      {/* Campaign Health */}
      <CampaignHealthSection campaign={activeCampaign} />

      {/* Performance Breakdown — sub-segment / channel toggle */}
      <CampaignPerformanceBreakdown />

      {/* Content Variant Performance */}
      <CampaignContentVariants />
    </motion.div>
  );
}
