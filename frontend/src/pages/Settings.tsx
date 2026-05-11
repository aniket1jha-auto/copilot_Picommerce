import { useState } from 'react';
import {
  Database,
  CheckCircle,
  Circle,
  Mail,
  UserPlus,
  RefreshCw,
  PlugZap,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  Plus,
  TrendingUp,
  Zap,
  BarChart3,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ChannelIcon } from '@/components/common/ChannelIcon';
import { Toast } from '@/components/common/Toast';
import { Modal } from '@/components/common/Modal';
import { usePhaseData } from '@/hooks/usePhaseData';
import { formatCount, formatINR } from '@/utils/format';
import { channels } from '@/data/channels';
import type { DataSource, ChannelDefinition } from '@/types';

// ---------- helpers ----------

type TabId = 'data-sources' | 'channels' | 'billing' | 'team';
type ChannelTabId = 'configuration' | 'templates' | 'cost-usage';

function formatLastSynced(iso?: string): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

const TYPE_LABELS: Record<DataSource['type'], string> = {
  database: 'Database',
  api: 'API',
  csv: 'CSV',
  crm: 'CRM',
  warehouse: 'Warehouse',
  feature_store: 'Feature Store',
};

const TYPE_COLORS: Record<DataSource['type'], string> = {
  database: '#6366F1',
  api: '#F59E0B',
  csv: '#64748B',
  crm: '#EC4899',
  warehouse: '#0EA5E9',
  feature_store: '#8B5CF6',
};

// ---------- Team data ----------

const TEAM_MEMBERS = [
  {
    id: 'u1',
    name: 'Arjun Sharma',
    email: 'arjun.sharma@paytm.com',
    role: 'Admin' as const,
  },
  {
    id: 'u2',
    name: 'Priya Nair',
    email: 'priya.nair@paytm.com',
    role: 'Editor' as const,
  },
  {
    id: 'u3',
    name: 'Rahul Mehta',
    email: 'rahul.mehta@paytm.com',
    role: 'Editor' as const,
  },
  {
    id: 'u4',
    name: 'Sneha Iyer',
    email: 'sneha.iyer@paytm.com',
    role: 'Viewer' as const,
  },
];

const ROLE_COLORS: Record<'Admin' | 'Editor' | 'Viewer', string> = {
  Admin: 'bg-[#FEE2E2] text-[#DC2626]',
  Editor: 'bg-[#DBEAFE] text-[#2563EB]',
  Viewer: 'bg-[#F3F4F6] text-[#6B7280]',
};

// ---------- Billing data ----------

const BILLING_USAGE_DAY30 = [
  { channel: 'SMS', sent: 1_240_000, unitCost: 0.15 },
  { channel: 'WhatsApp', sent: 680_000, unitCost: 1.05 },
  { channel: 'RCS', sent: 320_000, unitCost: 0.2 },
  { channel: 'AI Voice', sent: 95_000, unitCost: 3.5 },
  { channel: 'Field Executive', sent: 4_200, unitCost: 45.0 },
];

// ---------- Channel config static data ----------

interface ChannelTemplate {
  id: string;
  name: string;
  content: string;
  meta?: string;
}

interface ChannelStaticConfig {
  senderId: string;
  apiKey: string;
  rateLimit: number;
  dndCompliance: boolean;
  connected: boolean;
}

