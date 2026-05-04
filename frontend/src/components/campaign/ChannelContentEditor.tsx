'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Image,
  MousePointer,
  ClipboardList,
  Type,
  Link,
  AlignLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  Info,
} from 'lucide-react';
import type { ChannelType } from '@/types';
import type { VoiceConfig } from './VoiceCallConfig';
import { VoiceCallConfig } from './VoiceCallConfig';
import type { TemplateChannel, ContentTemplateRow } from '@/types/contentLibrary';
import { loadContentTemplates } from '@/utils/contentTemplatesStore';
import { Link as RouterLink } from 'react-router-dom';

// ─── Content types ────────────────────────────────────────────────────────────

export interface SMSContent {
  body: string;
}

export interface WhatsAppContent {
  body: string;
  imageUrl: string;
  ctaText: string;
}

export interface RCSContent {
  body: string;
  imageUrl: string;
  button1: string;
  button2: string;
}

export interface FieldExecContent {
  taskType: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  slaHours: number;
}

export interface PushNotificationContent {
  title: string;
  body: string;
  deepLinkUrl: string;
  imageUrl: string;
}

export interface InAppBannerContent {
  headline: string;
  body: string;
  ctaText: string;
  backgroundColor: string;
  position: 'top' | 'bottom' | 'modal';
  expiryHours: number;
}

export type AnyChannelContent =
  | SMSContent
  | WhatsAppContent
  | RCSContent
  | VoiceConfig
  | FieldExecContent
  | PushNotificationContent
  | InAppBannerContent;

// ─── Variant / testing types ──────────────────────────────────────────────────

export interface ContentVariant {
  id: string;
  label: string;
  content: AnyChannelContent;
  source: 'user' | 'ai_generated';
  isPrimary: boolean;
}

export interface TestingConfig {
  enabled: boolean;
  randomnessFactor: number; // 10–50
}

// ─── AI variant copies ────────────────────────────────────────────────────────

export const AI_VARIANTS: Partial<Record<ChannelType, AnyChannelContent[]>> = {
  sms: [
    { body: 'Complete your KYC now & get ₹100 cashback. Click: https://p.me/kyc' } satisfies SMSContent,
    { body: '⏰ Last 24 hours to complete KYC! Avoid wallet limits. Verify now: https://p.me/kyc' } satisfies SMSContent,
    { body: 'Join 50L+ verified users on Paytm. Complete KYC in 2 mins: https://p.me/kyc' } satisfies SMSContent,
  ],
  whatsapp: [
    {
      body: 'Hi! You have a pre-approved personal loan of up to ₹5,00,000 on Paytm — zero processing fee, instant disbursal. Check your offer and apply today. Valid for 48 hours only.',
      imageUrl: 'https://placehold.co/400x200/00BAF2/FFFFFF?text=Paytm+Loan+Offer',
      ctaText: 'View My Loan Offer',
    } satisfies WhatsAppContent,
    {
      body: "Hey! Quick question — did you know you have a pre-approved loan waiting? ₹5L, zero fee, and it takes just 2 minutes to check. Want to see your offer?",
      imageUrl: '',
      ctaText: 'Check My Offer',
    } satisfies WhatsAppContent,
    {
      body: '₹5L at your fingertips. Zero processing fee. 2-minute approval. Your credit profile qualifies — claim your offer before it expires tonight.',
      imageUrl: 'https://placehold.co/400x200/6366F1/FFFFFF?text=Claim+Your+Offer',
      ctaText: 'Claim Now',
    } satisfies WhatsAppContent,
  ],
  push_notification: [
    {
      title: 'Complete KYC & unlock ₹100 cashback',
      body: 'Your KYC is pending. Finish in 2 minutes and get ₹100 cashback credited instantly.',
      deepLinkUrl: 'paytm://kyc/complete',
      imageUrl: '',
    } satisfies PushNotificationContent,
    {
      title: '🎉 Hey! Free ₹100 is waiting for you 👀',
      body: "Just 2 mins away from ₹100 cashback! Tap now, finish KYC & we'll drop the cash right in. Don't miss it! ⚡",
      deepLinkUrl: 'paytm://kyc/complete',
      imageUrl: 'https://placehold.co/400x200/10B981/FFFFFF?text=₹100+Cashback',
    } satisfies PushNotificationContent,
    {
      title: '⏰ KYC deadline tonight — act now!',
      body: 'Your wallet will be restricted after midnight if KYC is incomplete. Takes only 2 mins. Tap to secure your account.',
      deepLinkUrl: 'paytm://kyc/complete',
      imageUrl: '',
    } satisfies PushNotificationContent,
  ],
  rcs: [
    {
      body: 'Exclusive offer: Paytm Gold starting ₹1. Invest in digital gold securely — anytime, anywhere.',
      imageUrl: 'https://placehold.co/400x200/F59E0B/FFFFFF?text=Paytm+Gold',
      button1: 'Start Investing',
      button2: 'Learn More',
    } satisfies RCSContent,
    {
      body: "Psst — gold prices just dipped! 😍 This is your moment to start investing. Even ₹1 gets you started with Paytm Gold today.",
      imageUrl: 'https://placehold.co/400x200/F59E0B/FFFFFF?text=Gold+Dip+Alert',
      button1: 'Invest ₹1 Now',
      button2: 'See Live Price',
    } satisfies RCSContent,
    {
      body: '🚨 Gold prices rising — buy before it goes up further! Over 2 crore Indians already invest with Paytm Gold. Secure your wealth today.',
      imageUrl: 'https://placehold.co/400x200/EF4444/FFFFFF?text=Buy+Before+It+Rises',
      button1: 'Buy Gold Now',
      button2: 'Price Chart',
    } satisfies RCSContent,
  ],
  in_app_banner: [
    {
      headline: 'Pre-approved Loan — ₹5L at 10.5% p.a.',
      body: 'Your credit profile qualifies for an instant personal loan. Zero processing fee, disbursal in 2 hours.',
      ctaText: 'Check My Offer',
      backgroundColor: '#0EA5E9',
      position: 'bottom',
      expiryHours: 24,
    } satisfies InAppBannerContent,
    {
      headline: "Hey, your ₹5L loan is just waiting 👋",
      body: "We crunched the numbers — you're approved! Zero fee, instant money. Tap to see your personalised offer.",
      ctaText: 'See My Offer',
      backgroundColor: '#6366F1',
      position: 'bottom',
      expiryHours: 24,
    } satisfies InAppBannerContent,
    {
      headline: '⏳ Offer expires in 24 hours!',
      body: "Your pre-approved ₹5L loan offer expires tonight. Grab it before it's gone — zero processing fee.",
      ctaText: 'Claim Before It Expires',
      backgroundColor: '#EF4444',
      position: 'modal',
      expiryHours: 12,
    } satisfies InAppBannerContent,
  ],
};

