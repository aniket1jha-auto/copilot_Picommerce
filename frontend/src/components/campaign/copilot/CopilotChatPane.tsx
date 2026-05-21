import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Send, Wand2, MessageSquare, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePhaseData } from '@/hooks/usePhaseData';
import {
  getOpener,
  processBuilding,
  type BuildingState,
} from '@/components/campaign/copilot/copilotFlow';
import {
  useCopilotStore,
  type CopilotMessage,
} from '@/store/copilotStore';
import {
  useRecommendationsStore,
  type Recommendation,
} from '@/store/recommendationsStore';
import { RecommendationCard } from '@/components/campaign/recommendations/RecommendationCard';
import { useToast } from '@/components/ui';

/**
 * Standalone chat column for the copilot. Reads/writes the shared copilot
 * store so it stays in sync with anything else editing the building state
 * (e.g. the interactive Campaign So Far canvas). Drop into any layout —
 * the new unified builder mounts it as the left column.
 */

let msgIdCounter = 0;
const newMsgId = () => `m-${++msgIdCounter}-${Date.now()}`;

type CopilotTab = 'chat' | 'recommendations';

interface Props {
  /** When provided, called on launch instead of the default handoff. */
  onFinalize?: (state: BuildingState) => void;
  /**
   * The campaign this copilot is scoped to. Used to filter
   * recommendations for the Recommendations tab.
   */
  campaignId?: string;
  /**
   * Auto-open the Recommendations tab on mount and highlight this rec.
   * Used when arriving from the campaign detail page via the
   * "Open in copilot" CTA on a pending recommendation.
   */
  initialRecommendationId?: string;
}

export function CopilotChatPane({ onFinalize, campaignId, initialRecommendationId }: Props) {
  const { segments } = usePhaseData();
  const { toast } = useToast();

  const building = useCopilotStore((s) => s.building);
  const messages = useCopilotStore((s) => s.messages);
  const handedOff = useCopilotStore((s) => s.handedOff);
  const setBuilding = useCopilotStore((s) => s.setBuilding);
  const appendMessage = useCopilotStore((s) => s.appendMessage);
  const setMessages = useCopilotStore((s) => s.setMessages);
  const setHandedOff = useCopilotStore((s) => s.setHandedOff);

  // Recommendations — subscribe to the raw array. Selecting through
  // `s.forCampaign(...)` returns a fresh filtered array each call,
  // which trips React 18's getSnapshot-must-be-cached guard and can
  // blank the page. Filter via useMemo instead.
  const allRecs = useRecommendationsStore((s) => s.recommendations);
  const applyRec = useRecommendationsStore((s) => s.apply);
  const dismissRec = useRecommendationsStore((s) => s.dismiss);

  const recs = useMemo(
    () =>
      campaignId
        ? allRecs.filter((r) => r.campaignId === campaignId || r.campaignId === null)
        : allRecs,
    [allRecs, campaignId],
  );
  const pendingRecs = useMemo(() => recs.filter((r) => r.status === 'pending'), [recs]);
  const recentlyAppliedRecs = useMemo(
    () => recs.filter((r) => r.status === 'applied').slice(0, 3),
    [recs],
  );

  // Auto-open Recommendations tab when arriving via the "Open in
  // copilot" link from a campaign detail page.
  const [activeTab, setActiveTab] = useState<CopilotTab>(
    initialRecommendationId ? 'recommendations' : 'chat',
  );

  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const ctx = useMemo(() => ({ segments }), [segments]);

  // Seed opener once per session.
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

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

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
        setHandedOff(true);
        if (onFinalize) onFinalize(res.newState);
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
      appendMessage(message);
      setThinking(false);
    }, delay);
  }

  /**
   * Approving a recommendation:
   *   1. Flip the rec to "applied" in the store
   *   2. Post a user-style message into the chat ("✅ Applied: …")
   *      so the user sees the action reflected in the conversation
   *   3. Have the assistant acknowledge with the impact estimate
   *   4. Switch back to the Chat tab so the user sees the new turn
   *
   * In the mock we don't mutate the journey graph — when a real
   * backend lands, this is the seam to dispatch the rec's `change`
   * payload to the campaign-update endpoint.
   */
  function handleApplyRec(rec: Recommendation) {
    applyRec(rec.id);
    appendMessage({
      id: newMsgId(),
      role: 'user',
      text: `✅ Applied recommendation: **${rec.title}**`,
      timestamp: Date.now(),
    });
    window.setTimeout(() => {
      appendMessage({
        id: newMsgId(),
        role: 'assistant',
        text: `Done — I've applied "${rec.title}". ${rec.recommendation}\n\n_Estimated impact: ${rec.estimatedImpact}_`,
        applied: [rec.title],
        timestamp: Date.now(),
      });
    }, 420);
    setActiveTab('chat');
    toast({
      kind: 'success',
      title: 'Recommendation applied',
      body: rec.title,
    });
  }

  function handleDismissRec(rec: Recommendation) {
    dismissRec(rec.id);
    toast({ kind: 'info', title: 'Recommendation dismissed', body: rec.title });
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <ChatHeader state={building} />
      <TabNav
        active={activeTab}
        onChange={setActiveTab}
        pendingCount={pendingRecs.length}
      />

      {activeTab === 'chat' ? (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
            <div className="flex flex-col gap-4">
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
        </>
      ) : (
        <RecommendationsPanel
          pending={pendingRecs}
          recentlyApplied={recentlyAppliedRecs}
          highlightId={initialRecommendationId}
          onApply={handleApplyRec}
          onDismiss={handleDismissRec}
        />
      )}
    </section>
  );
}

