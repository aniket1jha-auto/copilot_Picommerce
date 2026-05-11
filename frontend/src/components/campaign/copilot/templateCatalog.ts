import type { ChannelKey } from './copilotEngine';

/**
 * Mock template catalog for the Campaign Copilot — UAE / Arabic-branch
 * variant.
 *
 * Templates mix English and Arabic copy, sized for typical UAE campaigns:
 *   • banking / consumer finance (credit card, personal loan, EMI)
 *   • telecom and utilities (DEWA, du, Etisalat-style bill reminders)
 *   • retail and e-commerce (Ramadan / Eid promos, cashback offers)
 *   • onboarding / win-back
 *
 * Currency is AED. Keep the placeholders ({name}, {amount}, {link}, etc.)
 * so the agent can stitch them in at send time.
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
    id: 'wa-emirates-id-reminder',
    name: 'WhatsApp · Emirates ID Verification',
    channel: 'whatsapp',
    preview:
      'Hello {name} 👋 Please verify your Emirates ID to unlock full account features. It only takes 2 minutes — tap here: {link}',
    useCases: ['kyc', 'verify', 'verification', 'onboard', 'emirates id'],
  },
  {
    id: 'wa-credit-card-emi-reminder-ar',
    name: 'WhatsApp · EMI Reminder (Arabic)',
    channel: 'whatsapp',
    preview:
      'مرحباً {name}، قسطك الشهري بقيمة AED {amount} مستحق بتاريخ {date}. الرجاء الدفع لتجنب رسوم التأخير: {link}',
    useCases: ['recovery', 'dunning', 'overdue', 'emi', 'loan', 'credit card'],
  },
  {
    id: 'wa-loan-recovery-en',
    name: 'WhatsApp · Loan Payment Reminder',
    channel: 'whatsapp',
    preview:
      'Hi {name}, your loan instalment of AED {amount} is due on {date}. Pay now to avoid late charges: {link}',
    useCases: ['recovery', 'dunning', 'overdue', 'emi', 'loan'],
  },
  {
    id: 'wa-eid-cashback',
    name: 'WhatsApp · Eid Cashback Promo',
    channel: 'whatsapp',
    preview:
      'Eid Mubarak {name}! 🌙 Get AED {cashback} cashback on your next purchase this Eid. Shop today: {link}',
    useCases: ['promo', 'cashback', 'eid', 'festival', 'offer', 'sale'],
  },
  {
    id: 'wa-ramadan-promo-ar',
    name: 'WhatsApp · Ramadan Offer (Arabic)',
    channel: 'whatsapp',
    preview:
      'رمضان كريم {name} 🌙 استمتع بخصم AED {discount} على طلباتك خلال الشهر الفضيل. تسوّق الآن: {link}',
    useCases: ['promo', 'ramadan', 'festival', 'offer', 'discount'],
  },
  {
    id: 'wa-reactivation-en',
    name: 'WhatsApp · Win-back Offer',
    channel: 'whatsapp',
    preview:
      "We miss you {name}! Here's AED {offer} on us to come back. Valid for 7 days: {link}",
    useCases: ['reactivat', 'dormant', 'inactive', 'engage', 'winback', 'win-back'],
  },
  {
    id: 'wa-welcome-ar',
    name: 'WhatsApp · Welcome Onboarding (Arabic)',
    channel: 'whatsapp',
    preview:
      'أهلاً بك {name} في باي تي إم الإمارات 🎉 ابدأ تجربتك في دقيقتين: {link}',
    useCases: ['welcome', 'onboard', 'signup', 'signed up'],
  },

  // ─── SMS ───────────────────────────────────────────────────────────────
  {
    id: 'sms-emirates-id-en',
    name: 'SMS · Emirates ID Verify',
    channel: 'sms',
    preview:
      'Dear {name}, verify your Emirates ID in 2 mins to unlock your account: {link}. Reply STOP to opt out.',
    useCases: ['kyc', 'verify', 'verification', 'onboard'],
  },
  {
    id: 'sms-emi-reminder-ar',
    name: 'SMS · EMI Reminder (Arabic)',
    channel: 'sms',
    preview:
      'عزيزي العميل، قسطك بقيمة AED {amount} مستحق بتاريخ {date}. للدفع: {link}',
    useCases: ['recovery', 'dunning', 'overdue', 'emi', 'loan'],
  },
  {
    id: 'sms-utility-bill-reminder',
    name: 'SMS · Utility Bill Reminder',
    channel: 'sms',
    preview:
      'Your monthly bill of AED {amount} is due on {date}. Pay now to avoid disconnection: {link}',
    useCases: ['recovery', 'dunning', 'overdue', 'bill', 'utility'],
  },
  {
    id: 'sms-promo-en',
    name: 'SMS · Cashback Promo',
    channel: 'sms',
    preview:
      'Pre-approved cashback of AED {x}! Apply now: {link}. T&C apply. Reply STOP to opt out.',
    useCases: ['promo', 'cashback', 'offer', 'sale'],
  },
  {
    id: 'sms-reactivation-ar',
    name: 'SMS · Win-back (Arabic)',
    channel: 'sms',
    preview: 'اشتقنا لك {name}! خصم AED {x} ينتظرك — استلمه الآن: {link}',
    useCases: ['reactivat', 'dormant', 'inactive', 'engage', 'winback'],
  },

  // ─── RCS ───────────────────────────────────────────────────────────────
  {
    id: 'rcs-emirates-id-card',
    name: 'RCS · Emirates ID Verification Card',
    channel: 'rcs',
    preview:
      'Rich card with Emirates ID verification steps + "Start now" / "Need help?" buttons',
    useCases: ['kyc', 'verify', 'onboard'],
  },
  {
    id: 'rcs-ramadan-carousel',
    name: 'RCS · Ramadan Offers Carousel',
    channel: 'rcs',
    preview: 'Multi-card carousel of Ramadan offers across grocery, fashion, and travel',
    useCases: ['promo', 'ramadan', 'eid', 'festival', 'cashback', 'offer'],
  },
  {
    id: 'rcs-loan-offer-card',
    name: 'RCS · Personal Loan Offer Card',
    channel: 'rcs',
    preview:
      'Rich card: pre-approved loan up to AED {amount} · 0% processing · 24-hour disbursal',
    useCases: ['loan', 'credit', 'promo', 'offer'],
  },

  // ─── AI Voice ──────────────────────────────────────────────────────────
  {
    id: 'voice-recovery-en',
    name: 'AI Voice · Recovery Script (English)',
    channel: 'ai_voice',
    preview:
      "Outbound call: 'Hello {name}, this is regarding your overdue payment of AED {amount}. Would you like to settle now via the SMS link or schedule a callback?'",
    useCases: ['recovery', 'dunning', 'overdue', 'emi', 'loan'],
  },
  {
    id: 'voice-recovery-ar',
    name: 'AI Voice · Recovery Script (Arabic)',
    channel: 'ai_voice',
    preview:
      "Outbound call: 'مرحباً {name}، نتواصل معك بخصوص قسطك المتأخر بقيمة AED {amount}. هل ترغب بالدفع الآن أم نحدد موعداً للمتابعة؟'",
    useCases: ['recovery', 'dunning', 'overdue', 'emi', 'loan'],
  },
  {
    id: 'voice-welcome-en',
    name: 'AI Voice · Welcome Call',
    channel: 'ai_voice',
    preview:
      "Outbound call: 'Welcome to Paytm UAE, {name}. May I help you set up your account in two minutes?'",
    useCases: ['welcome', 'onboard', 'signup'],
  },
  {
    id: 'voice-reactivation-ar',
    name: 'AI Voice · Reactivation Script (Arabic)',
    channel: 'ai_voice',
    preview:
      "Outbound call: 'مرحباً {name}، لاحظنا أنك لم تستخدم حسابك مؤخراً. لدينا عرض خاص بقيمة AED {offer} ينتظرك.'",
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
