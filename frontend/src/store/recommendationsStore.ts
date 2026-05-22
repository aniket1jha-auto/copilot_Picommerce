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
 * Seed data — pending recommendations distributed across the demo
 * campaigns in `base/campaigns.ts` so every campaign card has
 * something waiting for approval.
 *
 * Mix of categories (audience / channel / timing / content / budget /
 * flow) and risk levels so the UI demonstrates variety. Each rec is
 * anchored to a specific campaign via `campaignId`; `campaignId: null`
 * would indicate workspace-wide.
 */
const SEED_RECOMMENDATIONS: Recommendation[] = [
  /* ─── camp-001 — High-LTV Re-engagement ─────────────────────────── */
  {
    id: 'rec-001-1',
    campaignId: 'camp-001',
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
    id: 'rec-001-2',
    campaignId: 'camp-001',
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
    id: 'rec-001-3',
    campaignId: 'camp-001',
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

  /* ─── camp-002 — KYC Completion Drive ───────────────────────────── */
  {
    id: 'rec-002-1',
    campaignId: 'camp-002',
    kind: 'content',
    title: 'Promote winning WhatsApp variant earlier',
    description:
      'Variant C (with Aadhaar OTP step-by-step) has 38% higher CTR than the other two after 48 hours of testing.',
    recommendation:
      'Cut the A/B test short and route 100% of remaining WhatsApp traffic to Variant C',
    estimatedImpact: 'Estimated +1,200 KYCs completed over the remaining campaign window',
    risk: 'low',
    status: 'pending',
    createdAt: '2026-04-12T09:15:00Z',
  },
  {
    id: 'rec-002-2',
    campaignId: 'camp-002',
    kind: 'flow',
    title: 'Skip SMS for users who already opened WhatsApp',
    description:
      '18,400 users opened the WhatsApp KYC reminder but the SMS follow-up still fires 24h later — duplicate touch.',
    recommendation:
      'Add a condition node: if WhatsApp was opened, skip the SMS branch and go straight to AI Voice for non-converters.',
    estimatedImpact: 'Save ~₹11,000 in SMS costs and reduce opt-outs by an estimated 8%',
    risk: 'low',
    status: 'pending',
    createdAt: '2026-04-13T11:00:00Z',
  },
  {
    id: 'rec-002-3',
    campaignId: 'camp-002',
    kind: 'audience',
    title: 'Reduce field-executive load on tier-2 cities',
    description:
      'Field exec completion rate in tier-2 cities (32%) is 2x WhatsApp, but the cost-per-completion is ₹208 vs ₹14 on WhatsApp.',
    recommendation:
      'Route tier-2 users to WhatsApp + AI Voice first; reserve field execs for tier-1 users with LTV > ₹50K.',
    estimatedImpact: 'Cut field-exec spend by ~40% with negligible drop in completion volume',
    risk: 'medium',
    status: 'pending',
    createdAt: '2026-04-14T07:45:00Z',
  },

  /* ─── camp-003 — Festival Cashback Promo ────────────────────────── */
  {
    id: 'rec-003-1',
    campaignId: 'camp-003',
    kind: 'timing',
    title: 'Move WhatsApp sends to 7-9 PM window',
    description:
      'Opens are concentrated in the 7-9 PM evening window (54% of all opens) but sends happen at 10 AM.',
    recommendation:
      'Switch the WhatsApp step to "Smart + AI" send time so each contact gets the message at their personal peak.',
    estimatedImpact: 'Open rate likely to lift from 41% to ~58%',
    risk: 'low',
    status: 'pending',
    createdAt: '2026-04-20T06:30:00Z',
  },
  {
    id: 'rec-003-2',
    campaignId: 'camp-003',
    kind: 'budget',
    title: 'Reallocate RCS spend to WhatsApp',
    description:
      'RCS has 14% delivery on this audience (cohort skews to older Android phones without RCS).',
    recommendation:
      'Pause the RCS branch and shift ₹1.2L of remaining budget to WhatsApp + SMS fallback.',
    estimatedImpact: 'Roughly +9,000 effective deliveries with no extra spend',
    risk: 'low',
    status: 'pending',
    createdAt: '2026-04-21T10:10:00Z',
  },

  /* ─── camp-004 — Loan Product Cross-sell ────────────────────────── */
  {
    id: 'rec-004-1',
    campaignId: 'camp-004',
    kind: 'audience',
    title: 'Exclude users with active loans',
    description:
      '2,180 contacts in the segment already have an active loan in good standing — the cross-sell flow is dunning them anyway.',
    recommendation:
      'Add an audience filter "active_loans = 0" to the entry node.',
    estimatedImpact: 'Prevents ~2,180 noisy contacts; expected drop in opt-outs of 12-15%',
    risk: 'low',
    status: 'pending',
    createdAt: '2026-04-28T08:00:00Z',
  },
  {
    id: 'rec-004-2',
    campaignId: 'camp-004',
    kind: 'content',
    title: 'Add EMI-calculator link to the WhatsApp message',
    description:
      'Reply text analysis shows 31% of inbound replies ask "how much EMI" — the current message just states "starting ₹999/mo".',
    recommendation:
      'Update the WhatsApp template to include a CTA button linking to the EMI calculator landing page.',
    estimatedImpact: 'Click-through rate likely to lift by 18-22%',
    risk: 'low',
    status: 'pending',
    createdAt: '2026-04-29T09:30:00Z',
  },
  {
    id: 'rec-004-3',
    campaignId: 'camp-004',
    kind: 'flow',
    title: 'Add AI voice retry for callbacks-requested',
    description:
      '640 users responded "Call me" on WhatsApp but no voice step exists — they\'re currently dropping out.',
    recommendation:
      'Wire a Voice agent node from the "interested" branch of the WhatsApp message.',
    estimatedImpact: 'Recover ~640 high-intent leads; expected +90-130 conversions',
    risk: 'medium',
    status: 'pending',
    createdAt: '2026-04-30T11:00:00Z',
  },

  /* ─── camp-005 — Merchant Onboarding ────────────────────────────── */
  {
    id: 'rec-005-1',
    campaignId: 'camp-005',
    kind: 'timing',
    title: 'Send merchant nudges Tuesday-Thursday only',
    description:
      'Weekend response rate is 4% vs 21% mid-week. Sends still go out 7 days a week.',
    recommendation:
      'Restrict the WhatsApp send window to Tue/Wed/Thu, 11 AM - 5 PM IST.',
    estimatedImpact: 'Roughly +35% reply rate without changing message or audience',
    risk: 'low',
    status: 'pending',
    createdAt: '2026-05-02T07:15:00Z',
  },
  {
    id: 'rec-005-2',
    campaignId: 'camp-005',
    kind: 'channel',
    title: 'Add SMS fallback for non-WhatsApp merchants',
    description:
      '14% of merchants in the segment don\'t have WhatsApp Business installed — they\'re receiving no message today.',
    recommendation:
      'Add an SMS fallback step that fires when WhatsApp delivery fails.',
    estimatedImpact: 'Roughly +2,400 reachable merchants',
    risk: 'low',
    status: 'pending',
    createdAt: '2026-05-03T08:45:00Z',
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
  /**
   * Insert a recommendation only if a `pending` rec with the same id
   * doesn't already exist. Used by the copilot to surface contextual
   * suggestions (e.g. goal/channel mismatch) without spamming repeats.
   */
  upsertPending: (rec: Omit<Recommendation, 'status' | 'createdAt'>) => void;
  /** Remove a recommendation outright (id-keyed). */
  remove: (id: string) => void;
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

  upsertPending: (rec) =>
    set((s) => {
      // If a rec with the same id already exists in pending, don't
      // re-insert. Applied/dismissed ids are also respected — once
      // the user has acted on a contextual suggestion, we don't keep
      // re-surfacing it on every keystroke.
      const existing = s.recommendations.find((r) => r.id === rec.id);
      if (existing) return s;
      const full: Recommendation = {
        ...rec,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      return { recommendations: [full, ...s.recommendations] };
    }),

  remove: (id) =>
    set((s) => ({
      recommendations: s.recommendations.filter((r) => r.id !== id),
    })),
}));
