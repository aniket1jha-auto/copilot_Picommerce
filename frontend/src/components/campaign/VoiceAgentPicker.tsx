import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, BookOpen, Wrench, X, ExternalLink, ChevronRight, Plus, Lock } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { useKnowledgeBaseStore } from '@/store/knowledgeBaseStore';
import { Modal, Button, Input, StatusPill, Waveform, cn } from '@/components/ui';
import { ALL_TOOLS } from '@/data/toolConstants';
import type { Agent, AgentStatus } from '@/types/agent';

/**
 * VoiceAgentPicker — Phase 3.8 (the marquee "plug agent into campaign" moment).
 *
 * Embedded in the AI-Voice channel block of the campaign wizard.
 * Two states:
 *   - Empty:    "Connect a voice agent" affordance (large card, picker modal)
 *   - Attached: card showing the agent identity (waveform + name + version + status),
 *               attached KBs (read-only chips), tools (read-only chips), prompt-variant
 *               (default-only in v1), and a deep link to test the exact configuration.
 *
 * On change, calls back with the agent ID — the parent maps that to senderConfig.ai_voice.agentId
 * and the eventual `Campaign.aiVoiceConfig.agentId`.
 */

interface Props {
  /** Currently selected agent ID. */
  agentId: string;
  /** Called with new agent ID, or empty string when detached. */
  onChange: (agentId: string) => void;
}

