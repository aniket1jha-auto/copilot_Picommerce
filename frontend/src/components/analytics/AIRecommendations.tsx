import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  Target,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export interface AIRecommendation {
  id: string;
  type: 'opportunity' | 'warning' | 'optimization' | 'insight';
  scope: 'campaign' | 'agent' | 'global';
  title: string;
  description: string;
  impact: string;
  /** Existing in-app route the primary action navigates to. */
  action: string;
  actionLabel: string;
  confidence: number;
  /** Display-only label for the related campaign or agent. */
  relatedEntity?: string;
}

// Recommendations are wired to real mock entities in the platform so the
// experience is cohesive — every action lands on a page that exists.
//   Campaigns: camp-001 High-LTV Re-engagement, camp-002 KYC Completion Drive,
//   camp-003 Festival Cashback Promo, camp-004 Loan Cross-sell, camp-005 Merchant Onboarding
//   Agents:    agent_1 Sales Outreach, agent_2 Customer Support, agent_3 Appointment Scheduler
export const AI_RECOMMENDATIONS: AIRecommendation[] = [
  {
    id: 'rec_1',
    type: 'opportunity',
    scope: 'campaign',
    title: 'Switch High-LTV segment to AI Voice for 3x conversion lift',
    description:
      'Your High-LTV Re-engagement campaign is using SMS as primary channel, but AI Voice shows 7.2% conversion vs SMS at 2.1% for similar segments across the platform. The audience is reachable on phone, the script can be templated from your existing SMS copy, and historical data on similar cohorts suggests a clean lift.',
    impact: 'Estimated +2,400 additional conversions per month',
    action: '/campaigns/camp-001',
    actionLabel: 'View Campaign',
    confidence: 92,
    relatedEntity: 'High-LTV Re-engagement',
  },
  {
    id: 'rec_2',
    type: 'warning',
    scope: 'campaign',
    title: 'Festival Cashback Promo approaching budget ceiling',
    description:
      'Current burn rate will exhaust the campaign budget in 2.3 days at current pace. The campaign is performing at 4.2x ROI — well above your portfolio average — so prematurely stopping it would leave revenue on the table. Review pacing and decide whether to top up or hold.',
    impact: 'Risk of stopping a high-ROI campaign prematurely',
    action: '/campaigns/camp-003',
    actionLabel: 'View Campaign',
    confidence: 98,
    relatedEntity: 'Festival Cashback Promo',
  },
  {
    id: 'rec_3',
    type: 'optimization',
    scope: 'agent',
    title: 'Sales Agent: add budget objection handling to lift close rate',
    description:
      'Failure analysis on the Sales Outreach Agent shows 55% of failed calls involve misunderstood intents around pricing — phrases like "too expensive", "can I get a discount", and "let me think about it". Adding explicit budget-handling instructions and a small set of objection responses should reduce failures meaningfully.',
    impact: 'Projected success rate increase from 87.3% to 92%',
    action: '/agents/agent_1',
    actionLabel: 'View Agent',
    confidence: 87,
    relatedEntity: 'Sales Outreach Agent',
  },
  {
    id: 'rec_4',
    type: 'insight',
    scope: 'global',
    title: 'WhatsApp messages between 10–11 AM show 2.4x higher open rates',
    description:
      'Cross-campaign analysis across the last 30 days reveals a strong time-of-day signal for WhatsApp delivery. Messages sent in the 10–11 AM IST window are opened at 2.4× the rate of evening sends. This holds across segments and templates, suggesting it generalizes.',
    impact: '+18% average open rate improvement',
    action: '/campaigns/new',
    actionLabel: 'Start a New Campaign',
    confidence: 94,
  },
  {
    id: 'rec_5',
    type: 'optimization',
    scope: 'agent',
    title: 'Switch Support Agent to gpt-realtime-mini for 35% cost reduction',
    description:
      'Your Customer Support Agent currently uses gpt-realtime (1.5x cost). Quality benchmarks across the support use case show negligible differences with gpt-realtime-mini on this workload. Switching reduces per-call cost without measurable impact on resolution rate or customer satisfaction.',
    impact: 'Save ~AED 80,000/month at the same 92.5% success rate',
    action: '/agents/agent_2',
    actionLabel: 'View Agent',
    confidence: 91,
    relatedEntity: 'Customer Support Agent',
  },
  {
    id: 'rec_6',
    type: 'opportunity',
    scope: 'campaign',
    title: 'Untapped segment: dormant users with high past LTV',
    description:
      "We identified ~45K users who were high-value 6+ months ago but haven't been targeted in any active campaign. Similar reactivation campaigns on the platform see 3.8% conversion rates. A WhatsApp-first sequence with a personalised welcome-back message would be the natural starting point.",
    impact: 'Potential 1,710 reactivated users · est. AED 850,000 revenue impact',
    action: '/campaigns/new',
    actionLabel: 'Start a New Campaign',
    confidence: 82,
  },
];

type Tone = 'positive' | 'attention' | 'highlight' | 'neutral';

const TYPE_TONE: Record<AIRecommendation['type'], Tone> = {
  opportunity: 'positive',
  warning: 'attention',
  optimization: 'highlight',
  insight: 'neutral',
};

const TYPE_ICON: Record<AIRecommendation['type'], typeof Sparkles> = {
  opportunity: Target,
  warning: AlertTriangle,
  optimization: Zap,
  insight: Lightbulb,
};

