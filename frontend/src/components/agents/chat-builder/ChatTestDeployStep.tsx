import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import type { AgentConfiguration } from '@/types/agent';
import { ALL_TOOLS } from '@/data/toolConstants';
import {
  CHAT_CHANNELS,
  chatUseCaseLabel,
  chatLanguageLabels,
} from '@/data/chatAgentConstants';
import { ChatTestPanel } from './ChatTestPanel';

interface Props {
  config: AgentConfiguration;
  onPrev: () => void;
  /** Persist agent; return new agent id */
  onDeploy: (mode: 'deploy' | 'draft') => string;
}

function rolePreview(systemPrompt: string): string {
  const first = systemPrompt.trim().split('\n')[0] ?? '';
  return first.length > 120 ? `${first.slice(0, 120)}…` : first || '—';
}

export function ChatTestDeployStep({ config, onPrev, onDeploy }: Props) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'deploy' | 'draft'>('deploy');
  const [success, setSuccess] = useState(false);
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);

  const channel = CHAT_CHANNELS.find((c) => c.id === config.chatChannel);
  const langs = chatLanguageLabels(config.chatLanguages ?? []);
  const always = (config.mustAlwaysRules ?? []).filter((r) => r.trim());
  const never = (config.mustNeverRules ?? []).filter((r) => r.trim());
  const steps = config.instructionSteps ?? [];
  const globalIds = config.globalToolIds ?? [];

  const perStepTools = steps
    .map((s, i) =>
      s.attachedToolIds?.length
        ? `Step ${i + 1}: ${s.attachedToolIds.map((id) => ALL_TOOLS.find((t) => t.id === id)?.name ?? id).join(', ')}`
        : null,
    )
    .filter(Boolean) as string[];

  const globalNames = globalIds.map((id) => ALL_TOOLS.find((t) => t.id === id)?.name ?? id);
  const hasAnyTools = perStepTools.length > 0 || globalNames.length > 0;

  const handlePrimary = () => {
    const id = onDeploy(mode);
    setCreatedAgentId(id);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="grid min-h-[480px] grid-cols-1 gap-0 divide-y divide-[#E5E7EB] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <div className="flex flex-col items-center justify-center p-8 lg:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ECFDF5] text-[#059669]">
            <Check size={32} strokeWidth={2.5} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-text-primary">
            {mode === 'deploy'
              ? `${config.name.trim() || 'Agent'} deployed on ${channel?.label ?? 'channel'}`
              : `${config.name.trim() || 'Agent'} saved as draft`}
          </h3>
          <p className="mt-2 text-center text-sm text-text-secondary">
            {mode === 'deploy'
              ? 'The agent is live for inbound messages on the selected channel.'
              : 'You can deploy later from the Agents list.'}
          </p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                createdAgentId ? navigate(`/agents/${createdAgentId}`) : navigate('/agents')
              }
              className="inline-flex justify-center rounded-md bg-cyan px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan/90"
            >
              View Agent →
            </button>
            <Link
              to="/campaigns/new"
              className="inline-flex justify-center rounded-md border border-[#E5E7EB] px-5 py-2.5 text-sm font-medium text-text-primary hover:bg-[#F9FAFB]"
            >
              Add to a Campaign
            </Link>
          </div>
        </div>
        <div className="min-h-[320px] p-4 lg:p-6">
          <ChatTestPanel config={config} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[480px] grid-cols-1 gap-0 divide-y divide-[#E5E7EB] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
      <div className="flex flex-col p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-text-primary">Test & Deploy</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Review configuration and try a simulated conversation before going live.
          </p>
        </div>

        <h3 className="text-sm font-semibold text-text-primary">Agent Summary</h3>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Setup</p>
            <ul className="mt-2 space-y-1.5 text-sm text-text-primary">
              <li>
                <span className="text-text-secondary">Name:</span> {config.name.trim() || '—'}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-text-secondary">Channel:</span>
                <span>{channel?.icon}</span>
                {channel?.label ?? '—'}
              </li>
              <li>
                <span className="text-text-secondary">Use Case:</span>{' '}
                {chatUseCaseLabel(config.useCase ?? '')}
              </li>
              <li>
                <span className="text-text-secondary">Language:</span> {langs || '—'}
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Prompt</p>
            <ul className="mt-2 space-y-1.5 text-sm text-text-primary">
              <li>
                <span className="text-text-secondary">Role / preview:</span> {rolePreview(config.systemPrompt)}
              </li>
              <li>
                <span className="text-text-secondary">Must Always:</span> {always.length} rule
                {always.length !== 1 ? 's' : ''}
              </li>
              <li>
                <span className="text-text-secondary">Must Never:</span> {never.length} rule
                {never.length !== 1 ? 's' : ''}
              </li>
              <li>
                <span className="text-text-secondary">Instruction steps:</span> {steps.length}
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Tools</p>
            {hasAnyTools ? (
              <ul className="mt-2 space-y-1.5 text-sm text-text-primary">
                {perStepTools.map((line) => (
                  <li key={line}>{line}</li>
                ))}
                {globalNames.length > 0 && (
                  <li>
                    <span className="text-text-secondary">Global:</span> {globalNames.join(', ')}
                  </li>
                )}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">No tools configured</p>
            )}
          </div>
        </div>

        <div className="mt-auto space-y-3 border-t border-[#F3F4F6] pt-6">
          <label
            className={[
              'flex cursor-pointer gap-3 rounded-lg border p-3',
              mode === 'deploy' ? 'border-cyan bg-cyan/5' : 'border-[#E5E7EB]',
            ].join(' ')}
          >
            <input
              type="radio"
              name="deploy-mode"
              checked={mode === 'deploy'}
              onChange={() => setMode('deploy')}
              className="mt-0.5 text-cyan focus:ring-cyan"
            />
            <div>
              <p className="text-sm font-medium text-text-primary">Deploy now</p>
              <p className="text-xs text-text-secondary">
                Agent goes live immediately and handles inbound messages on {channel?.label ?? 'this channel'}
              </p>
            </div>
          </label>
          <label
            className={[
              'flex cursor-pointer gap-3 rounded-lg border p-3',
              mode === 'draft' ? 'border-cyan bg-cyan/5' : 'border-[#E5E7EB]',
            ].join(' ')}
          >
            <input
              type="radio"
              name="deploy-mode"
              checked={mode === 'draft'}
              onChange={() => setMode('draft')}
              className="mt-0.5 text-cyan focus:ring-cyan"
            />
            <div>
              <p className="text-sm font-medium text-text-primary">Save as draft</p>
              <p className="text-xs text-text-secondary">Configure now, deploy later from Agents list</p>
            </div>
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={onPrev}
              className="inline-flex items-center rounded-md border border-transparent px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-[#F9FAFB] hover:text-text-primary"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handlePrimary}
              className="inline-flex flex-1 items-center justify-center rounded-md bg-cyan px-6 py-2.5 text-sm font-medium text-white hover:bg-cyan/90 sm:flex-none"
            >
              {mode === 'deploy' ? 'Deploy Agent' : 'Save Draft'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col bg-[#F8FAFC] p-4 lg:p-6">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Test your agent</h3>
          <p className="text-xs text-text-secondary">Simulate a conversation before deploying</p>
        </div>
        <div className="min-h-0 flex-1">
          <ChatTestPanel config={config} />
        </div>
      </div>
    </div>
  );
}
