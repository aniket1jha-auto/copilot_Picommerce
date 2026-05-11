import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Flag,
  Sparkles,
  Share2,
  PhoneCall,
  ExternalLink,
  Bot,
  Megaphone,
} from 'lucide-react';
import { mockCalls } from '@/data/mock/calls';
import { testCallScripts } from '@/data/mock/testCallScripts';
import { useAgentStore } from '@/store/agentStore';
import { useCampaignStore } from '@/store/campaignStore';
import { useEvalStore } from '@/store/evalStore';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button,
  StatusPill,
  Waveform,
  EmptyState,
  useToast,
  cn,
} from '@/components/ui';
import { TranscriptTurn } from '@/components/agents/evaluate/test-console/TranscriptTurn';
import { LatencyTimeline } from '@/components/agents/evaluate/test-console/LatencyTimeline';
import { SentimentIntentRibbon } from '@/components/calls/SentimentIntentRibbon';
import { PromoteToEvalModal } from '@/components/calls/PromoteToEvalModal';
import type { TestCallAgentTurn, TestCallTurn, TestCallToolEvent } from '@/types/testCall';
import { totalLatencyMs } from '@/types/testCall';
import type { CallStatus } from '@/types/call';

/**
 * Call drill-down — Phase 4.4
 *
 * The central artifact in the eval/observability story per
 * docs/EVAL_SPEC.md §3. Re-uses the Phase 2.11 transcript subparts
 * (TranscriptTurn / InlineToolCall / InlineKBRetrieval / LatencyTimeline)
 * and adds the sentiment/intent ribbon, the worst-turn latency timeline,
 * and three header actions: Flag, Promote to eval, Share.
 *
 * Promote-to-eval opens the modal that writes to evalStore (see Phase 4.6).
 */

