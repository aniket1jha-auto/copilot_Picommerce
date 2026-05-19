import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, Plus, Trash2, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button,
  EmptyState,
  Input,
  Modal,
  Table,
  THead,
  TBody,
  Tr,
  Th,
  Td,
  useToast,
} from '@/components/ui';
import { useDashboardsStore } from '@/store/dashboardsStore';
import { formatTimeAgoShort } from '@/utils/formatRelative';
import type { Dashboard } from '@/types/dashboard';

/**
 * Observe → Reporting (list view).
 *
 * Lists every dashboard the user has created. Each dashboard is a
 * named collection of widgets the user assembles in the editor at
 * /observe/reporting/:id. Two demo dashboards are seeded so the
 * page never lands empty in the mock.
 */
export function Reporting() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const dashboards = useDashboardsStore((s) => s.dashboards);
  const createDashboard = useDashboardsStore((s) => s.createDashboard);
  const deleteDashboard = useDashboardsStore((s) => s.deleteDashboard);

  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Dashboard | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dashboards;
    return dashboards.filter(
      (d) => d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q),
    );
  }, [dashboards, query]);

  function handleCreate(name: string, description: string) {
    const d = createDashboard({ name, description });
    setCreateOpen(false);
    toast({
      kind: 'success',
      title: 'Dashboard created',
      body: `${d.name} is ready. Add widgets to start visualizing your data.`,
    });
    navigate(`/observe/reporting/${d.id}`);
  }

  function handleDelete(d: Dashboard) {
    deleteDashboard(d.id);
    setConfirmDelete(null);
    toast({ kind: 'success', title: 'Dashboard deleted', body: `${d.name} was removed.` });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reporting"
        subtitle="Build custom dashboards to track the metrics that matter to your team."
        actions={
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Plus size={14} />}
            onClick={() => setCreateOpen(true)}
          >
            Create dashboard
          </Button>
        }
      />

      {dashboards.length > 0 && (
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
            {filtered.length} of {dashboards.length}
          </p>
        </div>
      )}

      {dashboards.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No dashboards yet"
          body="Create your first dashboard to start tracking KPIs, charts, and tables across your campaigns and agents."
          primaryCta={
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Plus size={14} />}
              onClick={() => setCreateOpen(true)}
            >
              Create dashboard
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg bg-white ring-1 ring-[#E5E7EB]">
          <Table>
            <THead>
              <Tr hover={false}>
                <Th>Name</Th>
                <Th>Widgets</Th>
                <Th>Last updated</Th>
                <Th>{''}</Th>
              </Tr>
            </THead>
            <TBody>
              {filtered.map((d) => (
                <Tr key={d.id}>
                  <Td>
                    <Link to={`/observe/reporting/${d.id}`} className="flex min-w-0 items-start gap-2.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan/10 text-cyan">
                        <LayoutGrid size={15} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-text-primary hover:underline">
                          {d.name}
                        </div>
                        {d.description && (
                          <div className="line-clamp-1 text-[11.5px] text-text-secondary">
                            {d.description}
                          </div>
                        )}
                      </div>
                    </Link>
                  </Td>
                  <Td numeric>
                    <span className="tabular-nums">{d.widgets.length}</span>
                  </Td>
                  <Td>
                    <span className="text-text-secondary">{formatTimeAgoShort(d.updatedAt)}</span>
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setConfirmDelete(d);
                      }}
                      aria-label={`Delete ${d.name}`}
                      className="rounded-md p-1.5 text-text-tertiary transition-colors hover:bg-error-soft hover:text-error"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      <CreateDashboardModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete dashboard?"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            <strong className="text-text-primary">{confirmDelete?.name}</strong> and all{' '}
            {confirmDelete?.widgets.length ?? 0} widget
            {confirmDelete?.widgets.length === 1 ? '' : 's'} on it will be permanently removed.
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

interface CreateProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}

function CreateDashboardModal({ open, onClose, onCreate }: CreateProps) {
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
    <Modal open={open} onClose={close} title="Create dashboard" size="md">
      <div className="flex flex-col gap-4">
        <Input
          label="Name *"
          placeholder="e.g., Executive overview"
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
            placeholder="What's this dashboard for? Who should be looking at it?"
            rows={3}
            className="w-full rounded-md border border-border-default px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
        </div>
        <p className="text-[11px] text-text-tertiary">
          You'll add widgets (KPI tiles, charts, tables) on the next screen.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={!name.trim()}>
            Create &amp; add widgets
          </Button>
        </div>
      </div>
    </Modal>
  );
}