const CHANNEL_TEMPLATES: Record<string, ChannelTemplate[]> = {
  sms: [
    {
      id: 'sms-kyc-reminder',
      name: 'KYC Reminder',
      content:
        'Hi {name}, your Paytm KYC is pending. Complete it in 2 mins to unlock higher limits & exclusive offers. Tap: {link} Reply STOP to opt out.',
      meta: '1 SMS unit · 142 chars',
    },
    {
      id: 'sms-loan-offer',
      name: 'Pre-Approved Loan Offer',
      content:
        'Congratulations {name}! You are pre-approved for a personal loan up to AED {amount} at {rate}% p.a. No paperwork. Apply now: {link} T&C apply.',
      meta: '1 SMS unit · 155 chars',
    },
    {
      id: 'sms-payment-reminder',
      name: 'Payment Reminder',
      content:
        'Dear {name}, your EMI of AED {amount} is due on {date}. Pay now via Paytm to avoid late fees: {link} Helpline: 0120-4456-456',
      meta: '1 SMS unit · 138 chars',
    },
  ],
  whatsapp: [
    {
      id: 'wa-insurance-renewal',
      name: 'Insurance Renewal Reminder',
      content:
        'Hello {name} 👋 Your *{policy_name}* policy expires on *{expiry_date}*. Renew now to stay protected.\n\n✅ Same premium\n✅ No health check\n✅ Instant renewal',
      meta: 'Rich text · CTA button: "Renew Now"',
    },
    {
      id: 'wa-festive-offer',
      name: 'Festive Cashback Offer',
      content:
        '🎉 *Diwali Offer for you, {name}!*\n\nGet *AED {cashback} cashback* on your next transaction of AED {min_amount}+. Valid till {end_date}.\n\nUse code: *{promo_code}*',
      meta: 'Rich text · CTA button: "Avail Offer"',
    },
    {
      id: 'wa-account-activation',
      name: 'Account Activation',
      content:
        'Hi {name}, your Paytm account is almost ready! 🚀\n\nComplete 2 simple steps:\n1️⃣ Verify your mobile number\n2️⃣ Complete mini-KYC\n\nUnlock AED 500 welcome bonus on activation.',
      meta: 'Rich text · CTA button: "Activate Now"',
    },
  ],
  rcs: [
    {
      id: 'rcs-rich-loan-card',
      name: 'Loan Offer Rich Card',
      content:
        '[Image: Paytm Loan Banner] Pre-approved Personal Loan — AED {amount} at {rate}% p.a. • Instant disbursal • No collateral required • 100% digital process',
      meta: 'Rich card · Buttons: "Apply Now", "Know More"',
    },
    {
      id: 'rcs-kyc-interactive',
      name: 'KYC Interactive List',
      content:
        'Complete your KYC in one step. Choose your preferred method:\n→ Aadhaar OTP (fastest)\n→ Video KYC (assisted)\n→ Branch visit (walk-in)',
      meta: 'Interactive list · 3 options',
    },
    {
      id: 'rcs-cashback-carousel',
      name: 'Cashback Carousel',
      content:
        '[Carousel] Slide 1: AED 50 cashback on first UPI payment. Slide 2: 5% back on Paytm Mall. Slide 3: Free movie tickets on weekend recharge.',
      meta: 'Carousel · 3 cards · Auto-play',
    },
  ],
  ai_voice: [
    {
      id: 'voice-kyc-verification',
      name: 'KYC Verification Call',
      content:
        'Hello, am I speaking with {name}? This is a call from Paytm regarding your pending KYC verification. Your account has a spending limit of AED 10,000 until KYC is completed. I can help you complete it right now over this call. Would you like to proceed?',
      meta: 'Language: Hindi/English · Avg duration: 90 sec',
    },
    {
      id: 'voice-collection-reminder',
      name: 'Collection Reminder',
      content:
        'Hello {name}, this is an automated reminder from Paytm. Your EMI payment of AED {amount} was due on {due_date}. To avoid any penalty charges, please make the payment today. Press 1 to pay now or press 2 to speak with our executive.',
      meta: 'DTMF: 1=Pay, 2=Transfer to agent · Avg duration: 45 sec',
    },
    {
      id: 'voice-product-pitch',
      name: 'Product Pitch — Personal Loan',
      content:
        'Hi {name}, great news! Based on your excellent Paytm usage, you have a pre-approved personal loan offer of up to AED {amount}. The interest rate is just {rate}% per annum with flexible EMIs. This offer is valid only till {expiry}. Are you interested in knowing more details?',
      meta: 'Sentiment detection enabled · Warm transfer on positive response',
    },
  ],
  field_executive: [
    {
      id: 'fe-kyc-visit',
      name: 'KYC Home Visit',
      content:
        'Task: Conduct KYC verification for user {name} ({phone}) at {address}.\n\nRequired: Aadhaar card, PAN card.\nCapture: Photo of documents + selfie with customer.\nOutcome: Mark as Verified / Documents Incomplete / Customer Unavailable.',
      meta: 'Priority: High · SLA: 48 hours · Category: KYC',
    },
    {
      id: 'fe-document-collection',
      name: 'Document Collection',
      content:
        'Task: Collect loan documents from {name} ({phone}).\n\nDocuments needed: Income proof, address proof, 3-month bank statement.\nInstructions: Verify originals, collect self-attested copies.\nNote: Do not collect originals. Mark loan application ID: {loan_id}.',
      meta: 'Priority: Medium · SLA: 72 hours · Category: Loan',
    },
    {
      id: 'fe-device-setup',
      name: 'Merchant Device Setup',
      content:
        'Task: Install and configure Paytm PoS device for merchant {merchant_name} at {address}.\n\nSteps: Unbox device → Register merchant ID → Test transaction → Train merchant.\nCapture: Photo of installed device + merchant sign-off.\nEscalation contact: {escalation_phone}',
      meta: 'Priority: High · SLA: 24 hours · Category: Merchant Onboarding',
    },
  ],
  push_notification: [
    {
      id: 'push-loan-alert',
      name: 'Loan Offer Alert',
      content:
        '💰 {name}, you have a pre-approved loan! Get up to AED {amount} instantly. No paperwork required. Tap to apply now.',
      meta: 'Push · Title + body · Deep link: /loans/apply',
    },
    {
      id: 'push-kyc-nudge',
      name: 'KYC Nudge',
      content:
        'Your Paytm KYC is pending ⚠️ Complete it in 2 minutes to unlock full features and higher limits.',
      meta: 'Push · Urgency badge · Action: Complete KYC',
    },
    {
      id: 'push-cashback-earned',
      name: 'Cashback Earned',
      content:
        '🎉 AED {amount} cashback credited! Your Paytm wallet balance is now AED {balance}. Tap to view details.',
      meta: 'Push · Transactional · Deep link: /wallet',
    },
  ],
  in_app_banner: [
    {
      id: 'inapp-welcome-offer',
      name: 'Welcome Offer Banner',
      content:
        'Welcome to Paytm, {name}! 🎁 Get AED 100 cashback on your first UPI transaction. Offer valid for 7 days. [CTA: Claim Now]',
      meta: 'Banner · Full-width · Dismissable',
    },
    {
      id: 'inapp-upgrade-prompt',
      name: 'Upgrade to Full KYC',
      content:
        'Unlock unlimited transfers! Complete your Full KYC and enjoy no transaction limits, exclusive offers, and priority support. [CTA: Upgrade Now]',
      meta: 'Banner · Sticky · Bottom sheet variant',
    },
    {
      id: 'inapp-insurance-cross-sell',
      name: 'Insurance Cross-Sell',
      content:
        'Protect what matters most. Get AED 10L health cover starting at just AED {premium}/month. Exclusively for Paytm users. [CTA: Explore Plans]',
      meta: 'Banner · Card · After payment flow',
    },
  ],
};

