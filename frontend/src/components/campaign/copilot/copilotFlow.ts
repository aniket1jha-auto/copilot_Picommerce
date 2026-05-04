import type { Segment } from '@/types';
import {
  CHANNEL_NAMES,
  findSegment,
  recommendChannels,
  channelReasoning,
  recommendSegment,
  suggestName,
  answerConcept,
  isAffirmative,
  isNegative,
  parseJourneyDescription,
  extractNameOverride,
} from './copilotEngine';
import {
  type CopilotTemplate,
  recommendTemplates,
  templateById,
  findTemplateByPhrase,
} from './templateCatalog';
import {
  type SynthStep,
  describeStep,
  describeWait,
  isStepMissingTemplate,
  setStepTemplate,
} from './journeySynth';

/**
 * Campaign Copilot — single-state, greedy extractor model.
 *
 *  - One BuildingState carries everything we've learned so far.
 *  - Every user message goes through `extractAll`, which pulls as much as
 *    possible (channels in order, time gaps, fallbacks, audience hints,
 *    name overrides, template choices, schedule keywords) and accumulates.
 *  - After extraction, we pick the next FOCUS — usually the highest unmet
 *    need (e.g., a step missing a template) — and craft the assistant
 *    reply: short ack of what was applied + the next focused question.
 *  - When all required fields are filled, the focus becomes 'review' and
 *    the chat surfaces a "Open Journey Builder" primary action.
 */

export type Focus =
  | 'goal'
  | 'audience'
  | 'design'
  | 'template'   // asking template for a specific step
  | 'review';

export type ScheduleType = 'one-time' | 'recurring' | 'event' | 'smart_ai';

export interface BuildingState {
  focus: Focus;
  goalDescription?: string;
  name?: string;
  segmentId?: string;
  segmentName?: string;
  segmentSize?: number;
  steps: SynthStep[];
  scheduleType?: ScheduleType;
  /** Index of the step we're currently asking a template for (if any). */
  templatingIdx?: number;
  /** Templates the user explicitly accepted, by step key. Used to gate "ready". */
  acceptedTemplateKeys?: Record<string, true>;
}

export interface FlowContext {
  segments: Segment[];
}

export interface FlowResponse {
  text: string;
  newState: BuildingState;
  applied?: string[];
  suggestions?: string[];
  /** Set when the user confirms launch from the review focus. */
  finalize?: boolean;
}

let stepKeyCounter = 0;
function newStepKey() {
  return `s-${++stepKeyCounter}-${Date.now().toString(36)}`;
}

export function startBuilding(): BuildingState {
  return { focus: 'goal', steps: [] };
}

export function getOpener(): { text: string; suggestions: string[] } {
  return {
    text:
      "Hi 👋 I'm your **Campaign Copilot**. Tell me what you'd like to build — describe the goal in your own words, or jump straight in (e.g. *\"Re-engage dormant high-LTV users with WhatsApp first, then SMS after a day if they don't respond\"*). I'll wire the journey as we go.",
    suggestions: [
      'Re-engage dormant high-LTV users with WhatsApp + SMS fallback',
      'Drive KYC completion via WhatsApp this week',
      'Run festival cashback promo on WhatsApp + RCS',
    ],
  };
}

/* ─── Extraction ───────────────────────────────────────────────────────── */

interface Extraction {
  appliedSummary: string[];
  state: BuildingState;
}

