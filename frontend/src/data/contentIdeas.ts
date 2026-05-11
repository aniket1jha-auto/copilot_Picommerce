import type { ChannelType } from '@/types';

export type IdeaCategory = 'voice' | 'whatsapp' | 'sms' | 'sequence' | 'insights';

export type RecentTemplateType = 'Voice' | 'WhatsApp' | 'SMS' | 'Sequence';

/** Sample shown in drawer — no agent/customer dialogue formatting */
export type IdeaSample =
  | {
      variant: 'messaging';
      channel: 'whatsapp' | 'sms';
      text: string;
    }
  | {
      variant: 'voice';
      openingLine: string;
      /** Short line if customer agrees / engages */
      firstResponseLine: string;
    }
  | {
      variant: 'sequence';
      steps: readonly string[];
    }
  | {
      variant: 'insights';
      statLabel: string;
      statValue: string;
      /** 0–100 bar heights for mini chart */
      bars: readonly number[];
      summary: string;
    };

export interface CampaignPreset {
  audience: string;
  channel: string;
  recommendedTime: string;
  estimatedReach: string;
  segmentId: string;
  channels: ChannelType[];
}

export interface ContentIdea {
  id: string;
  category: IdeaCategory;
  title: string;
  sample: IdeaSample;
  campaign: CampaignPreset;
}

export interface RecentTemplate {
  id: string;
  name: string;
  type: RecentTemplateType;
}

export const CATEGORY_LABEL: Record<IdeaCategory, string> = {
  voice: 'Voice Script',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  sequence: 'Sequence',
  insights: 'Insights',
};

export const CATEGORY_ACCENT: Record<IdeaCategory, { ring: string; glow: string }> = {
  voice: {
    ring: 'hover:ring-amber-400/60',
    glow: 'hover:shadow-[0_0_20px_-4px_rgba(245,158,11,0.45)]',
  },
  whatsapp: {
    ring: 'hover:ring-emerald-400/60',
    glow: 'hover:shadow-[0_0_20px_-4px_rgba(52,211,153,0.45)]',
  },
  sms: {
    ring: 'hover:ring-indigo-400/60',
    glow: 'hover:shadow-[0_0_20px_-4px_rgba(129,140,248,0.45)]',
  },
  sequence: {
    ring: 'hover:ring-violet-400/60',
    glow: 'hover:shadow-[0_0_20px_-4px_rgba(167,139,250,0.45)]',
  },
  insights: {
    ring: 'hover:ring-cyan/70',
    glow: 'hover:shadow-[0_0_20px_-4px_rgba(0,186,242,0.4)]',
  },
};

export const RECENT_TEMPLATES: RecentTemplate[] = [
  { id: 'r1', name: 'Loan recovery — opening', type: 'Voice' },
  { id: 'r2', name: 'Payment reminder WA', type: 'WhatsApp' },
  { id: 'r3', name: 'OTP follow-up SMS', type: 'SMS' },
  { id: 'r4', name: 'Voice → WA nurture', type: 'Sequence' },
  { id: 'r5', name: 'Insurance renewal call', type: 'Voice' },
  { id: 'r6', name: 'KYC nudge template', type: 'WhatsApp' },
];

