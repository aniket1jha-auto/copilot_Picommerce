import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Database,
  Shield,
  Volume2,
  Sliders,
  Play,
  Square,
  Plus,
  X,
  Check,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { AgentConfiguration, FeedbackIntent, VoiceType } from '@/types/agent';
import type { ToolInstance } from '@/types/tool';
import type { AgentKBAttachment } from '@/types/knowledgeBase';
import { VOICE_OPTIONS, LANGUAGE_OPTIONS, PROMPT_TEMPLATES } from '@/data/agentConstants';
import { KBPicker } from './KBPicker';
import { ChannelIdentityChat } from './ChannelIdentityChat';
import { Input, Select, cn } from '@/components/ui';
import { useToolsStore } from '@/store/toolsStore';

/** Slug a tool name so it works as an @mention token. */
function toolSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

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

  // Configured tools the user can @-reference from the prompt.
  const configuredTools = useToolsStore((s) => s.tools);

  // Role + Tone + Conversation Steps were removed in favour of a single
  // Retell-style prompt textarea. We preserve whatever was already on
  // the agent so legacy consumers don't see fields blanked on save.
  const preservedRole = config.personality.role;
  const preservedTone = config.personality.tone;
  const preservedTraits = config.personality.traits;

  // System prompt — the single source of behavioral instruction now.
  // Tools are referenced inline via @tool_name mentions.
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt);

  // 4. Knowledge
  const [kbAttachments, setKbAttachments] = useState<AgentKBAttachment[]>(
    () => config.knowledgeBases ?? [],
  );

  // 5. Feedback Intents — post-call tagging vocabulary. Replaces the
  // old Guardrails (Do's/Don'ts/Key Intents). Optional.
  const [feedbackIntents, setFeedbackIntents] = useState<FeedbackIntent[]>(
    () => config.feedbackIntents ?? [],
  );

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

  // Only the prompt is required now. Feedback intents are optional —
  // an agent without tags simply means calls land uncategorized.
  const missingPrompt = systemPrompt.trim().length === 0;
  const isValid = !missingPrompt;

  /* ─── Mention resolution ───────────────────────────────────────────── */
  // Parse @tool_name mentions out of the prompt and resolve them to
  // the matching configured-tool instance ids. These get mirrored
  // into both `attachedToolIds` (on the synthetic single instruction
  // step we keep for back-compat) and `globalToolIds`.

  const mentionedToolIds = useMemo(() => {
    const matches = systemPrompt.match(/@[a-zA-Z0-9_]+/g) ?? [];
    const wanted = new Set(matches.map((m) => m.slice(1).toLowerCase()));
    return configuredTools
      .filter((t) => wanted.has(toolSlug(t.name)))
      .map((t) => t.id);
  }, [systemPrompt, configuredTools]);

  /* ─── Actions ──────────────────────────────────────────────────────── */

  const handleNext = () => {
    onSave({
      // Preserve previously-set role/tone/traits so existing agents
      // don't get their personality wiped on save.
      personality: { traits: preservedTraits, tone: preservedTone, role: preservedRole },
      systemPrompt,
      // Synthesize a single instruction step from the prompt so
      // downstream code that walks instructionSteps (review screen,
      // mock agents, etc.) keeps working.
      instructionSteps: [
        {
          id: 'inst-prompt',
          instruction: systemPrompt,
          transitionCondition: '',
          attachedToolIds: mentionedToolIds,
          quickReplies: [],
        },
      ],
      globalToolIds: mentionedToolIds,
      knowledgeBases: kbAttachments,
      // Filter blank intents before saving — only persist entries that
      // have at least a label so dashboards aren't polluted by drafts.
      feedbackIntents: feedbackIntents.filter((f) => f.label.trim().length > 0),
      // Preserve legacy guardrail fields so existing agents don't get
      // them wiped on save. We just don't ask for them anymore.
      objectives: config.objectives,
      guidelines: config.guidelines,
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

      {/* 1. Prompt — single Retell-style textarea with @-tool mentions
            and an optional template populate button up top. */}
      <Section
        icon={FileText}
        title="Prompt"
        subtitle="Write one prompt describing the agent's role, tone, and behavior. Reference tools you've configured by typing @tool_name."
      >
        <PromptEditor
          value={systemPrompt}
          onChange={setSystemPrompt}
          tools={configuredTools}
          missing={missingPrompt}
        />
      </Section>

      {/* 4. Knowledge */}
      <Section
        icon={Database}
        title="Knowledge"
        subtitle="Attach knowledge bases the agent can retrieve from at runtime."
      >
        <KBPicker attachments={kbAttachments} onChange={setKbAttachments} />
      </Section>

      {/* 5. Feedback Intents — post-call tagging vocabulary */}
      <Section
        icon={Shield}
        title="Feedback Intents"
        subtitle="Define the tags the platform should apply to a conversation once the call ends — your team uses these to categorize outcomes in dashboards. For example: Interested, Not Eligible, Callback Requested."
      >
        <FeedbackIntentsEditor
          intents={feedbackIntents}
          onChange={setFeedbackIntents}
        />
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

interface SectionProps {
  icon: LucideIcon;
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

/* ─── FeedbackIntentsEditor ────────────────────────────────────────────
 * Add-a-pair editor for post-call tagging. Each row is a {label,
 * description} tuple: the label is the short tag dashboards show,
 * the description tells reviewers (and the LLM) when to apply it.
 *
 * Empty state shows the canonical example so users immediately
 * understand the shape — "Interested → User was interested to take
 * a loan".
 * ─────────────────────────────────────────────────────────────────── */

interface FeedbackIntentsEditorProps {
  intents: FeedbackIntent[];
  onChange: (next: FeedbackIntent[]) => void;
}

function newIntentId(): string {
  return `fi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function FeedbackIntentsEditor({ intents, onChange }: FeedbackIntentsEditorProps) {
  function addIntent() {
    onChange([...intents, { id: newIntentId(), label: '', description: '' }]);
  }

  function updateIntent(id: string, patch: Partial<FeedbackIntent>) {
    onChange(intents.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function removeIntent(id: string) {
    onChange(intents.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-3">
      {intents.length === 0 && (
        <div className="rounded-md border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-3 py-3 text-[12px] leading-relaxed text-text-secondary">
          <p className="font-medium text-text-primary">
            Add at least one intent to enable post-call tagging.
          </p>
          <p className="mt-1">
            <span className="font-mono text-[11.5px] text-text-primary">Interested</span>
            <span className="text-text-tertiary"> : </span>
            <span>User was interested to take a loan</span>
          </p>
        </div>
      )}

      {intents.length > 0 && (
        <div className="grid grid-cols-[160px_1fr_auto] gap-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
          <span>Label</span>
          <span>Description</span>
          <span aria-hidden />
        </div>
      )}

      {intents.map((intent) => (
        <div key={intent.id} className="grid grid-cols-[160px_1fr_auto] items-start gap-2">
          <input
            type="text"
            value={intent.label}
            onChange={(e) => updateIntent(intent.id, { label: e.target.value })}
            placeholder="Interested"
            className="rounded-md border border-[#E5E7EB] px-3 py-1.5 text-[13px] font-mono focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
          <input
            type="text"
            value={intent.description}
            onChange={(e) => updateIntent(intent.id, { description: e.target.value })}
            placeholder="User was interested to take a loan"
            className="rounded-md border border-[#E5E7EB] px-3 py-1.5 text-[13px] focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
          <button
            type="button"
            onClick={() => removeIntent(intent.id)}
            aria-label="Remove intent"
            className="rounded-md p-1.5 text-text-tertiary hover:bg-error-soft hover:text-error"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addIntent}
        className="inline-flex items-center gap-1 text-[12px] font-medium text-cyan hover:underline"
      >
        <Plus size={12} />
        Add intent
      </button>
    </div>
  );
}

/* ─── PromptEditor ────────────────────────────────────────────────────── */

/**
 * Retell-style prompt editor:
 *   • "Start from template" dropdown above the textarea — populates the
 *     prompt with a pre-built starter.
 *   • Plain textarea below. Typing `@` opens an inline picker over the
 *     user's configured tools (from useToolsStore). Selecting a tool
 *     inserts `@tool_slug ` at the cursor.
 *   • Helper chips below the textarea show which tools the prompt
 *     currently references and link out to /tools for new ones.
 */
interface PromptEditorProps {
  value: string;
  onChange: (next: string) => void;
  tools: ToolInstance[];
  missing: boolean;
}

function PromptEditor({ value, onChange, tools, missing }: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  /**
   * Mention state — set while the user is typing `@<query>` immediately
   * before the cursor. `anchor` is the byte index of the `@`. We use it
   * to splice in the chosen tool slug.
   */
  const [mention, setMention] = useState<{ query: string; anchor: number } | null>(null);
  const [highlightIdx, setHighlightIdx] = useState(0);

  const filteredTools = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return tools.filter((t) => {
      const slug = toolSlug(t.name);
      return slug.includes(q) || t.name.toLowerCase().includes(q);
    });
  }, [tools, mention]);

  // Keep highlight in range as the filtered list changes.
  useEffect(() => {
    if (highlightIdx >= filteredTools.length) setHighlightIdx(0);
  }, [filteredTools.length, highlightIdx]);

  /** Scan back from cursor for an active `@<word>` token. */
  function detectMention(text: string, cursor: number) {
    let i = cursor - 1;
    while (i >= 0 && /[a-zA-Z0-9_]/.test(text[i])) i--;
    if (i >= 0 && text[i] === '@') {
      const query = text.slice(i + 1, cursor);
      setMention({ query, anchor: i });
      setHighlightIdx(0);
    } else {
      setMention(null);
    }
  }

  function onTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    detectMention(e.target.value, e.target.selectionStart ?? 0);
  }

  function onSelectClick() {
    const ta = textareaRef.current;
    if (!ta) return;
    detectMention(ta.value, ta.selectionStart ?? 0);
  }

  function insertMention(tool: ToolInstance) {
    if (!mention) return;
    const slug = toolSlug(tool.name);
    const before = value.slice(0, mention.anchor);
    const after = value.slice(mention.anchor + 1 + mention.query.length);
    // Trailing space so the user can keep typing after the mention.
    const next = `${before}@${slug} ${after}`;
    onChange(next);
    setMention(null);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      const pos = before.length + 1 + slug.length + 1;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mention || filteredTools.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % filteredTools.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => (i - 1 + filteredTools.length) % filteredTools.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const chosen = filteredTools[highlightIdx];
      if (chosen) insertMention(chosen);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setMention(null);
    }
  }

  // Compute which tools are currently referenced in the prompt (for the
  // helper chips beneath the textarea — independent of the active mention).
  const referencedTools = useMemo(() => {
    const matches = value.match(/@[a-zA-Z0-9_]+/g) ?? [];
    const wanted = new Set(matches.map((m) => m.slice(1).toLowerCase()));
    return tools.filter((t) => wanted.has(toolSlug(t.name)));
  }, [value, tools]);

  return (
    <div className="space-y-2">
      {/* Template populate row */}
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-medium text-text-secondary">
          Prompt *
        </label>
        <TemplatePicker
          open={templateOpen}
          onOpenChange={setTemplateOpen}
          onPick={(prompt) => onChange(prompt)}
          hasExisting={value.trim().length > 0}
        />
      </div>

      {/* Textarea + mention popup */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onTextChange}
          onClick={onSelectClick}
          onKeyUp={onSelectClick}
          onKeyDown={onKeyDown}
          rows={14}
          placeholder={
            'You are a friendly sales rep at [Company]. Greet the customer, qualify them, and book a callback.\n\nUse @kb_query_recovery_playbook to look up scripts.\nWhen the customer is ready to hang up, call @polite_goodbye.'
          }
          className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 font-mono text-[13px] focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          data-testid="system-prompt-input"
          spellCheck
        />
        {mention && (
          <MentionPopup
            tools={filteredTools}
            highlightIdx={highlightIdx}
            query={mention.query}
            onSelect={insertMention}
            onClose={() => setMention(null)}
          />
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] leading-snug text-text-tertiary">
          Type <code className="rounded bg-[#F3F4F6] px-1 py-px font-mono text-[10.5px]">@</code>{' '}
          to reference a tool you've configured. Create new tools in{' '}
          <Link to="/tools" className="font-medium text-cyan hover:underline">
            Tools →
          </Link>
        </p>
        {missing && (
          <p className="shrink-0 text-[11px] text-error">A prompt is required.</p>
        )}
      </div>

      {referencedTools.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
            Referenced tools:
          </span>
          {referencedTools.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-full bg-cyan/10 px-2 py-0.5 text-[11px] font-medium text-cyan"
            >
              @{toolSlug(t.name)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── @-mention popup ─────────────────────────────────────────────────── */

function MentionPopup({
  tools,
  highlightIdx,
  query,
  onSelect,
  onClose,
}: {
  tools: ToolInstance[];
  highlightIdx: number;
  query: string;
  onSelect: (t: ToolInstance) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-md border border-[#E5E7EB] bg-white shadow-lg"
      // Mousedown would steal focus from the textarea before we can splice.
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="border-b border-[#F3F4F6] px-3 py-1.5">
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
          Tools {query && <span className="font-mono normal-case text-text-secondary">— @{query}</span>}
        </p>
      </div>
      {tools.length === 0 ? (
        <div className="px-3 py-3">
          <p className="text-[12px] text-text-secondary">
            No tools match "@{query}".
          </p>
          <Link
            to="/tools"
            onClick={onClose}
            className="mt-1 inline-block text-[11px] font-medium text-cyan hover:underline"
          >
            Create a tool →
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col">
          {tools.map((t, idx) => {
            const active = idx === highlightIdx;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(t)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
                    active ? 'bg-cyan/10' : 'hover:bg-cyan/5',
                  )}
                >
                  <span className="font-mono text-[11.5px] font-semibold text-cyan">
                    @{toolSlug(t.name)}
                  </span>
                  <span className="truncate text-[12px] text-text-secondary">{t.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─── Template picker (above the prompt) ─────────────────────────────── */

function TemplatePicker({
  open,
  onOpenChange,
  onPick,
  hasExisting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (prompt: string) => void;
  hasExisting: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  function pick(template: (typeof PROMPT_TEMPLATES)[number]) {
    if (
      hasExisting &&
      !window.confirm(
        `Replace the current prompt with the "${template.name}" template?`,
      )
    ) {
      return;
    }
    onPick(template.systemPrompt);
    onOpenChange(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11.5px] font-medium text-text-primary transition-colors hover:border-cyan/40"
      >
        <Sparkles size={12} className="text-cyan" />
        Start from template
        <ChevronDown size={11} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-72 overflow-hidden rounded-md border border-[#E5E7EB] bg-white shadow-lg"
        >
          <div className="border-b border-[#F3F4F6] px-3 py-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
              Pre-built prompts
            </p>
          </div>
          <ul>
            {PROMPT_TEMPLATES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => pick(t)}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-cyan/5"
                >
                  <span className="text-[12.5px] font-semibold text-text-primary">{t.name}</span>
                  <span className="text-[10.5px] text-text-tertiary">
                    Pre-configured starter you can edit
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
