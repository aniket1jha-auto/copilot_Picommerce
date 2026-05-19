import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Phone, MessageSquare, Play, TrendingUp, Clock, ChevronDown } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCount } from '@/utils/format';
import type { Agent, AgentStatus, AgentType } from '@/types/agent';

/**
 * Small "+ Create Agent" → Voice / Chat dropdown. Picking an option
 * navigates to /agents/new?type=… so the builder skips the inline
 * type picker in Basic Info. Closes on outside click + Escape.
 */
function CreateAgentDropdown({ variant = 'header' }: { variant?: 'header' | 'empty' }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(type: AgentType) {
    setOpen(false);
    navigate(`/agents/new?type=${type}`);
  }

  const triggerClass =
    variant === 'header'
      ? 'inline-flex items-center gap-1.5 rounded-md bg-cyan px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan/90'
      : 'inline-flex items-center gap-2 rounded-md bg-cyan px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan/90';

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={triggerClass}
        data-testid={variant === 'header' ? 'create-agent-btn' : 'create-first-agent-btn'}
      >
        <Plus size={variant === 'header' ? 16 : 16} strokeWidth={2.5} />
        {variant === 'header' ? 'Create Agent' : 'Create Your First Agent'}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-52 overflow-hidden rounded-md border border-[#E5E7EB] bg-white shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => pick('voice')}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-text-primary transition-colors hover:bg-cyan/5"
            data-testid="create-voice-agent-option"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan/10 text-cyan">
              <Phone size={14} />
            </span>
            Voice Agent
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => pick('chat')}
            className="flex w-full items-center gap-2.5 border-t border-[#F3F4F6] px-3 py-2.5 text-left text-sm font-medium text-text-primary transition-colors hover:bg-cyan/5"
            data-testid="create-chat-agent-option"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan/10 text-cyan">
              <MessageSquare size={14} />
            </span>
            Chat Agent
          </button>
        </div>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<AgentStatus, { bg: string; text: string }> = {
  draft: { bg: 'bg-[#F3F4F6]', text: 'text-[#6B7280]' },
  testing: { bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]' },
  deployed: { bg: 'bg-[#D4EDDA]', text: 'text-[#27AE60]' },
  paused: { bg: 'bg-[#FEE2E2]', text: 'text-[#EF4444]' },
};

function AgentCard({ agent }: { agent: Agent }) {
  const { config, status, metrics } = agent;

  return (
    <Link
      to={`/agents/${agent.id}`}
      className="block rounded-lg bg-white p-5 ring-1 ring-[#E5E7EB] transition-all hover:ring-2 hover:ring-cyan"
      data-testid={`agent-card-${agent.id}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan/10 to-cyan/5">
            {config.type === 'voice' ? (
              <Phone size={20} className="text-cyan" />
            ) : (
              <MessageSquare size={20} className="text-cyan" />
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">{config.name}</h3>
            <p className="text-sm text-text-secondary mt-0.5">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="rounded-full border border-border-subtle bg-surface px-1.5 h-5 text-[10px] font-medium text-text-secondary tabular-nums inline-flex items-center"
            title="Configuration version"
          >
            v{agent.version}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status].bg} ${STATUS_STYLES[status].text}`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 pt-4 border-t border-[#E5E7EB]">
        <div>
          <div className="text-xs text-text-secondary mb-1">
            {config.type === 'chat' ? 'Sessions' : 'Total Calls'}
          </div>
          <div className="text-lg font-semibold text-text-primary">
            {formatCount(metrics.totalCalls)}
          </div>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">Success Rate</div>
          <div className="text-lg font-semibold text-text-primary">
            {metrics.completionRate.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">Avg Duration</div>
          <div className="text-lg font-semibold text-text-primary">
            {Math.floor(metrics.avgDuration / 60)}m {metrics.avgDuration % 60}s
          </div>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">
            {config.type === 'chat' ? 'Channel' : 'Voice'}
          </div>
          <div className="text-sm font-medium text-text-primary capitalize">
            {config.type === 'chat' ? (config.chatChannel ?? 'chat') : config.voice}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <span className="text-xs text-text-secondary">Model:</span>
        <span className="text-xs font-medium text-text-primary">{config.model}</span>
      </div>
    </Link>
  );
}

function EmptyAgents() {
  return (
    <div className="rounded-lg bg-white ring-1 ring-[#E5E7EB] p-12 text-center">
      <div className="flex justify-center mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan/10">
          <Phone size={32} className="text-cyan" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        No agents yet
      </h3>
      <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
        Create your first AI agent to automate voice calls, chat interactions, and more.
      </p>
      <CreateAgentDropdown variant="empty" />
    </div>
  );
}

function StatsCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  subtext?: string;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-white p-4 ring-1 ring-[#E5E7EB]">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <div className="text-2xl font-bold text-text-primary mb-0.5">{value}</div>
      {subtext && <div className="text-xs text-text-secondary">{subtext}</div>}
    </div>
  );
}

export function Agents() {
  const agents = useAgentStore((s) => s.agents);

  const totalCalls = agents.reduce((sum, a) => sum + a.metrics.totalCalls, 0);
  const deployedAgents = agents.filter((a) => a.status === 'deployed').length;
  const avgSuccessRate = agents.length > 0
    ? agents.reduce((sum, a) => sum + a.metrics.completionRate, 0) / agents.length
    : 0;
  const avgDuration = agents.length > 0
    ? agents.reduce((sum, a) => sum + a.metrics.avgDuration, 0) / agents.length
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agents"
        subtitle="Build, test, and deploy AI agents for voice and chat"
        actions={<CreateAgentDropdown variant="header" />}
      />

      {agents.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={Phone}
            label="Total Calls"
            value={formatCount(totalCalls)}
            subtext="Across all agents"
            color="#06B6D4"
          />
          <StatsCard
            icon={Play}
            label="Deployed Agents"
            value={deployedAgents.toString()}
            subtext={`${agents.length - deployedAgents} in testing/draft`}
            color="#10B981"
          />
          <StatsCard
            icon={TrendingUp}
            label="Avg Success Rate"
            value={`${avgSuccessRate.toFixed(1)}%`}
            subtext="Completion rate"
            color="#8B5CF6"
          />
          <StatsCard
            icon={Clock}
            label="Avg Duration"
            value={`${Math.floor(avgDuration / 60)}m ${Math.floor(avgDuration % 60)}s`}
            subtext="Per call"
            color="#F59E0B"
          />
        </div>
      )}

      {agents.length === 0 ? (
        <EmptyAgents />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">
              All Agents ({agents.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
