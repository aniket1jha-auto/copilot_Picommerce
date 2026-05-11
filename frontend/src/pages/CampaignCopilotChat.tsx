import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Send, Wand2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePhaseData } from '@/hooks/usePhaseData';
import {
  getOpener,
  processBuilding,
  isReadyToLaunch,
  type BuildingState,
} from '@/components/campaign/copilot/copilotFlow';
import { synthesizeJourney } from '@/components/campaign/copilot/journeySynth';
import { MiniJourneyDiagram } from '@/components/campaign/copilot/MiniJourneyDiagram';
import { useCopilotStore, type CopilotMessage } from '@/store/copilotStore';

let msgIdCounter = 0;
const newMsgId = () => `m-${++msgIdCounter}-${Date.now()}`;

export function CampaignCopilotChat() {
  const navigate = useNavigate();
  const { segments } = usePhaseData();

  // Session state lives in the store so it survives navigation to/from the
  // review page.
  const building = useCopilotStore((s) => s.building);
  const messages = useCopilotStore((s) => s.messages);
  const handedOff = useCopilotStore((s) => s.handedOff);
  const setBuilding = useCopilotStore((s) => s.setBuilding);
  const appendMessage = useCopilotStore((s) => s.appendMessage);
  const setMessages = useCopilotStore((s) => s.setMessages);
  const setHandedOff = useCopilotStore((s) => s.setHandedOff);

  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const ctx = useMemo(() => ({ segments }), [segments]);

  // Seed opener once per session
  useEffect(() => {
    if (messages.length === 0) {
      const opener = getOpener();
      setMessages([
        {
          id: newMsgId(),
          role: 'assistant',
          text: opener.text,
          suggestions: opener.suggestions,
          timestamp: Date.now(),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoscroll
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  function handoffToCanvas(state: BuildingState) {
    const synthed = synthesizeJourney(state.steps);
    const draft = {
      campaignType: 'journey' as const,
      name: state.name ?? 'Untitled Campaign',
      segmentId: state.segmentId ?? '',
      channels: [...new Set(state.steps.map((s) => s.channel))],
      journey: synthed,
      goal: {
        description: state.goalDescription ?? '',
        goals: [],
        goalsOperator: 'or' as const,
        tentativeBudget: '',
      },
    };
    setHandedOff(true);
    navigate('/campaigns/copilot/review', {
      state: { campaignDraft: draft },
    });
  }

  function send(rawText: string) {
    const text = rawText.trim();
    if (!text || thinking || handedOff) return;

    appendMessage({
      id: newMsgId(),
      role: 'user',
      text,
      timestamp: Date.now(),
    });
    setInput('');
    setThinking(true);

    const delay = 380 + Math.min(text.length * 6, 700);
    window.setTimeout(() => {
      const res = processBuilding(text, building, ctx);
      setBuilding(res.newState);

      if (res.finalize) {
        // User confirmed launch from review focus. Hand off to canvas.
        handoffToCanvas(res.newState);
        setThinking(false);
        return;
      }

      const message: CopilotMessage = {
        id: newMsgId(),
        role: 'assistant',
        text: res.text,
        applied: res.applied,
        suggestions: res.suggestions,
        timestamp: Date.now(),
      };

      // Note: the "Open Journey Builder" CTA lives only in the right preview
      // panel — single, persistent affordance. Don't duplicate it inside chat
      // bubbles.
      appendMessage(message);
      setThinking(false);
    }, delay);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Campaign Copilot"
          subtitle="Describe what you want; the copilot wires the journey as we go. Validate it on the canvas before launch."
        />
        <button
          type="button"
          onClick={() => navigate('/campaigns')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3.5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-[#F9FAFB]"
        >
          <ArrowLeft size={14} />
          Exit
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        {/* Chat column */}
        <section className="flex h-[calc(100vh-220px)] min-h-[560px] flex-col overflow-hidden rounded-xl bg-white ring-1 ring-[#E5E7EB]">
          <ChatHeader state={building} />
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
            <div className="mx-auto flex max-w-[720px] flex-col gap-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} onSuggestion={(s) => send(s)} />
              ))}
              {thinking && <ThinkingDots />}
            </div>
          </div>
          <Composer
            value={input}
            onChange={setInput}
            onSend={() => send(input)}
            disabled={thinking || handedOff}
          />
        </section>

        {/* Live preview */}
        <PreviewPanel
          state={building}
          onLaunch={() => handoffToCanvas(building)}
        />
      </div>
    </div>
  );
}

/* ─── Header ───────────────────────────────────────────────────────────── */

function ChatHeader({ state }: { state: BuildingState }) {
  const focusLabel: Record<BuildingState['focus'], string> = {
    goal: 'Goal',
    audience: 'Audience',
    design: 'Journey design',
    template: 'Templates',
    review: 'Review',
  };
  return (
    <div className="border-b border-[#F3F4F6] bg-gradient-to-r from-cyan/5 via-purple-50 to-pink-50 px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-cyan/20">
            <Sparkles size={16} className="text-cyan" />
          </div>
          <div>
            <div className="text-[12.5px] font-semibold text-text-primary">Campaign Copilot</div>
            <div className="text-[10.5px] text-text-secondary">
              Currently focused on: <span className="font-medium text-text-primary">{focusLabel[state.focus]}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Messages ─────────────────────────────────────────────────────────── */

function MessageBubble({
  message,
  onSuggestion,
}: {
  message: CopilotMessage;
  onSuggestion: (s: string) => void;
}) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-cyan px-4 py-2.5 text-[14px] leading-relaxed text-white">
          {message.text}
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-start gap-3"
    >
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cyan/20 to-purple-100">
        <Sparkles size={15} className="text-cyan" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-md bg-[#F4F5F7] px-4 py-3 text-[14px] leading-relaxed text-text-primary">
          <RichText text={message.text} />
        </div>
        {message.applied && message.applied.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.applied.map((a, i) => (
              <span
                key={`${a}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700 ring-1 ring-green-200"
              >
                <Wand2 size={11} />
                {a}
              </span>
            ))}
          </div>
        )}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {message.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestion(s)}
                className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-[12px] text-text-secondary transition-colors hover:border-cyan/40 hover:bg-cyan/5 hover:text-text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {renderInline(line)}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

function renderInline(line: string): React.ReactNode {
  const tokens: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) tokens.push(line.slice(last, m.index));
    const piece = m[0];
    if (piece.startsWith('**')) {
      tokens.push(
        <strong key={`b-${i++}`} className="font-semibold text-text-primary">
          {piece.slice(2, -2)}
        </strong>,
      );
    } else {
      tokens.push(
        <em key={`i-${i++}`} className="text-text-secondary">
          {piece.slice(1, -1)}
        </em>,
      );
    }
    last = re.lastIndex;
  }
  if (last < line.length) tokens.push(line.slice(last));
  return tokens;
}

function ThinkingDots() {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cyan/20 to-purple-100">
        <Sparkles size={15} className="text-cyan" />
      </div>
      <div className="rounded-2xl rounded-tl-md bg-[#F4F5F7] px-4 py-3.5">
        <span className="inline-flex gap-1">
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-text-tertiary"
      style={{ animation: `pi-pulse 1.4s ease-in-out ${delay}ms infinite` }}
    />
  );
}

/* ─── Composer ─────────────────────────────────────────────────────────── */

function Composer({
  value,
  onChange,
  onSend,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 160)}px`;
  }, [value]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="border-t border-[#F3F4F6] bg-white px-4 pt-3 pb-3">
      <div className="mx-auto flex max-w-[720px] items-end gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2.5 transition-[border-color,box-shadow] duration-150 hover:border-[#D1D5DB] focus-within:border-cyan focus-within:shadow-[0_0_0_3px_rgba(34,179,229,0.12)]">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Reply to the copilot, or describe what you want…"
          className="max-h-[160px] min-h-[22px] flex-1 resize-none bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:!shadow-none"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan text-white transition-colors hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </div>
      <p className="mx-auto mt-2 max-w-[720px] px-1 text-[11px] text-text-tertiary">
        Powered by AI · may make mistakes. Press <kbd className="rounded bg-[#F3F4F6] px-1">⏎</kbd> to send,{' '}
        <kbd className="rounded bg-[#F3F4F6] px-1">Shift+⏎</kbd> for newline.
      </p>
    </div>
  );
}

/* ─── Live preview panel ───────────────────────────────────────────────── */

function PreviewPanel({
  state,
  onLaunch,
}: {
  state: BuildingState;
  onLaunch: () => void;
}) {
  const ready = isReadyToLaunch(state);

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-72px)] lg:overflow-y-auto">
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-[#E5E7EB]">
        <header className="flex items-center gap-2 border-b border-[#F3F4F6] bg-gradient-to-r from-cyan/5 to-purple-50 px-4 py-3">
          <Sparkles size={14} className="text-cyan" />
          <span className="text-[12px] font-semibold text-text-primary">Campaign so far</span>
        </header>
        <div className="flex flex-col gap-4 p-4">
          <PreviewField label="Name" value={state.name} active={state.focus === 'goal'} />
          <PreviewField
            label="Goal"
            value={state.goalDescription}
            active={state.focus === 'goal'}
          />
          <PreviewField
            label="Audience"
            value={
              state.segmentName
                ? `${state.segmentName} · ${(state.segmentSize ?? 0).toLocaleString('en-AE')} contacts`
                : undefined
            }
            active={state.focus === 'audience'}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-[#E5E7EB]">
        <header className="flex items-center gap-2 border-b border-[#F3F4F6] bg-gradient-to-r from-cyan/5 to-purple-50 px-4 py-3">
          <Sparkles size={14} className="text-cyan" />
          <span className="text-[12px] font-semibold text-text-primary">Journey</span>
          <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-text-secondary ring-1 ring-[#E5E7EB]">
            {state.steps.length} step{state.steps.length === 1 ? '' : 's'}
          </span>
        </header>
        <div className="p-3">
          <MiniJourneyDiagram steps={state.steps} />
        </div>
      </div>

      <LaunchCta state={state} ready={ready} onLaunch={onLaunch} />
    </aside>
  );
}

function LaunchCta({
  state,
  ready,
  onLaunch,
}: {
  state: BuildingState;
  ready: boolean;
  onLaunch: () => void;
}) {
  const missing = whatsMissing(state);
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onLaunch}
        disabled={!ready}
        className={[
          'inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-[13px] font-semibold transition-all',
          ready
            ? 'bg-gradient-to-r from-cyan to-purple-500 text-white shadow-[0_6px_16px_-6px_rgba(34,179,229,0.55)] hover:shadow-[0_8px_20px_-6px_rgba(34,179,229,0.7)]'
            : 'cursor-not-allowed bg-[#F3F4F6] text-text-tertiary ring-1 ring-[#E5E7EB]',
        ].join(' ')}
      >
        <ArrowRight size={14} />
        Open Journey Builder
      </button>
      <p
        className={[
          'px-1 text-[11px]',
          ready ? 'text-text-secondary' : 'text-text-tertiary',
        ].join(' ')}
      >
        {ready
          ? 'Validate the canvas and launch when ready.'
          : `Need: ${missing.join(' · ')}`}
      </p>
    </div>
  );
}

function whatsMissing(state: BuildingState): string[] {
  const missing: string[] = [];
  if (!state.goalDescription) missing.push('goal');
  if (!state.segmentId) missing.push('audience');
  if (state.steps.length === 0) missing.push('at least one step');
  else if (state.steps.some((s) => !s.templateId)) missing.push('templates');
  return missing.length > 0 ? missing : ['ready'];
}

function PreviewField({
  label,
  value,
  active,
}: {
  label: string;
  value: React.ReactNode | undefined;
  active: boolean;
}) {
  const filled = value !== undefined && value !== '';
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
          {label}
        </span>
        <StatusDot active={active && !filled} done={filled} />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={String(filled)}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="mt-1 text-[12.5px] text-text-primary"
        >
          {filled ? (
            typeof value === 'string' ? <span>{value}</span> : value
          ) : (
            <span className="italic text-text-tertiary">
              {active ? 'Waiting for your reply…' : 'Not set yet'}
            </span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StatusDot({ active, done }: { active: boolean; done: boolean }) {
  if (done) return <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />;
  if (active) {
    return (
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inset-0 animate-ping rounded-full bg-cyan/60" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-cyan" />
      </span>
    );
  }
  return <span className="h-1.5 w-1.5 rounded-full bg-[#E5E7EB]" aria-hidden />;
}
