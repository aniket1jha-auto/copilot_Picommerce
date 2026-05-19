import { create } from 'zustand';

/**
 * AI Recommendations — central store.
 *
 * Recommendations originate from "AI Companion Insights" on a campaign
 * detail page. They now also surface inside the copilot chat pane on
 * /campaigns/:id/edit, where the user can apply them like a normal
 * chat action. Both surfaces read + write the same store so state
 * stays consistent.
 *
 * In the mock, applying a recommendation does NOT mutate the
 * campaign's underlying journey graph. It only:
 *   1. flips the recommendation's status to "applied"
 *   2. tells the copilot chat to post an applied-style message
 *   3. fires a toast at the call site
 * When a real backend exists, the apply handler should patch the
 * campaign with the recommendation's `change` payload.
 */

export type RecStatus = 'pending' | 'applied' | 'dismissed';

export type RecRisk = 'low' | 'medium' | 'high';

export type RecKind = 'budget' | 'channel' | 'audience' | 'timing' | 'content' | 'flow';

export interface Recommendation {
  id: string;
  /** Scope: a specific campaign, or null for workspace-wide recs. */
  campaignId: string | null;
  kind: RecKind;
  title: string;
  description: string;
  recommendation: string;
  estimatedImpact: string;
  risk: RecRisk;
  status: RecStatus;
  createdAt: string;
  appliedAt?: string;
}

/**
 * Seed data — copy of the old INITIAL_PENDING_INSIGHTS from
 * CampaignSections.tsx, now scoped to specific demo campaigns.
 * `campaignId: null` would mean workspace-wide; we anchor to a
 * representative campaign for the demo flow.
 */
const DEMO_CAMPAIGN_ID = 'campaign-1';

const SEED_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'rec-1',
    campaignId: DEMO_CAMPAIGN_ID,
    kind: 'audience',
    title: 'Pause underperforming sub-segment',
    description:
      'SMS Only — No App sub-segment has 1.5% conversion (60% below campaign average)',
    recommendation:
      'Pause SMS outreach for this sub-segment and reallocate budget to AI Voice, which shows 7.2% conversion for similar profiles',
    estimatedImpact:
      'Save ~₹8,400 in SMS costs, potentially convert 40+ additional users via AI Voice',
    risk: 'low',
    status: 'pending',
    createdAt: '2026-04-04T08:00:00Z',
  },
  {
    id: 'rec-2',
    campaignId: DEMO_CAMPAIGN_ID,
    kind: 'channel',
    title: 'Add field executive for high-value non-converters',
    description: '412 high-value users (LTV > ₹15K) have not converted after 3 channel touchpoints',
    recommendation:
      'Create field executive tasks for these users — they represent ₹61.8L in potential LTV',
    estimatedImpact:
      'Based on field exec completion rate of 22%, expect ~90 additional conversions',
    risk: 'medium',
    status: 'pending',
    createdAt: '2026-04-05T10:00:00Z',
  },
  {
    id: 'rec-3',
    campaignId: DEMO_CAMPAIGN_ID,
    kind: 'timing',
    title: 'Extend campaign for weekend responders',
    description:
      'Weekend Active sub-segment shows 40% of engagement on Sat–Sun, but campaign ends Friday',
    recommendation: 'Extend campaign by 3 days to capture weekend engagement spike',
    estimatedImpact: 'Estimated 120–180 additional conversions from weekend activity',
    risk: 'low',
    status: 'pending',
    createdAt: '2026-04-06T07:30:00Z',
  },
];

interface RecommendationsState {
  recommendations: Recommendation[];

  /** Read all recommendations scoped to a specific campaign (plus workspace-wide). */
  forCampaign: (campaignId: string | undefined) => Recommendation[];
  getById: (id: string) => Recommendation | undefined;

  apply: (id: string) => Recommendation | null;
  dismiss: (id: string) => void;
  /** Revert an apply/dismiss back to pending — exposed for undo scenarios. */
  reopen: (id: string) => void;
}

export const useRecommendationsStore = create<RecommendationsState>((set, get) => ({
  recommendations: SEED_RECOMMENDATIONS,

  forCampaign: (campaignId) => {
    const all = get().recommendations;
    if (!campaignId) return all;
    return all.filter((r) => r.campaignId === campaignId || r.campaignId === null);
  },

  getById: (id) => get().recommendations.find((r) => r.id === id),

  apply: (id) => {
    let applied: Recommendation | null = null;
    set((s) => ({
      recommendations: s.recommendations.map((r) => {
        if (r.id !== id) return r;
        applied = {
          ...r,
          status: 'applied' as RecStatus,
          appliedAt: new Date().toISOString(),
        };
        return applied;
      }),
    }));
    return applied;
  },

  dismiss: (id) =>
    set((s) => ({
      recommendations: s.recommendations.map((r) =>
        r.id === id ? { ...r, status: 'dismissed' as RecStatus } : r,
      ),
    })),

  reopen: (id) =>
    set((s) => ({
      recommendations: s.recommendations.map((r) =>
        r.id === id ? { ...r, status: 'pending' as RecStatus, appliedAt: undefined } : r,
      ),
    })),
}));
