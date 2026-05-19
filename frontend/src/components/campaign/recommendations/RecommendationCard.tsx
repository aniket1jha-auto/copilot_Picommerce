import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  TriangleAlert,
  ArrowRight,
  Megaphone,
  Users,
  Clock,
  DollarSign,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import type { Recommendation, RecKind } from '@/store/recommendationsStore';

/**
 * A single recommendation card used in two surfaces:
 *   - Campaign detail page  → mode="link"   (whole card navigates to the builder)
 *   - Copilot chat pane     → mode="inline" (Apply / Dismiss buttons act in place)
 *
 * Visual treatment is consistent across both surfaces so users
 * recognize a recommendation no matter where it surfaces.
 */
interface Props {
  rec: Recommendation;
  mode: 'link' | 'inline';
  /** Required for mode="link". Where clicking the card navigates to. */
  applyHref?: string;
  /** mode="inline" only — fires when the user clicks "Apply". */
  onApply?: () => void;
  /** Optional dismiss action. Available on both modes. */
  onDismiss?: () => void;
}

const KIND_ICON: Record<RecKind, typeof Megaphone> = {
  budget: DollarSign,
  channel: Megaphone,
  audience: Users,
  timing: Clock,
  content: Sparkles,
  flow: GitBranch,
};

const KIND_LABEL: Record<RecKind, string> = {
  budget: 'Budget',
  channel: 'Channel',
  audience: 'Audience',
  timing: 'Timing',
  content: 'Content',
  flow: 'Journey',
};

export function RecommendationCard({ rec, mode, applyHref, onApply, onDismiss }: Props) {
  if (rec.status === 'applied') {
    return <AppliedCard rec={rec} />;
  }
  if (rec.status === 'dismissed') {
    return <DismissedCard rec={rec} />;
  }
  return mode === 'link' ? (
    <LinkCard rec={rec} href={applyHref ?? '#'} onDismiss={onDismiss} />
  ) : (
    <InlineCard rec={rec} onApply={onApply} onDismiss={onDismiss} />
  );
}

/* ─── Layouts ─────────────────────────────────────────────────────────── */

function LinkCard({
  rec,
  href,
  onDismiss,
}: {
  rec: Recommendation;
  href: string;
  onDismiss?: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="group relative rounded-xl border border-amber-200 bg-amber-50 border-l-4 border-l-amber-500"
    >
      <Link
        to={href}
        className="block pl-4 pr-4 py-4 hover:bg-amber-100/40 rounded-xl transition-colors"
      >
        <Header rec={rec} />
        <Body rec={rec} />
        <div className="mt-3 flex items-center justify-between">
          <Pills rec={rec} />
          <span className="inline-flex items-center gap-1 rounded-lg bg-cyan px-3 py-1.5 text-xs font-semibold text-white transition-opacity group-hover:opacity-90">
            Open in copilot
            <ArrowRight size={12} />
          </span>
        </div>
      </Link>
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
          className="absolute right-2 top-2 rounded-md p-1 text-text-tertiary opacity-0 transition-opacity hover:bg-amber-100 hover:text-text-primary group-hover:opacity-100"
          aria-label="Dismiss recommendation"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
}

function InlineCard({
  rec,
  onApply,
  onDismiss,
}: {
  rec: Recommendation;
  onApply?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="rounded-xl border border-amber-200 bg-amber-50 border-l-4 border-l-amber-500 pl-4 pr-4 py-3.5"
    >
      <Header rec={rec} />
      <Body rec={rec} />
      <div className="mt-2.5">
        <Pills rec={rec} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        {onApply && (
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-cyan/90"
          >
            <CheckCircle2 size={12} />
            Apply
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-text-secondary ring-1 ring-[#E5E7EB] transition-colors hover:bg-gray-50 hover:text-text-primary"
          >
            Dismiss
          </button>
        )}
      </div>
    </motion.div>
  );
}

function AppliedCard({ rec }: { rec: Recommendation }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-xl border border-green-200 bg-green-50 border-l-4 border-l-green-500 pl-4 pr-4 py-3"
    >
      <div className="flex items-center gap-2.5">
        <CheckCircle2 size={14} className="shrink-0 text-green-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">{rec.title}</p>
          <p className="text-xs text-text-secondary">Applied</p>
        </div>
        <span className="ml-auto inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
          Applied
        </span>
      </div>
    </motion.div>
  );
}

function DismissedCard({ rec }: { rec: Recommendation }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 1 }}
      animate={{ opacity: 0.5 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-xl border border-[#E5E7EB] bg-[#F7F9FC] border-l-4 border-l-gray-300 pl-4 pr-4 py-3"
    >
      <div className="flex items-center gap-2.5">
        <TriangleAlert size={14} className="shrink-0 text-gray-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-400 line-through">{rec.title}</p>
          <p className="text-xs text-gray-400">Dismissed</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Shared bits ─────────────────────────────────────────────────────── */

function Header({ rec }: { rec: Recommendation }) {
  const KindIcon = KIND_ICON[rec.kind];
  return (
    <div className="flex items-start gap-2.5">
      <TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-600" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            <KindIcon size={10} />
            {KIND_LABEL[rec.kind]}
          </span>
        </div>
        <p className="text-sm font-semibold text-text-primary leading-snug">{rec.title}</p>
      </div>
    </div>
  );
}

function Body({ rec }: { rec: Recommendation }) {
  return (
    <>
      <p className="mt-0.5 text-xs text-text-secondary">{rec.description}</p>
      <div className="mt-3 rounded-lg bg-white/70 border border-amber-100 px-3 py-2.5">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
          Recommendation
        </p>
        <p className="text-xs text-text-secondary">{rec.recommendation}</p>
      </div>
    </>
  );
}

function Pills({ rec }: { rec: Recommendation }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
        Est. Impact: {rec.estimatedImpact}
      </span>
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
          rec.risk === 'low'
            ? 'bg-green-100 text-green-700'
            : rec.risk === 'medium'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-red-100 text-red-700'
        }`}
      >
        Risk: {rec.risk === 'low' ? 'Low' : rec.risk === 'medium' ? 'Medium' : 'High'}
      </span>
    </div>
  );
}
