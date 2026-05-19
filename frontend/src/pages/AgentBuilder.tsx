import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import type { AgentType } from '@/types/agent';
import { PageHeader } from '@/components/layout/PageHeader';
import { BasicInfoStep } from '@/components/agents/builder/BasicInfoStep';
import { PromptsAndInstructionsStep } from '@/components/agents/builder/PromptsAndInstructionsStep';
import { ReviewStep } from '@/components/agents/builder/ReviewStep';
import { useAgentStore } from '@/store/agentStore';
import { useToast } from '@/components/ui';
import type { AgentConfiguration } from '@/types/agent';

/**
 * Three-step unified agent builder. The middle step folds in System
 * Prompt, Instructions, Knowledge attachment, Voice, and Advanced —
 * laid out as one scrolling page with collapsible sections. See
 * PromptsAndInstructionsStep for the section order.
 */
const STEPS = [
  { id: 1, name: 'Basic Info', component: BasicInfoStep },
  { id: 2, name: 'Prompts & Instructions', component: PromptsAndInstructionsStep },
  { id: 3, name: 'Review & Deploy', component: ReviewStep },
];

const DEFAULT_CONFIG: AgentConfiguration = {
  name: '',
  description: '',
  type: 'voice',
  model: 'gpt-realtime-mini',
  voice: 'coral',
  systemPrompt: '',
  personality: {
    traits: [],
    tone: 'professional',
    role: '',
  },
  objectives: [],
  guidelines: {
    dos: [],
    donts: [],
  },
  instructionSteps: [
    {
      id: 'ins-default-1',
      instruction: '',
      transitionCondition: '',
      attachedToolIds: [],
    },
  ],
  globalToolIds: [],
  flow: {
    nodes: [],
    edges: [],
  },
  builtInTools: [],
  customFunctions: [],
  knowledgeBases: [],
  audioConfig: {
    inputFormat: 'pcm16',
    outputFormat: 'pcm16',
    turnDetection: 'server_vad',
    allowInterruptions: true,
  },
  llmConfig: {
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0.3,
    presencePenalty: 0.3,
  },
  conversationSettings: {
    silenceTimeout: 5,
    maxDuration: 600,
    endCallPhrases: ['goodbye', 'end call', 'thank you'],
    language: 'en-US',
    speechRate: 1.0,
  },
  compliance: {
    contentFiltering: true,
    piiDetection: true,
    recordingConsent: true,
    tcpaCompliance: true,
  },
  environment: 'test',

  chatChannel: 'whatsapp',
  chatLanguages: ['English'],
  chatFallbackLanguage: 'English',
  chatDisplayName: '',
  chatWhatsAppAccountId: 'wa-1',
  chatWhatsAppPhoneId: 'ph-1',
  mustAlwaysRules: [],
  mustNeverRules: [],
  chatAdvancedSettings: {
    sessionExpiryAction: 'template',
    fallbackMessage:
      "I'm sorry, I didn't quite understand that. Could you rephrase, or type HELP to see what I can assist with.",
    maxFallbackAttempts: 2,
    stopKeywords: ['STOP', 'UNSUBSCRIBE', 'OPT OUT'],
    optOutBehavior: 'confirm',
    optOutConfirmationMessage:
      "You've been unsubscribed from our messages. Reply START to re-subscribe or call [number] for support.",
    escalationKeywords: ['legal', 'RBI', 'fraud', 'complaint', 'manager'],
  },
};

interface AgentBuilderProps {
  /** Edit mode — when set, loads the agent's existing config and saves with updateAgent. */
  mode?: 'create' | 'edit';
}

export function AgentBuilder({ mode = 'create' }: AgentBuilderProps) {
  const { id: agentId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const createAgent = useAgentStore((s) => s.createAgent);
  const updateAgent = useAgentStore((s) => s.updateAgent);
  const getAgentById = useAgentStore((s) => s.getAgentById);

  const existingAgent = mode === 'edit' && agentId ? getAgentById(agentId) : undefined;

  /**
   * On /agents/new the Agents-page dropdown sends us here with
   * ?type=voice|chat — pre-seed the config so the Basic Info step
   * doesn't need to ask again. Anything else falls back to the
   * default ("voice").
   */
  const initialType = useMemo<AgentType>(() => {
    const raw = searchParams.get('type');
    return raw === 'chat' ? 'chat' : 'voice';
  }, [searchParams]);

  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<AgentConfiguration>(
    () => existingAgent?.config ?? { ...DEFAULT_CONFIG, type: initialType },
  );

  // If the agent is loaded asynchronously (edge case during HMR), sync it in.
  useEffect(() => {
    if (mode === 'edit' && existingAgent) {
      setConfig(existingAgent.config);
    }
  }, [mode, existingAgent]);

  if (mode === 'edit' && !existingAgent) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Agent not found" />
        <div className="rounded-lg border border-border-subtle bg-surface p-6 text-sm text-text-secondary">
          No agent with ID <code className="font-mono">{agentId}</code> exists. It may have been deleted.
        </div>
      </div>
    );
  }

  const CurrentStepComponent = STEPS[currentStep - 1].component;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSave = (stepConfig: Partial<AgentConfiguration>) => {
    setConfig((prev) => ({ ...prev, ...stepConfig }));
  };

  const stepIndicatorLabels = useMemo(
    () => ['Basic Info', 'Prompts & Instructions', 'Review & Deploy'],
    [],
  );

  const handleDeploy = () => {
    if (mode === 'edit' && existingAgent) {
      updateAgent(existingAgent.id, config);
      toast({
        kind: 'success',
        title: `${config.name || existingAgent.config.name} updated`,
        body: `Now on version ${existingAgent.version + 1}.`,
      });
      navigate(`/agents/${existingAgent.id}`);
      return;
    }
    const agent = createAgent(config);
    toast({
      kind: 'success',
      title: `${config.name || 'Agent'} created`,
      body: 'Status: draft. Test it before deploying.',
    });
    navigate(`/agents/${agent.id}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={mode === 'edit' ? `Edit Agent — ${existingAgent?.config.name ?? ''}` : 'Create Agent'}
        subtitle={
          mode === 'edit'
            ? `Currently v${existingAgent?.version}. Saving creates a new version.`
            : 'Build and configure your AI agent step by step'
        }
      />

      {/* Progress Steps */}
      <div className="rounded-lg bg-white p-6 ring-1 ring-[#E5E7EB]">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    currentStep > step.id
                      ? 'border-cyan bg-cyan text-white'
                      : currentStep === step.id
                      ? 'border-cyan bg-white text-cyan'
                      : 'border-[#E5E7EB] bg-white text-text-secondary'
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check size={20} strokeWidth={2.5} />
                  ) : (
                    <span className="text-sm font-semibold">{step.id}</span>
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    currentStep >= step.id ? 'text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  {stepIndicatorLabels[idx]}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors ${
                    currentStep > step.id ? 'bg-cyan' : 'bg-[#E5E7EB]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-lg bg-white p-6 ring-1 ring-[#E5E7EB]">
        <CurrentStepComponent
          config={config}
          onSave={handleSave}
          onNext={handleNext}
          onPrev={handlePrev}
          onDeploy={handleDeploy}
          isFirstStep={currentStep === 1}
          isLastStep={currentStep === STEPS.length}
        />
      </div>
    </div>
  );
}
