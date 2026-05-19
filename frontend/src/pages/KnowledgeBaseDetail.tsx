import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Database,
  FileText,
  Layers,
  Coins,
  Upload,
  Trash2,
  Bot as BotIcon,
  RotateCw,
  UploadCloud,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  StatusPill,
  Table,
  THead,
  TBody,
  Tr,
  Th,
  Td,
  cn,
  useToast,
} from '@/components/ui';
import type { StatusKind } from '@/components/ui';
import { useKnowledgeBaseStore } from '@/store/knowledgeBaseStore';
import { useAgentStore } from '@/store/agentStore';
import type {
  KBDocument,
  KBDocumentStatus,
  KBSplitter,
  KBStatus,
} from '@/types/knowledgeBase';
import { formatTimeAgoShort } from '@/utils/formatRelative';

/**
 * Single-KB detail. Lists every document, lets the user upload more,
 * retry failed indexing, delete files, edit indexing settings (chunk
 * size / overlap / splitter / embedding model), or delete the KB.
 *
 * Documents go through a mocked indexing lifecycle: new uploads start
 * as `indexing`, flip to `indexed` after ~1.5s + small stagger. The
 * store auto-reconciles the parent KB's status from doc statuses.
 */

const KB_STATUS_KIND: Record<KBStatus, StatusKind> = {
  ready: 'success',
  indexing: 'warning',
  error: 'error',
  empty: 'neutral',
};

const KB_STATUS_LABEL: Record<KBStatus, string> = {
  ready: 'Ready',
  indexing: 'Indexing',
  error: 'Error',
  empty: 'Empty',
};

const DOC_STATUS_KIND: Record<KBDocumentStatus, StatusKind> = {
  indexed: 'success',
  indexing: 'warning',
  failed: 'error',
};

const DOC_STATUS_LABEL: Record<KBDocumentStatus, string> = {
  indexed: 'Indexed',
  indexing: 'Indexing…',
  failed: 'Failed',
};

const ACCEPTED_EXT = ['.pdf', '.docx', '.txt', '.md', '.csv'] as const;
const ACCEPT_ATTR = ACCEPTED_EXT.join(',');
const MAX_BYTES = 25 * 1024 * 1024;

const EMBEDDING_OPTIONS = [
  { value: 'text-embedding-3-large', label: 'OpenAI · text-embedding-3-large (3072d)' },
  { value: 'text-embedding-3-small', label: 'OpenAI · text-embedding-3-small (1536d)' },
  { value: 'text-embedding-ada-002', label: 'OpenAI · text-embedding-ada-002 (1536d)' },
  { value: 'voyage-large-2', label: 'Voyage · voyage-large-2 (1536d)' },
];

const SPLITTER_OPTIONS: Array<{ value: KBSplitter; label: string }> = [
  { value: 'recursive', label: 'Recursive character (default)' },
  { value: 'markdown', label: 'Markdown-aware' },
  { value: 'semantic', label: 'Semantic (slower, smarter)' },
];