export const SAMPLE_COPY: Record<ChannelType, AnyChannelContent> = {
  sms: {
    body: 'Dear Customer, complete your Paytm KYC in 2 mins & unlock full wallet access + ₹100 cashback. Click: https://p.me/kyc-now STOP to opt out.',
  } satisfies SMSContent,
  whatsapp: {
    body: 'Hi! You have a pre-approved personal loan of up to ₹5,00,000 on Paytm — zero processing fee, instant disbursal. Check your offer and apply today. Valid for 48 hours only.',
    imageUrl: 'https://placehold.co/400x200/00BAF2/FFFFFF?text=Paytm+Loan+Offer',
    ctaText: 'View My Loan Offer',
  } satisfies WhatsAppContent,
  rcs: {
    body: 'Exclusive offer for you: Paytm Gold starting ₹1. Invest in digital gold securely — anytime, anywhere. Start your investment journey today.',
    imageUrl: 'https://placehold.co/400x200/F59E0B/FFFFFF?text=Paytm+Gold',
    button1: 'Start Investing',
    button2: 'Learn More',
  } satisfies RCSContent,
  ai_voice: {
    script:
      'Call the user and introduce yourself as calling from Paytm. Inform them about their pending KYC verification which is required to continue transacting. If they are interested, offer to help complete it right now on the call using their Aadhaar OTP. If they are busy, ask for a preferred callback time and confirm it.',
    language: 'hinglish',
    voiceGender: 'female',
    voiceTone: 'friendly',
    callWindowStart: '10:00',
    callWindowEnd: '19:00',
    maxRetries: 3,
    durationCap: 5,
    successCriteria: ['agreed', 'callback', 'completed'],
    failureCriteria: ['declined', 'dnd', 'hostile'],
  } satisfies VoiceConfig,
  field_executive: {
    taskType: 'KYC Verification',
    description:
      'Visit the customer and assist them in completing their full KYC. Collect: Aadhaar card (original + copy), PAN card (original + copy), one recent passport-size photograph. Fill KYC form and get customer signature. Upload scanned copies to the app before leaving the premises.',
    priority: 'high',
    slaHours: 48,
  } satisfies FieldExecContent,
  push_notification: {
    title: '🎁 Exclusive cashback waiting for you!',
    body: 'Complete your first UPI transaction today and get ₹50 cashback instantly. Offer valid for 24 hours only. Tap to claim now!',
    deepLinkUrl: 'paytm://cashback/claim?offer=upi50',
    imageUrl: 'https://placehold.co/400x200/EF4444/FFFFFF?text=Paytm+Cashback',
  } satisfies PushNotificationContent,
  in_app_banner: {
    headline: 'Pre-approved Loan — ₹5L at 10.5% p.a.',
    body: 'Your credit profile qualifies for an instant personal loan. Zero processing fee, disbursal in 2 hours.',
    ctaText: 'Check My Offer',
    backgroundColor: '#0EA5E9',
    position: 'bottom',
    expiryHours: 24,
  } satisfies InAppBannerContent,
  facebook_ads: {
    body: 'Pre-approved personal loan up to ₹5,00,000 — zero processing fee, instant disbursal. Check your Paytm offer now.',
  } satisfies SMSContent,
  instagram_ads: {
    body: 'Your Paytm Gold awaits. Start investing from just ₹1 — secure, simple, anytime. Tap to explore.',
  } satisfies SMSContent,
};

const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  script: '',
  language: 'hinglish',
  voiceGender: 'female',
  voiceTone: 'friendly',
  callWindowStart: '10:00',
  callWindowEnd: '19:00',
  maxRetries: 3,
  durationCap: 5,
  successCriteria: ['agreed', 'callback'],
  failureCriteria: ['declined', 'dnd'],
};

const DEFAULT_FIELD_EXEC: FieldExecContent = {
  taskType: 'KYC Verification',
  description: '',
  priority: 'medium',
  slaHours: 48,
};

const DEFAULT_PUSH: PushNotificationContent = {
  title: '',
  body: '',
  deepLinkUrl: '',
  imageUrl: '',
};

const DEFAULT_IN_APP: InAppBannerContent = {
  headline: '',
  body: '',
  ctaText: '',
  backgroundColor: '#0EA5E9',
  position: 'bottom',
  expiryHours: 24,
};

export function getDefaultContent(channel: ChannelType): AnyChannelContent {
  switch (channel) {
    case 'sms': return { body: '' };
    case 'whatsapp': return { body: '', imageUrl: '', ctaText: '' };
    case 'rcs': return { body: '', imageUrl: '', button1: '', button2: '' };
    case 'ai_voice': return DEFAULT_VOICE_CONFIG;
    case 'field_executive': return DEFAULT_FIELD_EXEC;
    case 'push_notification': return DEFAULT_PUSH;
    case 'in_app_banner': return DEFAULT_IN_APP;
    case 'facebook_ads': return { body: '', imageUrl: '', ctaText: '' };
    case 'instagram_ads': return { body: '', imageUrl: '', ctaText: '' };
  }
}

export function makeInitialVariant(channel: ChannelType): ContentVariant {
  return {
    id: `${channel}-variant-primary`,
    label: 'Variant A',
    content: getDefaultContent(channel),
    source: 'user',
    isPrimary: true,
  };
}

const VARIANT_LABELS = ['A', 'B', 'C', 'D', 'E'];

