import { useState, useEffect, useRef, useCallback } from 'react';
import { Reorder, motion } from 'framer-motion';
import {
  Sparkles,
  GripVertical,
  Trash2,
  Plus,
  ChevronDown,
  X,
  ChevronUp,
} from 'lucide-react';
import type { AgentConfiguration, InstructionStep } from '@/types/agent';
import { ALL_TOOLS } from '@/data/toolConstants';
import type { ToolDefinition } from '@/types/tool';
import { instructionStepsForUseCase } from '@/data/chatAgentConstants';
import {
  CHAT_PROMPT_TEMPLATES,
  buildInstructionStepsFromTemplate,
  type ChatPromptTemplateId,
} from '@/data/chatPromptTemplates';

interface Props {
  config: AgentConfiguration;
  onSave: (partial: Partial<AgentConfiguration>) => void;
  onNext: () => void;
  onPrev: () => void;
}

function newStepId(): string {
  return `step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function getTool(id: string): ToolDefinition | undefined {
  return ALL_TOOLS.find((t) => t.id === id);
}

const SYSTEM_PROMPT_PLACEHOLDER = `You are [Name], a [role] for [Company].
Your goal is to help customers who reply to our outreach messages.

Tone: [professional / friendly / empathetic]

Key things to know:
- [Important context about your business]
- [Policies or limits the agent must respect]
- [What this agent can and cannot help with]`;

export function ChatPromptInstructionsStep({ config, onSave, onNext, onPrev }: Props) {
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt);
  const [mustAlways, setMustAlways] = useState<string[]>(() =>
    (config.mustAlwaysRules?.length ? config.mustAlwaysRules : ['']).slice(0, 20),
  );
  const [mustNever, setMustNever] = useState<string[]>(() =>
    (config.mustNeverRules?.length ? config.mustNeverRules : ['']).slice(0, 20),
  );
  const [alwaysVisible, setAlwaysVisible] = useState(3);
  const [neverVisible, setNeverVisible] = useState(3);

  const [steps, setSteps] = useState<InstructionStep[]>(() => {
    if (config.instructionSteps?.length) return config.instructionSteps;
    return instructionStepsForUseCase(config.useCase ?? 'recovery_followup', config.chatChannel ?? 'whatsapp');
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
  const [quickReplySlots, setQuickReplySlots] = useState<Record<string, number>>({});

  const [sysGenOpen, setSysGenOpen] = useState(false);
  const [sysGenPrompt, setSysGenPrompt] = useState('');
  const [stepGenOpen, setStepGenOpen] = useState(false);
  const [stepGenPrompt, setStepGenPrompt] = useState('');

  const [selectedTemplateId, setSelectedTemplateId] = useState<ChatPromptTemplateId | null>(null);
  const [templateApplying, setTemplateApplying] = useState(false);
  const [contentAnimKey, setContentAnimKey] = useState(0);

  const sysGenRef = useRef<HTMLDivElement>(null);
  const stepGenRef = useRef<HTMLDivElement>(null);
  const templateApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (templateApplyTimerRef.current) clearTimeout(templateApplyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (sysGenRef.current?.contains(t)) return;
      if (stepGenRef.current?.contains(t)) return;
      setSysGenOpen(false);
      setStepGenOpen(false);
      const el = e.target as HTMLElement | null;
      if (el && !el.closest('[data-step-tool-menu]')) setToolMenuStepId(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleGlobalTool = useCallback((toolId: string) => {
    setGlobalToolIds((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId],
    );
  }, []);

  const updateStep = useCallback((id: string, patch: Partial<InstructionStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

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
      {
        id,
        instruction: '',
        transitionCondition: '',
        attachedToolIds: [],
        quickReplies: [],
      },
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

  const handleGenerateSystem = () => {
    setSelectedTemplateId(null);
    const hint = sysGenPrompt.trim() || 'a financial services company';
    setSystemPrompt(
      `You are a helpful chat assistant for ${hint}.

Your goal is to resolve customer inquiries clearly and respectfully in the channel they use.

Tone: professional, empathetic, concise.

Key things to know:
- Follow company policies and escalate when unsure.
- Never share sensitive account data without proper verification.
- Offer quick replies when they help the customer move forward.`,
    );
    setSysGenPrompt('');
    setSysGenOpen(false);
  };

  const handleGenerateSteps = () => {
    setSteps(instructionStepsForUseCase(config.useCase ?? 'recovery_followup', config.chatChannel ?? 'whatsapp'));
    setSelectedTemplateId(null);
    setStepGenPrompt('');
    setStepGenOpen(false);
  };

  const hasUserTypedContent = useCallback(() => {
    if (systemPrompt.trim()) return true;
    if (mustAlways.some((r) => r.trim())) return true;
    if (mustNever.some((r) => r.trim())) return true;
    if (globalToolIds.length > 0) return true;
    return steps.some(
      (s) =>
        s.instruction.trim() ||
        s.transitionCondition.trim() ||
        s.attachedToolIds.length > 0 ||
        (s.quickReplies ?? []).some((q) => q.trim()),
    );
  }, [systemPrompt, mustAlways, mustNever, steps, globalToolIds]);

  const applyChatTemplate = useCallback((id: ChatPromptTemplateId) => {
    if (templateApplyTimerRef.current) clearTimeout(templateApplyTimerRef.current);
    setSelectedTemplateId(id);
    setTemplateApplying(true);
    templateApplyTimerRef.current = setTimeout(() => {
      const t = CHAT_PROMPT_TEMPLATES.find((x) => x.id === id);
      if (t) {
        setSystemPrompt(t.systemPrompt);
        setMustAlways([...t.mustAlways]);
        setMustNever([...t.mustNever]);
        setAlwaysVisible(Math.max(3, t.mustAlways.length));
        setNeverVisible(Math.max(3, t.mustNever.length));
        setSteps(buildInstructionStepsFromTemplate(t.stepInstructions));
        setTransitionExpanded({});
        setQuickReplySlots({});
      }
      setTemplateApplying(false);
      setContentAnimKey((k) => k + 1);
      templateApplyTimerRef.current = null;
    }, 200);
  }, []);

  const startFromScratch = useCallback(() => {
    if (hasUserTypedContent()) {
      const ok = window.confirm(
        'This will clear your current prompt and instructions. Continue?',
      );
      if (!ok) return;
    }
    if (templateApplyTimerRef.current) {
      clearTimeout(templateApplyTimerRef.current);
      templateApplyTimerRef.current = null;
    }
    setSelectedTemplateId(null);
    setTemplateApplying(false);
    setSystemPrompt('');
    setMustAlways([]);
    setMustNever([]);
    setAlwaysVisible(3);
    setNeverVisible(3);
    setSteps([
      {
        id: newStepId(),
        instruction: '',
        transitionCondition: '',
        attachedToolIds: [],
        quickReplies: [],
      },
    ]);
    setGlobalToolIds([]);
    setTransitionExpanded({});
    setQuickReplySlots({});
    setContentAnimKey((k) => k + 1);
  }, [hasUserTypedContent]);

  const handleNext = () => {
    const mergedToolIds = [...new Set([...globalToolIds, ...steps.flatMap((s) => s.attachedToolIds)])];
    onSave({
      systemPrompt,
      mustAlwaysRules: mustAlways.map((s) => s.trim()).filter(Boolean),
      mustNeverRules: mustNever.map((s) => s.trim()).filter(Boolean),
      instructionSteps: steps.map((s) => ({
        ...s,
        quickReplies: (s.quickReplies ?? []).map((q) => q.trim()).filter(Boolean).slice(0, 3),
      })),
      globalToolIds,
      builtInTools: mergedToolIds,
    });
    onNext();
  };

  const isValid =
    systemPrompt.trim().length > 0 && steps.some((s) => s.instruction.trim().length > 0);

  const divider = <div className="border-t border-[#E5E7EB]" />;

  return (
    <div className="space-y-10">
      <div>
        <h2 className="mb-2 text-xl font-semibold text-text-primary">Prompt & Instructions</h2>
        <p className="text-sm text-text-secondary">
          Define who this agent is, what it should do, and which tools it can use
        </p>
      </div>

      <div className="rounded-lg border border-cyan/20 bg-gradient-to-br from-cyan/5 to-cyan/10 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-cyan" />
          <span className="font-semibold text-text-primary">Start with a Template</span>
        </div>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CHAT_PROMPT_TEMPLATES.map((template) => {
            const selected = selectedTemplateId === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => applyChatTemplate(template.id)}
                disabled={templateApplying}
                className={[
                  'rounded-lg border bg-white p-3 text-left transition-all',
                  selected
                    ? 'border-cyan ring-2 ring-cyan'
                    : 'border-[#E5E7EB] hover:ring-2 hover:ring-cyan',
                  templateApplying ? 'cursor-wait opacity-80' : '',
                ].join(' ')}
              >
                <div className="mb-1 text-sm font-medium text-text-primary">{template.title}</div>
                <div className="text-xs text-text-secondary">{template.subtext}</div>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={startFromScratch}
          className="text-xs text-cyan hover:underline"
        >
          Start from scratch instead
        </button>
      </div>

      <div className="relative">
        {templateApplying && (
          <div
            className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-xl"
            aria-hidden
          >
            <div className="absolute inset-0 bg-gradient-to-b from-cyan/10 via-white/60 to-cyan/10 animate-pulse" />
          </div>
        )}
        <motion.div
          key={contentAnimKey}
          initial={contentAnimKey > 0 ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="space-y-10"
        >
      {/* SECTION A */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">System Prompt</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Define the agent&apos;s identity, tone, and core context. This is the foundation everything
              else builds on.
            </p>
          </div>
          <div className="relative shrink-0" ref={sysGenRef}>
            <button
              type="button"
              onClick={() => setSysGenOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-[#F9FAFB] hover:text-text-primary"
            >
              <Sparkles size={14} className="text-cyan" />
              Generate with AI
            </button>
            {sysGenOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,22rem)] rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-lg ring-1 ring-black/5">
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Describe your business and what this agent handles...
                </label>
                <textarea
                  value={sysGenPrompt}
                  onChange={(e) => setSysGenPrompt(e.target.value)}
                  rows={3}
                  className="mb-2 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                />
                <button
                  type="button"
                  onClick={handleGenerateSystem}
                  className="w-full rounded-md bg-cyan py-2 text-sm font-medium text-white hover:bg-cyan/90"
                >
                  Generate
                </button>
              </div>
            )}
          </div>
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder={SYSTEM_PROMPT_PLACEHOLDER}
          rows={8}
          className="w-full rounded-lg border border-[#E5E7EB] px-4 py-3 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
        />

        <div className="rounded-lg bg-[#F9FAFB] p-4">
          <p className="mb-2 text-xs font-semibold text-text-primary">Must Always</p>
          <div className="space-y-2">
            {mustAlways.slice(0, alwaysVisible).map((rule, idx) => (
              <div key={`a-${idx}`} className="flex gap-2">
                <input
                  value={rule}
                  onChange={(e) => {
                    const next = [...mustAlways];
                    next[idx] = e.target.value;
                    setMustAlways(next);
                  }}
                  placeholder="e.g. Always greet the customer by name"
                  className="min-w-0 flex-1 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                />
                <button
                  type="button"
                  onClick={() => setMustAlways((prev) => prev.filter((_, i) => i !== idx))}
                  className="shrink-0 rounded-md p-2 text-text-secondary hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove rule"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMustAlways((prev) => [...prev, ''])}
            className="mt-2 text-xs font-medium text-cyan hover:underline"
          >
            + Add rule
          </button>
          {mustAlways.length > alwaysVisible && (
            <button
              type="button"
              onClick={() => setAlwaysVisible((n) => n + 3)}
              className="ml-3 text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              + Add more
            </button>
          )}
        </div>

        <div className="rounded-lg bg-[#F9FAFB] p-4">
          <p className="mb-2 text-xs font-semibold text-text-primary">Must Never</p>
          <div className="space-y-2">
            {mustNever.slice(0, neverVisible).map((rule, idx) => (
              <div key={`n-${idx}`} className="flex gap-2">
                <input
                  value={rule}
                  onChange={(e) => {
                    const next = [...mustNever];
                    next[idx] = e.target.value;
                    setMustNever(next);
                  }}
                  placeholder="e.g. Never share account details without verification"
                  className="min-w-0 flex-1 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                />
                <button
                  type="button"
                  onClick={() => setMustNever((prev) => prev.filter((_, i) => i !== idx))}
                  className="shrink-0 rounded-md p-2 text-text-secondary hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove rule"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMustNever((prev) => [...prev, ''])}
            className="mt-2 text-xs font-medium text-cyan hover:underline"
          >
            + Add rule
          </button>
          {mustNever.length > neverVisible && (
            <button
              type="button"
              onClick={() => setNeverVisible((n) => n + 3)}
              className="ml-3 text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              + Add more
            </button>
          )}
        </div>
      </section>

      {divider}

      {/* SECTION B */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Conversation Instructions</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Write step-by-step what this agent should do. Plain language — the agent follows these in
              order.
            </p>
          </div>
          <div className="relative shrink-0" ref={stepGenRef}>
            <button
              type="button"
              onClick={() => setStepGenOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-[#F9FAFB] hover:text-text-primary"
            >
              <Sparkles size={14} className="text-cyan" />
              Generate steps with AI
            </button>
            {stepGenOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,22rem)] rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-lg ring-1 ring-black/5">
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Describe the conversation this agent needs to handle...
                </label>
                <textarea
                  value={stepGenPrompt}
                  onChange={(e) => setStepGenPrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. Payment recovery on WhatsApp after a reminder"
                  className="mb-2 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                />
                <button
                  type="button"
                  onClick={handleGenerateSteps}
                  className="w-full rounded-md bg-cyan py-2 text-sm font-medium text-white hover:bg-cyan/90"
                >
                  Generate
                </button>
              </div>
            )}
          </div>
        </div>

        <Reorder.Group axis="y" values={steps} onReorder={setSteps} className="flex flex-col gap-3">
          {steps.map((step, stepIndex) => {
            const ex = transitionExpanded[step.id];
            const transitionOpen =
              ex !== undefined ? ex : Boolean(step.transitionCondition?.trim());
            const qr = step.quickReplies ?? [];
            const qrSlots = quickReplySlots[step.id] ?? Math.min(3, Math.max(qr.length, qr.some(Boolean) ? qr.length : 0));

            return (
              <Reorder.Item
                key={step.id}
                value={step}
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
                        className="rounded-md p-1 text-text-secondary hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                        aria-label="Remove step"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <textarea
                      value={step.instruction}
                      onChange={(e) => updateStep(step.id, { instruction: e.target.value })}
                      placeholder="Instruction for this step..."
                      rows={3}
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                    />
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setTransitionExpanded((m) => {
                            const cur =
                              m[step.id] !== undefined
                                ? m[step.id]
                                : Boolean(step.transitionCondition?.trim());
                            return { ...m, [step.id]: !cur };
                          })
                        }
                        className="mb-1 flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary"
                      >
                        Transition condition
                        {transitionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {transitionOpen && (
                        <textarea
                          value={step.transitionCondition}
                          onChange={(e) =>
                            updateStep(step.id, { transitionCondition: e.target.value })
                          }
                          placeholder="e.g. Move to next step once identity is confirmed"
                          rows={2}
                          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                        />
                      )}
                    </div>

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
                          {ALL_TOOLS.filter((t) => !step.attachedToolIds.includes(t.id)).map((tool) => (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={() => attachTool(step.id, tool.id)}
                              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              <span className="font-medium text-text-primary">{tool.name}</span>
                              <span className="text-xs text-text-secondary">{tool.description}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-md border border-dashed border-[#E5E7EB] p-3">
                      <p className="mb-2 text-xs font-medium text-text-secondary">
                        Buttons shown to customer at this step
                      </p>
                      {qrSlots > 0 ? (
                        <>
                          {Array.from({ length: qrSlots }).map((_, qi) => (
                            <input
                              key={qi}
                              value={qr[qi] ?? ''}
                              onChange={(e) => {
                                const next = [...(step.quickReplies ?? [])];
                                next[qi] = e.target.value;
                                updateStep(step.id, { quickReplies: next });
                              }}
                              placeholder="e.g. Pay Now"
                              className="mb-2 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm last:mb-0 focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                            />
                          ))}
                          {qrSlots < 3 && (
                            <button
                              type="button"
                              onClick={() =>
                                setQuickReplySlots((m) => ({
                                  ...m,
                                  [step.id]: qrSlots + 1,
                                }))
                              }
                              className="text-xs font-medium text-cyan hover:underline"
                            >
                              + Add quick replies
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setQuickReplySlots((m) => ({
                              ...m,
                              [step.id]: 1,
                            }))
                          }
                          className="text-xs font-medium text-cyan hover:underline"
                        >
                          + Add quick replies
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        <button
          type="button"
          onClick={addStep}
          className="inline-flex items-center gap-2 rounded-md border border-dashed border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-text-secondary hover:border-cyan hover:text-cyan"
        >
          <Plus size={16} />
          Add Step
        </button>
      </section>

      {divider}

      {/* SECTION C */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Global Tool Access</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Tools available throughout the entire conversation. The agent decides when to call them.
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
                <div className="line-clamp-2 text-xs text-text-secondary">{tool.description}</div>
              </button>
            );
          })}
        </div>
      </section>
        </motion.div>
      </div>

      <div className="flex justify-between border-t border-[#F3F4F6] pt-6">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center rounded-md border border-[#E5E7EB] px-6 py-2.5 text-sm font-medium text-text-primary hover:bg-[#F9FAFB]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!isValid}
          className="inline-flex items-center gap-2 rounded-md bg-cyan px-6 py-2.5 text-sm font-medium text-white hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
