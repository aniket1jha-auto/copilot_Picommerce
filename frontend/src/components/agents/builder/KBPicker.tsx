import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  Plus,
  Search,
  ExternalLink,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Modal, Input, Select, Button, StatusPill, cn } from '@/components/ui';
import type { StatusKind } from '@/components/ui';
import { useKnowledgeBaseStore } from '@/store/knowledgeBaseStore';
import {
  DEFAULT_KB_ATTACHMENT,
  KB_CITATION_STYLE_LABEL,
  KB_RETRIEVAL_MODE_LABEL,
} from '@/types/knowledgeBase';
import type {
  AgentKBAttachment,
  KBCitationStyle,
  KBRetrievalMode,
  KBStatus,
  KnowledgeBase,
} from '@/types/knowledgeBase';

interface Props {
  attachments: AgentKBAttachment[];
  onChange: (next: AgentKBAttachment[]) => void;
}

const STATUS_KIND: Record<KBStatus, StatusKind> = {
  ready: 'success',
  indexing: 'warning',
  error: 'error',
  empty: 'neutral',
};

const STATUS_LABEL: Record<KBStatus, string> = {
  ready: 'Ready',
  indexing: 'Indexing',
  error: 'Error',
  empty: 'Empty',
};

/**
 * Knowledge picker for the unified Prompts & Instructions step.
 *
 * Reads from the central Knowledge Base store (the /knowledge-base
 * section). No inline upload here — users manage files in the
 * dedicated KB section and *attach* them to an agent here. This
 * mirrors how Vapi / Iterable / similar platforms separate the
 * knowledge catalog from agent configuration.
 */