export function CallDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const evalCases = useEvalStore((s) => s.cases);
  const getAgentById = useAgentStore((s) => s.getAgentById);
  const getCampaignById = useCampaignStore((s) => s.getCampaignById);

  const call = useMemo(
    () => mockCalls.find((c) => c.id === id),
    [id],
  );

  const script = useMemo(() => {
    if (!call) return undefined;
    return testCallScripts.find((s) => s.id === call.scriptId);
  }, [call]);

  // Apply call.scriptOverrides (e.g. force a tool failure on a happy script)
  const renderedTurns = useMemo<TestCallTurn[]>(() => {
    if (!script) return [];
    if (!call?.scriptOverrides?.toolCalls) return script.turns;
    const overrides = call.scriptOverrides.toolCalls;
    return script.turns.map((t) => {
      if (t.kind !== 'agent' || !t.toolCalls) return t;
      const toolCalls = t.toolCalls.map<TestCallToolEvent>((tc) => {
        const ov = overrides[tc.id];
        if (!ov) return tc;
        return { ...tc, ...ov };
      });
      return { ...t, toolCalls };
    });
  }, [script, call]);

  const [promoteOpen, setPromoteOpen] = useState(false);
  const [, forceRefresh] = useState(0);

  if (!call || !script) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => navigate('/monitoring/calls')}
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary self-start"
        >
          <ChevronLeft size={14} />
          Call Logs
        </button>
        <EmptyState
          icon={PhoneCall}
          title="Call not found"
          body="It may have rolled out of retention or the link is wrong."
        />
      </div>
    );
  }

  const agent = getAgentById(call.agentId);
  const campaign = call.campaignId ? getCampaignById(call.campaignId) : undefined;

  // Worst-latency turn — surfaced at the top
  const agentTurns = renderedTurns.filter(
    (t): t is TestCallAgentTurn => t.kind === 'agent',
  );
  const worstTurn = agentTurns.reduce<TestCallAgentTurn | null>((acc, t) => {
    if (!acc) return t;
    return totalLatencyMs(t.latency) > totalLatencyMs(acc.latency) ? t : acc;
  }, null);

  // Track the eval case if already promoted (or just promoted in this session)
  const promotedCase = evalCases.find(
    (c) => c.sourceCallId === call.id || c.id === call.promotedToEvalCaseId,
  );

  function handleFlag() {
    toast({
      kind: 'info',
      title: 'Flagging UI lands in D.2',
      body: 'For now this would mark the call for follow-up review. The full Flag dialog (with reason / severity) ships with the Failure Analysis surface.',
    });
  }

  function handleShare() {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      toast({ kind: 'success', title: 'Share link copied', body: url });
    } else {
      toast({ kind: 'info', title: 'Share link', body: url });
    }
  }

  function handlePromoted(_evalCaseId: string) {
    // Force a re-render so the post-promote banner shows up
    forceRefresh((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate('/monitoring/calls')}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary self-start"
      >
        <ChevronLeft size={14} />
        Call Logs
      </button>

      <PageHeader
        title={
          <span className="inline-flex items-center gap-3 flex-wrap">
            <Waveform seed={call.id} bars={4} height={12} />
            {call.agentName}
            <CallStatusPill status={call.status} />
            <span className="text-[12px] font-normal text-text-tertiary font-mono">
              {call.id}
            </span>
          </span>
        }
        subtitle={`${formatStartedAt(call.startedAt)} · ${call.contactPhoneMasked}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Flag size={12} />}
              onClick={handleFlag}
            >
              Flag
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Sparkles size={12} />}
              onClick={() => setPromoteOpen(true)}
              disabled={Boolean(promotedCase)}
            >
              {promotedCase ? 'Promoted to eval' : 'Promote to eval'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<Share2 size={12} />}
              onClick={handleShare}
            >
              Share
            </Button>
          </div>
        }
      />

      {/* Cross-section chips */}
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        {agent && (
          <Link
            to={`/agents/${agent.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-2.5 h-6 text-text-primary hover:border-accent"
          >
            <Bot size={11} className="text-accent" />
            {agent.config.name}
            <span className="text-text-tertiary tabular-nums">v{agent.version}</span>
            <ExternalLink size={10} className="text-text-tertiary" />
          </Link>
        )}
        {campaign && (
          <Link
            to={`/campaigns/${campaign.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-2.5 h-6 text-text-primary hover:border-accent"
          >
            <Megaphone size={11} className="text-accent-warm" />
            {campaign.name}
            <ExternalLink size={10} className="text-text-tertiary" />
          </Link>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox
          label="Duration"
          value={call.durationMs ? formatDuration(call.durationMs) : '—'}
        />
        <StatBox label="Latency p50" value={`${call.latencyP50Ms}ms`} mono />
        <StatBox
          label="Latency p95"
          value={`${call.latencyP95Ms}ms`}
          mono
          tone={call.latencyP95Ms > 1000 ? 'error' : 'normal'}
        />
        <StatBox label="Outcome" value={call.outcome === 'unknown' ? '—' : call.outcome === 'converted' ? 'Converted' : 'Not converted'} />
      </div>

      {/* Promotion banner */}
      {promotedCase && (
        <div className="flex items-center justify-between rounded-md border border-accent/40 bg-accent-soft p-3">
          <div className="flex items-center gap-2 text-[12px] text-text-primary">
            <Sparkles size={14} className="text-accent" />
            This call is promoted to eval case{' '}
            <span className="font-mono font-medium">{promotedCase.name}</span>.
          </div>
          <span className="text-[11px] text-text-tertiary">
            Eval suite UI lands in Phase 4 — D.2
          </span>
        </div>
      )}

      {/* Sentiment + intent ribbon */}
      <SentimentIntentRibbon turns={renderedTurns} />

      {/* Latency timeline — worst turn */}
      {worstTurn && (
        <div className="rounded-md border border-border-subtle bg-surface p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
              Latency timeline · longest turn
            </span>
            <span className="text-[11px] text-text-tertiary tabular-nums">
              {totalLatencyMs(worstTurn.latency)}ms total
            </span>
          </div>
          <LatencyTimeline latency={worstTurn.latency} />
          {worstTurn.intent && (
            <p className="mt-2 text-[11px] text-text-tertiary">
              Turn intent:{' '}
              <span className="text-text-secondary capitalize">
                {worstTurn.intent.replace(/_/g, ' ')}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Transcript */}
      <div>
        <h2 className="text-[13px] font-semibold text-text-primary mb-3">Transcript</h2>
        <div className="flex flex-col gap-3">
          {renderedTurns.map((turn, i) => (
            <TranscriptTurn
              key={i}
              turn={turn}
              startedAt={offsetForTurn(renderedTurns, i)}
              agentSeed={call.agentId}
            />
          ))}
        </div>
      </div>

      <PromoteToEvalModal
        open={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        call={call}
        script={{ ...script, turns: renderedTurns }}
        onPromoted={handlePromoted}
      />
    </div>
  );
}

/* ─── Sub-components ───────────────────────────────────────────────────── */

function StatBox({
  label,
  value,
  mono,
  tone = 'normal',
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  tone?: 'normal' | 'error';
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-[18px] font-semibold tabular-nums',
          tone === 'error' ? 'text-error' : 'text-text-primary',
          mono && 'font-mono',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function CallStatusPill({ status }: { status: CallStatus }) {
  const map: Record<CallStatus, { kind: 'success' | 'error' | 'warning' | 'neutral' | 'info' | 'accent'; label: string }> = {
    in_progress: { kind: 'accent', label: 'In progress' },
    completed: { kind: 'success', label: 'Completed' },
    failed: { kind: 'error', label: 'Failed' },
    abandoned: { kind: 'warning', label: 'Abandoned' },
    no_answer: { kind: 'neutral', label: 'No answer' },
    busy: { kind: 'neutral', label: 'Busy' },
  };
  const s = map[status];
  return <StatusPill status={s.kind}>{s.label}</StatusPill>;
}

/** Turn offset (ms since call start) — sums prior turn durations. */
function offsetForTurn(turns: TestCallTurn[], index: number): number {
  let acc = 0;
  for (let i = 0; i < index; i++) {
    const t = turns[i];
    if (t.kind === 'user') acc += t.durationMs;
    else acc += totalLatencyMs(t.latency) + t.speakingMs;
  }
  return acc;
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function formatStartedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
