'use client';

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Users,
  Target,
  Layers,
  Clock,
  Image,
  AlignLeft,
  MousePointerClick,
  Mic,
  ClipboardList,
  Layout,
  MessageSquareText,
  Megaphone,
} from 'lucide-react';
import { usePhaseData } from '@/hooks/usePhaseData';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ChannelIcon } from '@/components/common/ChannelIcon';
import { EmptyState } from '@/components/common/EmptyState';
import { formatCount } from '@/utils/format';
import type { ChannelType } from '@/types';

// ─── Content Types ────────────────────────────────────────────────────────────

interface SmsContent {
  kind: 'sms';
  text: string;
}

interface WhatsAppContent {
  kind: 'whatsapp';
  text: string;
  ctaLabel: string;
  hasImage: boolean;
}

interface PushContent {
  kind: 'push_notification';
  title: string;
  body: string;
}

interface VoiceContent {
  kind: 'ai_voice';
  scriptSummary: string;
  language: string;
}

interface FieldExecContent {
  kind: 'field_executive';
  taskType: string;
  description: string;
}

interface InAppContent {
  kind: 'in_app_banner';
  headline: string;
  cta: string;
  bgColor: string;
}

interface RcsContent {
  kind: 'rcs';
  text: string;
  buttons: string[];
}

type StepContent =
  | SmsContent
  | WhatsAppContent
  | PushContent
  | VoiceContent
  | FieldExecContent
  | InAppContent
  | RcsContent;

interface JourneyStep {
  channel: ChannelType;
  waitLabel: string;
  trigger: string;
  content: StepContent;
}

interface SubSegment {
  name: string;
  users: number;
  percentOfAudience: number;
  journey: JourneyStep[];
}

// ─── Channel display helpers ──────────────────────────────────────────────────

const CHANNEL_NAMES: Record<ChannelType, string> = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  rcs: 'RCS',
  ai_voice: 'AI Voice',
  field_executive: 'Field Executive',
  push_notification: 'Push Notification',
  in_app_banner: 'In-App Banner',
  facebook_ads: 'Facebook Ads',
  instagram_ads: 'Instagram Ads',
};

// ─── Hardcoded Sub-segment Data ───────────────────────────────────────────────

