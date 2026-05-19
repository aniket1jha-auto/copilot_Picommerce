import { Check, AlertCircle } from 'lucide-react';
import type { AgentConfiguration } from '@/types/agent';
import { ChatTestPanel } from '@/components/agents/chat-builder/ChatTestPanel';
import { TestConsole } from '@/components/agents/evaluate/TestConsole';
import { chatChannelLabel } from '@/data/chatAgentConstants';

interface Props {
  config: AgentConfiguration;
  onPrev: () => void;
  onDeploy: () => void;
  isLastStep: boolean;
}

function ConfigurationSummary({ config }: { config: AgentConfiguration }) {
  const toolCount = new Set([
    ...(config.globalToolIds ?? []),
    ...(config.builtInTools ?? []),
    ...(config.instructionSteps ?? []).flatMap((s) => s.attachedToolIds ?? []),
  ]).size;

  return (
    <div className="rounded-lg bg-white border border-[#E5E7EB] p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Configuration Summary</h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Name:</span>
          <span className="text-text-primary font-medium">{config.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Type:</span>
          <span className="text-text-primary font-medium capitalize">{config.type}</span>
        </div>
        {config.type === 'chat' ? (
          <>
            <div className="flex justify-between text-sm gap-4">
              <span className="text-text-secondary shrink-0">Channel:</span>
              <span className="text-text-primary font-medium text-right">
                {chatChannelLabel(config.chatChannel ?? 'whatsapp')}
              </span>
            </div>
            <div className="flex justify-between text-sm gap-4">
              <span className="text-text-secondary shrink-0">Display Name:</span>
              <span className="text-text-primary font-medium text-right">
                {config.chatDisplayName?.trim() || '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm gap-4">
              <span className="text-text-secondary shrink-0">Response Languages:</span>
              <span className="text-text-primary font-medium text-right">
                {(config.chatLanguages ?? []).length ? (config.chatLanguages ?? []).join(', ') : '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Fallback Language:</span>
              <span className="text-text-primary font-medium">
                {config.chatFallbackLanguage ?? 'English'}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Model:</span>
              <span className="text-text-primary font-medium">{config.model}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Voice:</span>
              <span className="text-text-primary font-medium capitalize">{config.voice}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Language:</span>
              <span className="text-text-primary font-medium">
                {config.conversationSettings.language}
              </span>
            </div>
          </>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Tools Enabled:</span>
          <span className="text-text-primary font-medium">{toolCount}</span>
        </div>
      </div>
    </div>
  );
}

export function ReviewStep({ config, onPrev, onDeploy }: Props) {
  const handleDeploy = () => {
    onDeploy();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Review & Deploy</h2>
        <p className="text-sm text-text-secondary">
          Review your agent configuration and test before deploying
        </p>
      </div>

      <div className="space-y-4">
        {config.type === 'chat' ? (
          <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
            <ConfigurationSummary config={config} />
            <div className="flex min-h-0 flex-col gap-2 min-h-[420px]">
              <h3 className="text-sm font-semibold text-text-primary">Test your agent</h3>
              <p className="text-xs text-text-secondary">
                Simulate a conversation before deploying
              </p>
              <div className="flex min-h-[420px] flex-1 flex-col">
                <ChatTestPanel config={config} layout="review" />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
            <ConfigurationSummary config={config} />
            <div className="flex min-h-0 flex-col gap-2">
              <h3 className="text-sm font-semibold text-text-primary">Test your agent</h3>
              <p className="text-xs text-text-secondary">
                Start a test call to hear how the agent responds turn by turn
              </p>
              <TestConsole useCase={config.useCase ?? ''} seed={config.name || 'review'} />
            </div>
          </div>
        )}

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium text-amber-900 mb-1">Before deploying</div>
              <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                <li>Test your agent thoroughly to ensure it behaves as expected</li>
                <li>Review compliance settings for your use case</li>
                <li>Monitor performance metrics after deployment</li>
                <li>You can always pause or update your agent later</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onPrev}
          className="inline-flex items-center gap-2 rounded-md border border-[#E5E7EB] px-6 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
          data-testid="review-prev-btn"
        >
          Back
        </button>
        <button
          onClick={handleDeploy}
          className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-cyan to-cyan/90 px-6 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg"
          data-testid="deploy-agent-btn"
        >
          <Check size={16} />
          Deploy Agent
        </button>
      </div>
    </div>
  );
}
