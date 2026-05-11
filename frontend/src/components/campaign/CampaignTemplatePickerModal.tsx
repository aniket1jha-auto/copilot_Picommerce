import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ChannelIcon } from '@/components/common/ChannelIcon';
import { Modal, Input, StatusPill, cn } from '@/components/ui';
import { campaignTemplates } from '@/data/mock/campaignTemplates';
import type {
  CampaignTemplateDef,
  CampaignTemplateKind,
} from '@/data/mock/campaignTemplates';
import { useAgentStore } from '@/store/agentStore';
import { usePhaseData } from '@/hooks/usePhaseData';

/**
 * Campaign template picker — shown from inside the build flow.
 * Quick-run templates are picked from the wizard's SetupStep ("Start from
 * template" button); journey templates are picked from the journey canvas
 * (existing PrebuiltJourneyModal).
 */

interface Props {
  open: boolean;
  onClose: () => void;
  /** Filter templates to this path. */
  kind: CampaignTemplateKind;
  onPick: (t: CampaignTemplateDef) => void;
}

export function CampaignTemplatePickerModal({ open, onClose, kind, onPick }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let list = campaignTemplates.filter((t) => t.kind === kind);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [kind, query]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Start from a ${kind === 'journey' ? 'journey' : 'quick-run'} template`}
      size="lg"
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <Input
            placeholder="Search by name, description, category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-default bg-surface-sunken p-6 text-center text-sm text-text-secondary">
            No templates match "{query}".
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((t) => (
              <TemplateRow key={t.id} template={t} onPick={onPick} />
            ))}
          </div>
        )}

        <p className="text-[11px] text-text-tertiary">
          Picking a template fills your current campaign with sensible defaults.
          You can change anything later in the wizard.
        </p>
      </div>
    </Modal>
  );
}

function TemplateRow({
  template,
  onPick,
}: {
  template: CampaignTemplateDef;
  onPick: (t: CampaignTemplateDef) => void;
}) {
  const Icon = template.icon;
  const { segments } = usePhaseData();
  const segment = segments.find((s) => s.id === template.suggestedSegmentId);
  const agent = useAgentStore((s) =>
    template.suggestedAgentId ? s.getAgentById(template.suggestedAgentId) : undefined,
  );

  return (
    <button
      type="button"
      onClick={() => onPick(template)}
      className={cn(
        'flex flex-col gap-2 rounded-md border border-border-subtle bg-surface p-3 text-left',
        'transition-colors hover:border-accent',
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${template.accent}1F`, color: template.accent }}
        >
          <Icon size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-text-primary truncate">
            {template.name}
          </div>
          <div className="mt-0.5 text-[11px] leading-5 text-text-secondary line-clamp-2">
            {template.description}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border-subtle">
        <div className="inline-flex items-center gap-1">
          {template.channels.map((ch) => (
            <ChannelIcon key={ch} channel={ch} size={11} />
          ))}
        </div>
        {segment && (
          <span className="text-[11px] text-text-secondary truncate" title={segment.name}>
            {segment.name}
          </span>
        )}
        {agent && (
          <StatusPill status="accent" size="sm" showDot={false}>
            🎙 {agent.config.name.split(' ')[0]}
          </StatusPill>
        )}
        <span className="ml-auto text-[11px] text-text-tertiary tabular-nums">
          ~AED {(parseFloat(template.tentativeBudgetLakh) * 1000).toLocaleString('en-AE')}
        </span>
      </div>
    </button>
  );
}