const DEFAULT_CHANNEL_STATIC_CONFIGS: Record<string, ChannelStaticConfig> = {
  sms: {
    senderId: 'PAYTM',
    apiKey: 'sk-sms-a1b2c3d4e5f6****',
    rateLimit: 500,
    dndCompliance: true,
    connected: true,
  },
  whatsapp: {
    senderId: '+91-9001-000-000',
    apiKey: 'sk-wa-f7e8d9c0b1a2****',
    rateLimit: 200,
    dndCompliance: true,
    connected: true,
  },
  rcs: {
    senderId: 'PAYTM-RCS',
    apiKey: 'sk-rcs-3c4d5e6f7a8b****',
    rateLimit: 100,
    dndCompliance: true,
    connected: true,
  },
  ai_voice: {
    senderId: '+91-8000-PAYTM-0',
    apiKey: 'sk-voice-9b0c1d2e3f4a****',
    rateLimit: 50,
    dndCompliance: false,
    connected: true,
  },
  field_executive: {
    senderId: 'FE-TEAM-OPS',
    apiKey: 'sk-fe-5e6f7a8b9c0d****',
    rateLimit: 10,
    dndCompliance: false,
    connected: true,
  },
  push_notification: {
    senderId: 'com.paytm.app',
    apiKey: 'sk-fcm-d1e2f3a4b5c6****',
    rateLimit: 1000,
    dndCompliance: true,
    connected: false,
  },
  in_app_banner: {
    senderId: 'INAPP-PAYTM',
    apiKey: 'sk-inapp-e4f5a6b7c8d9****',
    rateLimit: 200,
    dndCompliance: false,
    connected: false,
  },
};

const CHANNEL_USAGE_DAY30: Record<
  string,
  { sent: number; avgDaily: number }