/* ─── Top nav: Chat / Recommendations ─────────────────────────────────── */

function TabNav({
  active,
  onChange,
  pendingCount,
}: {
  active: CopilotTab;
  onChange: (t: CopilotTab) => void;
  pendingCount: number;
}) {
  return (
    <div className="flex border-b border-[#F3F4F6] bg-white px-2">
      <TabButton
        active={active === 'chat'}
        onClick={() => onChange('chat')}
        icon={<MessageSquare size={13} />}
        label="Chat"
      />
      <TabButton
        active={active === 'recommendations'}
        onClick={() => onChange('recommendations')}
        icon={<Lightbulb size={13} />}
        label="Recommendations"
        badge={pendingCount > 0 ? pendingCount : undefined}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative inline-flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-medium transition-colors',
        active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
      ].join(' ')}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span
          className={[
            'inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold',
            active ? 'bg-cyan text-white' : 'bg-amber-100 text-amber-700',
          ].join(' ')}
        >
          {badge}
        </span>
      )}
      {active && (
        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-cyan" aria-hidden />
      )}
    </button>
  );
}

/* ─── Recommendations panel (tab content) ─────────────────────────────── */

function RecommendationsPanel({
  pending,
  recentlyApplied,
  highlightId,
  onApply,
  onDismiss,
}: {
  pending: Recommendation[];
  recentlyApplied: Recommendation[];
  highlightId?: string;
  onApply: (rec: Recommendation) => void;
  onDismiss: (rec: Recommendation) => void;
}) {
  const highlightRef = useRef<HTMLDivElement | null>(null);

  // When arriving via "Open in copilot" with a specific rec, scroll
  // it into view and pulse the border briefly.
  const [pulse, setPulse] = useState(!!highlightId);
  useEffect(() => {
    if (!highlightId) return;
    highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = window.setTimeout(() => setPulse(false), 2200);
    return () => window.clearTimeout(t);
  }, [highlightId]);

  if (pending.length === 0 && recentlyApplied.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <Lightbulb size={28} className="mb-2 text-text-tertiary" />
        <p className="text-sm font-semibold text-text-primary">No recommendations yet</p>
        <p className="mt-1 text-[12px] text-text-secondary">
          As your campaign runs, the copilot will surface optimizations here. You can also ask
          for ideas in the Chat tab.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {pending.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
            Pending — {pending.length}
          </p>
          <div className="flex flex-col gap-2.5">
            <AnimatePresence initial={false}>
              {pending.map((rec) => {
                const isHighlighted = rec.id === highlightId;
                return (
                  <div
                    key={rec.id}
                    ref={isHighlighted ? highlightRef : undefined}
                    className={
                      isHighlighted && pulse
                        ? 'rounded-xl ring-2 ring-cyan ring-offset-2 transition-shadow'
                        : ''
                    }
                  >
                    <RecommendationCard
                      rec={rec}
                      mode="inline"
                      onApply={() => onApply(rec)}
                      onDismiss={() => onDismiss(rec)}
                    />
                  </div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {recentlyApplied.length > 0 && (
        <div>
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
            Recently applied
          </p>
          <div className="flex flex-col gap-2">
            {recentlyApplied.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} mode="inline" />
            ))}
          </div>
        </div>
      )}
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
    <div className="border-b border-[#F3F4F6] bg-gradient-to-r from-cyan/5 via-purple-50 to-pink-50 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-cyan/20">
          <Sparkles size={16} className="text-cyan" />
        </div>
        <div className="min-w-0">
          <div className="text-[12.5px] font-semibold text-text-primary">Campaign Copilot</div>
          <div className="text-[10.5px] text-text-secondary truncate">
            Focus: <span className="font-medium text-text-primary">{focusLabel[state.focus]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Message bubble ───────────────────────────────────────────────────── */

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
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-cyan px-3.5 py-2 text-[13.5px] leading-relaxed text-white">
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
      className="flex items-start gap-2.5"
    >
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cyan/20 to-purple-100">
        <Sparkles size={13} className="text-cyan" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-md bg-[#F4F5F7] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-text-primary">
          <RichText text={message.text} />
        </div>
        {message.applied && message.applied.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {message.applied.map((a, i) => (
              <span
                key={`${a}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[10.5px] font-medium text-green-700 ring-1 ring-green-200"
              >
                <Wand2 size={10} />
                {a}
              </span>
            ))}
          </div>
        )}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestion(s)}
                className="rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11.5px] text-text-secondary transition-colors hover:border-cyan/40 hover:bg-cyan/5 hover:text-text-primary"
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
    <div className="flex items-start gap-2.5">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cyan/20 to-purple-100">
        <Sparkles size={13} className="text-cyan" />
      </div>
      <div className="rounded-2xl rounded-tl-md bg-[#F4F5F7] px-3.5 py-3">
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
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 140)}px`;
  }, [value]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="border-t border-[#F3F4F6] bg-white px-3 pt-2.5 pb-2.5">
      <div className="flex items-end gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 transition-[border-color,box-shadow] duration-150 hover:border-[#D1D5DB] focus-within:border-cyan focus-within:shadow-[0_0_0_3px_rgba(34,179,229,0.12)]">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Reply to the copilot, or describe what you want…"
          className="max-h-[140px] min-h-[20px] flex-1 resize-none bg-transparent text-[13.5px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:!shadow-none"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan text-white transition-colors hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[10.5px] text-text-tertiary">
        ⏎ to send · Shift+⏎ for newline
      </p>
    </div>
  );
}