export function VoiceAgentPicker({ agentId, onChange }: Props) {
  const agents = useAgentStore((s) => s.agents);
  const [pickerOpen, setPickerOpen] = useState(false);

  const voiceAgents = useMemo(
    () => agents.filter((a) => a.config.type === 'voice'),
    [agents],
  );
  const selected = useMemo(
    () => voiceAgents.find((a) => a.id === agentId),
    [voiceAgents, agentId],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-medium text-text-secondary">
          Voice agent
        </label>
        {selected && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="text-[11px] font-medium text-accent hover:underline"
          >
            Change
          </button>
        )}
      </div>

      {selected ? (
        <AttachedAgentCard agent={selected} onDetach={() => onChange('')} />
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={cn(
            'group flex w-full items-center justify-between gap-3 rounded-md border border-dashed',
            'border-border-default bg-surface-sunken p-4 text-left',
            'hover:border-accent hover:bg-accent-soft transition-colors',
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-accent">
              <Bot size={18} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-text-primary">
                Connect a voice agent
              </div>
              <div className="text-[12px] text-text-secondary">
                Pick a deployed voice agent. Its prompt, knowledge sources, and tools
                will run this campaign's voice channel.
              </div>
            </div>
          </div>
          <ChevronRight size={16} className="text-text-tertiary group-hover:text-accent" />
        </button>
      )}

      <VoiceAgentPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        agents={voiceAgents}
        selectedId={agentId}
        onPick={(id) => {
          onChange(id);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

/* ─── Attached card ────────────────────────────────────────────────────── */

function AttachedAgentCard({ agent, onDetach }: { agent: Agent; onDetach: () => void }) {
  const knowledgeBases = useKnowledgeBaseStore((s) => s.knowledgeBases);

  const attachedKBs = useMemo(() => {
    const ids = (agent.config.knowledgeBases ?? []).map((a) => a.knowledgeBaseId);
    return knowledgeBases.filter((kb) => ids.includes(kb.id));
  }, [agent, knowledgeBases]);

  const attachedTools = useMemo(() => {
    const stepIds = agent.config.instructionSteps?.flatMap((s) => s.attachedToolIds ?? []) ?? [];
    const all = new Set<string>([
      ...stepIds,
      ...(agent.config.globalToolIds ?? []),
      ...(agent.config.builtInTools ?? []),
    ]);
    return ALL_TOOLS.filter((t) => all.has(t.id));
  }, [agent]);

  const isDeployed = agent.status === 'deployed';

  return (
    <div
      className={cn(
        'rounded-md border bg-surface p-3',
        isDeployed ? 'border-border-subtle' : 'border-warning-soft',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Waveform seed={agent.id} bars={4} height={12} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                to={`/agents/${agent.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-semibold text-text-primary hover:text-accent inline-flex items-center gap-1"
              >
                <span className="truncate">{agent.config.name}</span>
                <ExternalLink size={11} className="text-text-tertiary" />
              </Link>
              <span className="rounded-full border border-border-subtle bg-surface px-1.5 h-5 text-[10px] font-medium text-text-secondary tabular-nums inline-flex items-center">
                v{agent.version}
              </span>
              <AgentStatusPill status={agent.status} />
            </div>
            <div className="mt-0.5 text-[11px] text-text-secondary truncate">
              {agent.config.voice} voice
              {agent.config.useCase && (
                <>
                  {' '}· <span className="capitalize">{agent.config.useCase}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onDetach}
          aria-label="Detach agent"
          className="text-text-tertiary hover:text-error transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Connected resources — read-only summary */}
      {(attachedKBs.length > 0 || attachedTools.length > 0) && (
        <div className="mt-3 pt-3 border-t border-border-subtle flex flex-col gap-2">
          {attachedKBs.length > 0 && (
            <div className="flex items-start gap-2 text-[11px]">
              <span className="text-text-tertiary inline-flex items-center gap-1.5 mt-0.5 shrink-0">
                <BookOpen size={11} />
                Knowledge
              </span>
              <div className="flex flex-wrap gap-1">
                {attachedKBs.map((kb) => (
                  <span
                    key={kb.id}
                    className="rounded-full bg-surface-sunken px-2 h-5 inline-flex items-center text-text-primary"
                  >
                    {kb.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {attachedTools.length > 0 && (
            <div className="flex items-start gap-2 text-[11px]">
              <span className="text-text-tertiary inline-flex items-center gap-1.5 mt-0.5 shrink-0">
                <Wrench size={11} />
                Tools
              </span>
              <div className="flex flex-wrap gap-1">
                {attachedTools.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full bg-surface-sunken px-2 h-5 inline-flex items-center text-text-primary"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prompt variant — default-only in v1 */}
      <div className="mt-3 pt-3 border-t border-border-subtle">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-text-tertiary">Prompt variant</span>
          <span className="inline-flex items-center gap-1.5 text-text-secondary">
            Default <Lock size={10} className="text-text-tertiary" />
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-text-tertiary">
          Variant A/B selection lands in Phase 4 alongside the eval suite.
        </p>
      </div>

      {/* Test deep link */}
      <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
        <span className="text-[11px] text-text-tertiary">
          {isDeployed
            ? 'Agent is deployed and ready.'
            : `Status: ${agent.status} — review before launch.`}
        </span>
        <Link
          to={`/agents/${agent.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
        >
          Test in console
          <ExternalLink size={10} />
        </Link>
      </div>
    </div>
  );
}

function AgentStatusPill({ status }: { status: AgentStatus }) {
  const map: Record<AgentStatus, { kind: 'success' | 'info' | 'warning' | 'neutral'; label: string }> = {
    deployed: { kind: 'success', label: 'Deployed' },
    testing: { kind: 'info', label: 'Testing' },
    paused: { kind: 'warning', label: 'Paused' },
    draft: { kind: 'neutral', label: 'Draft' },
  };
  const s = map[status];
  return (
    <StatusPill status={s.kind} size="sm">
      {s.label}
    </StatusPill>
  );
}

/* ─── Picker modal ─────────────────────────────────────────────────────── */

interface PickerProps {
  open: boolean;
  onClose: () => void;
  agents: Agent[];
  selectedId: string;
  onPick: (id: string) => void;
}

function VoiceAgentPickerModal({ open, onClose, agents, selectedId, onPick }: PickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.config.name.toLowerCase().includes(q) ||
        a.config.description?.toLowerCase().includes(q) ||
        a.config.useCase?.toLowerCase().includes(q),
    );
  }, [agents, query]);

  // Sort: deployed first, then testing, then paused/draft
  const sorted = useMemo(() => {
    const order: Record<AgentStatus, number> = {
      deployed: 0,
      testing: 1,
      paused: 2,
      draft: 3,
    };
    return [...filtered].sort((a, b) => order[a.status] - order[b.status]);
  }, [filtered]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connect a voice agent"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="tertiary"
            iconLeft={<Plus size={12} />}
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.open('/agents/new', '_blank', 'noreferrer');
              }
            }}
          >
            Build a new agent
          </Button>
        </>
      }
    >
      <Input
        placeholder="Search by name, description, or use case…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div className="mt-4 flex flex-col gap-1.5">
        {sorted.length === 0 && (
          <div className="py-8 text-center text-sm text-text-secondary">
            No voice agents in this workspace yet.
            <br />
            <Link
              to="/agents/new"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              Build one →
            </Link>
          </div>
        )}
        {sorted.map((a) => {
          const isSelected = a.id === selectedId;
          const isDeployed = a.status === 'deployed';
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onPick(a.id)}
              className={cn(
                'flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors',
                isSelected
                  ? 'border-accent bg-accent-soft'
                  : isDeployed
                  ? 'border-border-subtle bg-surface hover:border-accent'
                  : 'border-border-subtle bg-surface-sunken hover:border-border-default',
              )}
            >
              <Waveform seed={a.id} bars={4} height={14} className="shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-text-primary truncate">
                    {a.config.name}
                  </span>
                  <span className="rounded-full border border-border-subtle bg-surface px-1.5 h-4 text-[10px] font-medium text-text-secondary tabular-nums inline-flex items-center">
                    v{a.version}
                  </span>
                  <AgentStatusPill status={a.status} />
                </div>
                {a.config.description && (
                  <div className="mt-0.5 text-[12px] text-text-secondary line-clamp-1">
                    {a.config.description}
                  </div>
                )}
                <div className="mt-1 text-[11px] text-text-tertiary">
                  {a.config.voice} voice
                  {a.config.useCase && (
                    <>
                      {' '}· <span className="capitalize">{a.config.useCase}</span>
                    </>
                  )}
                  {(a.config.knowledgeBases?.length ?? 0) > 0 && (
                    <>
                      {' '}
                      · {a.config.knowledgeBases!.length} KB
                      {a.config.knowledgeBases!.length === 1 ? '' : 's'}
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