function extractAll(raw: string, state: BuildingState, ctx: FlowContext): Extraction {
  const next: BuildingState = { ...state, steps: [...state.steps] };
  const applied: string[] = [];
  const msg = raw.trim();
  const lower = msg.toLowerCase();

  // 1) Name override — explicit "call it X"
  const nameOverride = extractNameOverride(msg);
  if (nameOverride) {
    next.name = nameOverride;
    applied.push(`Name → ${nameOverride}`);
  }

  // 2) Goal — if not yet set, treat substantial messages as goal text
  if (!next.goalDescription && msg.length >= 8 && !nameOverride) {
    // Don't grab lone affirmatives or list requests as goal
    const looksLikeAnswer =
      isAffirmative(msg) ||
      isNegative(msg) ||
      /^(show|list|what|which|use\b|pick\b)/i.test(msg);
    if (!looksLikeAnswer) {
      next.goalDescription = msg;
      next.name = next.name ?? suggestName(msg);
      applied.push('Captured goal');
      if (next.name) applied.push(`Suggested name → ${next.name}`);
    }
  }

  // 3) Audience extraction — recognize "use the X segment" or any phrase that
  //    contains a known segment name fragment.
  if (!next.segmentId) {
    let matched: Segment | null = null;
    const directMatch = msg.match(
      /(?:use|pick|select|set\s+audience\s+to|switch\s+to)\s+(?:the\s+)?(.+?)(?:\s+(?:segment|audience))?\s*$/i,
    );
    if (directMatch) {
      matched = findSegment(directMatch[1], ctx.segments);
    }
    if (!matched) {
      // Try fuzzy across the whole message
      for (const seg of ctx.segments) {
        if (seg.name.length < 4) continue;
        const tokens = seg.name.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
        if (tokens.length === 0) continue;
        const allHit = tokens.every((t) => lower.includes(t));
        if (allHit) {
          matched = seg;
          break;
        }
      }
    }
    if (matched) {
      next.segmentId = matched.id;
      next.segmentName = matched.name;
      next.segmentSize = matched.size;
      applied.push(`Audience → ${matched.name}`);
    }
  }

  // 4) Journey steps — parse channels in order, with waits and fallbacks.
  //    Skip when the user is answering a template question; they're talking
  //    about a template, not adding new steps. (Without this, "Use WhatsApp
  //    · KYC Reminder" would be parsed as a brand-new WhatsApp step.)
  if (state.focus !== 'template') {
    const parsed = parseJourneyDescription(msg);
    if (parsed.length > 0) {
      for (const p of parsed) {
        const newStep: SynthStep = {
          key: newStepKey(),
          channel: p.channel,
          waitBeforeHours: p.waitBeforeHours,
          fallback: p.fallback ?? null,
        };
        next.steps.push(newStep);
        const parts: string[] = [];
        if (p.waitBeforeHours) parts.push(describeWait(p.waitBeforeHours));
        parts.push(describeStep(newStep));
        applied.push(`Added step → ${parts.join(' · ')}`);
      }
    }
  }

  // 5) Template acceptance — when user is in template focus and either
  //    affirmed OR named a template explicitly.
  if (state.focus === 'template' && state.templatingIdx !== undefined) {
    const idx = state.templatingIdx;
    const target = next.steps[idx];
    if (target) {
      const explicit = findTemplateByPhrase(msg, target.channel);
      if (explicit) {
        next.steps[idx] = setStepTemplate(target, explicit);
        next.acceptedTemplateKeys = { ...(next.acceptedTemplateKeys ?? {}), [target.key]: true };
        applied.push(`Template for ${CHANNEL_NAMES[target.channel]} → ${explicit.name}`);
      } else if (isAffirmative(msg)) {
        const recs = recommendTemplates(target.channel, next.goalDescription ?? '', 1);
        if (recs.length > 0) {
          next.steps[idx] = setStepTemplate(target, recs[0]);
          next.acceptedTemplateKeys = { ...(next.acceptedTemplateKeys ?? {}), [target.key]: true };
          applied.push(`Template for ${CHANNEL_NAMES[target.channel]} → ${recs[0].name}`);
        }
      } else if (/^skip\b/i.test(msg.trim())) {
        // User skips template — pre-fill best match silently so journey is launchable.
        const recs = recommendTemplates(target.channel, next.goalDescription ?? '', 1);
        if (recs.length > 0) {
          next.steps[idx] = setStepTemplate(target, recs[0]);
          applied.push(`Skipped — defaulting to ${recs[0].name}`);
        }
      }
    }
  }

  return { state: next, appliedSummary: applied };
}

/* ─── Focus selection ──────────────────────────────────────────────────── */

function pickNextFocus(state: BuildingState): Focus {
  // Highest priority: any step missing a template that the user has not yet
  // confirmed (either by acceptance or explicit override).
  const missingIdx = state.steps.findIndex(
    (s) =>
      isStepMissingTemplate(s) ||
      !(state.acceptedTemplateKeys ?? {})[s.key],
  );
  if (missingIdx >= 0) return 'template';

  if (!state.goalDescription) return 'goal';
  if (!state.segmentId) return 'audience';
  if (state.steps.length === 0) return 'design';
  return 'review';
}

