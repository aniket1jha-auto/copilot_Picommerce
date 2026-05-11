import { useMemo, useRef, useState } from 'react';
import { BookOpen, Plus, X, Users, UploadCloud, FileText } from 'lucide-react';
import {
  Modal,
  Button,
  StatusPill,
  Select,
  Input,
  cn,
} from '@/components/ui';
import { useKnowledgeBaseStore } from '@/store/knowledgeBaseStore';
import {
  DEFAULT_KB_ATTACHMENT,
  KB_RETRIEVAL_MODE_LABEL,
  KB_CITATION_STYLE_LABEL,
} from '@/types/knowledgeBase';
import type {
  AgentKBAttachment,
  KBRetrievalMode,
  KBCitationStyle,
  KnowledgeBase,
} from '@/types/knowledgeBase';

interface Props {
  attachments: AgentKBAttachment[];
  onChange: (next: AgentKBAttachment[]) => void;
}

export function ConnectKnowledgeSourcesPanel({ attachments, onChange }: Props) {
  const allKBs = useKnowledgeBaseStore((s) => s.knowledgeBases);
  const createKB = useKnowledgeBaseStore((s) => s.createKB);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reuseOpen, setReuseOpen] = useState(false);

  const attachedIds = useMemo(
    () => new Set(attachments.map((a) => a.knowledgeBaseId)),
    [attachments],
  );
  const kbById = useMemo(() => {
    const m: Record<string, KnowledgeBase> = {};
    for (const kb of allKBs) m[kb.id] = kb;
    return m;
  }, [allKBs]);

  const reusableCount = allKBs.filter((kb) => !attachedIds.has(kb.id)).length;

  function addAttachment(kbId: string) {
    if (attachedIds.has(kbId)) return;
    onChange([...attachments, { knowledgeBaseId: kbId, ...DEFAULT_KB_ATTACHMENT }]);
    setReuseOpen(false);
  }

  function handleUpload(name: string, files: File[]) {
    const totalChunks = files.reduce(
      (acc, f) => acc + Math.max(1, Math.round(f.size / 2048)),
      0,
    );
    const kb = createKB({
      name: name.trim() || files[0]?.name.replace(/\.[^.]+$/, '') || 'Uploaded knowledge',
      description: `Uploaded ${files.length} document${files.length === 1 ? '' : 's'}`,
      source: 'files',
      documentCount: files.length,
      chunkCount: totalChunks,
    });
    onChange([...attachments, { knowledgeBaseId: kb.id, ...DEFAULT_KB_ATTACHMENT }]);
    setUploadOpen(false);
  }

  function detach(kbId: string) {
    onChange(attachments.filter((a) => a.knowledgeBaseId !== kbId));
  }

  function update(kbId: string, patch: Partial<AgentKBAttachment>) {
    onChange(
      attachments.map((a) => (a.knowledgeBaseId === kbId ? { ...a, ...patch } : a)),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-text-primary">
            Knowledge for this agent
          </label>
          <p className="text-sm text-text-secondary">
            Upload reference documents — playbooks, FAQs, product sheets — and the agent will look
            things up while talking to customers.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Plus size={14} />}
          onClick={() => setUploadOpen(true)}
        >
          Add knowledge
        </Button>
      </div>

      {attachments.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-default bg-surface-sunken px-5 py-8 text-center">
          <BookOpen size={20} className="mx-auto mb-2 text-text-tertiary" />
          <p className="text-[13px] text-text-secondary">
            No reference documents added. The agent will rely on its instructions and tools alone.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {attachments.map((att) => {
            const kb = kbById[att.knowledgeBaseId];
            return (
              <AttachmentCard
                key={att.knowledgeBaseId}
                attachment={att}
                kb={kb}
                onChange={(patch) => update(att.knowledgeBaseId, patch)}
                onDetach={() => detach(att.knowledgeBaseId)}
              />
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setReuseOpen(true)}
        disabled={reusableCount === 0}
        className={cn(
          'inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors',
          reusableCount === 0
            ? 'text-text-tertiary cursor-not-allowed'
            : 'text-accent hover:text-accent-hover',
        )}
      >
        <Users size={12} />
        <span className="border-b border-dashed border-current">
          + Reuse a knowledge source from another agent ({reusableCount})
        </span>
      </button>

      <UploadKnowledgeModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUpload}
      />

      <KBPickerModal
        open={reuseOpen}
        onClose={() => setReuseOpen(false)}
        knowledgeBases={allKBs}
        attachedIds={attachedIds}
        onPick={addAttachment}
      />
    </div>
  );
}

/* ─── Attachment row ────────────────────────────────────────────────────── */

interface AttachmentCardProps {
  attachment: AgentKBAttachment;
  kb: KnowledgeBase | undefined;
  onChange: (patch: Partial<AgentKBAttachment>) => void;
  onDetach: () => void;
}

function AttachmentCard({ attachment, kb, onChange, onDetach }: AttachmentCardProps) {
  if (!kb) {
    return (
      <div className="rounded-md border border-error-soft bg-error-soft p-3 text-[12px] text-error">
        Missing knowledge base "{attachment.knowledgeBaseId}".
        <button
          type="button"
          onClick={onDetach}
          className="ml-2 underline hover:no-underline"
        >
          Detach
        </button>
      </div>
    );
  }

  const ready = kb.status === 'ready';

  return (
    <div
      className={cn(
        'rounded-md border bg-surface p-3',
        ready ? 'border-border-subtle' : 'border-warning-soft',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="shrink-0 text-text-tertiary" />
            <span
              className="text-sm font-medium text-text-primary truncate"
              title={kb.name}
            >
              {kb.name}
            </span>
            <StatusPill
              status={
                kb.status === 'ready'
                  ? 'success'
                  : kb.status === 'indexing'
                  ? 'info'
                  : kb.status === 'error'
                  ? 'error'
                  : 'neutral'
              }
              size="sm"
            >
              {kb.status === 'ready'
                ? 'Ready'
                : kb.status === 'indexing'
                ? 'Indexing'
                : kb.status === 'error'
                ? 'Error'
                : 'Empty'}
            </StatusPill>
          </div>
          <div className="mt-0.5 text-[12px] text-text-tertiary">
            {kb.documentCount.toLocaleString('en-AE')} docs ·{' '}
            {kb.chunkCount.toLocaleString('en-AE')} chunks
          </div>
        </div>
        <button
          type="button"
          onClick={onDetach}
          aria-label="Detach"
          className="text-text-tertiary hover:text-error transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select
          label="Retrieval"
          value={attachment.retrievalMode}
          onChange={(e) =>
            onChange({ retrievalMode: e.target.value as KBRetrievalMode })
          }
        >
          {(Object.keys(KB_RETRIEVAL_MODE_LABEL) as KBRetrievalMode[]).map((m) => (
            <option key={m} value={m}>
              {KB_RETRIEVAL_MODE_LABEL[m]}
            </option>
          ))}
        </Select>
        <Select
          label="Top K"
          value={String(attachment.topK)}
          onChange={(e) => onChange({ topK: Number(e.target.value) })}
        >
          {[1, 2, 3, 4, 5, 6, 8].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
        <Input
          label="Threshold"
          type="number"
          step={0.05}
          min={0}
          max={1}
          value={attachment.scoreThreshold}
          onChange={(e) =>
            onChange({ scoreThreshold: Number(e.target.value) })
          }
        />
        <Select
          label="Citations"
          value={attachment.citationStyle}
          onChange={(e) =>
            onChange({ citationStyle: e.target.value as KBCitationStyle })
          }
        >
          {(Object.keys(KB_CITATION_STYLE_LABEL) as KBCitationStyle[]).map((s) => (
            <option key={s} value={s}>
              {KB_CITATION_STYLE_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      {!ready && kb.status !== 'empty' && (
        <p className="mt-2 text-[11px] text-warning">
          KB is not ready yet — retrieval will fall back gracefully until indexing completes.
        </p>
      )}
    </div>
  );
}

/* ─── Upload modal ─────────────────────────────────────────────────────── */

const ACCEPTED_EXT = ['.pdf', '.docx', '.txt'] as const;
const ACCEPT_ATTR = ACCEPTED_EXT.join(',');

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (name: string, files: File[]) => void;
}

function UploadKnowledgeModal({ open, onClose, onUpload }: UploadModalProps) {
  const [name, setName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setName('');
    setFiles([]);
    setDragOver(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function acceptFiles(incoming: FileList | File[]) {
    const next = Array.from(incoming).filter((f) => {
      const ext = '.' + (f.name.split('.').pop() ?? '').toLowerCase();
      return (ACCEPTED_EXT as readonly string[]).includes(ext);
    });
    if (next.length === 0) return;
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [
        ...prev,
        ...next.filter((f) => !seen.has(`${f.name}:${f.size}`)),
      ];
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit() {
    if (files.length === 0) return;
    onUpload(name, files);
    reset();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add knowledge" size="md">
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          placeholder="e.g., Sales playbook"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-text-primary">
            Documents
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer?.files) acceptFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-center transition-colors',
              dragOver
                ? 'border-accent bg-accent-soft/40'
                : 'border-border-default bg-surface-sunken hover:border-accent',
            )}
          >
            <UploadCloud size={24} className="mb-2 text-text-tertiary" />
            <p className="text-[13px] font-medium text-text-primary">
              Drop files here or click to browse
            </p>
            <p className="mt-1 text-[11px] text-text-tertiary">
              .pdf, .docx, .txt — up to 25 MB each
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) acceptFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {files.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {files.map((f, idx) => (
              <div
                key={`${f.name}-${idx}`}
                className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText size={14} className="shrink-0 text-text-tertiary" />
                  <span className="truncate text-[13px] text-text-primary">{f.name}</span>
                  <span className="shrink-0 text-[11px] text-text-tertiary">
                    {formatFileSize(f.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  aria-label={`Remove ${f.name}`}
                  className="text-text-tertiary hover:text-error transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={files.length === 0}
          >
            Upload {files.length > 0 ? `(${files.length})` : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ─── Picker modal (reuse from existing KBs) ───────────────────────────── */

interface PickerProps {
  open: boolean;
  onClose: () => void;
  knowledgeBases: KnowledgeBase[];
  attachedIds: Set<string>;
  onPick: (kbId: string) => void;
}

function KBPickerModal({ open, onClose, knowledgeBases, attachedIds, onPick }: PickerProps) {
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
    <Modal open={open} onClose={onClose} title="Reuse a knowledge source" size="md">
      <Input
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <div className="mt-4 flex flex-col gap-1.5">
        {filtered.length === 0 && (
          <div className="py-6 text-center text-sm text-text-secondary">
            No knowledge bases match "{query}".
          </div>
        )}
        {filtered.map((kb) => {
          const already = attachedIds.has(kb.id);
          const ready = kb.status === 'ready';
          return (
            <button
              key={kb.id}
              type="button"
              disabled={already || !ready}
              onClick={() => onPick(kb.id)}
              className={cn(
                'flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors',
                already || !ready
                  ? 'border-border-subtle bg-surface-sunken opacity-60 cursor-not-allowed'
                  : 'border-border-subtle bg-surface hover:border-accent',
              )}
            >
              <BookOpen size={16} className="mt-0.5 shrink-0 text-text-tertiary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary truncate">
                    {kb.name}
                  </span>
                  <StatusPill
                    status={
                      kb.status === 'ready'
                        ? 'success'
                        : kb.status === 'indexing'
                        ? 'info'
                        : kb.status === 'error'
                        ? 'error'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {kb.status === 'ready' ? 'Ready' : kb.status === 'indexing' ? 'Indexing' : kb.status === 'error' ? 'Error' : 'Empty'}
                  </StatusPill>
                  {already && (
                    <span className="text-[11px] text-text-tertiary">already attached</span>
                  )}
                </div>
                {kb.description && (
                  <div className="mt-0.5 text-[12px] text-text-secondary line-clamp-1">
                    {kb.description}
                  </div>
                )}
                <div className="mt-1 text-[11px] text-text-tertiary">
                  {kb.documentCount.toLocaleString('en-AE')} docs ·{' '}
                  {kb.chunkCount.toLocaleString('en-AE')} chunks
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