const TYPE_LABEL: Record<AIRecommendation['type'], string> = {
  opportunity: 'Opportunity',
  warning: 'Watch out',
  optimization: 'Optimization',
  insight: 'Insight',
};

const TONE_STYLES: Record<
  Tone,
  {
    bg: string;
    ring: string;
    iconBg: string;
    iconColor: string;
    hoverRing: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  positive: {
    bg: 'bg-green-50',
    ring: 'ring-green-200',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-700',
    hoverRing: 'hover:ring-green-300',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-800',
  },
  highlight: {
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    hoverRing: 'hover:ring-amber-300',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
  },
  attention: {
    bg: 'bg-rose-50',
    ring: 'ring-rose-200',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-700',
    hoverRing: 'hover:ring-rose-300',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
  },
  neutral: {
    bg: 'bg-white',
    ring: 'ring-[#E5E7EB]',
    iconBg: 'bg-cyan/10',
    iconColor: 'text-cyan',
    hoverRing: 'hover:ring-cyan/40',
    badgeBg: 'bg-cyan/10',
    badgeText: 'text-cyan',
  },
};

interface CardProps {
  rec: AIRecommendation;
  onOpen: (rec: AIRecommendation) => void;
}

function RecommendationCard({ rec, onOpen }: CardProps) {
  const tone = TONE_STYLES[TYPE_TONE[rec.type]];
  const Icon = TYPE_ICON[rec.type];

  return (
    <button
      type="button"
      onClick={() => onOpen(rec)}
      data-testid={`rec-${rec.id}`}
      className={`group flex w-full gap-3 rounded-lg p-3.5 text-left ring-1 transition-all ${tone.bg} ${tone.ring} ${tone.hoverRing}`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tone.iconBg}`}>
        <Icon size={16} className={tone.iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-text-primary">{rec.title}</div>
        <p className="mt-1 text-[12px] leading-relaxed text-text-secondary line-clamp-2">
          {rec.description}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-tertiary">
          <span className="capitalize">{rec.scope}</span>
          <span aria-hidden>·</span>
          <span>{rec.confidence}% confidence</span>
          {rec.relatedEntity && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{rec.relatedEntity}</span>
            </>
          )}
        </div>
      </div>
      <ArrowRight
        size={14}
        className="mt-1 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary"
      />
    </button>
  );
}

interface DetailProps {
  rec: AIRecommendation | null;
  onClose: () => void;
}

function RecommendationDetail({ rec, onClose }: DetailProps) {
  if (!rec) return null;
  const tone = TONE_STYLES[TYPE_TONE[rec.type]];
  const Icon = TYPE_ICON[rec.type];
  const typeLabel = TYPE_LABEL[rec.type];

  return (
    <Modal
      open={!!rec}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border-subtle bg-surface px-3.5 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-sunken"
          >
            Close
          </button>
          <Link
            to={rec.action}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md bg-cyan px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-cyan/90"
          >
            {rec.actionLabel}
            <ArrowRight size={14} />
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone.iconBg}`}
          >
            <Icon size={20} className={tone.iconColor} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.badgeBg} ${tone.badgeText}`}
              >
                {typeLabel}
              </span>
              <span className="text-[11px] capitalize text-text-tertiary">{rec.scope}</span>
              {rec.relatedEntity && (
                <>
                  <span className="text-[11px] text-text-tertiary" aria-hidden>·</span>
                  <span className="text-[11px] text-text-tertiary">{rec.relatedEntity}</span>
                </>
              )}
            </div>
            <h2 className="mt-1.5 text-[16px] font-semibold leading-snug text-text-primary">
              {rec.title}
            </h2>
          </div>
        </div>

        <p className="text-[13.5px] leading-relaxed text-text-secondary">{rec.description}</p>

        <div className="rounded-lg border border-border-subtle bg-surface-sunken p-3">
          <div className="flex items-start gap-2">
            <TrendingUp size={14} className="mt-0.5 shrink-0 text-green-600" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                Expected impact
              </div>
              <div className="text-[13px] font-medium text-text-primary">{rec.impact}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="font-semibold uppercase tracking-wide text-text-tertiary">
              Confidence
            </span>
            <span className="font-medium text-text-primary tabular-nums">
              {rec.confidence}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-cyan transition-all"
              style={{ width: `${rec.confidence}%` }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface PanelProps {
  scope?: 'all' | 'campaign' | 'agent';
}

export function AIRecommendationsPanel({ scope = 'all' }: PanelProps) {
  const [activeRec, setActiveRec] = useState<AIRecommendation | null>(null);

  const filtered =
    scope === 'all'
      ? AI_RECOMMENDATIONS
      : AI_RECOMMENDATIONS.filter((r) => r.scope === scope || r.scope === 'global');

  return (
    <>
      <section className="rounded-lg ring-1 ring-[#E5E7EB] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-cyan/10 via-purple-50 to-pink-50 border-b border-[#E5E7EB]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white ring-1 ring-cyan/20">
            <Sparkles size={18} className="text-cyan" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">AI Recommendations</h3>
            <p className="text-xs text-text-secondary">
              {filtered.length} actionable insights based on cross-platform analysis
            </p>
          </div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} onOpen={setActiveRec} />
          ))}
        </div>
      </section>

      <RecommendationDetail rec={activeRec} onClose={() => setActiveRec(null)} />
    </>
  );
}
