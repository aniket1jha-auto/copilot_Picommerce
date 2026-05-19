import { useCallback, useMemo, useState } from 'react';
import {
  User,
  Mic,
  ListOrdered,
  Database,
  Shield,
  Volume2,
  Sliders,
  Play,
  Square,
  Plus,
  X,
  Check,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  AgentConfiguration,
  InstructionStep,
  VoiceType,
} from '@/types/agent';
import type { AgentKBAttachment } from '@/types/knowledgeBase';
import { TONE_OPTIONS, VOICE_OPTIONS, LANGUAGE_OPTIONS } from '@/data/agentConstants';
import { KBPicker } from './KBPicker';
import { ChannelIdentityChat } from './ChannelIdentityChat';
import { Input, Select, cn } from '@/components/ui';

interface Props {
  config: AgentConfiguration;
  onSave: (config: Partial<AgentConfiguration>) => void;
  onNext: () => void;
  onPrev: () => void;
}

/**
 * Unified Prompts & Instructions step — the 3-step wizard's middle
 * page. Replaces the old separate System Prompt / Instructions /
 * Voice / Advanced Settings screens.
 *
 * Layout (per spec):
 *   1. Role         — who the agent is
 *   2. Tone         — default tone + personality traits
 *   3. Steps        — ordered conversation instructions
 *   4. Knowledge    — picker over the central /knowledge-base catalog
 *   5. Guardrails   — Do's / Don'ts / Key Intents
 *   6. Voice        — picker + browser preview  (voice agents)
 *      Channel     — WhatsApp/SMS/RCS settings (chat agents — delegated)
 *   7. Advanced    — LLM creativity, response length, conversation timing
 */
export function PromptsAndInstructionsStep(props: Props) {
  if (props.config.type === 'chat') {
    // For chat agents, we still want the new layout, but voice doesn't
    // apply. The existing Channel & Identity screen owns the chat-only
    // setup; we keep it as the final section.
    return <PromptsAndInstructionsVoiceStep {...props} chatChannelSection />;
  }
  return <PromptsAndInstructionsVoiceStep {...props} />;
}

