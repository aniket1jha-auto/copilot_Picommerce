import type { ChannelType, Segment } from '@/types';

/**
 * Reusable helpers shared by the guided copilot flow.
 *   - detectChannels:    pull channel keys out of free-text
 *   - findSegment:       fuzzy-match a segment by name
 *   - answerConcept:     scripted explanations for common copilot questions
 *   - recommendChannels: goal-aware channel suggestions
 *   - recommendSegment:  goal-aware audience suggestion
 *   - suggestName:       quick name from a goal sentence
 */

export type ChannelKey = Extract<ChannelType, 'whatsapp' | 'sms' | 'rcs' | 'ai_voice'>;

export const CHANNEL_NAMES: Record<ChannelKey, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  rcs: 'RCS',
  ai_voice: 'AI Voice Call',
};

const CHANNEL_PATTERNS: Array<[ChannelKey, RegExp]> = [
  ['whatsapp', /\b(whatsapp|wa)\b/],
  ['rcs', /\brcs\b/],
  ['sms', /\b(sms|text\s*message|text\s*msg)\b/],
  ['ai_voice', /\b(ai\s*voice|voice\s*call|voice|phone\s*call)\b/],
];

const norm = (s: string) => s.trim().toLowerCase();

export function detectChannels(msg: string): ChannelKey[] {
  const m = norm(msg);
  const found = new Set<ChannelKey>();
  for (const [key, re] of CHANNEL_PATTERNS) {
    if (re.test(m)) found.add(key);
  }
  return [...found];
}

export function findSegment(query: string, segments: Segment[]): Segment | null {
  const q = norm(query);
  if (!q) return null;
  const exact = segments.find((s) => norm(s.name) === q);
  if (exact) return exact;
  const includes = segments.find((s) => norm(s.name).includes(q));
  if (includes) return includes;
  const tokens = q.split(/\s+/).filter((t) => t.length > 2);
  if (tokens.length === 0) return null;
  return (
    segments.find((s) => {
      const name = norm(s.name);
      return tokens.every((t) => name.includes(t));
    }) || null
  );
}

export function recommendChannels(goalText: string): ChannelKey[] {
  const t = norm(goalText);
  if (/recovery|dunning|overdue|emi|past[-\s]?due/.test(t)) {
    return ['whatsapp', 'sms', 'ai_voice'];
  }
  if (/kyc|verify|onboard|sign[-\s]?up/.test(t)) {
    return ['whatsapp', 'sms'];
  }
  if (/promo|cashback|festival|discount|offer|sale/.test(t)) {
    return ['whatsapp', 'rcs', 'sms'];
  }
  if (/re[-\s]?engage|reactivat|dormant|inactive|win[-\s]?back/.test(t)) {
    return ['whatsapp', 'sms'];
  }
  return ['whatsapp', 'sms'];
}

export function channelReasoning(goalText: string): string {
  const t = norm(goalText);
  if (/recovery|dunning|overdue|emi|past[-\s]?due/.test(t)) {
    return 'Recovery flows do best with WhatsApp first (high open rate), SMS for unreachable users, and AI Voice for high-LTV cases that need a human-style nudge.';
  }
  if (/kyc|verify|onboard|sign[-\s]?up/.test(t)) {
    return 'KYC and onboarding nudges work best on WhatsApp + SMS — instant reach, low friction, good for short instructional content.';
  }
  if (/promo|cashback|festival|discount|offer|sale/.test(t)) {
    return 'Promotional sends benefit from rich media — WhatsApp first, RCS where supported, SMS as the cost-efficient fallback.';
  }
  return 'A safe default is WhatsApp (rich, high engagement) plus SMS (cheap, near-universal reach).';
}