const SUB_SEGMENTS: SubSegment[] = [
  {
    name: 'High-Value Metro — Premium Offer',
    users: 12400,
    percentOfAudience: 28,
    journey: [
      {
        channel: 'whatsapp',
        waitLabel: 'Day 0 — Immediately',
        trigger: 'Campaign launch',
        content: {
          kind: 'whatsapp',
          text: 'Namaste {{first_name}} 🙏\n\nAapka KYC abhi bhi incomplete hai. Aaj complete karein aur paayein AED 500 cashback + pre-approved AED 2L personal loan offer.\n\nOffer sirf 48 ghante valid hai.',
          ctaLabel: 'KYC Abhi Complete Karein →',
          hasImage: true,
        },
      },
      {
        channel: 'ai_voice',
        waitLabel: 'Day 2 — If no WhatsApp response',
        trigger: 'No click on WhatsApp CTA within 48h',
        content: {
          kind: 'ai_voice',
          scriptSummary:
            'Personalised call: greet by name, mention AED 2L pre-approved loan, reference their account activity. Ask if they have 2 minutes to complete KYC via app. Offer to send a direct deep-link SMS immediately.',
          language: 'Hindi / English (code-switch)',
        },
      },
      {
        channel: 'field_executive',
        waitLabel: 'Day 5 — If no voice response',
        trigger: 'No KYC initiated after voice attempt',
        content: {
          kind: 'field_executive',
          taskType: 'Doorstep KYC Assist',
          description:
            'Visit assigned to nearest FE. Carry printed KYC checklist. Assist customer with video-KYC on their phone. If unavailable, leave a physical pamphlet with QR code and callback number.',
        },
      },
    ],
  },
  {
    name: 'Morning Engagers — Digital First',
    users: 9800,
    percentOfAudience: 22,
    journey: [
      {
        channel: 'whatsapp',
        waitLabel: 'Day 0 — 8:30 AM',
        trigger: 'Campaign launch (morning batch)',
        content: {
          kind: 'whatsapp',
          text: 'Good morning {{first_name}} ☀️\n\nStart your day right — your KYC is just 3 minutes away. Complete it before 12 PM today and unlock AED 250 instant cashback.\n\nCheck → https://app.lnk/kyc',
          ctaLabel: 'Complete KYC →',
          hasImage: false,
        },
      },
      {
        channel: 'push_notification',
        waitLabel: 'Day 1 — 9:00 AM',
        trigger: 'No app open after Day 0 WhatsApp',
        content: {
          kind: 'push_notification',
          title: '⏳ KYC pending — cashback waiting!',
          body: 'Your AED 250 cashback is still unclaimed. Tap to complete KYC in 3 mins.',
        },
      },
      {
        channel: 'sms',
        waitLabel: 'Day 3 — 10:00 AM',
        trigger: 'KYC still not initiated',
        content: {
          kind: 'sms',
          text: 'Dear {{first_name}}, KYC pend hai. Abhi complete karein: https://app.lnk/kyc. AED 250 cashback milega. -FintechApp',
        },
      },
    ],
  },
  {
    name: 'Evening Responders — Tier 2 Cities',
    users: 7600,
    percentOfAudience: 17,
    journey: [
      {
        channel: 'sms',
        waitLabel: 'Day 0 — 6:30 PM',
        trigger: 'Campaign launch (evening batch)',
        content: {
          kind: 'sms',
          text: 'Namaste {{first_name}}, aapka KYC baaki hai. Aaj shaam 9 baje tak complete karein aur paayein AED 200 cashback. Link: https://app.lnk/kyc -FintechApp',
        },
      },
      {
        channel: 'whatsapp',
        waitLabel: 'Day 2 — 7:00 PM',
        trigger: 'SMS link not clicked within 48h',
        content: {
          kind: 'whatsapp',
          text: 'Helo {{first_name}} 👋\n\nAapke area mein network issues ki wajah se already 2 log KYC nahi kar paaye — lekin aap abhi bhi eligible hain!\n\nSirf aadhaar + selfie chahiye. 3 minute ka kaam hai.',
          ctaLabel: 'KYC Start Karein →',
          hasImage: true,
        },
      },
      {
        channel: 'ai_voice',
        waitLabel: 'Day 4 — 7:30 PM',
        trigger: 'No WhatsApp engagement',
        content: {
          kind: 'ai_voice',
          scriptSummary:
            'Local language (Hindi/Marathi/Telugu based on profile). Acknowledge they may be busy in evening. Mention that a friend referral bonus of AED 100 has also been added. Ask if they can try once tonight.',
          language: 'Hindi / Regional (profile-matched)',
        },
      },
    ],
  },
  {
    name: 'SMS-Only — Feature Phone Users',
    users: 5200,
    percentOfAudience: 12,
    journey: [
      {
        channel: 'sms',
        waitLabel: 'Day 0 — 11:00 AM',
        trigger: 'Campaign launch (SMS-only segment)',
        content: {
          kind: 'sms',
          text: 'FintechApp: {{first_name}}, KYC karo aur AED 150 pao. Call 1800-XXX-XXXX ya link: https://app.lnk/k -FintechApp STOP 1909',
        },
      },
      {
        channel: 'sms',
        waitLabel: 'Day 3 — 11:00 AM',
        trigger: 'No response to Day 0 SMS',
        content: {
          kind: 'sms',
          text: 'Last reminder: KYC deadline aaj raat. AED 150 cashback expire ho jayega. Link: https://app.lnk/k -FintechApp STOP 1909',
        },
      },
      {
        channel: 'ai_voice',
        waitLabel: 'Day 5 — 12:00 PM',
        trigger: 'No SMS link click after 2 attempts',
        content: {
          kind: 'ai_voice',
          scriptSummary:
            'Simple, slow-paced Hindi call. No jargon. Explain that KYC can be done by calling back on a toll-free number with their Aadhaar ready. No smartphone required for IVRS-KYC path.',
          language: 'Hindi (simple, slow)',
        },
      },
    ],
  },
  {
    name: 'In-App Active — High Session Frequency',
    users: 6100,
    percentOfAudience: 14,
    journey: [
      {
        channel: 'in_app_banner',
        waitLabel: 'Day 0 — On next app open',
        trigger: 'Campaign launch (triggers on app open)',
        content: {
          kind: 'in_app_banner',
          headline: 'Complete KYC → Unlock AED 5L Credit Line',
          cta: 'Start in 3 mins',
          bgColor: '#002970',
        },
      },
      {
        channel: 'push_notification',
        waitLabel: 'Day 2 — 8:00 PM',
        trigger: 'Banner shown but KYC not started',
        content: {
          kind: 'push_notification',
          title: '🔓 Unlock your credit line today',
          body: '{{first_name}}, you\'re one step away from a AED 5L credit limit. Complete KYC now.',
        },
      },
      {
        channel: 'whatsapp',
        waitLabel: 'Day 4 — If still no KYC',
        trigger: 'No KYC initiated after banner + push',
        content: {
          kind: 'whatsapp',
          text: 'Hi {{first_name}} 👋\n\nNoticed you\'ve been actively using the app but KYC is still pending. That\'s the only thing between you and a AED 5L credit line.\n\nTakes 3 minutes — try it right now.',
          ctaLabel: 'Unlock Credit Line →',
          hasImage: false,
        },
      },
    ],
  },
  {
    name: 'RCS-Enabled — Android Premium',
    users: 3100,
    percentOfAudience: 7,
    journey: [
      {
        channel: 'rcs',
        waitLabel: 'Day 0 — 10:00 AM',
        trigger: 'Campaign launch (RCS-capable devices)',
        content: {
          kind: 'rcs',
          text: 'Namaste {{first_name}} 🎉 Aapka account almost ready hai — bas KYC baaki hai. Complete karein aur paayein AED 300 cashback + AED 2L pre-approved loan.',
          buttons: ['KYC Abhi Karein', 'Baad Mein Yaad Dilaayein', 'Helpline'],
        },
      },
      {
        channel: 'whatsapp',
        waitLabel: 'Day 3 — If no RCS engagement',
        trigger: 'RCS delivered but no button tap',
        content: {
          kind: 'whatsapp',
          text: 'Hey {{first_name}} 👋\n\nWe sent you a message a few days ago about your KYC. Still pending! Complete it today — AED 300 cashback + loan access waiting.',
          ctaLabel: 'Complete KYC →',
          hasImage: true,
        },
      },
      {
        channel: 'sms',
        waitLabel: 'Day 6 — Final nudge',
        trigger: 'No KYC after RCS + WhatsApp',
        content: {
          kind: 'sms',
          text: 'Final reminder {{first_name}}: KYC puri karein aur AED 300 cashback paayein. Link: https://app.lnk/kyc -FintechApp STOP 1909',
        },
      },
    ],
  },
];

