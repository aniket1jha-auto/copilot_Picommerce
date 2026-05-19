import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  Wrench,
  PhoneOff,
  PhoneForwarded,
  Keyboard,
  MessageSquare,
  Search,
  Building2,
  Database,
  Calendar,
  Sheet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Modal, useToast } from '@/components/ui';
import { useToolsStore } from '@/store/toolsStore';
import { findToolDef } from '@/data/toolConstants';
import type { ToolInstance } from '@/types/tool';
import { AddToolDrawer } from '@/components/tools/AddToolDrawer';

/**
 * Tools — full-width single-content page.
 *
 * Sidebar (global) + a single content area. The middle catalog list
 * and right-side inline config from the old layout were removed —
 * configuration now happens inside a right-side drawer (AddToolDrawer).
 *
 * The page renders only tools the user has actually configured. When
 * none exist, the page falls back to a generous empty state with a
 * single primary CTA.
 */

const ICON_MAP: Record<string, LucideIcon> = {
  PhoneOff,
  PhoneForwarded,
  Keyboard,
  MessageSquare,
  Search,
  Building2,
  Database,
  Calendar,
  Sheet,
  Wrench,
};

export function Tools() {
  const { toast } = useToast();
  const tools = useToolsStore((s) => s.tools);
  const duplicateTool = useToolsStore((s) => s.duplicateTool);
  const deleteTool = useToolsStore((s) => s.deleteTool);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTool, setEditTool] = useState<ToolInstance | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ToolInstance | null>(null);

  function openAdd() {
    setEditTool(null);
    setDrawerOpen(true);
  }

  function openEdit(tool: ToolInstance) {
    setEditTool(tool);
    setDrawerOpen(true);
  }

  function handleDuplicate(tool: ToolInstance) {
    const dup = duplicateTool(tool.id);
    if (dup) {
      toast({ kind: 'success', title: 'Tool duplicated', body: dup.name });
    }
  }

  function handleDeleteConfirmed() {
    if (!confirmDelete) return;
    const name = confirmDelete.name;
    deleteTool(confirmDelete.id);
    setConfirmDelete(null);
    toast({ kind: 'success', title: 'Tool deleted', body: name });
  }

  return (
    <div className="flex flex-col gap-12">
      <PageHeader
        title="Tools"
        actions={
          tools.length > 0 ? (
            <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={openAdd}>
              Add Tool
            </Button>
          ) : undefined
        }
      />

      {tools.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onEdit={() => openEdit(tool)}
              onDuplicate={() => handleDuplicate(tool)}
              onDelete={() => setConfirmDelete(tool)}
            />
          ))}
        </div>
      )}

      <AddToolDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          // brief delay so the close animation finishes before we
          // clear the edit target — prevents the "Add Tool" title
          // from flashing in for one frame on close.
          window.setTimeout(() => setEditTool(null), 220);
        }}
        editTool={editTool}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete tool?"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            <strong className="text-text-primary">{confirmDelete?.name}</strong> will be
            permanently removed. Agents already referencing it will lose access on their next
            update.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteConfirmed}>
              Delete tool
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Tool card ───────────────────────────────────────────────────────── */

function ToolCard({
  tool,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  tool: ToolInstance;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const def = findToolDef(tool.toolType);
  const Icon = ICON_MAP[def?.icon ?? 'Wrench'] ?? Wrench;
  const color = def?.color ?? '#7C3AED';
  const description = tool.description || def?.description || '';

  return (
    <div
      className="group relative flex flex-col rounded-xl bg-white p-6 ring-1 ring-[#E5E7EB] transition-shadow hover:shadow-sm"
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <CardOverflowMenu onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
      </div>
      <div className="mt-4">
        <h3 className="text-[14.5px] font-semibold text-text-primary leading-tight">
          {tool.name}
        </h3>
        {description && (
          <p className="mt-1.5 line-clamp-2 text-[12.5px] text-text-secondary">{description}</p>
        )}
      </div>
    </div>
  );
}

/* ─── Three-dot overflow menu (Edit / Duplicate / Delete) ─────────────── */

function CardOverflowMenu({
  onEdit,
  onDuplicate,
  onDelete,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-md p-1.5 text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-md border border-[#E5E7EB] bg-white shadow-lg"
        >
          <MenuItem
            icon={<Pencil size={13} />}
            label="Edit"
            onClick={() => {
              close();
              onEdit();
            }}
          />
          <MenuItem
            icon={<Copy size={13} />}
            label="Duplicate"
            onClick={() => {
              close();
              onDuplicate();
            }}
          />
          <div className="border-t border-[#F3F4F6]" />
          <MenuItem
            icon={<Trash2 size={13} />}
            label="Delete"
            onClick={() => {
              close();
              onDelete();
            }}
            danger
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors ${
        danger
          ? 'text-error hover:bg-error-soft'
          : 'text-text-primary hover:bg-surface-raised'
      }`}
    >
      <span className="text-text-tertiary">{icon}</span>
      {label}
    </button>
  );
}

/* ─── Empty state (zero tools configured) ─────────────────────────────── */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan/10">
        <Wrench size={28} className="text-cyan" />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-text-primary">No tools yet</h2>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        Add your first tool to give your agents capabilities.
      </p>
      <Button
        variant="primary"
        size="sm"
        iconLeft={<Plus size={14} />}
        onClick={onAdd}
        className="mt-6"
      >
        Add Tool
      </Button>
    </div>
  );
}
