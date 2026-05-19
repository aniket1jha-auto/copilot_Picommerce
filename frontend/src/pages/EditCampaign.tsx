'use client';

import { useParams } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { usePhaseData } from '@/hooks/usePhaseData';
import { EmptyState } from '@/components/common/EmptyState';
import { CampaignBuilder } from '@/pages/CampaignBuilder';

/**
 * Edit Campaign — thin wrapper.
 *
 * Mounts the same copilot + journey-canvas builder that powers
 * /campaigns/new, but in `edit` mode with the existing campaign
 * pre-loaded. Everything users learn for creating a campaign now
 * also applies to editing one.
 */
export function EditCampaign() {
  const { id } = useParams<{ id: string }>();
  const { campaigns, isDay0, isDay1 } = usePhaseData();

  const campaign = campaigns.find((c) => c.id === id);

  if (isDay0 || isDay1 || !campaign) {
    return (
      <div className="flex flex-col gap-6">
        <EmptyState
          icon={Megaphone}
          title="Campaign not found"
          description="This campaign does not exist or is not available in the current phase."
          ctaLabel="Back to Campaigns"
          ctaHref="/campaigns"
        />
      </div>
    );
  }

  return <CampaignBuilder mode="edit" seedCampaign={campaign} />;
}
