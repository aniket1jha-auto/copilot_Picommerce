import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  Plus,
  Trash2,
  Pencil,
  Check,
  Gauge,
  LineChart as LineIcon,
  BarChart3,
  Table as TableIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button,
  Input,
  Modal,
  Select,
  cn,
  useToast,
} from '@/components/ui';
import { useDashboardsStore } from '@/store/dashboardsStore';
import {
  WIDGET_TYPE_LABEL,
  WIDGET_TYPE_DESCRIPTION,
  DATA_SOURCE_LABEL,
  compatibleDataSources,
} from '@/types/dashboard';
import type { DashboardWidget, DataSource, WidgetType } from '@/types/dashboard';
import { WidgetRenderer } from '@/components/observe/reporting/WidgetRenderer';

/**
 * Single-dashboard editor.
 *
 * Lists every widget on the dashboard, lets the user add new ones
 * via a picker modal, reorder via up/down buttons, and delete. The
 * title + description are inline-editable.
 *
 * Tier A scope:
 *   • Widgets stack vertically (responsive grid).
 *   • No drag-drop, no resize.
 *   • One mock data source per widget — real fetches come later.
 */

const WIDGET_TYPE_ICON: Record<WidgetType, typeof Gauge> = {
  kpi: Gauge,
  line_chart: LineIcon,
  bar_chart: BarChart3,
  table: TableIcon,
};

export function ReportingDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const dashboard = useDashboardsStore((s) =>
    id ? s.dashboards.find((d) => d.id === id) : undefined,
  );
  const updateDashboard = useDashboardsStore((s) => s.updateDashboard);
  const deleteDashboard = useDashboardsStore((s) => s.deleteDashboard);
  const addWidget = useDashboardsStore((s) => s.addWidget);
  const removeWidget = useDashboardsStore((s) => s.removeWidget);
  const moveWidget = useDashboardsStore((s) => s.moveWidget);

  const [addOpen, setAddOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!dashboard) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dashboard not found" />
        <div className="rounded-lg border border-border-subtle bg-surface p-6 text-sm text-text-secondary">
          No dashboard with ID <code className="font-mono">{id}</code> exists. It may have been
          deleted.{' '}
          <Link to="/observe/reporting" className="text-cyan hover:underline">
            Back to dashboards
          </Link>
          .
        </div>
      </div>
    );
  }

  function saveTitle() {
    const trimmed = draftTitle.trim();
    if (!trimmed) {
      setEditingTitle(false);
      return;
    }
    updateDashboard(dashboard!.id, { name: trimmed });
    setEditingTitle(false);
  }

  function saveDescription() {
    updateDashboard(dashboard!.id, { description: draftDescription.trim() });
    setEditingDescription(false);
  }

  function handleAdd(type: WidgetType, dataSource: DataSource, title: string) {
    addWidget(dashboard!.id, { type, dataSource, title });
    setAddOpen(false);
    toast({ kind: 'success', title: 'Widget added', body: title });
  }

  function handleDeleteDashboard() {
    const name = dashboard!.name;
    deleteDashboard(dashboard!.id);
    toast({ kind: 'success', title: 'Dashboard deleted', body: `${name} was removed.` });
    navigate('/observe/reporting');
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px]">
        <Link
          to="/observe/reporting"
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={13} />
          All dashboards
        </Link>
      </div>

      {/* Title + description (inline editable) */}
      <section className="rounded-lg bg-white p-5 ring-1 ring-[#E5E7EB]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={draftTitle}
                  autoFocus
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle();
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  className="text-lg font-semibold"
                />
                <Button variant="primary" size="sm" iconLeft={<Check size={14} />} onClick={saveTitle}>
                  Save
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditingTitle(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraftTitle(dashboard.name);
                  setEditingTitle(true);
                }}
                className="group flex items-center gap-2 text-left"
              >
                <h1 className="text-xl font-bold tracking-tight text-text-primary">{dashboard.name}</h1>
                <Pencil
                  size={13}
                  className="text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
                />
              </button>
            )}

            <div className="mt-1.5">
              {editingDescription ? (
                <div className="flex items-start gap-2">
                  <textarea
                    value={draftDescription}
                    autoFocus
                    onChange={(e) => setDraftDescription(e.target.value)}
                    rows={2}
                    className="flex-1 rounded-md border border-border-default px-3 py-2 text-[13px] focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                  />
                  <Button variant="primary" size="sm" iconLeft={<Check size={14} />} onClick={saveDescription}>
                    Save
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditingDescription(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDraftDescription(dashboard.description ?? '');
                    setEditingDescription(true);
                  }}
                  className="group flex items-center gap-2 text-left"
                >
                  <p className="text-[13px] text-text-secondary">
                    {dashboard.description ?? (
                      <span className="italic text-text-tertiary">Add a description…</span>
                    )}
                  </p>
                  <Pencil
                    size={11}
                    className="text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </button>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Trash2 size={14} />}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
            <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => setAddOpen(true)}>
              Add widget
            </Button>
          </div>
        </div>
      </section>

      {/* Widgets */}
      {dashboard.widgets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-default bg-surface-sunken px-6 py-16 text-center">
          <LayoutGrid size={28} className="mx-auto mb-3 text-text-tertiary" />
          <p className="text-base font-semibold text-text-primary">No widgets yet</p>
          <p className="mt-1 text-sm text-text-secondary">
            Add KPI tiles, charts, or tables to assemble your dashboard.
          </p>
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Plus size={14} />}
            onClick={() => setAddOpen(true)}
            className="mt-4"
          >
            Add your first widget
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dashboard.widgets.map((widget, idx) => (
            <WidgetCard
              key={widget.id}
              widget={widget}
              isFirst={idx === 0}
              isLast={idx === dashboard.widgets.length - 1}
              onMoveUp={() => moveWidget(dashboard.id, widget.id, 'up')}
              onMoveDown={() => moveWidget(dashboard.id, widget.id, 'down')}
              onDelete={() => {
                removeWidget(dashboard.id, widget.id);
                toast({ kind: 'success', title: 'Widget removed' });
              }}
            />
          ))}
        </div>
      )}

      {/* Add widget modal */}
      <AddWidgetModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />

      {/* Delete dashboard confirmation */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete dashboard?" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            <strong className="text-text-primary">{dashboard.name}</strong> and all{' '}
            {dashboard.widgets.length} widget{dashboard.widgets.length === 1 ? '' : 's'} will be
            permanently removed.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteDashboard}>
              Delete dashboard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Widget card (the box around a rendered widget) ─────────────────── */