function PromptsAndInstructionsVoiceStep({
  config,
  onSave,
  onNext,
  onPrev,
  chatChannelSection = false,
}: Props & { chatChannelSection?: boolean }) {
  /* ─── State ────────────────────────────────────────────────────────── */

  // 1. Role
  const [role, setRole] = useState(config.personality.role);

  // 2. Tone
  const [tone, setTone] = useState(config.personality.tone);
  // Personality traits removed from the UI — preserve whatever was on
  // the existing agent so editing doesn't blow away pre-existing data.
  const traits = config.personality.traits;

  // 3. Steps & system prompt
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt);
  const [steps, setSteps] = useState<InstructionStep[]>(
    () =>
      config.instructionSteps?.length
        ? config.instructionSteps
        : [
            {
              id: newStepId(),
              instruction: '',
              transitionCondition: '',
              attachedToolIds: [],
              quickReplies: [],
            },
          ],
  );

  // 4. Knowledge
  const [kbAttachments, setKbAttachments] = useState<AgentKBAttachment[]>(
    () => config.knowledgeBases ?? [],
  );

  // 5. Guardrails
  const [objectives, setObjectives] = useState<string[]>(config.objectives);
  const [dos, setDos] = useState<string[]>(config.guidelines.dos);
  const [donts, setDonts] = useState<string[]>(config.guidelines.donts);

  // 6. Voice (voice agents only — chat path handled in section 6b below)
  const [voice, setVoice] = useState<VoiceType>(config.voice);
  const [previewVoiceId, setPreviewVoiceId] = useState<VoiceType | null>(null);

  // 7. Advanced (voice agents — chat agents use the legacy AdvancedChatSettings via a dedicated step before we collapse it; left as-is in chat path)
  const [temperature, setTemperature] = useState(config.llmConfig.temperature);
  const [maxTokens, setMaxTokens] = useState(config.llmConfig.maxTokens);
  const [silenceTimeout, setSilenceTimeout] = useState(
    config.conversationSettings.silenceTimeout,
  );
  const [maxDuration, setMaxDuration] = useState(config.conversationSettings.maxDuration);
  const [language, setLanguage] = useState(config.conversationSettings.language);
  const [allowInterruptions, setAllowInterruptions] = useState(
    config.audioConfig.allowInterruptions,
  );

  /* ─── Validation ───────────────────────────────────────────────────── */

  const hasIntent = objectives.some((o) => o.trim().length > 0);
  const missingRole = role.trim().length === 0;
  const missingPrompt = systemPrompt.trim().length === 0;
  const missingStep = steps.every((s) => !s.instruction.trim());
  const isValid = !missingRole && !missingPrompt && !missingStep && hasIntent;

  /* ─── Actions ──────────────────────────────────────────────────────── */

  const updateStep = useCallback(
    (id: string, patch: Partial<InstructionStep>) => {
      setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    },
    [],
  );

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      {
        id: newStepId(),
        instruction: '',
        transitionCondition: '',
        attachedToolIds: [],
        quickReplies: [],
      },
    ]);
  }, []);

  const handleNext = () => {
    onSave({
      personality: { traits, tone, role },
      systemPrompt,
      instructionSteps: steps,
      knowledgeBases: kbAttachments,
      objectives,
      guidelines: { dos, donts },
      voice,
      llmConfig: { ...config.llmConfig, temperature, maxTokens },
      conversationSettings: {
        ...config.conversationSettings,
        silenceTimeout,
        maxDuration,
        language,
      },
      audioConfig: { ...config.audioConfig, allowInterruptions },
    });
    onNext();
  };

  /* ─── Voice preview ─────────────────────────────────────────────────── */
  //
  // Uses the browser's built-in SpeechSynthesis. Not a true preview of
  // the model's actual voice, but lets the user hear sample copy in
  // their browser without any network calls or audio assets — the same
  // technique Vapi uses for offline preview.

  const playPreview = useCallback((voiceOption: (typeof VOICE_OPTIONS)[number]) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(
      `Hi, this is ${voiceOption.name}. I'm a ${voiceOption.characteristics.join(', ')} voice. ` +
        `Here's a short sample so you can hear how I sound.`,
    );
    // Try to find a voice matching characteristics; otherwise default
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      const match =
        voices.find((v) => v.name.toLowerCase().includes(voiceOption.id)) ??
        voices.find((v) => v.lang.startsWith('en')) ??
        voices[0];
      utter.voice = match;
    }
    utter.onend = () => setPreviewVoiceId(null);
    utter.onerror = () => setPreviewVoiceId(null);
    setPreviewVoiceId(voiceOption.id);
    window.speechSynthesis.speak(utter);
  }, []);

  const stopPreview = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setPreviewVoiceId(null);
  }, []);

  const speechSupported = useMemo(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
    [],
  );

  /* ─── Render ───────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-1">Prompts & Instructions</h2>
        <p className="text-sm text-text-secondary">
          Define who the agent is, how it speaks, what it does — and tune voice &amp; runtime
          behavior. All in one place.
        </p>
      </div>

      {/* 1. Role */}
      <Section icon={User} title="Role" subtitle="Who is this agent? (e.g., Sales rep, Support agent, Loan recovery specialist)">
        <Input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g., Sales Representative"
          error={missingRole ? 'Role is required' : undefined}
          data-testid="role-input"
        />
      </Section>

      {/* 2. Tone */}
      <Section
        icon={Mic}
        title="Tone"
        subtitle="Default communication style for the agent."
      >
        <Select
          label="Tone"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          data-testid="tone-select"
        >
          {TONE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Section>

      {/* 3. Steps & Instructions */}
      <Section
        icon={ListOrdered}
        title="Steps & Instructions"
        subtitle="Write the overall system prompt + the ordered playbook the agent should follow."
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
              System prompt *
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant that…&#10;&#10;Your main goal is to…&#10;&#10;Key responsibilities:&#10;- …"
              rows={6}
              className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 font-mono text-[13px] focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
              data-testid="system-prompt-input"
            />
            {missingPrompt && (
              <p className="mt-1 text-[11px] text-error">A system prompt is required.</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
              Conversation steps *
            </label>
            <ul className="flex flex-col gap-2">
              {steps.map((step, idx) => (
                <li key={step.id} className="rounded-md border border-[#E5E7EB] bg-white p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-[11px] font-semibold text-cyan">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <textarea
                        value={step.instruction}
                        onChange={(e) => updateStep(step.id, { instruction: e.target.value })}
                        placeholder="What should the agent do at this step?"
                        rows={2}
                        className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-[13px] focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                      />
                      <input
                        value={step.transitionCondition ?? ''}
                        onChange={(e) =>
                          updateStep(step.id, { transitionCondition: e.target.value })
                        }
                        placeholder="Optional: when to move on (e.g., once the customer confirms identity)"
                        className="w-full rounded-md border border-[#E5E7EB] px-3 py-1.5 text-[12px] text-text-secondary focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                      />
                    </div>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        aria-label="Remove step"
                        className="rounded-md p-1.5 text-text-tertiary transition-colors hover:bg-error-soft hover:text-error"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addStep}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-cyan hover:underline"
            >
              <Plus size={12} />
              Add step
            </button>
            {missingStep && (
              <p className="mt-1 text-[11px] text-error">Add at least one step with instructions.</p>
            )}
          </div>
        </div>
      </Section>

      {/* 4. Knowledge */}
      <Section
        icon={Database}
        title="Knowledge"
        subtitle="Attach knowledge bases the agent can retrieve from at runtime."
      >
        <KBPicker attachments={kbAttachments} onChange={setKbAttachments} />
      </Section>

      {/* 5. Guardrails / Do's & Don'ts */}
      <Section
        icon={Shield}
        title="Guardrails"
        subtitle="What the agent must accomplish — and what it must never do."
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
              Key intents *
            </label>
            <ListEditor
              items={objectives}
              onChange={setObjectives}
              placeholder="e.g., Qualify lead, capture call-back time"
              addLabel="Add intent"
            />
            {!hasIntent && (
              <p className="mt-1 text-[11px] text-error">Add at least one key intent.</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
                Do's
              </label>
              <ListEditor
                items={dos}
                onChange={setDos}
                placeholder="Do this…"
                addLabel="Add Do"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
                Don'ts
              </label>
              <ListEditor
                items={donts}
                onChange={setDonts}
                placeholder="Don't do this…"
                addLabel="Add Don't"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* 6. Voice (voice agents) — or — Channel & Identity (chat agents) */}
      {chatChannelSection ? (
        <Section
          icon={Volume2}
          title="Channel & Identity"
          subtitle="Where this chat agent lives and how it identifies itself."
        >
          {/* Chat agents render the existing channel-identity content
              inline here. Its internal Back/Continue footer is hidden
              by passing no-op handlers; navigation happens via our
              own footer below. */}
          <ChannelIdentityChat
            config={config}
            onSave={onSave}
            onNext={() => undefined}
            onPrev={() => undefined}
            hideFooter
          />
        </Section>
      ) : (
        <Section
          icon={Volume2}
          title="Voice"
          subtitle={
            speechSupported
              ? 'Pick a voice and click Play to hear a sample.'
              : 'Pick a voice. Browser preview unavailable in this environment.'
          }
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {VOICE_OPTIONS.map((option) => {
              const active = voice === option.id;
              const playing = previewVoiceId === option.id;
              return (
                <div
                  key={option.id}
                  className={cn(
                    'rounded-md border-2 p-3 transition-all',
                    active ? 'border-cyan bg-cyan/5' : 'border-[#E5E7EB] hover:border-cyan/40',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setVoice(option.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-text-primary">
                          {option.name}
                        </span>
                        {active && <Check size={13} className="text-cyan" strokeWidth={2.5} />}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
                        {option.description}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {option.characteristics.map((c, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-cyan/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </button>
                    <button
                      type="button"
                      disabled={!speechSupported}
                      onClick={() => (playing ? stopPreview() : playPreview(option))}
                      aria-label={playing ? `Stop ${option.name} preview` : `Play ${option.name} sample`}
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                        playing
                          ? 'bg-cyan text-white'
                          : 'border border-[#E5E7EB] text-text-secondary hover:border-cyan/40 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                    >
                      {playing ? <Square size={11} /> : <Play size={11} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* 7. Advanced (voice agents only — chat agents have their own
          advanced settings panel inside the channel section above) */}
      {!chatChannelSection && (
        <Section
          icon={Sliders}
          title="Advanced settings"
          subtitle="Runtime tuning — creativity, response length, conversation timing."
          collapsible
          defaultCollapsed
        >
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-text-secondary">
                  Creativity: {temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="mt-0.5 flex justify-between text-[10px] text-text-tertiary">
                  <span>Predictable</span>
                  <span>Creative</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-text-tertiary">
                  Lower sticks closer to the script. Higher varies wording. Recovery + KYC tend
                  to work best at 0.2–0.4.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-text-secondary">
                  Max response length: ~{Math.round(maxTokens * 0.75).toLocaleString()} words
                </label>
                <input
                  type="range"
                  min="512"
                  max="4096"
                  step="256"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                  className="w-full"
                />
                <div className="mt-0.5 flex justify-between text-[10px] text-text-tertiary">
                  <span>~380 words</span>
                  <span>~3,000 words</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-text-tertiary">
                  Longest single reply in one turn. Voice calls rarely need more than ~1,200.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                type="number"
                label="Silence timeout (s)"
                min={3}
                max={15}
                value={silenceTimeout}
                onChange={(e) => setSilenceTimeout(parseInt(e.target.value, 10) || 5)}
              />
              <Input
                type="number"
                label="Max duration (s)"
                min={60}
                max={1800}
                step={60}
                value={maxDuration}
                onChange={(e) => setMaxDuration(parseInt(e.target.value, 10) || 600)}
              />
              <Select label="Language" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGE_OPTIONS.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>

            <label className="flex items-center gap-2 text-[13px] text-text-primary">
              <input
                type="checkbox"
                checked={allowInterruptions}
                onChange={(e) => setAllowInterruptions(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-cyan focus:ring-cyan"
              />
              Allow user interruptions during agent speech
            </label>

            <div className="rounded-md border border-border-subtle bg-surface-sunken px-3 py-2.5 text-[11px] text-text-secondary">
              <strong className="text-text-primary">Compliance:</strong> Content filtering, PII
              detection, recording consent, and TCPA are always enabled and cannot be turned off
              from this surface.
            </div>
          </div>
        </Section>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-2 rounded-md border border-[#E5E7EB] px-5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!isValid}
          className="inline-flex items-center gap-2 rounded-md bg-cyan px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function newStepId(): string {
  return `step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

interface SectionProps {
  icon: typeof User;
  title: string;
  subtitle?: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
  collapsible = false,
  defaultCollapsed = false,
}: SectionProps) {
  const [open, setOpen] = useState(!defaultCollapsed);
  return (
    <section className="rounded-lg border border-[#E5E7EB] bg-white">
      <header className="flex items-start gap-3 px-4 py-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan/10 text-cyan">
          <Icon size={14} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold text-text-primary">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12px] text-text-secondary">{subtitle}</p>}
        </div>
        {collapsible && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[12px] font-medium text-cyan hover:underline"
          >
            {open ? 'Hide' : 'Show'}
          </button>
        )}
      </header>
      {open && <div className="border-t border-[#F3F4F6] px-4 py-4">{children}</div>}
    </section>
  );
}

interface ListEditorProps {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  addLabel: string;
}

function ListEditor({ items, onChange, placeholder, addLabel }: ListEditorProps) {
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[idx] = e.target.value;
              onChange(next);
            }}
            placeholder={placeholder}
            className="flex-1 rounded-md border border-[#E5E7EB] px-3 py-1.5 text-[13px] focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
            aria-label="Remove"
            className="rounded-md p-1 text-text-tertiary hover:bg-error-soft hover:text-error"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="inline-flex items-center gap-1 text-[12px] font-medium text-cyan hover:underline"
      >
        <Plus size={12} />
        {addLabel}
      </button>
    </div>
  );
}
