'use client';

import { Plus, ZoomIn, ZoomOut, Maximize2, Map as MapIcon, Keyboard } from 'lucide-react';

interface JourneyFloatingControlsProps {
  minimapVisible: boolean;
  onAddNode: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onToggleMinimap: () => void;
  onShowShortcuts: () => void;
}

export function JourneyFloatingControls({
  minimapVisible,
  onAddNode,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleMinimap,
  onShowShortcuts,
}: JourneyFloatingControlsProps) {
  return (
    <div className="absolute bottom-4 left-4 z-20 flex flex-col overflow-hidden rounded-md border border-border-subtle bg-surface-raised shadow-[var(--shadow-md)]">
      <ControlButton onClick={onAddNode} title="Add node ( / )" icon={<Plus size={16} strokeWidth={1.75} />} accent />
      <Divider />
      <ControlButton onClick={onZoomIn} title="Zoom in ( + )" icon={<ZoomIn size={16} strokeWidth={1.75} />} />
      <ControlButton onClick={onZoomOut} title="Zoom out ( - )" icon={<ZoomOut size={16} strokeWidth={1.75} />} />
      <ControlButton onClick={onFitView} title="Fit to view ( F )" icon={<Maximize2 size={16} strokeWidth={1.75} />} />
      <ControlButton
        onClick={onToggleMinimap}
        title="Toggle minimap"
        icon={<MapIcon size={16} strokeWidth={1.75} />}
        active={minimapVisible}
      />
      <Divider />
      <ControlButton
        onClick={onShowShortcuts}
        title="Keyboard shortcuts ( ? )"
        icon={<Keyboard size={16} strokeWidth={1.75} />}
      />
    </div>
  );
}

function Divider() {
  return <span className="h-px bg-border-subtle" aria-hidden />;
}

function ControlButton({
  onClick,
  title,
  icon,
  active,
  accent,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  active?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        'inline-flex h-10 w-10 items-center justify-center transition-colors',
        accent
          ? 'text-brand-600 hover:bg-brand-50'
          : active
            ? 'bg-brand-50 text-brand-700'
            : 'text-text-secondary hover:bg-surface-sunken hover:text-text-primary',
      ].join(' ')}
    >
      {icon}
    </button>
  );
}