interface WidgetCardProps {
  widget: DashboardWidget;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

function WidgetCard({ widget, isFirst, isLast, onMoveUp, onMoveDown, onDelete }: WidgetCardProps) {
  const Icon = WIDGET_TYPE_ICON[widget.type];
  return (
    <div className="group flex flex-col rounded-lg bg-white p-4 ring-1 ring-[#E5E7EB] transition-shadow hover:shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan/10 px-2 py-0.5 text-[10px] font-medium text-cyan">
          <Icon size={11} />
          {WIDGET_TYPE_LABEL[widget.type]}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label="Move up"
            className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronUp size={13} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label="Move down"
            className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronDown size={13} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete widget"
            className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-error-soft hover:text-error"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-[170px]">
        <WidgetRenderer widget={widget} />
      </div>
    </div>
  );
}

/* ─── Add-widget modal ────────────────────────────────────────────────── */

interface AddProps {
  open: boolean;
  onClose: () => void;
  onAdd: (type: WidgetType, dataSource: DataSource, title: string) => void;
}

function AddWidgetModal({ open, onClose, onAdd }: AddProps) {
  const [type, setType] = useState<WidgetType>('kpi');
  const sources = useMemo(() => compatibleDataSources(type), [type]);
  const [dataSource, setDataSource] = useState<DataSource>(sources[0]);
  const [title, setTitle] = useState('');

  // Whenever type changes, snap dataSource to the first compatible option.
  useMemo(() => {
    if (!sources.includes(dataSource)) setDataSource(sources[0]);
  }, [sources, dataSource]);

  function reset() {
    setType('kpi');
    setDataSource('campaign_overview');
    setTitle('');
  }

  function close() {
    reset();
    onClose();
  }

  function submit() {
    if (!title.trim()) return;
    onAdd(type, dataSource, title.trim());
    reset();
  }

  return (
    <Modal open={open} onClose={close} title="Add widget" size="md">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-text-primary">
            Widget type
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(['kpi', 'line_chart', 'bar_chart', 'table'] as const).map((t) => {
              const Icon = WIDGET_TYPE_ICON[t];
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-md border-2 px-3 py-2 text-left transition-colors',
                    active
                      ? 'border-cyan bg-cyan/5'
                      : 'border-[#E5E7EB] hover:border-cyan/40 bg-white',
                  )}
                >
                  <Icon size={16} className={active ? 'text-cyan' : 'text-text-secondary'} />
                  <span className="text-[12.5px] font-semibold text-text-primary">
                    {WIDGET_TYPE_LABEL[t]}
                  </span>
                  <span className="text-[10.5px] leading-snug text-text-tertiary">
                    {WIDGET_TYPE_DESCRIPTION[t]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Select
          label="Data source"
          value={dataSource}
          onChange={(e) => setDataSource(e.target.value as DataSource)}
        >
          {sources.map((s) => (
            <option key={s} value={s}>
              {DATA_SOURCE_LABEL[s]}
            </option>
          ))}
        </Select>

        <Input
          label="Widget title"
          placeholder="e.g., Active campaigns, Revenue this week"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={!title.trim()}>
            Add widget
          </Button>
        </div>
      </div>
    </Modal>
  );
}
