/**
 * Mock calls — Phase 4 (D.1).
 * Spec: docs/EVAL_SPEC.md §3, docs/MOCKS_PLAN.md §6
 *
 * Strategy:
 *  - Generate ~40 historical calls (last 30 days) referencing existing scripts.
 *  - Calls are scriptId-referenced — the drill-down resolves the script + overrides.
 *  - Two seeded calls are notable:
 *      1. `call-paytm-kyc-failed` — KYC outreach where the Aadhaar OTP send_text
 *         tool TIMES OUT. This is the demoer's "promote to eval" target.
 *      2. `call-paytm-loan-flagged` — Loan recovery call already operator-flagged.
 *  - Generation is deterministic — same time → same calls, so the demo is stable.
 */

import type { Call, CallFlag, CallStatus, FailureModeMeta } from '@/types/call';
import type { TestCallScript } from '@/types/testCall';
import { testCallScripts } from './testCallScripts';
import { mockAgents } from './agents';
import { totalLatencyMs } from '@/types/testCall';

/**
 * Catalog of failure modes referenced by Call.failureMode.
 * The Performance Review page (Phase 4 D.1.5) groups failures by these.
 */
export const failureModeCatalog: FailureModeMeta[] = [
  {
    id: 'aadhaar_otp_timeout',
    label: 'Aadhaar OTP gateway timeout',
    description:
      'Send-text tool fails to deliver the Aadhaar OTP link. Usually a UIDAI service hiccup.',
    rootToolId: 'send_text',
  },
  {
    id: 'transfer_unavailable',
    label: 'Transfer queue saturated',
    description: 'transfer_call returned but the human queue had no available officer.',
    rootToolId: 'transfer_call',
  },
  {
    id: 'agent_off_script',
    label: 'Agent went off-script',
    description: 'Agent diverged from instruction steps after a customer objection.',
  },
  {
    id: 'tool_error',
    label: 'Generic tool error',
    description: 'Tool call returned an unexpected error and the agent could not recover.',
  },
];

function pickFailureMode(scriptId: string, seed: number): string {
  if (scriptId === 'kyc-aadhaar') {
    return seed % 3 === 0 ? 'agent_off_script' : 'aadhaar_otp_timeout';
  }
  if (scriptId === 'loan-recovery') {
    return seed % 4 === 0 ? 'agent_off_script' : 'transfer_unavailable';
  }
  return 'tool_error';
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function pickAgentForScript(scriptId: string): { id: string; name: string } {
  // Prefer the agent whose useCase matches the script
  const script = testCallScripts.find((s) => s.id === scriptId);
  if (!script) return { id: mockAgents[0].id, name: mockAgents[0].config.name };

  const match = mockAgents.find(
    (a) => a.config.type === 'voice' && a.config.useCase && script.useCases.includes(a.config.useCase),
  );
  return match
    ? { id: match.id, name: match.config.name }
    : { id: mockAgents[0].id, name: mockAgents[0].config.name };
}

function maskedPhone(seed: number): string {
  const last5 = String(10000 + (seed * 977) % 90000);
  return `+91 9XXX ${last5.slice(0, 2)}${last5.slice(2)}`;
}

function isoFromOffset(daysBefore: number, hourOfDay: number, minuteOfHour: number): string {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - daysBefore);
  d.setHours(hourOfDay, minuteOfHour, 0, 0);
  return d.toISOString();
}

function aggregateLatencyForScript(script: TestCallScript): { p50: number; p95: number } {
  const totals = script.turns
    .filter((t): t is Extract<typeof t, { kind: 'agent' }> => t.kind === 'agent')
    .map((t) => totalLatencyMs(t.latency))
    .sort((a, b) => a - b);
  const p50idx = Math.floor(totals.length * 0.5);
  const p95idx = Math.min(totals.length - 1, Math.floor(totals.length * 0.95));
  return { p50: totals[p50idx] ?? 0, p95: totals[p95idx] ?? 0 };
}

function totalScriptDurationMs(script: TestCallScript): number {
  return script.turns.reduce((sum, t) => {
    if (t.kind === 'user') return sum + t.durationMs;
    return sum + totalLatencyMs(t.latency) + t.speakingMs;
  }, 0);
}

/* ─── Seeded "marquee" calls ──────────────────────────────────────────── */

const KYC_AGENT = pickAgentForScript('kyc-aadhaar');
const LOAN_AGENT = pickAgentForScript('loan-recovery');
const KYC_SCRIPT = testCallScripts.find((s) => s.id === 'kyc-aadhaar')!;
const LOAN_SCRIPT = testCallScripts.find((s) => s.id === 'loan-recovery')!;

const SEEDED_FAILED_CALL: Call = (() => {
  const startedAt = isoFromOffset(0, 14, 33);
  const dur = totalScriptDurationMs(KYC_SCRIPT) - 1500; // ended a bit early after tool failure
  const lat = aggregateLatencyForScript(KYC_SCRIPT);
  return {
    id: 'call-paytm-kyc-failed',
    agentId: KYC_AGENT.id,
    agentName: KYC_AGENT.name,
    campaignId: 'camp-002',
    campaignName: 'KYC Completion Drive',
    scriptId: 'kyc-aadhaar',
    contactPhoneMasked: '+91 9XXX 12345',
    startedAt,
    endedAt: new Date(new Date(startedAt).getTime() + dur).toISOString(),
    durationMs: dur,
    status: 'failed',
    outcome: 'not_converted',
    latencyP50Ms: lat.p50,
    latencyP95Ms: 1240, // tool timeout pushes p95 way up
    flags: [],
    failureMode: 'aadhaar_otp_timeout',
    scriptOverrides: {
      toolCalls: {
        'tc-001': {
          status: 'failure',
          errorMessage: 'Aadhaar OTP gateway timeout (UIDAI service unreachable)',
          output: undefined,
          latencyMs: 1100,
        },
      },
    },
  };
})();