const BANNER_PRESET_COLORS = [
  { label: 'Sky Blue', value: '#0EA5E9' },
  { label: 'Indigo', value: '#6366F1' },
  { label: 'Green', value: '#10B981' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Purple', value: '#8B5CF6' },
];

const BANNER_EXPIRY_OPTIONS = [
  { label: '1 hour', value: 1 },
  { label: '6 hours', value: 6 },
  { label: '12 hours', value: 12 },
  { label: '24 hours', value: 24 },
  { label: '48 hours', value: 48 },
];

const BANNER_POSITIONS: Array<{ value: InAppBannerContent['position']; label: string }> = [
  { value: 'top', label: 'Top Banner' },
  { value: 'bottom', label: 'Bottom Banner' },
  { value: 'modal', label: 'Modal' },
];

const TASK_TYPES = [
  'KYC Verification',
  'Document Collection',
  'Device Installation',
  'Customer Visit',
  'Custom',
];

const PRIORITIES: Array<{
  value: FieldExecContent['priority'];
  label: string;
  selectedClass: string;
}> = [
  { value: 'low', label: 'Low', selectedClass: 'border-[#6B7280] bg-[#6B7280]/10 text-[#6B7280]' },
  { value: 'medium', label: 'Medium', selectedClass: 'border-warning bg-warning/10 text-warning' },
  { value: 'high', label: 'High', selectedClass: 'border-error bg-error/10 text-error' },
  { value: 'urgent', label: 'Urgent', selectedClass: 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]' },
];

// ─── Small reusable helpers ───────────────────────────────────────────────────

function SuggestButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-cyan px-2.5 py-1 text-xs font-medium text-cyan transition-colors hover:bg-cyan/5"
    >
      <Sparkles size={11} />
      Suggest Copy
    </button>
  );
}

function InputLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
      {children}
    </label>
  );
}

function TemplatePicker({
  channel,
  onApplyBody,
  allowedStatuses,
}: {
  channel: TemplateChannel;
  onApplyBody: (body: string) => void;
  allowedStatuses?: Array<ContentTemplateRow['status']>;
}) {
  const [templates, setTemplates] = useState<ContentTemplateRow[]>([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    setTemplates(loadContentTemplates());
  }, []);

  const filtered = templates.filter((t) => {
    if (t.channel !== channel) return false;
    if (!allowedStatuses || allowedStatuses.length === 0) return true;
    return allowedStatuses.includes(t.status);
  });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <select
          value={selectedId}
          onChange={(e) => {
            const next = e.target.value;
            setSelectedId(next);
            const tpl = filtered.find((t) => t.id === next);
            if (tpl) {
              onApplyBody(tpl.bodyPreview);
              setSelectedId('');
            }
          }}
          className="min-w-0 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
        >
          <option value="">Select from Content Library…</option>
          {filtered.length === 0 && <option value="" disabled>No templates available</option>}
          {filtered.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.status})
            </option>
          ))}
        </select>
        <RouterLink
          to="/content-library"
          className="shrink-0 whitespace-nowrap text-xs font-semibold text-cyan hover:underline"
        >
          Open library →
        </RouterLink>
      </div>
      <p className="text-[11px] text-text-secondary">Applying a template fills the message text.</p>
    </div>
  );
}

function TemplateOnlyVariantPanel({
  channel,
  content,
  onApplyBody,
}: {
  channel: TemplateChannel;
  content: AnyChannelContent;
  onApplyBody: (body: string) => void;
}) {
  const body = 'body' in content && typeof (content as { body?: unknown }).body === 'string' ? String((content as { body?: string }).body ?? '') : '';
  const hasBody = body.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      <TemplatePicker channel={channel} allowedStatuses={['approved']} onApplyBody={onApplyBody} />
      <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Selected template</p>
        <p className={['mt-1 text-sm leading-relaxed', hasBody ? 'text-text-primary' : 'text-text-secondary italic'].join(' ')}>
          {hasBody ? body : 'No template selected yet'}
        </p>
      </div>
    </div>
  );
}

function getContentPreview(content: AnyChannelContent): string {
  if ('body' in content && typeof content.body === 'string' && content.body) {
    const text = content.body.slice(0, 80);
    return content.body.length > 80 ? `${text}…` : text;
  }
  if ('title' in content && typeof (content as PushNotificationContent).title === 'string') {
    const push = content as PushNotificationContent;
    const text = push.title || push.body;
    return text ? (text.length > 80 ? `${text.slice(0, 80)}…` : text) : 'No content yet';
  }
  if ('script' in content && typeof (content as VoiceConfig).script === 'string') {
    const script = (content as VoiceConfig).script;
    return script ? (script.length > 80 ? `${script.slice(0, 80)}…` : script) : 'No script yet';
  }
  if ('headline' in content && typeof (content as InAppBannerContent).headline === 'string') {
    const banner = content as InAppBannerContent;
    return banner.headline || 'No headline yet';
  }
  if ('description' in content && typeof (content as FieldExecContent).description === 'string') {
    const exec = content as FieldExecContent;
    const text = exec.taskType ? `${exec.taskType}: ${exec.description}` : exec.description;
    return text ? (text.length > 80 ? `${text.slice(0, 80)}…` : text) : 'No instructions yet';
  }
  return 'No content yet';
}

// ─── Channel editor panels ────────────────────────────────────────────────────