export function recommendSegment(goalText: string, segments: Segment[]): Segment | null {
  if (segments.length === 0) return null;
  const t = norm(goalText);
  const byNameToken = (token: string) =>
    segments.find((s) => norm(s.name).includes(token));
  if (/high[-\s]?ltv|premium|big\s*spender|whale/.test(t)) {
    return byNameToken('ltv') || byNameToken('high') || byNameToken('premium') || segments[0];
  }
  if (/kyc/.test(t)) {
    return byNameToken('kyc') || segments[0];
  }
  if (/dormant|inactive|reactivat|re[-\s]?engage|win[-\s]?back/.test(t)) {
    return (
      byNameToken('dormant') ||
      byNameToken('inactive') ||
      byNameToken('reactivat') ||
      segments[0]
    );
  }
  if (/loan|credit|emi/.test(t)) {
    return byNameToken('loan') || byNameToken('credit') || segments[0];
  }
  // Fallback: largest segment
  return [...segments].sort((a, b) => b.size - a.size)[0];
}

export function suggestName(goalText: string): string {
  const cleaned = goalText.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  const lower = cleaned.toLowerCase();
  // Quick keyword-based titles
  if (/kyc|verif/.test(lower)) return 'KYC Completion Drive';
  if (/recovery|dunning|overdue|emi/.test(lower)) return 'Loan Recovery Outreach';
  if (/cashback|festival|promo|offer|sale|discount/.test(lower)) return 'Festival Promo Push';
  if (/dormant|reactivat|win[-\s]?back|re[-\s]?engage/.test(lower)) return 'High-Intent Reactivation';
  if (/onboard|sign[-\s]?up/.test(lower)) return 'Welcome & Onboarding';
  if (/cross[-\s]?sell|upsell/.test(lower)) return 'Cross-sell Campaign';
  // Title-case the first 4 meaningful words
  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 4)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  return words.length > 0 ? words.join(' ') + ' Campaign' : 'Untitled Campaign';
}

export function answerConcept(msg: string): string | null {
  const t = norm(msg);
  if (/(what|explain|how|tell.*about).*(smart\s*\+?\s*ai|smart.*ai)/.test(t)) {
    return 'Smart + AI lets you set a window (e.g. "next 7 days, 9am–9pm") and the platform auto-generates the sub-cohort breakdown, channel mix, and per-cohort send timing — with fallbacks. Use it when you want the system to optimize, not when you want a single fixed send.';
  }
  if (/(what|explain|how|tell.*about).*(event[\s-]*based|event.*trigger|trigger)/.test(t)) {
    return 'Event-based fires when a user does something — KYC step completed, payment received, sign-up — or when an external system pings a webhook. Pick the event, set match conditions (every / first / nth occurrence), an optional delay, dedupe and frequency caps. Great for lifecycle and behavioral nudges.';
  }
  if (/(recurring|one[-\s]?time|one\s*shot).*(diff|vs|or)/.test(t)) {
    return '**One time** is a single fire at a fixed date/time — best for announcements or a dated event. **Recurring** repeats on a daily / weekly / biweekly / monthly cadence — best for nudges, reminders, weekly digests.';
  }
  if (/(which|what|best).*channel/.test(t)) {
    return 'Quick rule of thumb: **WhatsApp** has the best engagement on reachable users (rich media + 80%+ read rates). **SMS** is the cheapest blanket reach with ~96% deliverability. **AI Voice** is high-touch but pricier — best for high-LTV segments and recovery flows. **RCS** if your audience skews Android and the carrier supports it. Most campaigns layer 2–3 channels with WhatsApp as primary.';
  }
  return null;
}

export function isAffirmative(msg: string): boolean {
  return /^(y|yes|yeah|yep|sure|sounds\s*good|ok|okay|approve|approved|go\s*ahead|do\s*it|launch|create|confirm|that.s\s*fine|that\s*works|keep\s*it|let.s\s*go)\b/i.test(
    msg.trim(),
  );
}

export function isNegative(msg: string): boolean {
  return /^(n|no|nope|skip|not\s*now|cancel|abort|wait|hold\s*on|change|different)\b/i.test(
    msg.trim(),
  );
}

/* ─── Journey description parsing ──────────────────────────────────────── */