/* ─── Prompts per focus ────────────────────────────────────────────────── */

function focusPrompt(state: BuildingState, ctx: FlowContext): { text: string; suggestions: string[] } {
  const focus = state.focus;

  if (focus === 'goal') {
    return {
      text: "What's the goal of this campaign?",
      suggestions: [
        'Re-engage dormant high-LTV users with WhatsApp + SMS',
        'Drive KYC completion via WhatsApp this week',
        'Promote festival cashback on WhatsApp + RCS',
      ],
    };
  }

  if (focus === 'audience') {
    const rec = recommendSegment(state.goalDescription ?? '', ctx.segments);
    if (rec) {
      return {
        text: `Now let's pick the audience. Based on the goal, **${rec.name}** (${rec.size.toLocaleString('en-IN')} contacts) is a strong fit. Want that, or browse others?`,
        suggestions: [`Use ${rec.name}`, 'Show me my audiences'],
      };
    }
    return { text: 'Which audience should we target?', suggestions: ['Show me my audiences'] };
  }

  if (focus === 'design') {
    const rec = recommendChannels(state.goalDescription ?? '');
    return {
      text: `Now describe the journey — which channels in what order?\n\n_${channelReasoning(state.goalDescription ?? '')}_\n\nFor example: *"WhatsApp first, then SMS after 24h, AI Voice if no response"* — or accept the recommendation **${rec.map((c) => CHANNEL_NAMES[c]).join(' → ')}**.`,
      suggestions: [
        `Use ${rec.map((c) => CHANNEL_NAMES[c]).join(' + ')}`,
        'WhatsApp first, then SMS after 24h',
        'WhatsApp, then voice if no response',
      ],
    };
  }

  if (focus === 'template' && state.templatingIdx !== undefined) {
    const step = state.steps[state.templatingIdx];
    if (!step) {
      return { text: 'All templates picked.', suggestions: [] };
    }
    const recs = recommendTemplates(step.channel, state.goalDescription ?? '', 3);
    const top = recs[0];
    const lines: string[] = [];
    lines.push(`What template should the **${CHANNEL_NAMES[step.channel]}** step use?`);
    if (top) {
      lines.push('');
      lines.push(`Top match: **${top.name}**`);
      lines.push(`_${top.preview}_`);
    }
    const suggestions: string[] = [];
    if (top) suggestions.push(`Use ${top.name}`);
    for (const r of recs.slice(1)) suggestions.push(`Use ${r.name}`);
    suggestions.push('Skip — pick later in canvas');
    return { text: lines.join('\n'), suggestions };
  }

  // review
  return {
    text: reviewSummary(state) + '\n\nReady? Hit **Open Journey Builder** to validate the canvas, or tell me what to change.',
    suggestions: ['Looks good', 'Change audience', 'Change steps', 'Rename it'],
  };
}

function reviewSummary(state: BuildingState): string {
  const lines: string[] = ["Here's what I've put together:"];
  lines.push('');
  lines.push(`• **Name:** ${state.name ?? '_unset_'}`);
  lines.push(`• **Goal:** ${state.goalDescription ?? '_unset_'}`);
  lines.push(
    `• **Audience:** ${
      state.segmentName
        ? `${state.segmentName} (${(state.segmentSize ?? 0).toLocaleString('en-IN')} contacts)`
        : '_unset_'
    }`,
  );
  if (state.steps.length > 0) {
    lines.push('• **Journey:**');
    for (const s of state.steps) {
      const parts: string[] = [];
      if (s.waitBeforeHours) parts.push(`Wait ${s.waitBeforeHours}h`);
      parts.push(describeStep(s));
      if (s.templateName) parts.push(`(${s.templateName})`);
      lines.push(`   – ${parts.join(' · ')}`);
    }
  } else {
    lines.push('• **Journey:** _no steps yet_');
  }
  return lines.join('\n');
}

/* ─── Entry point ──────────────────────────────────────────────────────── */