// ─── Content Preview Components ───────────────────────────────────────────────

function SmsPreview({ content }: { content: SmsContent }) {
  const [expanded, setExpanded] = useState(false);
  const lines = content.text.split('\n');
  const truncated = lines.slice(0, 2).join('\n');
  const needsTruncation = lines.length > 2;

  return (
    <div className="rounded-md bg-[#F3F4F6] px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-text-secondary">
        <AlignLeft size={10} />
        Message
      </div>
      <p className="whitespace-pre-wrap text-xs text-text-primary">
        {expanded || !needsTruncation ? content.text : truncated + '…'}
      </p>
      {needsTruncation && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-[11px] font-medium text-cyan hover:underline"
        >
          {expanded ? 'Show less' : 'Show full message'}
        </button>
      )}
    </div>
  );
}

function WhatsAppPreview({ content }: { content: WhatsAppContent }) {
  const [expanded, setExpanded] = useState(false);
  const lines = content.text.split('\n');
  const truncated = lines.slice(0, 3).join('\n');
  const needsTruncation = lines.length > 3;

  return (
    <div className="space-y-2">
      {content.hasImage && (
        <div className="flex h-20 items-center justify-center rounded-md bg-[#E5E7EB]">
          <Image size={20} className="text-text-secondary" />
          <span className="ml-1.5 text-xs text-text-secondary">
            Campaign banner image
          </span>
        </div>
      )}
      <div className="rounded-md bg-[#E7F8EE] px-3 py-2.5">
        <p className="whitespace-pre-wrap text-xs text-[#1A1A1A]">
          {expanded || !needsTruncation ? content.text : truncated + '…'}
        </p>
        {needsTruncation && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-[11px] font-medium text-[#25D366] hover:underline"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        <div className="mt-2.5 border-t border-[#25D36622] pt-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#25D366]">
            <MousePointerClick size={12} />
            {content.ctaLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

function PushPreview({ content }: { content: PushContent }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-[#EF444420]">
          <span className="text-[10px]">🔔</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-primary">
            {content.title}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">{content.body}</p>
        </div>
      </div>
    </div>
  );
}

function VoicePreview({ content }: { content: VoiceContent }) {
  return (
    <div className="rounded-md bg-[#FEF3C7] px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-[#D97706]">
        <Mic size={10} />
        Script Summary
      </div>
      <p className="text-xs text-[#78350F]">{content.scriptSummary}</p>
      <div className="mt-2 text-[10px] text-[#92400E]">
        Language: {content.language}
      </div>
    </div>
  );
}

function FieldExecPreview({ content }: { content: FieldExecContent }) {
  return (
    <div className="rounded-md bg-[#F3F0FF] px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-[#7C3AED]">
        <ClipboardList size={10} />
        {content.taskType}
      </div>
      <p className="text-xs text-[#4C1D95]">{content.description}</p>
    </div>
  );
}

function InAppPreview({ content }: { content: InAppContent }) {
  return (
    <div
      className="rounded-md px-4 py-3"
      style={{ backgroundColor: content.bgColor }}
    >
      <p className="text-sm font-semibold text-white">{content.headline}</p>
      <div className="mt-2 inline-flex items-center gap-1.5 rounded bg-white/20 px-2.5 py-1 text-xs font-medium text-white">
        <Layout size={11} />
        {content.cta}
      </div>
      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/60">
        <span
          className="h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: content.bgColor, border: '1px solid rgba(255,255,255,0.3)' }}
        />
        bg: {content.bgColor}
      </div>
    </div>
  );
}

function RcsPreview({ content }: { content: RcsContent }) {
  return (
    <div className="rounded-md bg-[#E0F7FE] px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-[#0284C7]">
        <MessageSquareText size={10} />
        RCS Message
      </div>
      <p className="text-xs text-[#0C4A6E]">{content.text}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {content.buttons.map((btn) => (
          <span
            key={btn}
            className="rounded-full border border-[#00BAF2] px-2.5 py-0.5 text-[11px] font-medium text-[#0284C7]"
          >
            {btn}
          </span>
        ))}
      </div>
    </div>
  );
}

function ContentPreview({ content }: { content: StepContent }) {
  switch (content.kind) {
    case 'sms':
      return <SmsPreview content={content} />;
    case 'whatsapp':
      return <WhatsAppPreview content={content} />;
    case 'push_notification':
      return <PushPreview content={content} />;
    case 'ai_voice':
      return <VoicePreview content={content} />;
    case 'field_executive':
      return <FieldExecPreview content={content} />;
    case 'in_app_banner':
      return <InAppPreview content={content} />;
    case 'rcs':
      return <RcsPreview content={content} />;
  }
}

// ─── Sub-segment Card ─────────────────────────────────────────────────────────

function SubSegmentCard({ seg, index }: { seg: SubSegment; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const uniqueChannels = Array.from(
    new Set(seg.journey.map((s) => s.channel)),
  ) as ChannelType[];

  return (
    <div className="overflow-hidden rounded-lg bg-white ring-1 ring-[#E5E7EB]">
      {/* Header / collapsed summary */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-[#FAFAFA]"
      >
        {/* Index badge */}
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-xs font-semibold text-text-secondary">
          {index + 1}
        </div>

        {/* Name + users */}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-text-primary">
            {seg.name}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
            <Users size={11} />
            <span>{formatCount(seg.users)} users</span>
            <span className="text-[#D1D5DB]">·</span>
            <span>{seg.percentOfAudience}% of audience</span>
          </div>
        </div>

        {/* Channel journey chips */}
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {seg.journey.map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              <ChannelIcon channel={step.channel} size={13} />
              {i < seg.journey.length - 1 && (
                <span className="text-[10px] font-bold text-[#D1D5DB]">→</span>
              )}
            </div>
          ))}
        </div>

        {/* Expand/collapse */}
        <div className="flex-shrink-0 text-text-secondary">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded journey */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#E5E7EB] px-4 pb-5 pt-4">
              {/* Channel chips used in this segment */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-text-secondary">
                  Channels used:
                </span>
                {uniqueChannels.map((ch) => (
                  <div
                    key={ch}
                    className="flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-2.5 py-1"
                  >
                    <ChannelIcon channel={ch} size={11} />
                    <span className="text-xs font-medium text-text-primary">
                      {CHANNEL_NAMES[ch]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Steps */}
              <div className="space-y-0">
                {seg.journey.map((step, stepIdx) => (
                  <div key={stepIdx} className="flex gap-3">
                    {/* Left connector line */}
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-xs font-bold text-text-secondary">
                        {stepIdx + 1}
                      </div>
                      {stepIdx < seg.journey.length - 1 && (
                        <div className="my-1 w-0.5 flex-1 bg-[#E5E7EB]" style={{ minHeight: 24 }} />
                      )}
                    </div>

                    {/* Step content */}
                    <div
                      className={`flex-1 pb-4 ${
                        stepIdx === seg.journey.length - 1 ? 'pb-0' : ''
                      }`}
                    >
                      {/* Step header */}
                      <div className="flex items-center gap-2 pt-1.5">
                        <ChannelIcon channel={step.channel} size={13} />
                        <span className="text-sm font-medium text-text-primary">
                          {CHANNEL_NAMES[step.channel]}
                        </span>
                      </div>

                      {/* Timing + trigger */}
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {step.waitLabel}
                        </span>
                        <span className="text-[#D1D5DB]">·</span>
                        <span className="italic">{step.trigger}</span>
                      </div>

                      {/* Content preview */}
                      <div className="mt-2.5">
                        <ContentPreview content={step.content} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CampaignFlow() {
  const { id } = useParams<{ id: string }>();
  const { campaigns, isDay0, isDay1 } = usePhaseData();

  const campaign = campaigns.find((c) => c.id === id);

  // Empty state for Day 0 / Day 1
  if (isDay0 || isDay1 || !campaign) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link
            to="/campaigns"
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={15} />
            Campaigns
          </Link>
        </div>
        <div className="rounded-lg bg-white ring-1 ring-[#E5E7EB]">
          <EmptyState
            icon={Megaphone}
            title="No campaign found"
            description="This campaign doesn't exist or has no flow data yet."
          />
        </div>
      </div>
    );
  }

  const uniqueChannels = Array.from(new Set(campaign.channels)) as ChannelType[];
  const totalAudienceUsers = SUB_SEGMENTS.reduce((s, seg) => s + seg.users, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Link to="/campaigns" className="hover:text-text-primary">
          Campaigns
        </Link>
        <span>/</span>
        <span className="text-text-primary font-medium truncate max-w-[200px]">
          {campaign.name}
        </span>
        <span>/</span>
        <span className="text-text-primary">Flow</span>
      </div>

      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/campaigns"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E5E7EB] text-text-secondary transition-colors hover:bg-[#F9FAFB] hover:text-text-primary"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-text-primary truncate">{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to={`/campaigns/${id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-[#F9FAFB]"
          >
            Edit Campaign
          </Link>
          <Link
            to={`/campaigns/${id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            View Campaign Analytics
          </Link>
        </div>
      </div>

      {/* Section 1: Campaign Overview */}
      <div className="rounded-lg bg-white ring-1 ring-[#E5E7EB]">
        <div className="border-b border-[#E5E7EB] px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Campaign Overview
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[#E5E7EB] sm:grid-cols-4">
          {/* Goal */}
          <div className="bg-white px-4 py-3">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
              <Target size={11} />
              Goal
            </div>
            <p className="text-sm font-medium text-text-primary">
              Drive KYC completion to unlock pre-approved credit products
            </p>
          </div>

          {/* Audience */}
          <div className="bg-white px-4 py-3">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
              <Users size={11} />
              Audience
            </div>
            <p className="text-sm font-medium text-text-primary">
              {campaign.audience.segmentName}
            </p>
            <p className="text-xs text-text-secondary">
              {formatCount(campaign.audience.size)} users
            </p>
          </div>

          {/* Channels */}
          <div className="bg-white px-4 py-3">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
              <Layers size={11} />
              Channels
            </div>
            <div className="flex flex-wrap gap-1.5">
              {uniqueChannels.map((ch) => (
                <ChannelIcon key={ch} channel={ch} size={13} />
              ))}
            </div>
          </div>

          {/* Sub-segments */}
          <div className="bg-white px-4 py-3">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
              <Layers size={11} />
              Sub-segments
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {SUB_SEGMENTS.length}
            </p>
            <p className="text-xs text-text-secondary">
              {formatCount(totalAudienceUsers)} users mapped
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Sub-segments & Journeys */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">
            Sub-segments &amp; Journeys
          </h2>
          <span className="text-xs text-text-secondary">
            Click a row to see the full journey &amp; content
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {SUB_SEGMENTS.map((seg, i) => (
            <SubSegmentCard key={seg.name} seg={seg} index={i} />
          ))}
        </div>
      </div>

    </div>
  );
}