export type FallbackTrigger = 'on_failure' | 'on_no_response' | null;

export interface ParsedJourneyStep {
  /** Channel for this step. */
  channel: ChannelKey;
  /** Hours to wait BEFORE this step (when user said e.g. "after 24h"). */
  waitBeforeHours?: number;
  /** Marks this step as a fallback off the previous one. */
  fallback?: FallbackTrigger;
}

const TIME_REGEX =
  /\b(\d+(?:\.\d+)?)\s*(minute|min|hour|hr|h|day|d|week|w)s?\b/i;
const NEXT_DAY_REGEX = /\b(next|following)\s+day\b/i;

function tokenToHours(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith('m') && u !== 'mo') return value / 60;
  if (u.startsWith('h')) return value;
  if (u.startsWith('d')) return value * 24;
  if (u.startsWith('w')) return value * 24 * 7;
  return value;
}

function detectFallback(chunk: string): FallbackTrigger {
  const c = norm(chunk);
  if (/(if|when).*(not\s+deliver|fail|fails|undelivered|delivery\s+fail|bounce)/.test(c)) {
    return 'on_failure';
  }
  if (
    /(if|when).*(no\s+response|don.t\s+(?:reply|respond|answer)|not\s+answer|no.?reply|no.?answer)/.test(
      c,
    ) ||
    /\bfallback\b/.test(c) ||
    /\bas\s+(?:a\s+)?fallback\b/.test(c)
  ) {
    return 'on_no_response';
  }
  return null;
}

function detectWaitHours(chunk: string): number | undefined {
  const c = norm(chunk);
  if (NEXT_DAY_REGEX.test(c)) return 24;
  const m = c.match(TIME_REGEX);
  if (!m) return undefined;
  const value = parseFloat(m[1]);
  if (isNaN(value) || value <= 0) return undefined;
  return tokenToHours(value, m[2]);
}

/**
 * Parse a free-text description into an ordered list of journey steps.
 * Examples it handles:
 *   "WhatsApp first, then SMS after 24h, AI Voice if no response"
 *   "Send a WhatsApp KYC reminder. Wait 1 day. Send an SMS."
 *   "WhatsApp, then if not delivered send SMS"
 */
export function parseJourneyDescription(raw: string): ParsedJourneyStep[] {
  const text = raw.trim();
  if (!text) return [];

  // Split into segments on common sequence words
  const SEGMENT_SPLIT =
    /(?:\.\s+|;\s+|,\s+|\bthen\b|\bnext\b|\bafter\s+that\b|\bfollowed\s+by\b|\band\s+then\b)/gi;
  const segments = text
    .split(SEGMENT_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const steps: ParsedJourneyStep[] = [];

  for (const seg of segments) {
    const channels = detectChannels(seg);
    if (channels.length === 0) continue;

    // If a segment mentions multiple channels, split it again on small connectors
    const subSegments =
      channels.length === 1
        ? [seg]
        : seg.split(/\b(?:and|or|plus)\b/gi).map((s) => s.trim());

    for (const sub of subSegments) {
      const subChannels = detectChannels(sub);
      if (subChannels.length === 0) continue;
      const channel = subChannels[0];
      const waitBeforeHours = detectWaitHours(sub);
      const fallback = detectFallback(sub);
      steps.push({
        channel,
        ...(waitBeforeHours !== undefined ? { waitBeforeHours } : {}),
        ...(fallback ? { fallback } : {}),
      });
    }
  }

  return steps;
}

/** Try to extract a campaign name override from a message. */
export function extractNameOverride(raw: string): string | null {
  const m =
    raw.match(/(?:name\s+(?:it|this|the\s+campaign)\s+|call\s+(?:it|this|the\s+campaign)\s+)['"]?([^'"]+?)['"]?\s*$/i) ||
    raw.match(/^(?:set\s+)?name\s*(?:to|=|:)\s*['"]?([^'"]+?)['"]?\s*$/i);
  if (!m) return null;
  return m[1].trim() || null;
}

