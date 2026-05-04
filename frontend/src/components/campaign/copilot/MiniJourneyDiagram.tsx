import {
  MessageCircle,
  MessageSquare,
  Smartphone,
  Phone,
  Clock,
  Play,
  Square,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChannelKey } from './copilotEngine';
import type { SynthStep } from './journeySynth';

interface Props {
  steps: SynthStep[];
}

const CHANNEL_META: Record<
  ChannelKey,
  { name: string; icon: LucideIcon; color: string; bg: string }
> = {
  whatsapp: { name: 'WhatsApp', icon: MessageCircle, color: '#25D366', bg: '#25D36614' },
  sms: { name: 'SMS', icon: MessageSquare, color: '#6366F1', bg: '#6366F114' },
  rcs: { name: 'RCS', icon: Smartphone, color: '#00BAF2', bg: '#00BAF214' },
  ai_voice: { name: 'AI Voice', icon: Phone, color: '#F59E0B', bg: '#F59E0B14' },
};

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${Math.round(h * 10) / 10}h`;
  return `${Math.round((h / 24) * 10) / 10}d`;
}

export function MiniJourneyDiagram({ steps }: Props) {
  if (steps.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#FAFBFC] px-3 py-4 text-center text-[11.5px] text-text-tertiary">
        Describe the steps you want and the journey will draw itself here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <NodeChip kind="entry" />
      <AnimatePresence initial={false}>
        {steps.map((step, idx) => (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-1.5"
          >
            {step.waitBeforeHours && step.waitBeforeHours > 0 && (
              <>
                <Connector />
                <NodeChip kind="wait" label={`Wait ${formatHours(step.waitBeforeHours)}`} />
              </>
            )}
            <Connector />
            <NodeChip
              kind="message"
              channel={step.channel}
              templateName={step.templateName}
              fallback={step.fallback ?? null}
              index={idx}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      <Connector />
      <NodeChip kind="exit" />
    </div>
  );
}

function Connector() {
  return (
    <div className="ml-3 flex h-3 items-center">
      <ChevronRight size={12} className="-rotate-90 text-text-tertiary" />
    </div>
  );
}

interface ChipProps {
  kind: 'entry' | 'message' | 'wait' | 'exit';
  channel?: ChannelKey;
  label?: string;
  templateName?: string;
  fallback?: 'on_failure' | 'on_no_response' | null;
  index?: number;
}

function NodeChip({ kind, channel, label, templateName, fallback, index }: ChipProps) {
  if (kind === 'entry') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-cyan/10">
          <Play size={11} className="text-cyan" />
        </div>
        <span className="text-[11.5px] font-medium text-text-primary">Entry</span>
      </div>
    );
  }
  if (kind === 'exit') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-gray-100">
          <Square size={10} className="text-text-tertiary" />
        </div>
        <span className="text-[11.5px] font-medium text-text-primary">Exit</span>
      </div>
    );
  }
  if (kind === 'wait') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-amber-50">
          <Clock size={11} className="text-amber-600" />
        </div>
        <span className="text-[11.5px] font-medium text-text-primary">{label ?? 'Wait'}</span>
      </div>
    );
  }
  // message
  const meta = CHANNEL_META[channel!];
  const Icon = meta.icon;
  const stepNum = typeof index === 'number' ? index + 1 : null;
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1.5">
      <div className="flex items-center gap-2">
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm"
          style={{ backgroundColor: meta.bg }}
        >
          <Icon size={11} style={{ color: meta.color }} />
        </div>
        <span className="text-[11.5px] font-medium text-text-primary truncate">
          {meta.name}
        </span>
        {stepNum !== null && (
          <span className="ml-auto rounded-full bg-[#F3F4F6] px-1.5 py-0 text-[9.5px] font-semibold text-text-tertiary tabular-nums">
            {stepNum}
          </span>
        )}
      </div>
      {templateName && (
        <div className="mt-0.5 truncate pl-7 text-[10.5px] text-text-secondary">
          {templateName.replace(/^.*?·\s*/, '')}
        </div>
      )}
      {!templateName && (
        <div className="mt-0.5 pl-7 text-[10.5px] italic text-text-tertiary">
          Template pending…
        </div>
      )}
      {fallback && (
        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
          {fallback === 'on_failure' ? 'Fallback · delivery fail' : 'Fallback · no response'}
        </div>
      )}
    </div>
  );
}