export function KnowledgeBaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const kb = useKnowledgeBaseStore((s) => s.knowledgeBases.find((k) => k.id === id));
  const documents = useKnowledgeBaseStore((s) =>
    id ? s.documents.filter((d) => d.knowledgeBaseId === id) : [],
  );
  const addDocuments = useKnowledgeBaseStore((s) => s.addDocuments);
  const deleteDocument = useKnowledgeBaseStore((s) => s.deleteDocument);
  const setDocumentStatus = useKnowledgeBaseStore((s) => s.setDocumentStatus);
  const updateKB = useKnowledgeBaseStore((s) => s.updateKB);
  const deleteKB = useKnowledgeBaseStore((s) => s.deleteKB);

  const agents = useAgentStore((s) => s.agents);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<KBDocument | null>(null);
  const [confirmDeleteKb, setConfirmDeleteKb] = useState(false);

  const usedByAgents = useMemo(() => {
    if (!kb) return [];
    return kb.usedByAgentIds
      .map((agentId) => agents.find((a) => a.id === agentId))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
  }, [kb, agents]);

  if (!kb) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Knowledge base not found" />
        <div className="rounded-lg border border-border-subtle bg-surface p-6 text-sm text-text-secondary">
          No knowledge base with ID <code className="font-mono">{id}</code> exists. It may have
          been deleted.{' '}
          <Link to="/knowledge-base" className="text-cyan hover:underline">
            Back to list
          </Link>
          .
        </div>
      </div>
    );
  }

  function handleUpload(files: File[]) {
    const created = addDocuments(
      kb!.id,
      files.map((f) => ({
        name: f.name,
        type: (f.name.split('.').pop() ?? 'txt').toLowerCase(),
        sizeBytes: f.size,
      })),
    );
    setUploadOpen(false);
    toast({
      kind: 'success',
      title: 'Files added',
      body: `Indexing ${created.length} document${created.length === 1 ? '' : 's'} — they'll be searchable in a moment.`,
    });
  }

  function handleRetry(doc: KBDocument) {
    setDocumentStatus(doc.id, 'indexing');
    setTimeout(() => setDocumentStatus(doc.id, 'indexed'), 1500);
    toast({ kind: 'info', title: 'Retrying indexing', body: doc.name });
  }

  function handleDeleteDoc(doc: KBDocument) {
    deleteDocument(doc.id);
    setConfirmDeleteDoc(null);
    toast({ kind: 'success', title: 'Document removed', body: doc.name });
  }

  function handleDeleteKb() {
    const name = kb!.name;
    deleteKB(kb!.id);
    toast({ kind: 'success', title: 'Knowledge base deleted', body: `${name} was removed.` });
    navigate('/knowledge-base');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-[12px]">
        <Link
          to="/knowledge-base"
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={13} />
          All knowledge bases
        </Link>
      </div>

      <PageHeader
        title={kb.name}
        subtitle={kb.description}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill status={KB_STATUS_KIND[kb.status]}>
              {KB_STATUS_LABEL[kb.status]}
            </StatusPill>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Trash2 size={14} />}
              onClick={() => setConfirmDeleteKb(true)}
            >
              Delete
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Upload size={14} />}
              onClick={() => setUploadOpen(true)}
            >
              Upload files
            </Button>
          </div>
        }
      />

      {/* KB-level stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Tile icon={FileText} label="Documents" value={kb.documentCount.toLocaleString()} />
        <Tile icon={Layers} label="Chunks" value={kb.chunkCount.toLocaleString()} />
        <Tile
          icon={Coins}
          label="Tokens"
          value={
            kb.tokenCount >= 1_000_000
              ? `${(kb.tokenCount / 1_000_000).toFixed(2)}M`
              : kb.tokenCount.toLocaleString()
          }
        />
        <Tile
          icon={BotIcon}
          label="Used by"
          value={usedByAgents.length.toString()}
          subtext={usedByAgents.length > 0 ? usedByAgents.map((a) => a.config.name).join(', ') : 'No agents yet'}
        />
      </div>

      {/* Documents */}
      <section className="rounded-lg bg-white p-5 ring-1 ring-[#E5E7EB]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Documents</h3>
            <p className="mt-0.5 text-[12px] text-text-secondary">
              Files indexed into this knowledge base. Agents retrieve chunks from here at query
              time.
            </p>
          </div>
          {documents.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Upload size={14} />}
              onClick={() => setUploadOpen(true)}
            >
              Upload files
            </Button>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="py-6">
            <EmptyState
              icon={UploadCloud}
              title="No documents yet"
              body="Upload PDFs, DOCX, TXT, MD, or CSV files. They'll be chunked and embedded automatically."
              primaryCta={
                <Button
                  variant="primary"
                  size="sm"
                  iconLeft={<Upload size={14} />}
                  onClick={() => setUploadOpen(true)}
                >
                  Upload files
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border-subtle">
            <Table>
              <THead>
                <Tr hover={false}>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Size</Th>
                  <Th>Chunks</Th>
                  <Th>Status</Th>
                  <Th>Uploaded</Th>
                  <Th>{''}</Th>
                </Tr>
              </THead>
              <TBody>
                {documents.map((doc) => (
                  <Tr key={doc.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-text-tertiary" />
                        <span className="truncate text-[13px] text-text-primary">{doc.name}</span>
                      </div>
                    </Td>
                    <Td>
                      <span className="uppercase text-[11px] font-medium text-text-secondary">
                        {doc.type}
                      </span>
                    </Td>
                    <Td numeric>
                      <span className="tabular-nums">{formatBytes(doc.sizeBytes)}</span>
                    </Td>
                    <Td numeric>
                      <span className="tabular-nums">{doc.chunkCount.toLocaleString()}</span>
                    </Td>
                    <Td>
                      <StatusPill status={DOC_STATUS_KIND[doc.status]}>
                        {DOC_STATUS_LABEL[doc.status]}
                      </StatusPill>
                    </Td>
                    <Td>
                      <span className="text-text-secondary">
                        {formatTimeAgoShort(doc.uploadedAt)}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-0.5">
                        {doc.status === 'failed' && (
                          <button
                            type="button"
                            onClick={() => handleRetry(doc)}
                            aria-label="Retry indexing"
                            className="rounded-md p-1.5 text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary"
                          >
                            <RotateCw size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteDoc(doc)}
                          aria-label={`Delete ${doc.name}`}
                          className="rounded-md p-1.5 text-text-tertiary transition-colors hover:bg-error-soft hover:text-error"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </section>

      {/* Indexing settings */}
      <section className="rounded-lg bg-white p-5 ring-1 ring-[#E5E7EB]">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-text-primary">Indexing settings</h3>
          <p className="mt-0.5 text-[12px] text-text-secondary">
            Defaults match Vapi/Iterable. Changing these requires re-indexing all documents —
            queued automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Embedding model"
            value={kb.embeddingModel}
            onChange={(e) => updateKB(kb.id, { embeddingModel: e.target.value })}
          >
            {EMBEDDING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>

          <Select
            label="Splitter"
            value={kb.splitter}
            onChange={(e) => updateKB(kb.id, { splitter: e.target.value as KBSplitter })}
          >
            {SPLITTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>

          <Input
            label="Chunk size (tokens)"
            type="number"
            min={64}
            max={4096}
            value={kb.chunkSize}
            onChange={(e) =>
              updateKB(kb.id, { chunkSize: Math.max(64, Math.min(4096, Number(e.target.value) || 512)) })
            }
          />

          <Input
            label="Chunk overlap (tokens)"
            type="number"
            min={0}
            max={512}
            value={kb.chunkOverlap}
            onChange={(e) =>
              updateKB(kb.id, {
                chunkOverlap: Math.max(0, Math.min(512, Number(e.target.value) || 0)),
              })
            }
          />
        </div>
      </section>

      {/* Modals */}
      <UploadFilesModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUpload}
      />

      <Modal
        open={!!confirmDeleteDoc}
        onClose={() => setConfirmDeleteDoc(null)}
        title="Delete document?"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            <strong className="text-text-primary">{confirmDeleteDoc?.name}</strong> will be removed
            from this knowledge base. Agents will stop retrieving its chunks immediately.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteDoc(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => confirmDeleteDoc && handleDeleteDoc(confirmDeleteDoc)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmDeleteKb}
        onClose={() => setConfirmDeleteKb(false)}
        title="Delete knowledge base?"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            <strong className="text-text-primary">{kb.name}</strong> and all{' '}
            {kb.documentCount.toLocaleString()} document{kb.documentCount === 1 ? '' : 's'} will
            be permanently removed.
            {usedByAgents.length > 0 && (
              <>
                {' '}
                <span className="text-warning-strong">
                  {usedByAgents.length} agent{usedByAgents.length === 1 ? '' : 's'}
                </span>{' '}
                currently reference this KB and will fall back to base prompts.
              </>
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteKb(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteKb}>
              Delete knowledge base
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Local helpers ──────────────────────────────────────────────────── */

function Tile({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-lg bg-white p-4 ring-1 ring-[#E5E7EB]">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/10">
          <Icon size={16} className="text-cyan" />
        </div>
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <div className="text-2xl font-bold text-text-primary mb-0.5">{value}</div>
      {subtext && (
        <div className="line-clamp-1 text-xs text-text-secondary" title={subtext}>
          {subtext}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ─── Upload modal ────────────────────────────────────────────────────── */

interface UploadProps {
  open: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
}

function UploadFilesModal({ open, onClose, onUpload }: UploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [oversizeWarning, setOversizeWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFiles([]);
    setDragOver(false);
    setOversizeWarning(false);
  }

  function close() {
    reset();
    onClose();
  }

  function accept(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    const valid = arr.filter((f) => {
      const ext = '.' + (f.name.split('.').pop() ?? '').toLowerCase();
      return (ACCEPTED_EXT as readonly string[]).includes(ext) && f.size <= MAX_BYTES;
    });
    if (valid.length !== arr.length) setOversizeWarning(true);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...valid.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
  }

  function removeAt(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function submit() {
    if (files.length === 0) return;
    onUpload(files);
    reset();
  }

  return (
    <Modal open={open} onClose={close} title="Upload files" size="md">
      <div className="flex flex-col gap-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer?.files) accept(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-8 text-center transition-colors',
            dragOver
              ? 'border-cyan bg-cyan/5'
              : 'border-border-default bg-surface-sunken hover:border-cyan',
          )}
        >
          <UploadCloud size={28} className="mb-2 text-text-tertiary" />
          <p className="text-[13px] font-medium text-text-primary">
            Drop files here or click to browse
          </p>
          <p className="mt-1 text-[11px] text-text-tertiary">
            .pdf, .docx, .txt, .md, .csv — up to 25 MB each
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) accept(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {oversizeWarning && (
          <p className="text-[11px] text-warning-strong">
            Some files were skipped — either unsupported file type or larger than 25 MB.
          </p>
        )}

        {files.length > 0 && (
          <div className="flex max-h-[200px] flex-col gap-1.5 overflow-y-auto">
            {files.map((f, idx) => (
              <div
                key={`${f.name}-${idx}`}
                className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText size={14} className="shrink-0 text-text-tertiary" />
                  <span className="truncate text-[13px] text-text-primary">{f.name}</span>
                  <span className="shrink-0 text-[11px] text-text-tertiary">
                    {formatBytes(f.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
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
          <Button variant="secondary" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={files.length === 0}>
            Upload{files.length > 0 ? ` (${files.length})` : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