export function KBPicker({ attachments, onChange }: Props) {
  const allKBs = useKnowledgeBaseStore((s) => s.knowledgeBases);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const attachedIds = useMemo(
    () => new Set(attachments.map((a) => a.knowledgeBaseId)),
    [attachments],
  );

  const kbById = useMemo(() => {
    const m = new Map<string, KnowledgeBase>();
    for (const kb of allKBs) m.set(kb.id, kb);
    return m;
  }, [allKBs]);

  function attach(kbId: string) {
    if (attachedIds.has(kbId)) return;
    onChange([...attachments, { knowledgeBaseId: kbId, ...DEFAULT_KB_ATTACHMENT }]);
  }

  function detach(kbId: string) {
    onChange(attachments.filter((a) => a.knowledgeBaseId !== kbId));
  }

  function update(kbId: string, patch: Partial<AgentKBAttachment>) {
    onChange(attachments.map((a) => (a.knowledgeBaseId === kbId ? { ...a, ...patch } : a)));
  }

  function toggleExpanded(kbId: string) {
    setExpanded((prev) => ({ ...prev, [kbId]: !prev[kbId] }));
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-text-secondary">
          Pick from your central knowledge base. Need to upload new documents?{' '}
          <Link
            to="/knowledge-base"
            className="inline-flex items-center gap-0.5 font-medium text-cyan hover:underline"
          >
            Open Knowledge Base
            <ExternalLink size={11} />
          </Link>
          .
        </p>
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Plus size={14} />}
          onClick={() => setPickerOpen(true)}
        >
          Attach knowledge
        </Button>
      </div>

      {/* Attached KB list */}
      {attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-default bg-surface-sunken px-4 py-6 text-center">
          <Database size={20} className="mx-auto mb-2 text-text-tertiary" />
          <p className="text-[13px] text-text-secondary">
            No knowledge attached. The agent will rely on its prompt and tools alone.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {attachments.map((attachment) => {
            const kb = kbById.get(attachment.knowledgeBaseId);
            if (!kb) {
              return (
                <li
                  key={attachment.knowledgeBaseId}
                  className="flex items-center justify-between gap-3 rounded-md border border-warning-soft bg-warning-soft/30 px-3 py-2"
                >
                  <span className="text-[12px] text-warning-strong">
                    Knowledge base <code>{attachment.knowledgeBaseId}</code> no longer exists.
                  </span>
                  <button
                    type="button"
                    onClick={() => detach(attachment.knowledgeBaseId)}
                    className="text-text-tertiary hover:text-error"
                    aria-label="Remove broken attachment"
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            }
            const isExpanded = expanded[kb.id];
            return (
              <li
                key={kb.id}
                className="rounded-md border border-border-subtle bg-surface"
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan/10 text-cyan">
                    <Database size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/knowledge-base/${kb.id}`}
                        className="truncate text-[13px] font-medium text-text-primary hover:underline"
                      >
                        {kb.name}
                      </Link>
                      <StatusPill status={STATUS_KIND[kb.status]} size="sm">
                        {STATUS_LABEL[kb.status]}
                      </StatusPill>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-text-tertiary">
                      {kb.documentCount.toLocaleString()} docs ·{' '}
                      {kb.chunkCount.toLocaleString()} chunks ·{' '}
                      {KB_RETRIEVAL_MODE_LABEL[attachment.retrievalMode]} · top {attachment.topK}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(kb.id)}
                    aria-label={isExpanded ? 'Collapse settings' : 'Expand settings'}
                    className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary"
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => detach(kb.id)}
                    aria-label={`Detach ${kb.name}`}
                    className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-error-soft hover:text-error"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Per-attachment retrieval config — collapsed by default */}
                {isExpanded && (
                  <div className="grid gap-3 border-t border-border-subtle bg-surface-sunken px-3 py-3 sm:grid-cols-2">
                    <Select
                      label="Retrieval mode"
                      value={attachment.retrievalMode}
                      onChange={(e) =>
                        update(kb.id, { retrievalMode: e.target.value as KBRetrievalMode })
                      }
                    >
                      {Object.entries(KB_RETRIEVAL_MODE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label="Citation style"
                      value={attachment.citationStyle}
                      onChange={(e) =>
                        update(kb.id, { citationStyle: e.target.value as KBCitationStyle })
                      }
                    >
                      {Object.entries(KB_CITATION_STYLE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <Input
                      type="number"
                      label="Top K"
                      min={1}
                      max={8}
                      value={attachment.topK}
                      onChange={(e) =>
                        update(kb.id, {
                          topK: Math.max(1, Math.min(8, Number(e.target.value) || 4)),
                        })
                      }
                    />
                    <Input
                      type="number"
                      label="Score threshold"
                      min={0}
                      max={1}
                      step="0.05"
                      value={attachment.scoreThreshold}
                      onChange={(e) =>
                        update(kb.id, {
                          scoreThreshold: Math.max(
                            0,
                            Math.min(1, Number(e.target.value) || 0.65),
                          ),
                        })
                      }
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <KBPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        knowledgeBases={allKBs}
        attachedIds={attachedIds}
        onAttach={(id) => {
          attach(id);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

/* ─── Picker modal ─────────────────────────────────────────────────────── */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  knowledgeBases: KnowledgeBase[];
  attachedIds: Set<string>;
  onAttach: (kbId: string) => void;
}

function KBPickerModal({ open, onClose, knowledgeBases, attachedIds, onAttach }: ModalProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return knowledgeBases;
    return knowledgeBases.filter(
      (kb) =>
        kb.name.toLowerCase().includes(q) ||
        kb.description?.toLowerCase().includes(q),
    );
  }, [knowledgeBases, query]);

  return (
    <Modal
      open={open}
      onClose={() => {
        setQuery('');
        onClose();
      }}
      title="Attach knowledge base"
      size="lg"
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or description"
            className="pl-8"
            autoFocus
          />
        </div>

        {knowledgeBases.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border-default bg-surface-sunken px-4 py-8 text-center">
            <Database size={24} className="mb-2 text-text-tertiary" />
            <p className="text-sm font-medium text-text-primary">No knowledge bases yet</p>
            <p className="mt-1 text-[12px] text-text-secondary">
              Create one in the Knowledge Base section, then come back to attach it.
            </p>
            <Link
              to="/knowledge-base"
              className="mt-3 inline-flex items-center gap-1 rounded-md bg-cyan px-3 py-1.5 text-[13px] font-medium text-white hover:bg-cyan/90"
            >
              Open Knowledge Base
              <ExternalLink size={11} />
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">
            No matches for "{query}".
          </p>
        ) : (
          <ul className="flex max-h-[420px] flex-col gap-1.5 overflow-y-auto">
            {filtered.map((kb) => {
              const attached = attachedIds.has(kb.id);
              return (
                <li key={kb.id}>
                  <button
                    type="button"
                    disabled={attached}
                    onClick={() => onAttach(kb.id)}
                    className={cn(
                      'group flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
                      attached
                        ? 'cursor-not-allowed border-border-subtle bg-surface-sunken opacity-60'
                        : 'border-border-subtle bg-surface hover:border-cyan/40 hover:bg-cyan/5',
                    )}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan/10 text-cyan">
                      <Database size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-text-primary">
                          {kb.name}
                        </span>
                        <StatusPill status={STATUS_KIND[kb.status]} size="sm">
                          {STATUS_LABEL[kb.status]}
                        </StatusPill>
                        {attached && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan">
                            Attached
                          </span>
                        )}
                      </div>
                      {kb.description && (
                        <p className="mt-0.5 line-clamp-1 text-[11.5px] text-text-secondary">
                          {kb.description}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-text-tertiary">
                        {kb.documentCount.toLocaleString()} docs ·{' '}
                        {kb.chunkCount.toLocaleString()} chunks
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
          <Link
            to="/knowledge-base"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-cyan hover:underline"
          >
            <Plus size={12} />
            Create new in Knowledge Base
          </Link>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