export const CONTENT_IDEAS: ContentIdea[] = [
  {
    id: 'i1',
    category: 'voice',
    title: 'Loan recovery opening script — 30-60 DPD',
    sample: {
      variant: 'voice',
      openingLine:
        'Namaste [Name] ji, main [Brand] ki taraf se bol raha hoon. Aapki EMI ke baare mein baat karni thi — kya abhi 2 minute ka time hai?',
      firstResponseLine:
        'Samajh gaya. Aapka outstanding AED [amount] hai, due date [date] thi. Main aapko restructuring options bata sakta hoon — chhoti EMI par shift karna possible ho sakta hai.',
    },
    campaign: {
      audience: '30–60 DPD loan accounts',
      channel: 'AI Voice',
      recommendedTime: '10am–1pm, weekdays',
      estimatedReach: '~1,200 contacts',
      segmentId: 'seg-004',
      channels: ['ai_voice'],
    },
  },
  {
    id: 'i2',
    category: 'voice',
    title: 'Insurance renewal reminder — warm tone',
    sample: {
      variant: 'voice',
      openingLine:
        'Hello [Name], main [Brand] insurance se [Agent] bol rahi hoon. Aapki [policy_type] policy [policy_id] [date] ko renew honi hai — premium same hai, kya 2 minute mein renew kar dein?',
      firstResponseLine:
        'Bilkul — main SMS par secure payment link bhej rahi hoon; aap chahein to abhi card se bhi kar sakte hain.',
    },
    campaign: {
      audience: 'Policy renewals in next 30 days',
      channel: 'AI Voice',
      recommendedTime: '11am–4pm, weekdays',
      estimatedReach: '~3,400 contacts',
      segmentId: 'seg-003',
      channels: ['ai_voice'],
    },
  },
  {
    id: 'i3',
    category: 'voice',
    title: 'KYC follow-up call script',
    sample: {
      variant: 'voice',
      openingLine:
        'Hi [Name], [Brand] se call hai — aapke account ke liye chhuti KYC details pending hain, bina iske transactions limit ho sakti hain. Kya abhi 3 minute verify kar lein?',
      firstResponseLine:
        'Dhanyavaad. Pehle address confirm karte hain — aapke paas jo address hai wahi deliverable hai?',
    },
    campaign: {
      audience: 'Incomplete KYC users',
      channel: 'AI Voice',
      recommendedTime: '10am–6pm, Mon–Sat',
      estimatedReach: '~8,900 contacts',
      segmentId: 'seg-002',
      channels: ['ai_voice'],
    },
  },
  {
    id: 'i4',
    category: 'whatsapp',
    title: 'Post-call follow-up message',
    sample: {
      variant: 'messaging',
      channel: 'whatsapp',
      text:
        'Hi [Name], thanks for speaking with us today. Here’s what we agreed:\n• Next step: [action]\n• Reference: [ticket_id]\nReply YES if you want a specialist callback.',
    },
    campaign: {
      audience: 'Customers with open support tickets',
      channel: 'WhatsApp',
      recommendedTime: 'Within 15 min of call',
      estimatedReach: '~620 contacts',
      segmentId: 'seg-003',
      channels: ['whatsapp'],
    },
  },
  {
    id: 'i5',
    category: 'whatsapp',
    title: 'Payment reminder with soft CTA',
    sample: {
      variant: 'messaging',
      channel: 'whatsapp',
      text:
        'Hi [Name], this is a reminder that your payment of AED [amount] is due on [date]. Tap here to pay now: [link]. Reply STOP to opt out.',
    },
    campaign: {
      audience: '30–60 DPD loan accounts',
      channel: 'WhatsApp',
      recommendedTime: '10am–1pm, weekdays',
      estimatedReach: '~2,100 contacts',
      segmentId: 'seg-004',
      channels: ['whatsapp'],
    },
  },
  {
    id: 'i6',
    category: 'whatsapp',
    title: 'Welcome message for new leads',
    sample: {
      variant: 'messaging',
      channel: 'whatsapp',
      text:
        'Welcome to [Brand] 🙏 You’re set — your RM is [RM_name]. Save this number for updates. Tap below for offers picked for you.',
    },
    campaign: {
      audience: 'New merchants (last 14 days)',
      channel: 'WhatsApp',
      recommendedTime: 'Immediately after signup',
      estimatedReach: '~850 contacts',
      segmentId: 'seg-005',
      channels: ['whatsapp'],
    },
  },
  {
    id: 'i7',
    category: 'sms',
    title: 'Appointment confirmation nudge',
    sample: {
      variant: 'messaging',
      channel: 'sms',
      text:
        '[Brand]: Hi [Name], your appointment is confirmed for [datetime] at [branch]. Reply C to cancel or R to reschedule. T&C apply.',
    },
    campaign: {
      audience: 'Branch appointment bookings',
      channel: 'SMS',
      recommendedTime: 'Morning of appointment day',
      estimatedReach: '~4,500 contacts',
      segmentId: 'seg-003',
      channels: ['sms'],
    },
  },
  {
    id: 'i8',
    category: 'sms',
    title: 'Re-engagement for dormant users',
    sample: {
      variant: 'messaging',
      channel: 'sms',
      text:
        '[Brand]: We miss you, [Name]! Your [product] is inactive. Re-activate with code [CODE] by [date]. Opt out: [opt_out]',
    },
    campaign: {
      audience: 'High LTV dormant (60+ days)',
      channel: 'SMS',
      recommendedTime: '2–5pm, weekdays',
      estimatedReach: '~12,000 contacts',
      segmentId: 'seg-001',
      channels: ['sms'],
    },
  },
  {
    id: 'i9',
    category: 'sequence',
    title: 'Voice → WhatsApp 3-step recovery sequence',
    sample: {
      variant: 'sequence',
      steps: [
        'Step 1 · Voice call · Day 1 — empathetic dues reminder + reschedule offer',
        'Step 2 · WhatsApp follow-up · Day 2 if no answer — payment link + FAQ',
        'Step 3 · SMS nudge · Day 4 if no reply — short reminder + opt-out',
      ],
    },
    campaign: {
      audience: '30–60 DPD loan accounts',
      channel: 'Voice → WhatsApp → SMS',
      recommendedTime: 'Voice 10am–1pm; WA/SMS auto',
      estimatedReach: '~1,200 contacts',
      segmentId: 'seg-004',
      channels: ['ai_voice', 'whatsapp', 'sms'],
    },
  },
  {
    id: 'i10',
    category: 'sequence',
    title: 'New user onboarding: Call + SMS',
    sample: {
      variant: 'sequence',
      steps: [
        'Step 1 · Voice · Day 0 — welcome + product tour offer',
        'Step 2 · SMS · Same day — app download + UPI setup link',
        'Step 3 · SMS · Day 3 — feedback NPS with short URL',
      ],
    },
    campaign: {
      audience: 'New merchants (last 14 days)',
      channel: 'Voice + SMS',
      recommendedTime: 'Call 11am–5pm; SMS triggered',
      estimatedReach: '~850 contacts',
      segmentId: 'seg-005',
      channels: ['ai_voice', 'sms'],
    },
  },
  {
    id: 'i11',
    category: 'insights',
    title: 'View call success rate by time of day',
    sample: {
      variant: 'insights',
      statLabel: 'Best connect window',
      statValue: '10am–12pm · 34% answer rate',
      bars: [22, 34, 28, 31, 26, 18, 14],
      summary:
        'Compare answer rate and conversion by hour bucket; filter by segment and agent pool. Export CSV for weekly reviews.',
    },
    campaign: {
      audience: 'All outbound voice campaigns',
      channel: 'Analytics (voice)',
      recommendedTime: 'Review weekly',
      estimatedReach: 'All historical calls',
      segmentId: 'seg-003',
      channels: ['ai_voice'],
    },
  },
  {
    id: 'i12',
    category: 'insights',
    title: 'Best performing opening lines this week',
    sample: {
      variant: 'insights',
      statLabel: 'Top line uplift',
      statValue: '+12% connect vs baseline',
      bars: [40, 52, 48, 65, 55, 50, 44],
      summary:
        'Rank first-agent utterances by connect→hold rate and downstream conversion; top 10 lines with sample size.',
    },
    campaign: {
      audience: 'Voice QA & ops teams',
      channel: 'Analytics (voice)',
      recommendedTime: 'Monday review',
      estimatedReach: 'Last 7 days of calls',
      segmentId: 'seg-003',
      channels: ['ai_voice'],
    },
  },
];
