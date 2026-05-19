import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Settings, TrendingUp, MessageSquare, Clock, AlertTriangle, BookOpen, Wrench } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { useKnowledgeBaseStore } from '@/store/knowledgeBaseStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { PerformanceMetrics } from '@/components/agents/evaluate/PerformanceMetrics';
import { TranscriptViewer } from '@/components/agents/evaluate/TranscriptViewer';
import { PromptEnhancement } from '@/components/agents/evaluate/PromptEnhancement';
import { FailureAnalysis } from '@/components/agents/evaluate/FailureAnalysis';
import { TestConsole } from '@/components/agents/evaluate/TestConsole';
import { ALL_TOOLS } from '@/data/toolConstants';
import { Waveform } from '@/components/ui';

export function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const agent = useAgentStore((s) => s.getAgentById(id!));
  const pauseAgent = useAgentStore((s) => s.pauseAgent);
  const deployAgent = useAgentStore((s) => s.deployAgent);
  const knowledgeBases = useKnowledgeBaseStore((s) => s.knowledgeBases);

  const [activeTab, setActiveTab] = useState<'overview' | 'transcripts' | 'enhancement' | 'failures'>('overview');

  // Connected resources for the header chip rows.
  const attachedKBs = useMemo(() => {
    if (!agent) return [];
    const ids = (agent.config.knowledgeBases ?? []).map((a) => a.knowledgeBaseId);
    return knowledgeBases.filter((kb) => ids.includes(kb.id));
  }, [agent, knowledgeBases]);

  const attachedTools = useMemo(() => {
    if (!agent) return [];
    const stepToolIds = agent.config.instructionSteps?.flatMap((s) => s.attachedToolIds ?? []) ?? [];
    const allIds = new Set<string>([...stepToolIds, ...(agent.config.globalToolIds ?? [])]);
    return ALL_TOOLS.filter((t) => allIds.has(t.id));
  }, [agent]);

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-text-secondary mb-4">Agent not found</p>
        <Link to="/agents" className="text-cyan hover:underline">
          Back to Agents
        </Link>
      </div>
    );
  }

  const { config, status, metrics } = agent;

  const handleToggleStatus = () => {
    if (status === 'deployed') {
      pauseAgent(agent.id);
    } else {
      deployAgent(agent.id);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button
          onClick={() => navigate('/agents')}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-4"
        >
          <ArrowLeft size={16} />
          Back to Agents
        </button>
        
        <PageHeader
          title={
            <span className="inline-flex items-center gap-3">
              {config.type === 'voice' && <Waveform seed={agent.id} />}
              {config.name}
              <span
                className="rounded-full border border-border-subtle bg-surface px-2 h-5 text-[11px] font-medium text-text-secondary tabular-nums inline-flex items-center"
                title="Configuration version"
              >
                v{agent.version}
              </span>
            </span>
          }
          subtitle={config.description}
          actions={
            <div className="flex items-center gap-3">
              <Link
                to={`/agents/${agent.id}/edit`}
                className="inline-flex items-center gap-2 rounded-md border border-border-default bg-surface-raised px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong"
              >
                <Settings size={16} />
                Edit Configuration
              </Link>
              <button
                onClick={handleToggleStatus}
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-text-on-accent transition-colors ${
                  status === 'deployed'
                    ? 'bg-error hover:opacity-90'
                    : 'bg-success hover:opacity-90'
                }`}
                data-testid="toggle-status-btn"
              >
                {status === 'deployed' ? (
                  <>
                    <Pause size={16} />
                    Pause Agent
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Deploy Agent
                  </>
                )}
              </button>
            </div>
          }
        />

        {/* Connected resources chip rows */}
        {(attachedKBs.length > 0 || attachedTools.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]">
            {attachedKBs.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-text-tertiary inline-flex items-center gap-1.5">
                  <BookOpen size={12} /> Knowledge sources
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {attachedKBs.map((kb) => (
                    <Link
                      key={kb.id}
                      to={`/knowledge-bases/${kb.id}`}
                      className="rounded-full border border-border-subtle bg-surface px-2 h-6 inline-flex items-center text-text-primary hover:border-accent"
                    >
                      {kb.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {attachedTools.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-text-tertiary inline-flex items-center gap-1.5">
                  <Wrench size={12} /> Tools
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {attachedTools.map((t) => (
                    <Link
                      key={t.id}
                      to={`/tools?selected=${t.id}`}
                      className="rounded-full border border-border-subtle bg-surface px-2 h-6 inline-flex items-center text-text-primary hover:border-accent"
                    >
                      {t.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status and Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-white p-4 ring-1 ring-[#E5E7EB]">
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-2 w-2 rounded-full ${
              status === 'deployed' ? 'bg-green-500' : status === 'testing' ? 'bg-yellow-500' : 'bg-gray-400'
            }`} />
            <span className="text-xs text-text-secondary">Status</span>
          </div>
          <div className="text-lg font-semibold text-text-primary capitalize">{status}</div>
        </div>
        <div className="rounded-lg bg-white p-4 ring-1 ring-[#E5E7EB]">
          <div className="text-xs text-text-secondary mb-2">Total Calls</div>
          <div className="text-lg font-semibold text-text-primary">{metrics.totalCalls.toLocaleString()}</div>
        </div>
        <div className="rounded-lg bg-white p-4 ring-1 ring-[#E5E7EB]">
          <div className="text-xs text-text-secondary mb-2">Success Rate</div>
          <div className="text-lg font-semibold text-text-primary">{metrics.completionRate.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg bg-white p-4 ring-1 ring-[#E5E7EB]">
          <div className="text-xs text-text-secondary mb-2">Avg Duration</div>
          <div className="text-lg font-semibold text-text-primary">
            {Math.floor(metrics.avgDuration / 60)}m {metrics.avgDuration % 60}s
          </div>
        </div>
      </div>

      {/* Test Console */}
      <TestConsole useCase={agent.config.useCase ?? ''} seed={agent.id} />

      {/* Tabs */}
      <div className="border-b border-[#E5E7EB]">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'overview'
                ? 'text-cyan'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            data-testid="tab-overview"
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={16} />
              Performance Metrics
            </div>
            {activeTab === 'overview' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('transcripts')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'transcripts'
                ? 'text-cyan'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            data-testid="tab-transcripts"
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={16} />
              Call Transcripts
            </div>
            {activeTab === 'transcripts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('enhancement')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'enhancement'
                ? 'text-cyan'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            data-testid="tab-enhancement"
          >
            <div className="flex items-center gap-2">
              <Clock size={16} />
              Prompt Enhancement
            </div>
            {activeTab === 'enhancement' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('failures')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'failures'
                ? 'text-cyan'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            data-testid="tab-failures"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              Tool call analysis
            </div>
            {activeTab === 'failures' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan" />
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <PerformanceMetrics agentId={agent.id} />}
        {activeTab === 'transcripts' && <TranscriptViewer agentId={agent.id} />}
        {activeTab === 'enhancement' && <PromptEnhancement agentId={agent.id} />}
        {activeTab === 'failures' && <FailureAnalysis agentId={agent.id} />}
      </div>
    </div>
  );
}
