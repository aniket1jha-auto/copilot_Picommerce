import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { CampaignWizard, type CampaignData } from '@/components/campaign/CampaignWizard';
import { CampaignPathPicker } from '@/components/campaign/CampaignPathPicker';
import type { CampaignTemplateKind } from '@/data/mock/campaignTemplates';
import { Button } from '@/components/ui';

/**
 * /campaigns/new — Phase 4 D.1.6 simplification.
 *
 * Two stages, no duplication:
 *   1. Path picker:  two big cards. Quick run vs Automated journey. Click
 *      starts the build immediately. No template grid here.
 *   2. Wizard:       runs with `campaignType` already locked in. Templates
 *      live INSIDE:
 *        - Quick run → SetupStep has "Start from template" button →
 *          CampaignTemplatePickerModal (filtered to quick_run templates).
 *        - Automated journey → canvas already has PrebuiltJourneyModal
 *          (existing behavior, unchanged).
 *
 * If a draft is passed via location.state (e.g. from Campaigns list "Clone"
 * or a Content-Ideas "Use this campaign" link), we skip the picker and
 * jump straight to the wizard with the seeded data.
 */

export interface CreateCampaignLocationState {
  campaignDraft?: Partial<CampaignData>;
  /** When set, skip the path picker and start the wizard at this step. */
  initialStep?: number;
}

type Stage =
  | { kind: 'pick' }
  | {
      kind: 'wizard';
      initialData: Partial<CampaignData>;
      initialStep?: number;
    };

export function CreateCampaign() {
  const location = useLocation();
  const stateFromLocation = useMemo(
    () => (location.state ?? null) as CreateCampaignLocationState | null,
    [location.state],
  );

  const [stage, setStage] = useState<Stage>(() => {
    if (stateFromLocation?.campaignDraft) {
      return {
        kind: 'wizard',
        initialData: stateFromLocation.campaignDraft,
        initialStep: stateFromLocation.initialStep,
      };
    }
    return { kind: 'pick' };
  });

  function pickPath(kind: CampaignTemplateKind) {
    setStage({
      kind: 'wizard',
      initialData: {
        campaignType: kind === 'journey' ? 'journey' : 'simple_send',
      },
    });
  }

  if (stage.kind === 'pick') {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Create campaign"
          subtitle="Pick how this campaign should run. You can start from a template once you're inside."
        />
        <CampaignPathPicker onPick={pickPath} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        iconLeft={<ArrowLeft size={14} />}
        onClick={() => setStage({ kind: 'pick' })}
        className="self-start"
      >
        Switch path
      </Button>
      <CampaignWizard initialData={stage.initialData} initialStep={stage.initialStep} />
    </div>
  );
}
