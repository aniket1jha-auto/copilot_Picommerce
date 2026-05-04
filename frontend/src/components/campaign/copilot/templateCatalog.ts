import type { ChannelKey } from './copilotEngine';

/**
 * Mock template catalog used by the Campaign Copilot.
 * Each template has channel + use-case keywords for goal-based matching.
 */

export interface CopilotTemplate {
  id: string;
  name: string;
  channel: ChannelKey;
  preview: string;
  /** Keywords matched against the campaign goal text */
  useCases: string[];
}

export const COPILOT_TEMPLATES: CopilotTemplate[] = [
  // ─── WhatsApp ──────────────────────────────────────────────────────────
  {
    id: 'wa-kyc-reminder',
    name: 'WhatsApp · KYC Reminder',
    channel: 'whatsapp',
    preview:
      'Hello {name} 👋 Your KYC is pending. Complete it now to unlock higher limits. Tap: {link}',
    useCases: ['kyc', 'verify', 'onboard'],
  },
  {
    id: 'wa-loan-recovery',
    name: 'WhatsApp · Loan EMI Reminder',
    channel: 'whatsapp',
    preview:
      'Hi {name}, your EMI of ₹{amount} is due on {date}. Pay now to avoid late fees: {link}',
    useCases: ['recovery', 'dunning', 'loan', 'emi', 'overdue'],
  },
  {
    id: 'wa-festival-promo',
    name: 'WhatsApp · Festival Cashback',
    channel: 'whatsapp',
    preview:
      'Festival offer 🎁 Get ₹{cashback} cashback on your next transaction. Shop now: {link}',
    useCases: ['promo', 'cashback', 'festival', 'offer', 'sale'],
  },
  {
    id: 'wa-reactivation',
    name: 'WhatsApp · Win-back',
    channel: 'whatsapp',
    preview:
      "We miss you {name}! Here's ₹{offer} to come back. Valid for 7 days: {link}",
    useCases: ['reactivat', 'dormant', 'inactive', 'engage', 'winback', 'win-back'],
  },
  {
    id: 'wa-welcome',
    name: 'WhatsApp · Welcome Onboarding',
    channel: 'whatsapp',
    preview:
      'Welcome to Paytm Commerce, {name}! Get started in 2 mins: {link}',
    useCases: ['welcome', 'onboard', 'signup', 'signed up'],
  },

  // ─── SMS ───────────────────────────────────────────────────────────────
  {
    id: 'sms-kyc',
    name: 'SMS · KYC Reminder',
    channel: 'sms',
    preview: 'Dear {name}, complete KYC in 2 mins to unlock limits: {link}',
    useCases: ['kyc', 'verify', 'onboard'],
  },
  {
    id: 'sms-recovery',
    name: 'SMS · EMI Reminder',
    channel: 'sms',
    preview: 'Dear {name}, EMI of ₹{amount} due on {date}. Pay: {link}',
    useCases: ['recovery', 'dunning', 'loan', 'emi', 'overdue'],
  },
  {
    id: 'sms-promo',
    name: 'SMS · Promo Offer',
    channel: 'sms',
    preview: 'Pre-approved cashback ₹{x}! Apply now: {link} T&C apply.',
    useCases: ['promo', 'cashback', 'offer', 'sale'],
  },
  {
    id: 'sms-reactivation',
    name: 'SMS · Win-back',
    channel: 'sms',
    preview: 'Come back to Paytm — ₹{x} offer for you: {link}',
    useCases: ['reactivat', 'dormant', 'inactive', 'engage', 'winback'],
  },

  // ─── RCS ───────────────────────────────────────────────────────────────
  {
    id: 'rcs-kyc-card',
    name: 'RCS · KYC Rich Card',
    channel: 'rcs',
    preview: 'Rich card with KYC steps + "Start now" / "Help" buttons',
    useCases: ['kyc', 'verify', 'onboard'],
  },
  {
    id: 'rcs-promo-carousel',
    name: 'RCS · Promo Carousel',
    channel: 'rcs',
    preview: 'Multi-card carousel of cashback offers',
    useCases: ['promo', 'cashback', 'festival', 'offer'],
  },

  // ─── AI Voice ──────────────────────────────────────────────────────────
  {
    id: 'voice-recovery-script',
    name: 'AI Voice · Recovery Script',
    channel: 'ai_voice',
    preview:
      "Outbound call: 'Hi {name}, calling about your loan EMI of ₹{amount}. Would you like to pay now or schedule a callback?'",
    useCases: ['recovery', 'dunning', 'loan', 'emi', 'overdue'],
  },
  {
    id: 'voice-welcome-script',
    name: 'AI Voice · Welcome Call',
    channel: 'ai_voice',
    preview:
      "Outbound call: 'Welcome to Paytm Commerce, {name}. May I help you set up your account?'",
    useCases: ['welcome', 'onboard', 'signup'],
  },
  {
    id: 'voice-reactivation-script',
    name: 'AI Voice · Reactivation Script',
    channel: 'ai_voice',
    preview:
      "Outbound call: 'Hi {name}, we noticed you haven't transacted in a while. We have a personalized offer for you.'",
    useCases: ['reactivat', 'dormant', 'inactive', 'engage', 'winback'],
  },
];

const norm = (s: string) => s.trim().toLowerCase();

/** Returns templates ordered by best match for the channel + goal. */
export function recommendTemplates(
  channel: ChannelKey,
  goalText: string,
  limit = 3,
): CopilotTemplate[] {
  const t = norm(goalText);
  const channelMatches = COPILOT_TEMPLATES.filter((tpl) => tpl.channel === channel);
  const scored = channelMatches.map((tpl) => {
    const score = tpl.useCases.reduce(
      (acc, kw) => (t.includes(kw) ? acc + 1 : acc),
      0,
    );
    return { tpl, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.tpl);
}

export function templateById(id: string): CopilotTemplate | undefined {
  return COPILOT_TEMPLATES.find((t) => t.id === id);
}

/**
 * Try to match a template by name fragment. Useful when the user says
 * "use the KYC reminder template".
 */
export function findTemplateByPhrase(
  phrase: string,
  channel?: ChannelKey,
): CopilotTemplate | null {
  const q = norm(phrase);
  if (!q || q.length < 3) return null;
  const pool = channel
    ? COPILOT_TEMPLATES.filter((t) => t.channel === channel)
    : COPILOT_TEMPLATES;
  // Exact name fragment
  const direct = pool.find((t) => norm(t.name).includes(q));
  if (direct) return direct;
  // Use-case keyword
  const tokens = q.split(/\s+/);
  const byKeyword = pool.find((t) =>
    t.useCases.some((kw) => tokens.some((tok) => kw.includes(tok))),
  );
  return byKeyword ?? null;
}
