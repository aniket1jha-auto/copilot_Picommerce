import { Send, Workflow, ArrowRight, Check, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CampaignTemplateKind } from '@/data/mock/campaignTemplates';

/**
 * Campaign path picker. Two substantial cards — gradient hero, big icon,
 * a feature list, and a primary CTA. Sized to fill the Create Campaign
 * page so the choice feels deliberate, not an afterthought.
 */

interface Props {
  onPick: (kind: CampaignTemplateKind) => void;
}

export function CampaignPathPicker({ onPick }: Props) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <PathCard
          onClick={() => onPick('quick_run')}
          icon={Send}
          accent="#7C5CFF"
          accentSoft="#EDE9FF"
          tagline="Recommended for one-shots"
          title="Quick run"
          description="Single send. Pick channels, audience, and content, then schedule it once, on a cadence, or let Smart + AI optimize delivery."
          features={[
            'One-time, recurring, or Smart + AI delivery',
            'Channel-level templates from the content library',
            'Auto-generated cohort + sequence in Smart mode',
          ]}
          ctaLabel="Start a quick run"
        />
        <PathCard
          onClick={() => onPick('journey')}
          icon={Workflow}
          accent="#0EA597"
          accentSoft="#D9F5F1"
          tagline="Best for lifecycle flows"
          title="Build your Journey"
          description="Drag-and-drop multi-step canvas. Branch on event triggers, time delays, audience splits, and AI agent outcomes."
          features={[
            'Visual canvas with WhatsApp / SMS / Voice nodes',
            'Conditions, waits, A/B splits, fallbacks',
            'Pre-built starters for KYC, recovery, onboarding',
          ]}
          ctaLabel="Open canvas builder"
        />
      </div>
    </div>
  );
}

interface PathCardProps {
  onClick: () => void;
  icon: LucideIcon;
  accent: string;
  accentSoft: string;
  tagline: string;
  title: string;
  description: string;
  features: string[];
  ctaLabel: string;
}

function PathCard({
  onClick,
  icon: Icon,
  accent,
  accentSoft,
  tagline,
  title,
  description,
  features,
  ctaLabel,
}: PathCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[460px] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface text-left shadow-[0_2px_8px_-4px_rgba(0,41,112,0.08)] transition-all hover:-translate-y-0.5 hover:border-transparent hover:shadow-[0_18px_36px_-18px_rgba(0,41,112,0.28)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {/* Hero band */}
      <div
        className="relative flex h-44 shrink-0 items-center justify-center px-6"
        style={{
          background: `linear-gradient(135deg, ${accentSoft} 0%, #FFFFFF 100%)`,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 transition-opacity group-hover:opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.06) 1px, transparent 0)',
            backgroundSize: '12px 12px',
          }}
        />
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-2xl shadow-[0_8px_18px_-6px_rgba(0,41,112,0.18)]"
          style={{ backgroundColor: '#FFFFFF', color: accent }}
        >
          <Icon size={36} strokeWidth={1.8} />
        </div>
        <span
          className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[10.5px] font-semibold tracking-wide backdrop-blur"
          style={{ color: accent }}
        >
          <Sparkles size={11} />
          {tagline}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 px-6 py-5">
        <div>
          <h3 className="text-[20px] font-semibold leading-tight text-text-primary">
            {title}
          </h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-text-secondary">
            {description}
          </p>
        </div>

        <ul className="mt-1 flex flex-col gap-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-[12.5px] text-text-secondary">
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: accentSoft, color: accent }}
              >
                <Check size={11} strokeWidth={2.4} />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div
          className="mt-auto flex items-center gap-2 text-[13px] font-semibold transition-transform group-hover:translate-x-0.5"
          style={{ color: accent }}
        >
          {ctaLabel}
          <ArrowRight size={15} strokeWidth={2.2} />
        </div>
      </div>
    </button>
  );
}
