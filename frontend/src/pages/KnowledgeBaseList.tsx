import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Database,
  Plus,
  FileText,
  Layers,
  Bot as BotIcon,
  Search,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button,
  EmptyState,
  Input,
  Modal,
  StatusPill,
  Table,
  THead,
  TBody,
  Tr,
  Th,
  Td,
  useToast,
} from '@/components/ui';
import type { StatusKind } from '@/components/ui';
import { useKnowledgeBaseStore } from '@/store/knowledgeBaseStore';
import { useAgentStore } from '@/store/agentStore';
import type { KBStatus, KnowledgeBase } from '@/types/knowledgeBase';
import { formatTimeAgoShort } from '@/utils/formatRelative';

/**
 * Central RAG / Knowledge Base index.
 *
 * Standalone home for all knowledge in the workspace. Agents reference
 * KBs from here via their builder; this page handles CRUD against the
 * KB store. Pattern follows Vapi/Iterable: each row is a KB (collection
 * of files); click into a row to see / manage its files.
 */
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

export function KnowledgeBaseList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const kbs = useKnowledgeBaseStore((s) => s.knowledgeBases);
  const createKB = useKnowledgeBaseStore((s) => s.createKB);
  const deleteKB = useKnowledgeBaseStore((s) => s.deleteKB);
  const agents = useAgentStore((s) => s.agents);

  const agentById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of agents) m.set(a.id, a.config.name);
    return m;
  }, [agents]);

  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<KnowledgeBase | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return kbs;
    return kbs.filter(
      (kb) =>
        kb.name.toLowerCase().includes(q) ||
        kb.description?.toLowerCase().includes(q),
    );
  }, [kbs, query]);

  const totals = useMemo(() => {
    let docs = 0;
    let chunks = 0;
    for (const kb of kbs) {
      docs += kb.documentCount;
      chunks += kb.chunkCount;
    }
    return { kbs: kbs.length, docs, chunks };
  }, [kbs]);

  function handleCreate(name: string, description: string) {
    const kb = createKB({ name, description, source: 'files' });
    setCreateOpen(false);
    toast({
      kind: 'success',
      title: 'Knowledge base created',
      body: `${kb.name} is ready. Add files to start indexing.`,
    });
    navigate(`/knowledge-base/${kb.id}`);
  }

  function handleDelete(kb: KnowledgeBase) {
    deleteKB(kb.id);
    setConfirmDelete(null);
    toast({
      kind: 'success',
      title: 'Knowledge base deleted',
      body: `${kb.name} and ${kb.documentCount} document${kb.documentCount === 1 ? '' : 's'} were removed.`,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Knowledge Base"
        subtitle="Central RAG store for your agents. Upload documents once, attach them to any agent."
        actions={
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Plus size={14} />}
            onClick={() => setCreateOpen(true)}
          >
            Create knowledge base
          </Button>
        }
      />

      {/* Top stats — same visual rhythm as the Agents page */}
      {kbs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatsTile icon={Database} label="Knowledge bases" value={totals.kbs.toLocaleString()} />
          <StatsTile icon={FileText} label="Documents" value={totals.docs.toLocaleString()} />
          <StatsTile
            icon={Layers}
            label="Chunks indexed"
            value={totals.chunks.toLocaleString()}
            subtext="searchable units"
          />
        </div>
      )}

      {/* Toolbar */}
      {kbs.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or description"
              className="pl-8"
            />
          </div>
          <p className="text-xs text-text-tertiary">
            {filtered.length} of {kbs.length}
          </p>
        </div>
      )}

      {/* List */}
      {kbs.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No knowledge bases yet"
          body="Create one to upload documents, FAQs, or playbooks your agents can reference at runtime."
          primaryCta={
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Plus size={14} />}
              onClick={() => setCreateOpen(true)}
            >
              Create knowledge base
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg bg-white ring-1 ring-[#E5E7EB]">
          <Table>
            <THead>
              <Tr hover={false}>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Documents</Th>
                <Th>Chunks</Th>
                <Th>Used by</Th>
                <Th>Last updated</Th>
                <Th>{''}</Th>
              </Tr>
            </THead>
            <TBody>
              {filtered.map((kb) => {
                const usedBy = kb.usedByAgentIds
                  .map((id) => agentById.get(id))
                  .filter((n): n is string => Boolean(n));
                return (
                  <Tr key={kb.id}>
                    <Td>
                      <Link
                        to={`/knowledge-base/${kb.id}`}
                        className="flex min-w-0 items-start gap-2.5"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan/10 text-cyan">
                          <Database size={15} />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-text-primary hover:underline">
                            {kb.name}
                          </div>
                          {kb.description && (
                            <div className="line-clamp-1 text-[11.5px] text-text-secondary">
                              {kb.description}
                            </div>
                          )}
                        </div>
                      </Link>
                    </Td>
                    <Td>
                      <StatusPill status={STATUS_KIND[kb.status]}>{STATUS_LABEL[kb.status]}</StatusPill>
                    </Td>
                    <Td numeric>
                      <span className="tabular-nums">{kb.documentCount.toLocaleString()}</span>
                    </Td>
                    <Td numeric>
                      <span className="tabular-nums">{kb.chunkCount.toLocaleString()}</span>
                    </Td>
                    <Td>
                      {usedBy.length === 0 ? (
                        <span className="text-text-tertiary">—</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[12px] text-text-secondary">
                          <BotIcon size={12} />
                          {usedBy.length === 1
                            ? usedBy[0]
                            : `${usedBy[0]} +${usedBy.length - 1}`}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span className="text-text-secondary">{formatTimeAgoShort(kb.updatedAt)}</span>
                    </Td>
                    <Td>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setConfirmDelete(kb);
                        }}
                        aria-label={`Delete ${kb.name}`}
                        className="rounded-md p-1.5 text-text-tertiary transition-colors hover:bg-error-soft hover:text-error"
                      >
                        <Trash2 size={14} />
                      </button>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}

      {/* Create modal */}
      <CreateKnowledgeBaseModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      {/* Delete confirmation */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete knowledge base?"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            <strong className="text-text-primary">{confirmDelete?.name}</strong> and all{' '}
            {confirmDelete?.documentCount.toLocaleString() ?? 0} document
            {confirmDelete?.documentCount === 1 ? '' : 's'} inside will be permanently removed.
            Agents currently referencing it will fall back to base prompts.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Local helpers ──────────────────────────────────────────────────── */

function StatsTile({
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
      {subtext && <div className="text-xs text-text-secondary">{subtext}</div>}
    </div>
  );
}

interface CreateProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}

function CreateKnowledgeBaseModal({ open, onClose, onCreate }: CreateProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  function reset() {
    setName('');
    setDescription('');
  }

  function close() {
    reset();
    onClose();
  }

  function submit() {
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim());
    reset();
  }

  return (
    <Modal open={open} onClose={close} title="Create knowledge base" size="md">
      <div className="flex flex-col gap-4">
        <Input
          label="Name *"
          placeholder="e.g., Product FAQ, Recovery Playbook"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-text-primary">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What kind of knowledge lives here? Who should reference it?"
            rows={3}
            className="w-full rounded-md border border-border-default px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
        </div>
        <p className="text-[11px] text-text-tertiary">
          You'll add files on the next screen. Defaults: <code>text-embedding-3-large</code> ·
          chunk 512 / overlap 64 · recursive splitter. Change them later from the KB's settings.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={!name.trim()}>
            Create & add files
          </Button>
        </div>
      </div>
    </Modal>
  );
}