const SEEDED_FLAGGED_CALL: Call = (() => {
  const startedAt = isoFromOffset(0, 11, 12);
  const dur = totalScriptDurationMs(LOAN_SCRIPT);
  const lat = aggregateLatencyForScript(LOAN_SCRIPT);
  const flag: CallFlag = {
    id: 'flag-001',
    reason: 'Customer expressed frustration; review scripting',
    severity: 'medium',
    addedToFailureAnalysis: true,
    createdBy: 'aniket@example.com',
    createdAt: new Date(new Date(startedAt).getTime() + dur + 60_000).toISOString(),
  };
  return {
    id: 'call-paytm-loan-flagged',
    agentId: LOAN_AGENT.id,
    agentName: LOAN_AGENT.name,
    scriptId: 'loan-recovery',
    contactPhoneMasked: '+91 9XXX 88421',
    startedAt,
    endedAt: new Date(new Date(startedAt).getTime() + dur).toISOString(),
    durationMs: dur,
    status: 'completed',
    outcome: 'not_converted',
    latencyP50Ms: lat.p50,
    latencyP95Ms: lat.p95,
    flags: [flag],
  };
})();

/* ─── Generate ~40 historical calls ───────────────────────────────────── */

interface GenSpec {
  scriptId: string;
  count: number;
  failureRate: number;       // fraction
  abandonRate: number;
  flagRate: number;
}

const GEN_SPECS: GenSpec[] = [
  { scriptId: 'kyc-aadhaar', count: 18, failureRate: 0.12, abandonRate: 0.08, flagRate: 0.03 },
  { scriptId: 'loan-recovery', count: 14, failureRate: 0.08, abandonRate: 0.12, flagRate: 0.04 },
  { scriptId: 'generic', count: 8, failureRate: 0.05, abandonRate: 0.05, flagRate: 0.02 },
];

function makeStatus(seed: number, spec: GenSpec): CallStatus {
  const r = (seed * 0.7301) % 1;
  if (r < spec.failureRate) return 'failed';
  if (r < spec.failureRate + spec.abandonRate) return 'abandoned';
  return 'completed';
}

function generateCalls(): Call[] {
  const out: Call[] = [];
  let seed = 100;

  for (const spec of GEN_SPECS) {
    const script = testCallScripts.find((s) => s.id === spec.scriptId)!;
    const agent = pickAgentForScript(spec.scriptId);
    const baseLat = aggregateLatencyForScript(script);
    const baseDur = totalScriptDurationMs(script);

    for (let i = 0; i < spec.count; i++) {
      seed += 1;
      const daysBefore = Math.floor((seed * 0.317) * 30) % 30;
      const hour = 9 + (seed % 9);
      const minute = (seed * 13) % 60;
      const startedAt = isoFromOffset(daysBefore, hour, minute);
      const status = makeStatus(seed, spec);
      const durJitter = 0.8 + ((seed * 0.123) % 1) * 0.4; // 0.8x..1.2x
      const dur = Math.round(baseDur * durJitter);
      const endedAt = new Date(new Date(startedAt).getTime() + dur).toISOString();
      const flagged = ((seed * 0.527) % 1) < spec.flagRate;
      const flags: CallFlag[] = flagged
        ? [{
            id: `flag-${seed}`,
            reason: status === 'failed' ? 'Tool failure mid-call' : 'Off-script response',
            severity: status === 'failed' ? 'high' : 'low',
            addedToFailureAnalysis: status === 'failed',
            createdBy: 'aniket@example.com',
            createdAt: endedAt,
          }]
        : [];

      out.push({
        id: `call-${spec.scriptId.split('-')[0]}-${String(seed).padStart(4, '0')}`,
        agentId: agent.id,
        agentName: agent.name,
        scriptId: spec.scriptId,
        contactPhoneMasked: maskedPhone(seed),
        startedAt,
        endedAt,
        durationMs: dur,
        status,
        outcome: status === 'completed' && (seed % 4 === 0) ? 'converted' : 'not_converted',
        latencyP50Ms: Math.round(baseLat.p50 * (0.9 + (seed % 10) / 50)),
        latencyP95Ms: Math.round(baseLat.p95 * (0.95 + (seed % 7) / 30)),
        flags,
        failureMode: status === 'failed' ? pickFailureMode(spec.scriptId, seed) : undefined,
      });
    }
  }
  return out;
}

const generatedCalls = generateCalls();

/** Aggregate of seeded + generated, sorted by startedAt desc (newest first). */
export const mockCalls: Call[] = [
  SEEDED_FAILED_CALL,
  SEEDED_FLAGGED_CALL,
  ...generatedCalls,
].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