export function processBuilding(
  raw: string,
  state: BuildingState,
  ctx: FlowContext,
): FlowResponse {
  const input = raw.trim();
  if (!input) {
    return {
      text: 'Type a reply or pick one of the suggestions below.',
      newState: state,
      suggestions: focusPrompt(state, ctx).suggestions,
    };
  }

  // Quick path for review-stage launch confirmations
  if (state.focus === 'review') {
    if (
      /^(launch|create|confirm|go|ship|do\s*it|open|review|looks?\s*good|y(es)?|launch\s+it|open\s+(?:journey\s+)?builder|open\s+canvas)\b/i.test(
        input,
      )
    ) {
      return { text: '', newState: state, finalize: true };
    }
  }

  // Side-question: concept Q&A mid-flow
  const concept = answerConcept(input);
  if (concept) {
    const fp = focusPrompt(state, ctx);
    return {
      text: `${concept}\n\n${fp.text}`,
      newState: state,
      suggestions: fp.suggestions,
    };
  }

  // Special: explicit "show audiences"
  if (/^(show|list|what|which)\s+(?:are\s+)?(?:my\s+)?(?:audiences|segments)\b/i.test(input)) {
    if (ctx.segments.length === 0) {
      return {
        text: 'No segments to show — create one under Audiences first.',
        newState: state,
        suggestions: focusPrompt(state, ctx).suggestions,
      };
    }
    const top = ctx.segments.slice(0, 6);
    const list = top.map(
      (s) => `• **${s.name}** — ${s.size.toLocaleString('en-IN')} contacts`,
    );
    return {
      text: `Available audiences:\n\n${list.join('\n')}\n\nWhich one?`,
      newState: state,
      suggestions: top.slice(0, 3).map((s) => `Use ${s.name}`),
    };
  }

  // Greedy extraction
  const ext = extractAll(input, state, ctx);
  let next = ext.state;

  // Recompute focus
  const newFocus = pickNextFocus(next);

  // If we're entering template focus, set the index pointer to the step
  // that needs attention (first one missing template or unaccepted).
  if (newFocus === 'template') {
    const idx = next.steps.findIndex(
      (s) =>
        isStepMissingTemplate(s) ||
        !(next.acceptedTemplateKeys ?? {})[s.key],
    );
    next = { ...next, templatingIdx: idx, focus: 'template' };
  } else {
    next = { ...next, focus: newFocus };
  }

  const fp = focusPrompt(next, ctx);
  const ackBlock =
    ext.appliedSummary.length > 0
      ? formatAck(ext.appliedSummary) + '\n\n'
      : '';

  return {
    text: `${ackBlock}${fp.text}`,
    newState: next,
    applied: ext.appliedSummary,
    suggestions: fp.suggestions,
  };
}

function formatAck(items: string[]): string {
  if (items.length === 1) return `Got it — ${decapFirst(items[0])}.`;
  return ['Got it:', ...items.map((s) => `• ${s}`)].join('\n');
}

function decapFirst(s: string): string {
  return s.length > 0 ? s[0].toLowerCase() + s.slice(1) : s;
}

/* ─── Public helpers exposed for the chat UI ───────────────────────────── */

/** Whether the build has the minimum to launch. */
export function isReadyToLaunch(state: BuildingState): boolean {
  if (!state.goalDescription || !state.segmentId) return false;
  if (state.steps.length === 0) return false;
  if (state.steps.some(isStepMissingTemplate)) return false;
  return true;
}

/** Apply a chosen template (programmatic — used when chip is clicked). */
export function applyTemplate(
  state: BuildingState,
  stepIdx: number,
  template: CopilotTemplate,
): BuildingState {
  if (stepIdx < 0 || stepIdx >= state.steps.length) return state;
  const steps = [...state.steps];
  const target = steps[stepIdx];
  steps[stepIdx] = setStepTemplate(target, template);
  return {
    ...state,
    steps,
    acceptedTemplateKeys: {
      ...(state.acceptedTemplateKeys ?? {}),
      [target.key]: true,
    },
  };
}

export function templateForStep(
  state: BuildingState,
  stepIdx: number,
): CopilotTemplate | null {
  if (stepIdx < 0 || stepIdx >= state.steps.length) return null;
  const id = state.steps[stepIdx].templateId;
  return id ? templateById(id) ?? null : null;
}

export const SCHEDULE_LABEL: Record<ScheduleType, string> = {
  'one-time': 'One time',
  recurring: 'Recurring',
  event: 'Event-based',
  smart_ai: 'Smart + AI',
};