> = {
  sms: { sent: 1_240_000, avgDaily: 41_333 },
  whatsapp: { sent: 680_000, avgDaily: 22_667 },
  rcs: { sent: 320_000, avgDaily: 10_667 },
  ai_voice: { sent: 95_000, avgDaily: 3_167 },
  field_executive: { sent: 4_200, avgDaily: 140 },
  push_notification: { sent: 0, avgDaily: 0 },
  in_app_banner: { sent: 0, avgDaily: 0 },
};

// ---------- Channel card sub-components ----------

interface ChannelConfigTabProps {
  channel: ChannelDefinition;
  onToast: (msg: string) => void;
}

function ChannelConfigTab({ channel, onToast }: ChannelConfigTabProps) {
  const defaults =
    DEFAULT_CHANNEL_STATIC_CONFIGS[channel.id] ??
    DEFAULT_CHANNEL_STATIC_CONFIGS['sms'];

  const [unitCost, setUnitCost] = useState(channel.unitCost.toFixed(2));
  const [senderId, setSenderId] = useState(defaults.senderId);
  const [rateLimit, setRateLimit] = useState(String(defaults.rateLimit));
  const [dndCompliance, setDndCompliance] = useState(defaults.dndCompliance);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSave = () => {
    onToast(`${channel.name} configuration saved`);
  };

  return (
    <div className="space-y-5 pt-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Unit Cost */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
            Unit Cost
          </label>
          <div className="flex items-center rounded-md border border-[#E5E7EB] bg-white overflow-hidden focus-within:border-cyan focus-within:ring-1 focus-within:ring-cyan/30 transition-all">
            <span className="px-3 py-2.5 text-sm font-medium text-text-secondary bg-[#F9FAFB] border-r border-[#E5E7EB]">
              AED 
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm text-text-primary bg-white outline-none"
              placeholder="0.00"
            />
            <span className="px-3 py-2.5 text-xs text-text-secondary bg-[#F9FAFB] border-l border-[#E5E7EB]">
              per message
            </span>
          </div>
        </div>

        {/* Sender ID */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
            Sender ID / From
          </label>
          <input
            type="text"
            value={senderId}
            onChange={(e) => setSenderId(e.target.value)}
            className="w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-cyan focus:ring-1 focus:ring-cyan/30 transition-all"
            placeholder="e.g. PAYTM"
          />
        </div>

        {/* API Key */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
            API Key
          </label>
          <div className="flex items-center rounded-md border border-[#E5E7EB] bg-white overflow-hidden focus-within:border-cyan focus-within:ring-1 focus-within:ring-cyan/30 transition-all">
            <input
              type={showApiKey ? 'text' : 'password'}
              defaultValue={defaults.apiKey}
              className="flex-1 px-3 py-2.5 text-sm text-text-primary bg-white outline-none font-mono"
              placeholder="sk-..."
            />
            <button
              type="button"
              onClick={() => setShowApiKey((v) => !v)}
              className="px-3 py-2.5 text-text-secondary hover:text-text-primary border-l border-[#E5E7EB] bg-[#F9FAFB] transition-colors"
            >
              {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Rate Limit */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
            Rate Limit
          </label>
          <div className="flex items-center rounded-md border border-[#E5E7EB] bg-white overflow-hidden focus-within:border-cyan focus-within:ring-1 focus-within:ring-cyan/30 transition-all">
            <input
              type="number"
              min="1"
              value={rateLimit}
              onChange={(e) => setRateLimit(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm text-text-primary bg-white outline-none"
              placeholder="100"
            />
            <span className="px-3 py-2.5 text-xs text-text-secondary bg-[#F9FAFB] border-l border-[#E5E7EB] whitespace-nowrap">
              msg / sec
            </span>
          </div>
        </div>
      </div>

      {/* DND Compliance toggle */}
      <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            DND Compliance
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Automatically filter Do-Not-Disturb opted-out numbers before
            sending
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDndCompliance((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
            dndCompliance ? 'bg-cyan' : 'bg-[#D1D5DB]'
          }`}
          role="switch"
          aria-checked={dndCompliance}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              dndCompliance ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-2">
        {defaults.connected ? (
          <span className="flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-3 py-1 text-xs font-semibold text-[#27AE60]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#27AE60]" />
            Connected
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-[#FEF2F2] px-3 py-1 text-xs font-semibold text-[#DC2626]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
            Not Connected
          </span>
        )}
        <span className="text-xs text-text-secondary">
          {defaults.connected
            ? 'API credentials verified'
            : 'Set up API key to activate this channel'}
        </span>
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-1 border-t border-[#F3F4F6]">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-md bg-[#002970] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#002970]/90"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
}

// ---------- Templates Tab ----------

interface TemplatesTabProps {
  channel: ChannelDefinition;
  onToast: (msg: string) => void;
}

function TemplatesTab({ channel, onToast }: TemplatesTabProps) {
  const initial: ChannelTemplate[] =
    CHANNEL_TEMPLATES[channel.id] ?? [];

  const [templates, setTemplates] =
    useState<ChannelTemplate[]>(initial);

  const [editingTemplate, setEditingTemplate] =
    useState<ChannelTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [isNewTemplate, setIsNewTemplate] = useState(false);

  const openEdit = (tpl: ChannelTemplate) => {
    setEditingTemplate(tpl);
    setModalName(tpl.name);
    setModalContent(tpl.content);
    setIsNewTemplate(false);
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditingTemplate(null);
    setModalName('');
    setModalContent('');
    setIsNewTemplate(true);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!modalName.trim() || !modalContent.trim()) return;
    if (isNewTemplate) {
      const newTpl: ChannelTemplate = {
        id: `${channel.id}-custom-${Date.now()}`,
        name: modalName.trim(),
        content: modalContent.trim(),
      };
      setTemplates((prev) => [...prev, newTpl]);
      onToast('Template saved');
    } else if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id
            ? { ...t, name: modalName.trim(), content: modalContent.trim() }
            : t,
        ),
      );
      onToast('Template saved');
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    onToast(`"${name}" deleted`);
  };

  return (
    <div className="pt-4 space-y-3">
      {templates.length === 0 && (
        <div className="rounded-lg border border-dashed border-[#E5E7EB] py-8 text-center">
          <p className="text-sm text-text-secondary">
            No templates yet for {channel.name}.
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Add your first template below.
          </p>
        </div>
      )}

      {templates.map((tpl) => (
        <div
          key={tpl.id}
          className="rounded-lg border border-[#E5E7EB] bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                {tpl.name}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                {tpl.content}
              </p>
              {tpl.meta && (
                <p className="mt-1.5 text-[11px] font-medium text-[#6366F1]">
                  {tpl.meta}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => openEdit(tpl)}
                className="flex items-center gap-1 rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-cyan hover:text-cyan"
              >
                <Edit3 size={11} />
                Edit
              </button>
              <button
                onClick={() => handleDelete(tpl.id, tpl.name)}
                className="flex items-center gap-1 rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-[#DC2626] hover:text-[#DC2626]"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={openNew}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#D1D5DB] py-3 text-sm font-medium text-text-secondary transition-colors hover:border-cyan hover:text-cyan"
      >
        <Plus size={15} />
        Add Template
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          isNewTemplate
            ? `New ${channel.name} Template`
            : `Edit Template — ${editingTemplate?.name ?? ''}`
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
              Template Name
            </label>
            <input
              type="text"
              value={modalName}
              onChange={(e) => setModalName(e.target.value)}
              className="w-full rounded-md border border-[#E5E7EB] px-3 py-2.5 text-sm text-text-primary outline-none focus:border-cyan focus:ring-1 focus:ring-cyan/30 transition-all"
              placeholder="e.g. KYC Reminder"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
              Content
            </label>
            <textarea
              value={modalContent}
              onChange={(e) => setModalContent(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-[#E5E7EB] px-3 py-2.5 text-sm text-text-primary outline-none focus:border-cyan focus:ring-1 focus:ring-cyan/30 transition-all resize-none leading-relaxed"
              placeholder="Write your message here. Use {variable} for dynamic fields."
            />
            <p className="mt-1.5 text-xs text-text-secondary">
              {modalContent.length} characters · Use{' '}
              <code className="rounded bg-[#F3F4F6] px-1 py-0.5 font-mono text-[11px] text-[#6366F1]">
                {'{variable}'}
              </code>{' '}
              for personalization
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#F3F4F6]">
            <button
              onClick={() => setIsModalOpen(false)}
              className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-[#D1D5DB]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!modalName.trim() || !modalContent.trim()}
              className="rounded-md bg-cyan px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Template
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------- Cost & Usage Tab ----------

interface CostUsageTabProps {
  channel: ChannelDefinition;
  isEmpty: boolean;
}

function CostUsageTab({ channel, isEmpty }: CostUsageTabProps) {
  const usage = CHANNEL_USAGE_DAY30[channel.id] ?? { sent: 0, avgDaily: 0 };
  const sent = isEmpty ? 0 : usage.sent;
  const avgDaily = isEmpty ? 0 : usage.avgDaily;
  const totalCost = sent * channel.unitCost;

  // Bar chart segments for visual interest (% of total across all channels)
  const maxForBar = 1_500_000;
  const barPct = Math.min(100, (sent / maxForBar) * 100);

  const stats = [
    {
      label: 'Messages Sent',
      value: sent === 0 ? '0' : formatCount(sent),
      icon: TrendingUp,
      color: '#00BAF2',
      bg: '#EFF9FE',
    },
    {
      label: 'Total Cost (Month)',
      value: totalCost === 0 ? 'AED 0' : formatINR(totalCost),
      icon: Zap,
      color: '#7C3AED',
      bg: '#F5F3FF',
    },
    {
      label: 'Avg Daily Volume',
      value: avgDaily === 0 ? '0' : formatCount(avgDaily),
      icon: BarChart3,
      color: '#F59E0B',
      bg: '#FFFBEB',
    },
  ];

  return (
    <div className="pt-4 space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-start gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: stat.bg }}
              >
                <Icon size={17} style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary leading-tight">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly volume bar */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-text-primary">
            Monthly Volume (April 2026)
          </p>
          <span className="text-xs text-text-secondary">
            vs. max {formatCount(maxForBar)}
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-[#F3F4F6] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${barPct}%`,
              backgroundColor: channel.color,
            }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
          <span>0</span>
          <span className="font-medium" style={{ color: channel.color }}>
            {sent === 0 ? 'No data yet' : formatCount(sent) + ' sent'}
          </span>
          <span>{formatCount(maxForBar)}</span>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <p className="text-sm font-semibold text-text-primary mb-3">
          Cost Breakdown
        </p>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Cost per unit</span>
            <span className="font-medium text-text-primary">
              AED {channel.unitCost.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Messages sent</span>
            <span className="font-medium text-text-primary">
              {sent === 0 ? '—' : formatCount(sent)}
            </span>
          </div>
          <div className="h-px bg-[#F3F4F6]" />
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-text-primary">
              Total spend
            </span>
            <span className="font-bold text-text-primary">
              {totalCost === 0 ? 'AED 0' : formatINR(totalCost)}
            </span>
          </div>
        </div>
      </div>

      {isEmpty && (
        <div className="rounded-lg border border-dashed border-[#E5E7EB] py-5 text-center">
          <p className="text-sm text-text-secondary">
            Usage data will appear after your first campaign runs.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------- Channel Card ----------

const CHANNEL_SUB_TABS: { id: ChannelTabId; label: string }[] = [
  { id: 'configuration', label: 'Configuration' },
  { id: 'templates', label: 'Templates' },
  { id: 'cost-usage', label: 'Cost & Usage' },
];

interface ChannelCardProps {
  channel: ChannelDefinition;
  onToast: (msg: string) => void;
  isEmpty: boolean;
}

function ChannelCard({ channel, onToast, isEmpty }: ChannelCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeSubTab, setActiveSubTab] =
    useState<ChannelTabId>('configuration');
  const [enabled, setEnabled] = useState(true);
  const defaults =
    DEFAULT_CHANNEL_STATIC_CONFIGS[channel.id] ??
    DEFAULT_CHANNEL_STATIC_CONFIGS['sms'];

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,41,112,0.08)] overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <ChannelIcon channel={channel.id as import('@/types').ChannelType} size={18} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">
              {channel.name}
            </p>
            <p className="text-xs text-text-secondary">
              AED {channel.unitCost.toFixed(2)} / message ·{' '}
              <span className="capitalize">{channel.type}</span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Connection status badge */}
          {defaults.connected ? (
            <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-[#27AE60]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#27AE60]" />
              Connected
            </span>
          ) : (
            <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-[#DC2626]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
              Not Connected
            </span>
          )}

          {/* Enable/Disable toggle */}
          <button
            type="button"
            onClick={() => {
              setEnabled((v) => !v);
              onToast(
                `${channel.name} ${enabled ? 'disabled' : 'enabled'}`,
              );
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
              enabled ? 'bg-cyan' : 'bg-[#D1D5DB]'
            }`}
            role="switch"
            aria-checked={enabled}
            title={enabled ? 'Disable channel' : 'Enable channel'}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className="text-xs font-medium text-text-secondary w-14">
            {enabled ? 'Enabled' : 'Disabled'}
          </span>

          {/* Expand/collapse */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center justify-center h-7 w-7 rounded-md border border-[#E5E7EB] text-text-secondary transition-colors hover:border-cyan hover:text-cyan"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-[#F3F4F6]">
          {/* Sub-tab bar */}
          <div className="flex gap-0 border-b border-[#F3F4F6] px-4 bg-[#F9FAFB]">
            {CHANNEL_SUB_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  activeSubTab === tab.id
                    ? 'border-cyan text-cyan'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-tab content */}
          <div className="px-4 pb-5">
            {activeSubTab === 'configuration' && (
              <ChannelConfigTab channel={channel} onToast={onToast} />
            )}
            {activeSubTab === 'templates' && (
              <TemplatesTab channel={channel} onToast={onToast} />
            )}
            {activeSubTab === 'cost-usage' && (
              <CostUsageTab channel={channel} isEmpty={isEmpty} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Main ChannelConfigSection ----------

function ChannelConfigSection({ onToast }: { onToast: (msg: string) => void }) {
  const { isDay0, isDay1 } = usePhaseData();
  const isEmpty = isDay0 || isDay1;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Channel Configuration
          </h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            Configure sending channels, templates, and view per-channel cost
            &amp; usage.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs font-medium text-text-secondary">
          {channels.length} channels
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {channels.map((ch) => (
          <ChannelCard
            key={ch.id}
            channel={ch}
            onToast={onToast}
            isEmpty={isEmpty}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- Sub-sections ----------

function DataSourcesSection({
  onToast,
}: {
  onToast: (msg: string) => void;
}) {
  const { dataSources } = usePhaseData();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Data Sources
          </h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            Manage your connected data sources and sync schedules.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {dataSources.map((ds) => {
          const connected = ds.status === 'connected';
          return (
            <div
              key={ds.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,41,112,0.08)]"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Status dot */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${connected ? 'bg-[#F0FDF4]' : 'bg-[#F9FAFB]'}`}
                >
                  <Database
                    size={16}
                    className={connected ? 'text-[#27AE60]' : 'text-[#9CA3AF]'}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {ds.name}
                    </p>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                      style={{
                        backgroundColor: TYPE_COLORS[ds.type],
                      }}
                    >
                      {TYPE_LABELS[ds.type]}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">
                      {connected ? (
                        <CheckCircle
                          size={12}
                          className="text-[#27AE60]"
                        />
                      ) : (
                        <Circle size={12} className="text-[#9CA3AF]" />
                      )}
                      {connected ? 'Connected' : 'Disconnected'}
                    </span>
                    {ds.lastSynced && (
                      <span className="flex items-center gap-1">
                        <RefreshCw size={11} />
                        Last synced {formatLastSynced(ds.lastSynced)}
                      </span>
                    )}
                    {ds.recordCount !== undefined && (
                      <span>{formatCount(ds.recordCount)} records</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action */}
              {ds.status === 'disconnected' ? (
                <button
                  onClick={() =>
                    onToast(`Connect ${ds.name} via Configure → Integrations`)
                  }
                  className="shrink-0 flex items-center gap-1.5 rounded-md border border-cyan px-3 py-1.5 text-xs font-medium text-cyan transition-colors hover:bg-cyan hover:text-white"
                >
                  <PlugZap size={13} />
                  Connect
                </button>
              ) : (
                <button
                  onClick={() =>
                    onToast(`Sync triggered for ${ds.name}`)
                  }
                  className="shrink-0 flex items-center gap-1.5 rounded-md border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-cyan hover:text-cyan"
                >
                  <RefreshCw size={13} />
                  Sync now
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BillingSection({ onToast }: { onToast: (msg: string) => void }) {
  const { isDay0, isDay1 } = usePhaseData();
  const isEmpty = isDay0 || isDay1;

  const totalSpend = BILLING_USAGE_DAY30.reduce(
    (sum, row) => sum + row.sent * row.unitCost,
    0,
  );

  return (
    <div>
      <h2 className="text-base font-semibold text-text-primary">
        Billing Summary
      </h2>
      <p className="mt-0.5 text-sm text-text-secondary">
        Your current plan and usage this month.
      </p>

      {/* Plan card */}
      <div className="mt-4 flex items-center justify-between rounded-lg border border-[#002970]/20 bg-[#002970] px-5 py-4">
        <div>
          <p className="text-xs font-medium text-white/60">Current Plan</p>
          <p className="mt-1 text-lg font-semibold text-white">
            Growth Plan — AED 1,00,000/mo
          </p>
          <p className="mt-0.5 text-xs text-white/60">
            Billed monthly · Renews 1 May 2026
          </p>
        </div>
        <button
          onClick={() => onToast('Upgrades are handled by your account manager — billing self-serve lands in Phase 5')}
          className="rounded-md bg-cyan px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan/90"
        >
          Upgrade Plan
        </button>
      </div>

      {/* Usage table */}
      <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,41,112,0.08)] overflow-hidden">
        <div className="border-b border-[#E5E7EB] px-4 py-3">
          <p className="text-sm font-semibold text-text-primary">
            Usage This Month (April 2026)
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">
                Channel
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary">
                Messages Sent
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary">
                Unit Cost
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary">
                Total Spend
              </th>
            </tr>
          </thead>
          <tbody>
            {BILLING_USAGE_DAY30.map((row, i) => (
              <tr
                key={row.channel}
                className={i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}
              >
                <td className="px-4 py-2.5 text-sm text-text-primary">
                  {row.channel}
                </td>
                <td className="px-4 py-2.5 text-right text-sm text-text-primary">
                  {isEmpty ? '—' : formatCount(row.sent)}
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-text-secondary">
                  AED {row.unitCost.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-right text-sm font-medium text-text-primary">
                  {isEmpty ? '—' : formatINR(row.sent * row.unitCost)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
              <td
                colSpan={3}
                className="px-4 py-2.5 text-sm font-semibold text-text-primary"
              >
                Total
              </td>
              <td className="px-4 py-2.5 text-right text-sm font-semibold text-text-primary">
                {isEmpty ? 'AED 0' : formatINR(totalSpend)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function TeamSection({ onToast }: { onToast: (msg: string) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Team Members
          </h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            Manage access and roles for your team.
          </p>
        </div>
        <button
          onClick={() => onToast('Team management lands in Phase 5 — see Configure → Team & Roles')}
          className="flex items-center gap-2 rounded-md bg-cyan px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan/90"
        >
          <UserPlus size={15} />
          Invite Member
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,41,112,0.08)] overflow-hidden">
        {TEAM_MEMBERS.map((member, i) => (
          <div
            key={member.id}
            className={`flex items-center justify-between gap-4 px-4 py-3.5 ${
              i < TEAM_MEMBERS.length - 1 ? 'border-b border-[#F3F4F6]' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#002970] text-sm font-semibold text-white">
                {member.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {member.name}
                </p>
                <p className="flex items-center gap-1 text-xs text-text-secondary truncate">
                  <Mail size={11} />
                  {member.email}
                </p>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[member.role]}`}
            >
              {member.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Main page ----------

const TABS: { id: TabId; label: string }[] = [
  { id: 'data-sources', label: 'Data Sources' },
  { id: 'channels', label: 'Channels' },
  { id: 'billing', label: 'Billing' },
  { id: 'team', label: 'Team' },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>('data-sources');
  const [toast, setToast] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your data sources, channels, billing, and team."
      />

      {/* Tab bar */}
      <div className="mt-6 flex gap-1 border-b border-[#E5E7EB]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-cyan text-cyan'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'data-sources' && (
          <DataSourcesSection onToast={setToast} />
        )}
        {activeTab === 'channels' && (
          <ChannelConfigSection onToast={setToast} />
        )}
        {activeTab === 'billing' && <BillingSection onToast={setToast} />}
        {activeTab === 'team' && <TeamSection onToast={setToast} />}
      </div>

      <Toast
        message={toast ?? ''}
        type="info"
        visible={toast !== null}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
