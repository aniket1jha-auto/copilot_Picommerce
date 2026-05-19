import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Reorder } from 'framer-motion';
import {
  Sparkles,
  GripVertical,
  Trash2,
  Plus,
  ChevronDown,
  X,
} from 'lucide-react';
import type { AgentConfiguration, InstructionStep as InstructionStepData } from '@/types/agent';
import { ALL_TOOLS } from '@/data/toolConstants';
import type { ToolDefinition } from '@/types/tool';

interface Props {
  config: AgentConfiguration;
  onSave: (config: Partial<AgentConfiguration>) => void;
  onNext: () => void;
  onPrev: () => void;
}

function newStepId(): string {
  return `step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function getTool(id: string): ToolDefinition | undefined {
  return ALL_TOOLS.find((t) => t.id === id);
}

/** Hardcoded sample: loan recovery flow (4 steps) */
function buildLoanRecoverySampleSteps(): InstructionStepData[] {
  return [
    {
      id: newStepId(),
      instruction:
        'Greet the customer by name and confirm you are calling from the lending team about their loan account.',
      transitionCondition:
        'Move to the next step once the customer confirms their identity (last 4 digits of account or DOB).',
      attachedToolIds: ['query'],
      quickReplies: [],
    },
    {
      id: newStepId(),
      instruction:
        'State the outstanding amount and due date clearly; ask if they can pay today or need a restructuring discussion.',
      transitionCondition:
        'Proceed when the customer acknowledges the dues or asks how to pay.',
      attachedToolIds: ['send_message'],
      quickReplies: [],
    },
    {
      id: newStepId(),
      instruction:
        'Offer repayment options: full payment link, EMI reschedule, or callback from a specialist — match tone to customer sentiment.',
      transitionCondition:
        'Move on once the customer picks an option or requests a supervisor.',
      attachedToolIds: ['transfer_call', 'custom_function'],
      quickReplies: [],
    },
    {
      id: newStepId(),
      instruction:
        'Confirm next steps (payment link sent / callback scheduled), read disclaimers if required, and close politely.',
      transitionCondition: 'End the step once confirmation is repeated back by the customer.',
      attachedToolIds: ['end_call'],
      quickReplies: [],
    },
  ];
}

export function InstructionsStep({ config, onSave, onNext, onPrev }: Props) {
  const [steps, setSteps] = useState<InstructionStepData[]>(() => {
    if (config.instructionSteps?.length) {
      return config.instructionSteps;
    }
    return [
      {
        id: newStepId(),
        instruction: '',
        transitionCondition: '',
        attachedToolIds: [],
        quickReplies: [],
      },
    ];
  });

  const [globalToolIds, setGlobalToolIds] = useState<string[]>(
    () => config.globalToolIds ?? config.builtInTools ?? [],
  );

  const [transitionExpanded, setTransitionExpanded] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    (config.instructionSteps ?? []).forEach((s) => {
      if (s.transitionCondition?.trim()) m[s.id] = true;
    });
    return m;
  });

  const [toolMenuStepId, setToolMenuStepId] = useState<string | null>(null);
  const [quickRepliesExpanded, setQuickRepliesExpanded] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    (config.instructionSteps ?? []).forEach((s) => {
      if ((s.quickReplies ?? []).some((q) => q.trim())) m[s.id] = true;
    });
    return m;
  });
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const generateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (generateRef.current?.contains(t)) return;
      setGenerateOpen(false);
      const el = e.target as HTMLElement | null;
      if (el && !el.closest('[data-step-tool-menu]')) {
        setToolMenuStepId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleGlobalTool = useCallback((toolId: string) => {
    setGlobalToolIds((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId],
    );
  }, []);

  const updateStep = useCallback(
    (id: string, patch: Partial<InstructionStepData>) => {
      setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    },
    [],
  );

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));
    setTransitionExpanded((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    });
  }, []);

  const addStep = useCallback(() => {
    const id = newStepId();
    setSteps((prev) => [
      ...prev,
      { id, instruction: '', transitionCondition: '', attachedToolIds: [], quickReplies: [] },
    ]);
  }, []);

  const attachTool = useCallback((stepId: string, toolId: string) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== stepId) return s;
        if (s.attachedToolIds.includes(toolId)) return s;
        return { ...s, attachedToolIds: [...s.attachedToolIds, toolId] };
      }),
    );
    setToolMenuStepId(null);
  }, []);

  const detachTool = useCallback((stepId: string, toolId: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? { ...s, attachedToolIds: s.attachedToolIds.filter((t) => t !== toolId) }
          : s,
      ),
    );
  }, []);

  const handleGenerate = () => {
    const generated = buildLoanRecoverySampleSteps();
    setSteps(generated);
    setGeneratePrompt('');
    setGenerateOpen(false);
    const nextExp: Record<string, boolean> = {};
    generated.forEach((s) => {
      if (s.transitionCondition?.trim()) nextExp[s.id] = true;
    });
    setTransitionExpanded(nextExp);
  };

  const handleNext = () => {
    const mergedToolIds = [
      ...new Set([...globalToolIds, ...steps.flatMap((s) => s.attachedToolIds)]),
    ];
    const normalizedSteps = steps.map((s) => ({
      ...s,
      quickReplies: (s.quickReplies ?? [])
        .map((q) => q.trim())
        .filter(Boolean)
        .slice(0, 3),
    }));
    onSave({
      instructionSteps: normalizedSteps,
      globalToolIds,
      builtInTools: mergedToolIds,
    });
    onNext();
  };

  const isValid = steps.some((s) => s.instruction.trim().length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold text-text-primary">Instructions</h2>
        <p className="text-sm text-text-secondary">
          Define what your agent should do in order, and which tools it can use.
        </p>
      </div>

      <Link
        to="/content-ideas"
        className="flex items-center gap-2 rounded-lg border border-cyan/20 bg-gradient-to-br from-cyan/5 to-cyan/10 p-4 text-sm text-text-primary transition-colors hover:border-cyan/40"
      >
        <Sparkles size={18} className="shrink-0 text-cyan" />
        <span>
          <span className="font-medium">Not sure where to start?</span>{' '}
          <span className="text-cyan underline-offset-2 hover:underline">
            Use a template from Content & Ideas →
          </span>
        </span>
      </Link>

      {/* Conversation Steps */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Conversation Steps
            </label>
            <p className="text-sm text-text-secondary">
              Write what the agent should do, in order. Each step is a plain language instruction.
            </p>
          </div>
          <div className="relative shrink-0" ref={generateRef}>
            <button
              type="button"
              onClick={() => setGenerateOpen((o) => !o)}
              className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-gray-50 hover:text-text-primary"
            >
              Generate steps with AI
            </button>
            {generateOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,20rem)] rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-lg ring-1 ring-black/5">
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Describe what this agent needs to do...
                </label>
                <textarea
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. Recover overdue loan payments with empathy..."
                  className="mb-2 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                />
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="w-full rounded-md bg-cyan py-2 text-sm font-medium text-white hover:bg-cyan/90"
                >
                  Generate
                </button>
              </div>
            )}
          </div>
        </div>

        <Reorder.Group
          as="div"
          axis="y"
          values={steps}
          onReorder={setSteps}
          className="flex flex-col gap-3"
        >
          {steps.map((step, stepIndex) => {
            const showTransition =
              transitionExpanded[step.id] === true || !!step.transitionCondition?.trim();

            return (
              <Reorder.Item
                key={step.id}
                value={step}
                as="div"
                className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm"
              >
                <div className="flex gap-3">
                  <div
                    className="flex cursor-grab touch-none items-start pt-1 text-text-secondary active:cursor-grabbing"
                    title="Drag to reorder"
                  >
                    <GripVertical size={18} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        Step {stepIndex + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        disabled={steps.length <= 1}
                        className="rounded-md p-1 text-text-secondary transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Remove step"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <textarea
                      value={step.instruction}
                      onChange={(e) => updateStep(step.id, { instruction: e.target.value })}
                      placeholder="e.g. Greet the customer by name and confirm their loan account details"
                      rows={3}
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                    />
                    {showTransition ? (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-secondary">
                          Transition condition (optional)
                        </label>
                        <textarea
                          value={step.transitionCondition}
                          onChange={(e) =>
                            updateStep(step.id, { transitionCondition: e.target.value })
                          }
                          placeholder="e.g. Move to next step once customer confirms they have 2 minutes"
                          rows={2}
                          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setTransitionExpanded((m) => ({ ...m, [step.id]: true }))
                        }
                        className="text-xs font-medium text-cyan hover:underline"
                      >
                        Add transition condition
                      </button>
                    )}

                    {step.attachedToolIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {step.attachedToolIds.map((tid) => {
                          const tool = getTool(tid);
                          return (
                            <span
                              key={tid}
                              className="inline-flex items-center gap-1 rounded-full bg-cyan/10 px-2 py-0.5 text-[11px] font-medium text-cyan ring-1 ring-cyan/25"
                            >
                              {tool?.name ?? tid}
                              <button
                                type="button"
                                onClick={() => detachTool(step.id, tid)}
                                className="rounded p-0.5 hover:bg-cyan/20"
                                aria-label={`Remove ${tool?.name}`}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="relative" data-step-tool-menu>
                      <button
                        type="button"
                        onClick={() =>
                          setToolMenuStepId((id) => (id === step.id ? null : step.id))
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-gray-100"
                      >
                        Attach tool
                        <ChevronDown size={14} className="text-text-secondary" />
                      </button>
                      {toolMenuStepId === step.id && (
                        <div className="absolute left-0 top-full z-20 mt-1 max-h-52 w-full min-w-[220px] overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg">
                          {ALL_TOOLS.filter((t) => !step.attachedToolIds.includes(t.id)).map(
                            (tool) => (
                              <button
                                key={tool.id}
                                type="button"
                                onClick={() => attachTool(step.id, tool.id)}
                                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-gray-50"
                              >
                                <span className="font-medium text-text-primary">{tool.name}</span>
                                <span className="text-xs text-text-secondary">{tool.description}</span>
                              </button>
                            ),
                          )}
                          {ALL_TOOLS.filter((t) => !step.attachedToolIds.includes(t.id)).length ===
                            0 && (
                            <div className="px-3 py-2 text-xs text-text-secondary">
                              All tools attached
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {config.type === 'chat' && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() =>
                            setQuickRepliesExpanded((m) => ({
                              ...m,
                              [step.id]: !m[step.id],
                            }))
                          }
                          className="text-xs font-medium text-cyan hover:underline"
                        >
                          {quickRepliesExpanded[step.id]
                            ? 'Hide quick replies'
                            : '+ Add quick replies'}
                        </button>
                        {quickRepliesExpanded[step.id] && (
                          <div className="space-y-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                            <label className="block text-xs font-medium text-text-secondary">
                              Quick reply buttons shown at this step
                            </label>
                            {[0, 1, 2].map((slot) => {
                              const padded = [...(step.quickReplies ?? [])]
                                .concat(['', '', ''])
                                .slice(0, 3);
                              return (
                                <input
                                  key={slot}
                                  type="text"
                                  value={padded[slot]}
                                  onChange={(e) => {
                                    const next = [...padded];
                                    next[slot] = e.target.value;
                                    updateStep(step.id, { quickReplies: next });
                                  }}
                                  placeholder="e.g. Pay Now"
                                  className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                                />
                              );
                            })}
                            <p className="text-[11px] text-text-secondary">
                              WhatsApp supports max 3 quick reply buttons
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        <button
          type="button"
          onClick={addStep}
          className="inline-flex items-center gap-2 rounded-md border border-dashed border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-cyan hover:text-cyan"
        >
          <Plus size={16} />
          Add Step
        </button>
      </div>

      {/* Global Tool Access */}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">
            Global Tool Access
          </label>
          <p className="text-sm text-text-secondary">
            Tools added here are available to the agent throughout the entire conversation. The agent
            decides when to call them.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ALL_TOOLS.map((tool) => {
            const selected = globalToolIds.includes(tool.id);
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => toggleGlobalTool(tool.id)}
                className={[
                  'rounded-lg border-2 p-3 text-left transition-all',
                  selected
                    ? 'border-cyan bg-cyan/5 shadow-sm'
                    : 'border-[#E5E7EB] opacity-60 hover:border-cyan/40 hover:opacity-100',
                ].join(' ')}
              >
                <div
                  className="mb-2 h-8 w-8 rounded-md"
                  style={{ backgroundColor: `${tool.color}22` }}
                />
                <div className="mb-0.5 text-sm font-semibold text-text-primary">{tool.name}</div>
                <div className="text-xs text-text-secondary line-clamp-2">{tool.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-2 rounded-md border border-[#E5E7EB] px-6 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!isValid}
          className="inline-flex items-center gap-2 rounded-md bg-cyan px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