function SMSPanel({
  content,
  onContentChange,
  onSuggestCopy,
  templateOnly = false,
}: {
  content: SMSContent;
  onContentChange: (c: SMSContent) => void;
  onSuggestCopy: () => void;
  templateOnly?: boolean;
}) {
  const charCount = content.body.length;
  const isOverLimit = charCount > 160;

  return (
    <div className="flex flex-col gap-3">
      <TemplatePicker channel="sms" onApplyBody={(body) => onContentChange({ body })} />
      <div className="flex items-center justify-between">
        <InputLabel>Message Text</InputLabel>
        {!templateOnly && <SuggestButton onClick={onSuggestCopy} />}
      </div>
      <textarea
        value={content.body}
        onChange={(e) => onContentChange({ body: e.target.value })}
        rows={4}
        placeholder="Select a template to populate message text…"
        readOnly={templateOnly}
        className={[
          'w-full resize-none rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-text-primary placeholder-text-secondary outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/20',
          templateOnly ? 'cursor-not-allowed bg-[#F9FAFB] text-text-secondary' : '',
        ].join(' ')}
      />
      <div className="flex items-center justify-between">
        <span className={`text-xs ${isOverLimit ? 'font-medium text-error' : 'text-text-secondary'}`}>
          {charCount} / 160 characters · {isOverLimit ? 2 : 1} SMS unit{isOverLimit ? 's' : ''}
        </span>
      </div>
      {isOverLimit && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/8 px-3 py-2.5">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
          <div>
            <p className="text-xs font-semibold text-warning">Cost alert: Will be sent as 2 SMS units</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              Your message is {charCount} characters. SMS units are 160 chars each — this will double
              cost from ₹0.25 to ₹0.50/user. Consider trimming to stay under 160 chars.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function WhatsAppPanel({
  content,
  onContentChange,
  onSuggestCopy,
  templateOnly = false,
}: {
  content: WhatsAppContent;
  onContentChange: (c: WhatsAppContent) => void;
  onSuggestCopy: () => void;
  templateOnly?: boolean;
}) {
  // Stack form + preview on narrow containers (e.g. JourneyNodeConfigPanel
  // drawer) and split into 2 columns only when there's room.
  return (
    <div className="@container">
    <div className="grid grid-cols-1 gap-5 @[640px]:grid-cols-2">
      <div className="flex flex-col gap-4">
        <TemplatePicker channel="whatsapp" onApplyBody={(body) => onContentChange({ ...content, body })} />
        <div>
          <div className="flex items-center justify-between mb-1">
            <InputLabel>Message Text</InputLabel>
            {!templateOnly && <SuggestButton onClick={onSuggestCopy} />}
          </div>
          <textarea
            value={content.body}
            onChange={(e) => onContentChange({ ...content, body: e.target.value })}
            rows={4}
            placeholder="Select a template to populate message text…"
            readOnly={templateOnly}
            className={[
              'w-full resize-none rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20',
              templateOnly ? 'cursor-not-allowed bg-[#F9FAFB] text-text-secondary' : '',
            ].join(' ')}
          />
        </div>
        <div>
          <InputLabel>
            <span className="flex items-center gap-1.5">
              <Image size={11} />
              Image URL (optional)
            </span>
          </InputLabel>
          <input
            type="url"
            value={content.imageUrl}
            onChange={(e) => onContentChange({ ...content, imageUrl: e.target.value })}
            placeholder="https://example.com/banner.jpg"
            disabled={templateOnly}
            className={[
              'w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20',
              templateOnly ? 'cursor-not-allowed bg-[#F9FAFB] text-text-secondary' : '',
            ].join(' ')}
          />
        </div>
        <div>
          <InputLabel>
            <span className="flex items-center gap-1.5">
              <MousePointer size={11} />
              CTA Button Text
            </span>
          </InputLabel>
          <input
            type="text"
            value={content.ctaText}
            onChange={(e) => onContentChange({ ...content, ctaText: e.target.value })}
            placeholder="e.g., View My Offer"
            disabled={templateOnly}
            className={[
              'w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20',
              templateOnly ? 'cursor-not-allowed bg-[#F9FAFB] text-text-secondary' : '',
            ].join(' ')}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <InputLabel>Rich Message Preview</InputLabel>
        <div className="flex justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <div className="w-52 overflow-hidden rounded-2xl border-2 border-[#E5E7EB] bg-white shadow-sm">
            <div className="flex items-center gap-2 bg-[#25D366] px-3 py-2">
              <div className="h-5 w-5 rounded-full bg-white/30" />
              <span className="text-xs font-semibold text-white">Paytm</span>
            </div>
            <div className="p-2.5">
              {content.imageUrl ? (
                <div className="mb-2 h-24 overflow-hidden rounded-lg bg-[#E5E7EB]">
                  <img
                    src={content.imageUrl}
                    alt="media"
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              ) : (
                <div className="mb-2 flex h-14 items-center justify-center rounded-lg bg-[#F3F4F6]">
                  <Image size={18} className="text-[#D1D5DB]" />
                </div>
              )}
              <p className="text-[11px] leading-relaxed text-[#1A1A1A]">
                {content.body || <span className="italic text-[#9CA3AF]">Your message will appear here...</span>}
              </p>
              {content.ctaText && (
                <button className="mt-2.5 w-full rounded-md bg-[#25D366] py-1.5 text-[10px] font-semibold text-white">
                  {content.ctaText}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

function RCSPanel({
  content,
  onContentChange,
  onSuggestCopy,
  templateOnly = false,
}: {
  content: RCSContent;
  onContentChange: (c: RCSContent) => void;
  onSuggestCopy: () => void;
  templateOnly?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-5">
      <div className="flex flex-col gap-4">
        <TemplatePicker channel="rcs" onApplyBody={(body) => onContentChange({ ...content, body })} />
        <div>
          <div className="flex items-center justify-between mb-1">
            <InputLabel>Message Text</InputLabel>
            {!templateOnly && <SuggestButton onClick={onSuggestCopy} />}
          </div>
          <textarea
            value={content.body}
            onChange={(e) => onContentChange({ ...content, body: e.target.value })}
            rows={4}
            placeholder="Select a template to populate message text…"
            readOnly={templateOnly}
            className={[
              'w-full resize-none rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20',
              templateOnly ? 'cursor-not-allowed bg-[#F9FAFB] text-text-secondary' : '',
            ].join(' ')}
          />
        </div>
        <div>
          <InputLabel>
            <span className="flex items-center gap-1.5">
              <Image size={11} />
              Image URL (optional)
            </span>
          </InputLabel>
          <input
            type="url"
            value={content.imageUrl}
            onChange={(e) => onContentChange({ ...content, imageUrl: e.target.value })}
            placeholder="https://example.com/card-image.jpg"
            disabled={templateOnly}
            className={[
              'w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20',
              templateOnly ? 'cursor-not-allowed bg-[#F9FAFB] text-text-secondary' : '',
            ].join(' ')}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <InputLabel>Button 1</InputLabel>
            <input
              type="text"
              value={content.button1}
              onChange={(e) => onContentChange({ ...content, button1: e.target.value })}
              placeholder="Primary CTA"
              disabled={templateOnly}
              className={[
                'w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20',
                templateOnly ? 'cursor-not-allowed bg-[#F9FAFB] text-text-secondary' : '',
              ].join(' ')}
            />
          </div>
          <div>
            <InputLabel>Button 2</InputLabel>
            <input
              type="text"
              value={content.button2}
              onChange={(e) => onContentChange({ ...content, button2: e.target.value })}
              placeholder="Secondary CTA"
              disabled={templateOnly}
              className={[
                'w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20',
                templateOnly ? 'cursor-not-allowed bg-[#F9FAFB] text-text-secondary' : '',
              ].join(' ')}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <InputLabel>Rich Card Preview</InputLabel>
        <div className="flex justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <div className="w-52 overflow-hidden rounded-2xl border-2 border-[#E5E7EB] bg-white shadow-sm">
            <div className="flex items-center gap-2 bg-[#00BAF2] px-3 py-2">
              <div className="h-5 w-5 rounded-full bg-white/30" />
              <span className="text-xs font-semibold text-white">Paytm</span>
            </div>
            <div className="p-2.5">
              {content.imageUrl ? (
                <div className="mb-2 h-24 overflow-hidden rounded-lg bg-[#E5E7EB]">
                  <img
                    src={content.imageUrl}
                    alt="media"
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              ) : (
                <div className="mb-2 flex h-14 items-center justify-center rounded-lg bg-[#F3F4F6]">
                  <Image size={18} className="text-[#D1D5DB]" />
                </div>
              )}
              <p className="text-[11px] leading-relaxed text-[#1A1A1A]">
                {content.body || <span className="italic text-[#9CA3AF]">Your message will appear here...</span>}
              </p>
              {(content.button1 || content.button2) && (
                <div className="mt-2.5 flex gap-1.5">
                  {content.button1 && (
                    <button className="flex-1 rounded-md bg-[#00BAF2] py-1 text-[9px] font-semibold text-white">
                      {content.button1}
                    </button>
                  )}
                  {content.button2 && (
                    <button className="flex-1 rounded-md border border-[#00BAF2] py-1 text-[9px] font-semibold text-[#00BAF2]">
                      {content.button2}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldExecPanel({
  content,
  onContentChange,
  onSuggestCopy,
}: {
  content: FieldExecContent;
  onContentChange: (c: FieldExecContent) => void;
  onSuggestCopy: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <InputLabel>
            <span className="flex items-center gap-1.5">
              <ClipboardList size={11} />
              Task Type
            </span>
          </InputLabel>
          <select
            value={content.taskType}
            onChange={(e) => onContentChange({ ...content, taskType: e.target.value })}
            className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
          >
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <InputLabel>SLA (hours)</InputLabel>
          <input
            type="number"
            min={1}
            max={720}
            value={content.slaHours}
            onChange={(e) => onContentChange({ ...content, slaHours: Number(e.target.value) })}
            className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <InputLabel>Task Description / Instructions</InputLabel>
          <SuggestButton onClick={onSuggestCopy} />
        </div>
        <textarea
          value={content.description}
          onChange={(e) => onContentChange({ ...content, description: e.target.value })}
          rows={4}
          placeholder={'Describe what the field executive should do.\nUse {{user_name}}, {{user_phone}}, {{user_address}} as template variables.'}
          className="w-full resize-none rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
        />
      </div>
      <div>
        <InputLabel>Priority</InputLabel>
        <div className="flex gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onContentChange({ ...content, priority: p.value })}
              className={[
                'rounded-md border-2 px-3.5 py-1.5 text-xs font-semibold transition-all',
                content.priority === p.value
                  ? p.selectedClass
                  : 'border-[#E5E7EB] text-text-secondary hover:border-[#D1D5DB]',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PushNotificationPanel({
  content,
  onContentChange,
  onSuggestCopy,
}: {
  content: PushNotificationContent;
  onContentChange: (c: PushNotificationContent) => void;
  onSuggestCopy: () => void;
}) {
  const titleCount = content.title.length;
  const bodyCount = content.body.length;
  const titleOver = titleCount > 50;
  const bodyOver = bodyCount > 180;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <InputLabel>
            <span className="flex items-center gap-1.5">
              <Type size={11} />
              Title
            </span>
          </InputLabel>
          <SuggestButton onClick={onSuggestCopy} />
        </div>
        <input
          type="text"
          value={content.title}
          onChange={(e) => onContentChange({ ...content, title: e.target.value })}
          maxLength={80}
          placeholder="e.g., 🎁 Your cashback is waiting!"
          className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
        />
        <p className={`mt-1 text-xs ${titleOver ? 'font-medium text-error' : 'text-text-secondary'}`}>
          {titleCount} / 50 characters{titleOver ? ' — title may be truncated on some devices' : ''}
        </p>
        {titleOver && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/8 px-3 py-2.5 mt-1">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-xs text-text-secondary">
              Push notification titles are typically limited to 50 chars on Android and iOS lock screens. Consider trimming for maximum visibility.
            </p>
          </div>
        )}
      </div>
      <div>
        <InputLabel>
          <span className="flex items-center gap-1.5">
            <AlignLeft size={11} />
            Body Text
          </span>
        </InputLabel>
        <textarea
          value={content.body}
          onChange={(e) => onContentChange({ ...content, body: e.target.value })}
          rows={3}
          maxLength={250}
          placeholder="Enter the notification body message..."
          className="w-full resize-none rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
        />
        <p className={`mt-1 text-xs ${bodyOver ? 'font-medium text-error' : 'text-text-secondary'}`}>
          {bodyCount} / 180 characters{bodyOver ? ' — body may be truncated on lock screen' : ''}
        </p>
      </div>
      <div>
        <InputLabel>
          <span className="flex items-center gap-1.5">
            <Link size={11} />
            Deep Link URL
          </span>
        </InputLabel>
        <input
          type="text"
          value={content.deepLinkUrl}
          onChange={(e) => onContentChange({ ...content, deepLinkUrl: e.target.value })}
          placeholder="e.g., paytm://offers/cashback or https://app.example.com/offer"
          className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
        />
      </div>
      <div>
        <InputLabel>
          <span className="flex items-center gap-1.5">
            <Image size={11} />
            Image URL (optional)
          </span>
        </InputLabel>
        <input
          type="url"
          value={content.imageUrl}
          onChange={(e) => onContentChange({ ...content, imageUrl: e.target.value })}
          placeholder="https://example.com/notification-image.jpg"
          className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
        />
        <p className="mt-1 text-xs text-text-secondary">
          Big image notifications are supported on Android (FCM). iOS shows a thumbnail.
        </p>
      </div>
    </div>
  );
}

function InAppBannerPanel({
  content,
  onContentChange,
  onSuggestCopy,
}: {
  content: InAppBannerContent;
  onContentChange: (c: InAppBannerContent) => void;
  onSuggestCopy: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-5">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <InputLabel>Headline</InputLabel>
            <SuggestButton onClick={onSuggestCopy} />
          </div>
          <input
            type="text"
            value={content.headline}
            onChange={(e) => onContentChange({ ...content, headline: e.target.value })}
            placeholder="e.g., Pre-approved Loan — ₹5L at 10.5% p.a."
            className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
          />
        </div>
        <div>
          <InputLabel>Body Text</InputLabel>
          <textarea
            value={content.body}
            onChange={(e) => onContentChange({ ...content, body: e.target.value })}
            rows={3}
            placeholder="Brief supporting message for the banner..."
            className="w-full resize-none rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
          />
        </div>
        <div>
          <InputLabel>
            <span className="flex items-center gap-1.5">
              <MousePointer size={11} />
              CTA Button Text
            </span>
          </InputLabel>
          <input
            type="text"
            value={content.ctaText}
            onChange={(e) => onContentChange({ ...content, ctaText: e.target.value })}
            placeholder="e.g., Check My Offer"
            className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
          />
        </div>
        <div>
          <InputLabel>Background Color</InputLabel>
          <div className="flex flex-wrap gap-2 mb-2">
            {BANNER_PRESET_COLORS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                title={preset.label}
                onClick={() => onContentChange({ ...content, backgroundColor: preset.value })}
                className={[
                  'h-7 w-7 rounded-full border-2 transition-all',
                  content.backgroundColor === preset.value
                    ? 'border-text-primary scale-110'
                    : 'border-transparent hover:scale-105',
                ].join(' ')}
                style={{ backgroundColor: preset.value }}
              />
            ))}
          </div>
          <input
            type="text"
            value={content.backgroundColor}
            onChange={(e) => onContentChange({ ...content, backgroundColor: e.target.value })}
            placeholder="#0EA5E9"
            className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-mono text-text-primary placeholder-text-secondary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <InputLabel>Banner Position</InputLabel>
            <div className="flex flex-col gap-1.5 mt-1">
              {BANNER_POSITIONS.map((pos) => (
                <label key={pos.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="banner-position"
                    value={pos.value}
                    checked={content.position === pos.value}
                    onChange={() => onContentChange({ ...content, position: pos.value })}
                    className="accent-cyan"
                  />
                  <span className="text-sm text-text-primary">{pos.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <InputLabel>Expiry</InputLabel>
            <select
              value={content.expiryHours}
              onChange={(e) => onContentChange({ ...content, expiryHours: Number(e.target.value) })}
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
            >
              {BANNER_EXPIRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {/* Preview */}
      <div className="flex flex-col gap-2">
        <InputLabel>Banner Preview</InputLabel>
        <div className="relative flex h-80 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 overflow-hidden">
          <div className="w-48 h-72 rounded-2xl border-2 border-[#E5E7EB] bg-white shadow-sm overflow-hidden relative flex flex-col">
            <div className="flex items-center gap-1.5 bg-[#F3F4F6] px-3 py-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
              <div className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
              <div className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            </div>
            <div className="flex-1 bg-[#FAFAFA] flex items-center justify-center">
              <span className="text-[9px] text-[#D1D5DB]">App Content</span>
            </div>
            {content.position === 'top' && (
              <div className="absolute top-8 left-0 right-0 p-2.5" style={{ backgroundColor: content.backgroundColor || '#0EA5E9' }}>
                {content.headline && <p className="text-[9px] font-bold text-white leading-tight">{content.headline}</p>}
                {content.body && <p className="text-[8px] text-white/90 mt-0.5 leading-tight">{content.body}</p>}
                {content.ctaText && (
                  <button className="mt-1.5 rounded bg-white px-2 py-0.5 text-[8px] font-semibold" style={{ color: content.backgroundColor || '#0EA5E9' }}>
                    {content.ctaText}
                  </button>
                )}
              </div>
            )}
            {content.position === 'bottom' && (
              <div className="absolute bottom-0 left-0 right-0 p-2.5" style={{ backgroundColor: content.backgroundColor || '#0EA5E9' }}>
                {content.headline && <p className="text-[9px] font-bold text-white leading-tight">{content.headline}</p>}
                {content.body && <p className="text-[8px] text-white/90 mt-0.5 leading-tight">{content.body}</p>}
                {content.ctaText && (
                  <button className="mt-1.5 rounded bg-white px-2 py-0.5 text-[8px] font-semibold" style={{ color: content.backgroundColor || '#0EA5E9' }}>
                    {content.ctaText}
                  </button>
                )}
              </div>
            )}
            {content.position === 'modal' && (
              <div className="absolute inset-3 rounded-lg p-3 flex flex-col items-center justify-center shadow-lg" style={{ backgroundColor: content.backgroundColor || '#0EA5E9' }}>
                {content.headline && <p className="text-[9px] font-bold text-white text-center leading-tight">{content.headline}</p>}
                {content.body && <p className="text-[8px] text-white/90 mt-1 text-center leading-tight">{content.body}</p>}
                {content.ctaText && (
                  <button className="mt-2 rounded bg-white px-3 py-0.5 text-[8px] font-semibold" style={{ color: content.backgroundColor || '#0EA5E9' }}>
                    {content.ctaText}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-[10px] text-text-secondary text-center">
          Banner expires after {content.expiryHours}h · Position: {content.position}
        </p>
      </div>
    </div>
  );
}

// ─── Renders the right panel for a channel ────────────────────────────────────

function renderChannelEditor(
  channel: ChannelType,
  content: AnyChannelContent,
  onChange: (c: AnyChannelContent) => void,
  onSuggestCopy: () => void,
  currentVoiceConfig: VoiceConfig,
  mode: 'full' | 'template_only' = 'full',
): ReactNode {
  switch (channel) {
    case 'sms':
      if (mode === 'template_only') {
        return <TemplateOnlyVariantPanel channel="sms" content={content} onApplyBody={(body) => onChange({ body } satisfies SMSContent)} />;
      }
      return (
        <SMSPanel
          content={content as SMSContent}
          onContentChange={(c) => onChange(c)}
          onSuggestCopy={onSuggestCopy}
        />
      );
    case 'whatsapp':
      if (mode === 'template_only') {
        return (
          <TemplateOnlyVariantPanel
            channel="whatsapp"
            content={content}
            onApplyBody={(body) => onChange({ ...(content as WhatsAppContent), body })}
          />
        );
      }
      return (
        <WhatsAppPanel
          content={content as WhatsAppContent}
          onContentChange={(c) => onChange(c)}
          onSuggestCopy={onSuggestCopy}
        />
      );
    case 'rcs':
      if (mode === 'template_only') {
        return (
          <TemplateOnlyVariantPanel
            channel="rcs"
            content={content}
            onApplyBody={(body) => onChange({ ...(content as RCSContent), body })}
          />
        );
      }
      return (
        <RCSPanel
          content={content as RCSContent}
          onContentChange={(c) => onChange(c)}
          onSuggestCopy={onSuggestCopy}
        />
      );
    case 'ai_voice':
      return (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <SuggestButton onClick={onSuggestCopy} />
          </div>
          <VoiceCallConfig
            config={content as VoiceConfig}
            onUpdate={(partial) => onChange({ ...currentVoiceConfig, ...partial })}
          />
        </div>
      );
    case 'field_executive':
      return <FieldExecPanel content={content as FieldExecContent} onContentChange={(c) => onChange(c)} onSuggestCopy={onSuggestCopy} />;
    case 'push_notification':
      return <PushNotificationPanel content={content as PushNotificationContent} onContentChange={(c) => onChange(c)} onSuggestCopy={onSuggestCopy} />;
    case 'in_app_banner':
      return <InAppBannerPanel content={content as InAppBannerContent} onContentChange={(c) => onChange(c)} onSuggestCopy={onSuggestCopy} />;
  }
}

// ─── VariantManager ───────────────────────────────────────────────────────────

interface VariantManagerProps {
  channel: ChannelType;
  variants: ContentVariant[];
  testing: TestingConfig;
  audienceSize: number;
  onVariantsChange: (variants: ContentVariant[]) => void;
  onTestingChange: (testing: TestingConfig) => void;
  onPrimaryContentChange: (content: AnyChannelContent) => void;
  onSuggestCopy: (variantId: string) => void;
  currentVoiceConfig: VoiceConfig;
  mode?: 'full' | 'template_only';
}

function VariantManager({
  channel,
  variants,
  testing,
  audienceSize,
  onVariantsChange,
  onTestingChange,
  onPrimaryContentChange,
  onSuggestCopy,
  currentVoiceConfig,
  mode = 'full',
}: VariantManagerProps) {
  const [expandedVariantId, setExpandedVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [isGenerating, setIsGenerating] = useState(false);

  const canAddVariant = variants.length < 5;
  const hasAiVariants = mode === 'full' && AI_VARIANTS[channel] !== undefined;

  function addVariant() {
    const nextIndex = variants.length;
    const label = `Variant ${VARIANT_LABELS[nextIndex] ?? String(nextIndex + 1)}`;
    const id = `${channel}-variant-${Date.now()}`;
    const newVariant: ContentVariant = {
      id,
      label,
      content: getDefaultContent(channel),
      source: 'user',
      isPrimary: false,
    };
    const updated = [...variants, newVariant];
    onVariantsChange(updated);
    setExpandedVariantId(id);
  }

  function removeVariant(id: string) {
    const updated = variants.filter((v) => v.id !== id);
    if (updated.length > 0 && !updated.some((v) => v.isPrimary)) {
      updated[0] = { ...updated[0], isPrimary: true };
    }
    onVariantsChange(updated);
    if (expandedVariantId === id) {
      setExpandedVariantId(updated[0]?.id ?? null);
    }
  }

  function updateVariantContent(id: string, content: AnyChannelContent) {
    const updated = variants.map((v) => (v.id === id ? { ...v, content } : v));
    onVariantsChange(updated);
    const primary = updated.find((v) => v.isPrimary);
    if (primary) onPrimaryContentChange(primary.content);
  }

  function generateAiVariants() {
    const aiCopies = AI_VARIANTS[channel];
    if (!aiCopies) return;
    setIsGenerating(true);
    setTimeout(() => {
      const newVariants: ContentVariant[] = aiCopies.map((copy, i) => ({
        id: `${channel}-ai-variant-${i}-${Date.now()}`,
        label: `Variant ${VARIANT_LABELS[i] ?? String(i + 1)}`,
        content: copy,
        source: 'ai_generated',
        isPrimary: i === 0,
      }));
      onVariantsChange(newVariants);
      setExpandedVariantId(newVariants[0]?.id ?? null);
      if (newVariants[0]) onPrimaryContentChange(newVariants[0].content);
      setIsGenerating(false);
    }, 900);
  }

  const otherVariantCount = variants.length - 1;
  const primaryPct = testing.enabled && otherVariantCount > 0 ? 100 - testing.randomnessFactor : 100;
  const otherPct = testing.enabled && otherVariantCount > 0 ? testing.randomnessFactor / otherVariantCount : 0;

  function fmtUsers(pct: number) {
    return Math.round((audienceSize * pct) / 100).toLocaleString('en-IN');
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Variant list */}
      <div className="rounded-xl border border-[#E5E7EB] overflow-hidden">
        {variants.map((variant, idx) => {
          const isExpanded = expandedVariantId === variant.id;
          const isLast = idx === variants.length - 1;

          return (
            <div key={variant.id} className={isLast ? '' : 'border-b border-[#E5E7EB]'}>
              <div className="flex items-center gap-2 px-4 py-3 bg-[#F9FAFB]">
                <button
                  type="button"
                  onClick={() => setExpandedVariantId(isExpanded ? null : variant.id)}
                  className="flex flex-1 items-center gap-2 text-left min-w-0"
                >
                  <span className="text-sm font-semibold text-text-primary shrink-0">
                    {variant.label}
                    {variant.isPrimary && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-cyan/10 px-2 py-0.5 text-[10px] font-semibold text-cyan">
                        Primary
                      </span>
                    )}
                  </span>
                  {variant.source === 'ai_generated' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/8 px-2 py-0.5 text-[10px] font-semibold text-[#8B5CF6] shrink-0">
                      <Sparkles size={9} />
                      AI Generated
                    </span>
                  )}
                  <span className="ml-1 truncate text-xs text-text-secondary">
                    {getContentPreview(variant.content)}
                  </span>
                </button>
                <button
                  type="button"
                  title={isExpanded ? 'Collapse' : 'Edit'}
                  onClick={() => setExpandedVariantId(isExpanded ? null : variant.id)}
                  className="shrink-0 rounded-md p-1.5 text-text-secondary hover:bg-[#E5E7EB] hover:text-text-primary transition-colors"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <Pencil size={14} />}
                </button>
                {!variant.isPrimary && (
                  <button
                    type="button"
                    title="Remove variant"
                    onClick={() => removeVariant(variant.id)}
                    className="shrink-0 rounded-md p-1.5 text-text-secondary hover:bg-error/10 hover:text-error transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {isExpanded && (
                <div className="border-t border-[#E5E7EB] p-4 bg-white">
                  {renderChannelEditor(
                    channel,
                    variant.content,
                    (c) => updateVariantContent(variant.id, c),
                    () => onSuggestCopy(variant.id),
                    currentVoiceConfig,
                    mode,
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add variant / Generate AI variants */}
      <div className="flex items-center gap-3">
        {canAddVariant && (
          <button
            type="button"
            onClick={addVariant}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-[#F9FAFB] transition-colors"
          >
            <Plus size={13} />
            Add Variant
          </button>
        )}
        {hasAiVariants && (
          <button
            type="button"
            onClick={generateAiVariants}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#8B5CF6]/40 bg-[#8B5CF6]/6 px-3 py-1.5 text-xs font-semibold text-[#8B5CF6] hover:bg-[#8B5CF6]/12 transition-colors disabled:opacity-60"
          >
            <Sparkles size={13} className={isGenerating ? 'animate-pulse' : ''} />
            {isGenerating ? 'Generating…' : '✦ Generate AI Variants'}
          </button>
        )}
      </div>

      {/* A/B testing config — only when multiple variants */}
      {variants.length > 1 && (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Content Testing</p>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name={`testing-mode-${channel}`}
                checked={!testing.enabled}
                onChange={() => onTestingChange({ ...testing, enabled: false })}
                className="accent-cyan"
              />
              <span className="text-sm text-text-primary">No testing — send Variant A to all users</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name={`testing-mode-${channel}`}
                checked={testing.enabled}
                onChange={() => onTestingChange({ ...testing, enabled: true })}
                className="accent-cyan"
              />
              <span className="text-sm text-text-primary">A/B Test — split audience across variants</span>
            </label>
          </div>

          {testing.enabled && (
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-text-secondary">Randomness Factor</span>
                  <span className="text-sm font-semibold text-text-primary">{testing.randomnessFactor}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={50}
                  step={5}
                  value={testing.randomnessFactor}
                  onChange={(e) => onTestingChange({ ...testing, randomnessFactor: Number(e.target.value) })}
                  className="w-full accent-cyan"
                />
                <div className="flex justify-between text-[10px] text-text-secondary mt-1">
                  <span>10%</span>
                  <span>50%</span>
                </div>
              </div>

              <div className="rounded-lg border border-[#E5E7EB] bg-white p-3 flex flex-col gap-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary mb-1">Traffic Split</p>
                {variants.map((variant) => {
                  const pct = variant.isPrimary ? primaryPct : otherPct;
                  const userCount = fmtUsers(pct);
                  return (
                    <div key={variant.id} className="flex items-center gap-3">
                      <span className="w-28 text-xs font-medium text-text-primary shrink-0">
                        {variant.label}{variant.isPrimary ? ' (Primary)' : ''}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden">
                        <div className="h-full rounded-full bg-cyan transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-text-secondary shrink-0 w-28 text-right">
                        {pct.toFixed(1)}% ({userCount} users)
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-[#0EA5E9]/30 bg-[#0EA5E9]/6 px-3 py-2.5">
                <Info size={13} className="mt-0.5 shrink-0 text-cyan" />
                <p className="text-xs text-text-secondary">
                  After reaching <span className="font-semibold text-text-primary">20%</span> of each variant&apos;s audience, the platform will automatically identify the best-performing variant and redirect remaining traffic to it.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ChannelContentEditor export ────────────────────────────────────────

interface ChannelContentEditorProps {
  channel: ChannelType;
  audienceSize: number;
  variants: ContentVariant[];
  testing: TestingConfig;
  onVariantsChange: (variants: ContentVariant[]) => void;
  onTestingChange: (testing: TestingConfig) => void;
  onPrimaryContentChange: (content: AnyChannelContent) => void;
  mode?: 'full' | 'template_only';
}

export function ChannelContentEditor({
  channel,
  audienceSize,
  variants,
  testing,
  onVariantsChange,
  onTestingChange,
  onPrimaryContentChange,
  mode = 'full',
}: ChannelContentEditorProps) {
  function getCurrentVoiceConfig(): VoiceConfig {
    const primary = variants.find((v) => v.isPrimary);
    if (primary && 'script' in primary.content) return primary.content as VoiceConfig;
    return DEFAULT_VOICE_CONFIG;
  }

  function handleSuggestCopy(variantId: string) {
    if (mode !== 'full') return;
    const sample = SAMPLE_COPY[channel];
    if (!sample) return;
    const updated = variants.map((v) => v.id === variantId ? { ...v, content: sample } : v);
    onVariantsChange(updated);
    const primary = updated.find((v) => v.isPrimary);
    if (primary) onPrimaryContentChange(primary.content);
  }

  return (
    <VariantManager
      channel={channel}
      variants={variants}
      testing={testing}
      audienceSize={audienceSize}
      onVariantsChange={onVariantsChange}
      onTestingChange={onTestingChange}
      onPrimaryContentChange={onPrimaryContentChange}
      onSuggestCopy={handleSuggestCopy}
      currentVoiceConfig={getCurrentVoiceConfig()}
      mode={mode}
    />
  );
}
