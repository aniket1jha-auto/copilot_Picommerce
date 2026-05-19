'use client';

import '@xyflow/react/dist/style.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, MouseEvent as ReactMouseEvent } from 'react';

type FlowPointerEvent = ReactMouseEvent<Element> | globalThis.MouseEvent;
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
} from '@xyflow/react';
import type { Connection, EdgeChange, NodeChange, Node } from '@xyflow/react';
import { Sparkles, PencilLine, ArrowRight, X } from 'lucide-react';
import type { CampaignData } from '@/components/campaign/CampaignWizard';
import type {
  CampaignJourneyState,
  JourneyFlowEdge,
  JourneyFlowNode,
  JourneyNodeData,
  JourneyNodeKind,
} from './journeyTypes';
import { TRIGGER_KINDS, ENTRY_TRIGGER_KINDS, newNodeId } from './journeyTypes';
import { createJourneyNode } from './journeyConstants';
import { JourneyFlowNode as JourneyFlowNodeComponent } from './JourneyFlowNode';
import { JourneyBezierEdge } from './JourneyBezierEdge';
import { JourneyPaletteDrawer, JOURNEY_PALETTE_DRAG_TYPE } from './JourneyPaletteDrawer';
import type { PaletteCategoryId } from './JourneyPaletteDrawer';
import { JourneyFloatingControls } from './JourneyFloatingControls';
import { JourneyCanvasFooter } from './JourneyCanvasFooter';
import { JourneyNodeConfigPanel } from './JourneyNodeConfigPanel';
import { usePhaseData } from '@/hooks/usePhaseData';
import { PrebuiltJourneyModal } from './PrebuiltJourneyModal';
import { buildPrebuiltJourney } from './journeyTemplates';
import { validateJourney } from './journeyValidation';

const nodeTypes = { journeyNode: JourneyFlowNodeComponent };
const edgeTypes = { journeyBezier: JourneyBezierEdge };

/** Derive a human label for an edge based on its source node + source handle id. */
function deriveEdgeLabel(
  sourceNode: JourneyFlowNode | undefined,
  sourceHandle: string,
): string | null {
  if (!sourceNode || !sourceHandle || sourceHandle === 'out') return null;
  const data = sourceNode.data as { kind?: string; pathLabels?: string[]; variants?: Array<{ label?: string }>; dispositionLabels?: Record<string, string>; outputLabels?: Record<string, string> };
  const kind = data.kind ?? '';
  if (kind === 'voice_agent') {
    return data.dispositionLabels?.[sourceHandle] ?? prettifyHandle(sourceHandle);
  }
  if (kind === 'chat_agent') {
    return data.outputLabels?.[sourceHandle] ?? prettifyHandle(sourceHandle);
  }
  if (kind === 'condition' && sourceHandle.startsWith('path_')) {
    const idx = Number(sourceHandle.slice(5));
    return data.pathLabels?.[idx] ?? `Path ${idx + 1}`;
  }
  if (kind === 'ab_split' && sourceHandle.startsWith('var_')) {
    const idx = Number(sourceHandle.slice(4));
    return data.variants?.[idx]?.label ?? `Variant ${String.fromCharCode(65 + idx)}`;
  }
  return prettifyHandle(sourceHandle);
}

function prettifyHandle(h: string): string {
  return h
    .split('_')
    .map((s) => (s.length ? s[0].toUpperCase() + s.slice(1) : s))
    .join(' ');
}

interface JourneyBuilderStepProps {
  campaignData: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
  /** Wizard footer wiring — passed by CampaignWizard when on journey step. */
  onBack?: () => void;
  onNext?: () => void;
  onSaveDraft?: () => void;
  isLastStep?: boolean;
  /**
   * Hide the docked footer (Back / Save draft / Launch). Used by the
   * Campaign Copilot review surface, which renders its own header-level
   * controls and doesn't want a duplicate bottom bar.
   */
  hideFooter?: boolean;
  /**
   * Suppress the "pick a pre-built journey vs start from scratch" overlay
   * that auto-opens for blank journeys. The unified copilot builder lands
   * straight on the entry node, so it sets this true.
   */
  hideStarter?: boolean;
}

function hasTrigger(nodes: JourneyFlowNode[]) {
  return nodes.some((n) =>
    (TRIGGER_KINDS as readonly string[]).includes(String((n.data as { kind?: string }).kind)),
  );
}

function cloneJourney(j: CampaignJourneyState): CampaignJourneyState {
  return {
    nodes: j.nodes.map((n) => ({ ...n, position: { ...n.position }, data: { ...n.data } })),
    edges: j.edges.map((e) => ({ ...e })),
  };
}

function isEntryNode(n: JourneyFlowNode) {
  return (ENTRY_TRIGGER_KINDS as readonly string[]).includes(String((n.data as { kind?: string }).kind));
}

function isBlankJourney(j: CampaignJourneyState) {
  return j.edges.length === 0 && j.nodes.length === 1 && isEntryNode(j.nodes[0] as JourneyFlowNode);
}

function JourneyBuilderCanvas({
  campaignData,
  onUpdate,
  onBack,
  onNext,
  onSaveDraft,
  isLastStep,
  hideFooter,
  hideStarter,
}: JourneyBuilderStepProps) {
  const journey = campaignData.journey;
  const { fitView, screenToFlowPosition, zoomIn, zoomOut } = useReactFlow();
  const { segments } = usePhaseData();
  const audienceSize = Math.max(1, segments.find((s) => s.id === campaignData.segmentId)?.size ?? 10_000);

  const [templateOpen, setTemplateOpen] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  /**
   * Node whose config drawer is open. Kept SEPARATE from React Flow's
   * `selected` flag so the drawer only opens on a deliberate click —
   * a mouse-down that becomes a drag should never open the panel.
   */
  const [panelNodeId, setPanelNodeId] = useState<string | null>(null);
  const [starterOpen, setStarterOpen] = useState(() => !hideStarter && isBlankJourney(campaignData.journey));
  const [pendingFitView, setPendingFitView] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteCategory, setPaletteCategory] = useState<PaletteCategoryId | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const historyRef = useRef<CampaignJourneyState[]>([]);
  const isUndoing = useRef(false);

  const setJourney = useCallback(
    (next: CampaignJourneyState) => {
      onUpdate({ journey: next });
    },
    [onUpdate],
  );

  const recordHistory = useCallback(() => {
    if (isUndoing.current) return;
    historyRef.current.push(cloneJourney(journey));
    if (historyRef.current.length > 50) historyRef.current.shift();
  }, [journey]);

  const selectedNode = useMemo(() => {
    const n = journey.nodes.find((x) => x.selected);
    return n ?? null;
  }, [journey.nodes]);

  /**
   * The node whose config drawer is currently visible. Driven by
   * `panelNodeId` (set by an explicit click), NOT by the React Flow
   * `selected` flag — so dragging a node never pops the drawer open.
   * If the node disappears from the graph, the panel collapses.
   */
  const panelNode = useMemo(() => {
    if (!panelNodeId) return null;
    return journey.nodes.find((n) => n.id === panelNodeId) ?? null;
  }, [journey.nodes, panelNodeId]);

  // Right-edge slot is shared between the palette drawer and the config drawer.
  // Config takes precedence — when a node's panel is open, close the palette.
  useEffect(() => {
    if (panelNode) setPaletteOpen(false);
  }, [panelNode]);

  const triggerPresent = hasTrigger(journey.nodes);
  const validation = useMemo(() => validateJourney(journey.nodes, journey.edges), [journey.nodes, journey.edges]);

  // Decorate edges with `data.active` based on selected node + auto-derive
  // a label from the source handle (Voice agent / Condition / Split).
  const decoratedEdges = useMemo(() => {
    const selectedId = selectedNode?.id;
    const nodeById = new Map(journey.nodes.map((n) => [n.id, n] as const));
    return journey.edges.map((e) => {
      const isActive = !!selectedId && (e.source === selectedId || e.target === selectedId);
      const prev = (e.data ?? {}) as Record<string, unknown>;
      const existingLabel = (prev.label as string | undefined) ?? undefined;
      const sourceHandle = (e.sourceHandle as string | undefined) ?? 'out';
      const derived = existingLabel ?? deriveEdgeLabel(nodeById.get(e.source), sourceHandle) ?? undefined;
      const nextData: Record<string, unknown> = { ...prev, active: isActive };
      if (derived) nextData.label = derived;
      return { ...e, data: nextData };
    });
  }, [journey.edges, journey.nodes, selectedNode?.id]);

  const addNodeAt = useCallback(
    (kind: JourneyNodeKind, position: { x: number; y: number }) => {
      if ((TRIGGER_KINDS as readonly string[]).includes(kind) && triggerPresent) {
        return;
      }
      recordHistory();
      const node = createJourneyNode(kind, position);
      setJourney({
        nodes: [...journey.nodes.map((n) => ({ ...n, selected: false })), { ...node, selected: true }],
        edges: journey.edges,
      });
    },
    [journey.nodes, journey.edges, recordHistory, setJourney, triggerPresent],
  );

  const addAtCenter = useCallback(
    (kind: JourneyNodeKind) => {
      const bounds = document.querySelector('.journey-flow-surface')?.getBoundingClientRect();
      if (!bounds) {
        addNodeAt(kind, { x: 400, y: 260 });
        return;
      }
      const cx = bounds.left + bounds.width / 2;
      const cy = bounds.top + bounds.height / 2;
      const p = screenToFlowPosition({ x: cx, y: cy });
      addNodeAt(kind, { x: p.x - 100, y: p.y - 40 });
    },
    [addNodeAt, screenToFlowPosition],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const skipHistory =
        changes.length > 0 &&
        changes.every((c) =>
          ['position', 'select', 'dimensions'].includes(c.type as string),
        );
      if (!skipHistory && !isUndoing.current) recordHistory();
      const nextNodes = applyNodeChanges(changes, journey.nodes as Node[]) as JourneyFlowNode[];
      setJourney({ nodes: nextNodes, edges: journey.edges });
    },
    [journey.nodes, journey.edges, recordHistory, setJourney],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const skipHistory =
        changes.length > 0 && changes.every((c) => (c as { type: string }).type === 'select');
      if (!skipHistory && !isUndoing.current) recordHistory();
      setJourney({
        nodes: journey.nodes,
        edges: applyEdgeChanges(changes, journey.edges) as JourneyFlowEdge[],
      });
    },
    [journey.nodes, journey.edges, recordHistory, setJourney],
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      recordHistory();
      // Derive a default edge label from the source handle (Voice agent / Condition / Split branches).
      const sourceNode = journey.nodes.find((n) => n.id === conn.source);
      const sourceHandle = conn.sourceHandle ?? 'out';
      const label = deriveEdgeLabel(sourceNode, sourceHandle);
      setJourney({
        nodes: journey.nodes,
        edges: addEdge(
          {
            ...conn,
            id: `je_${conn.source}_${conn.target}_${conn.sourceHandle ?? 'd'}`,
            type: 'journeyBezier',
            data: label ? { label } : undefined,
          },
          journey.edges,
        ),
      });
    },
    [journey.nodes, journey.edges, recordHistory, setJourney],
  );

  const onPatchNode = useCallback(
    (nodeId: string, nextData: JourneyNodeData) => {
      recordHistory();
      setJourney({
        nodes: journey.nodes.map((n) =>
          n.id === nodeId ? { ...n, data: nextData as unknown as Record<string, unknown> } : n,
        ),
        edges: journey.edges,
      });
    },
    [journey.nodes, journey.edges, recordHistory, setJourney],
  );

  const closePanel = useCallback(() => {
    setPanelNodeId(null);
    setJourney({
      nodes: journey.nodes.map((n) => ({ ...n, selected: false })),
      edges: journey.edges,
    });
  }, [journey.nodes, journey.edges, setJourney]);

  const applyTemplate = useCallback(
    (templateId: string) => {
      recordHistory();
      const built = buildPrebuiltJourney(templateId);
      setJourney({ nodes: built.nodes, edges: built.edges });
      setTemplateOpen(false);
      setStarterOpen(false);
      setPendingFitView(true);
    },
    [recordHistory, setJourney],
  );

  const startFromScratch = useCallback(() => {
    applyTemplate('blank');
  }, [applyTemplate]);

  useEffect(() => {
    // If user already has a non-blank flow (e.g. returning to this step), don't show the starter screen.
    if (!isBlankJourney(journey)) setStarterOpen(false);
  }, [journey]);

  useEffect(() => {
    if (!pendingFitView || starterOpen) return;
    // Wait a tick to ensure ReactFlow has mounted and nodes are in the store.
    requestAnimationFrame(() => {
      try {
        fitView({ padding: 0.25, duration: 300, maxZoom: 1 });
      } finally {
        setPendingFitView(false);
      }
    });
  }, [fitView, pendingFitView, starterOpen]);

  const focusNode = useCallback(
    (nodeId: string) => {
      setJourney({
        nodes: journey.nodes.map((n) => ({ ...n, selected: n.id === nodeId })),
        edges: journey.edges,
      });
      requestAnimationFrame(() => {
        fitView({ nodes: [{ id: nodeId }], duration: 400, padding: 0.35 });
      });
    },
    [fitView, journey.nodes, journey.edges, setJourney],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const inField = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;

      if (!inField && e.key === '/') {
        e.preventDefault();
        setPaletteCategory((cur) => cur ?? 'messaging');
        setPaletteOpen(true);
        return;
      }
      if (!inField && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (inField) return;
        const prev = historyRef.current.pop();
        if (!prev) return;
        e.preventDefault();
        isUndoing.current = true;
        setJourney(prev);
        requestAnimationFrame(() => {
          isUndoing.current = false;
        });
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        if (inField) return;
        const sel = journey.nodes.find((n) => n.selected);
        if (!sel || isEntryNode(sel)) return;
        e.preventDefault();
        recordHistory();
        const cur = sel.data as unknown as JourneyNodeData;
        const copy: JourneyFlowNode = {
          ...sel,
          id: newNodeId(),
          position: { x: sel.position.x + 48, y: sel.position.y + 48 },
          data: { ...sel.data, label: `${cur.label} copy` },
          selected: true,
        };
        setJourney({
          nodes: [...journey.nodes.map((n) => ({ ...n, selected: false })), copy],
          edges: journey.edges,
        });
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const t = e.target as HTMLElement;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
        const selNodes = journey.nodes.filter((n) => n.selected);
        const selEdges = journey.edges.filter((ed) => ed.selected);
        if (!selNodes.length && !selEdges.length) return;
        const deletable = selNodes.filter((n) => !isEntryNode(n));
        if (!deletable.length && !selEdges.length) return;
        e.preventDefault();
        recordHistory();
        const removeIds = new Set(deletable.map((n) => n.id));
        setJourney({
          nodes: journey.nodes.filter((n) => !removeIds.has(n.id)),
          edges: journey.edges.filter((ed) => !selEdges.includes(ed) && !removeIds.has(ed.source) && !removeIds.has(ed.target)),
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [journey.nodes, journey.edges, recordHistory, setJourney]);

  const onPaneContextMenu = useCallback((e: FlowPointerEvent) => {
    e.preventDefault();
    setCtxMenu(null);
  }, []);

  const onNodeContextMenu = useCallback((e: FlowPointerEvent, node: JourneyFlowNode) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
  }, []);

  const runCtx = useCallback(
    (action: 'rename' | 'duplicate' | 'delete' | 'note') => {
      if (!ctxMenu) return;
      const node = journey.nodes.find((n) => n.id === ctxMenu.nodeId);
      if (!node) {
        setCtxMenu(null);
        return;
      }
      setCtxMenu(null);
      if (action === 'rename') {
        const cur = node.data as unknown as JourneyNodeData;
        const name = window.prompt('Node name', cur.label);
        if (name && name.trim()) {
          recordHistory();
          setJourney({
            nodes: journey.nodes.map((n) =>
              n.id === node.id ? { ...n, data: { ...n.data, label: name.trim() } } : n,
            ),
            edges: journey.edges,
          });
        }
        return;
      }
      if (action === 'duplicate') {
        if (isEntryNode(node)) return;
        recordHistory();
        const cur = node.data as unknown as JourneyNodeData;
        const copy: JourneyFlowNode = {
          ...node,
          id: newNodeId(),
          position: { x: node.position.x + 48, y: node.position.y + 48 },
          data: { ...node.data, label: `${cur.label} copy` },
          selected: true,
        };
        setJourney({
          nodes: [...journey.nodes.map((n) => ({ ...n, selected: false })), copy],
          edges: journey.edges,
        });
        return;
      }
      if (action === 'delete') {
        if (isEntryNode(node)) return;
        recordHistory();
        setJourney({
          nodes: journey.nodes.filter((n) => n.id !== node.id),
          edges: journey.edges.filter((ed) => ed.source !== node.id && ed.target !== node.id),
        });
        return;
      }
      if (action === 'note') {
        recordHistory();
        const note = createJourneyNode('note', { x: node.position.x + 200, y: node.position.y });
        setJourney({
          nodes: [...journey.nodes, note],
          edges: journey.edges,
        });
      }
    },
    [ctxMenu, journey.nodes, journey.edges, recordHistory, setJourney],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const kind = e.dataTransfer.getData(JOURNEY_PALETTE_DRAG_TYPE) as JourneyNodeKind;
      if (!kind) return;
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNodeAt(kind, p);
    },
    [addNodeAt, screenToFlowPosition],
  );

  const passedCount = validation.checks.filter((c) => c.ok).length;
  const validationStatus: 'green' | 'amber' | 'red' = (() => {
    if (validation.issues.length === 0) return 'green';
    // No severity field today — treat any issue as amber until we wire severity.
    return 'amber';
  })();
  const validationDotClass =
    validationStatus === 'green'
      ? 'bg-success'
      : validationStatus === 'amber'
        ? 'bg-warning'
        : 'bg-error';

  function openPalette(category: PaletteCategoryId) {
    // Right-edge slot is shared with config drawer — close the config when palette opens.
    if (panelNode) closePanel();
    setPaletteCategory(category);
    setPaletteOpen(true);
  }

  return (
    <div className="relative flex h-full flex-col bg-canvas">
      {/* Canvas region — relative anchor for absolute overlays (palette, controls, panel, starter) */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="relative flex-1 min-w-0 overflow-hidden journey-flow-surface">
          <ReactFlow
            nodes={journey.nodes}
            edges={decoratedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeContextMenu={onNodeContextMenu}
            onNodeClick={(_, node) => setPanelNodeId(node.id)}
            onNodeDragStart={() => setPanelNodeId(null)}
            onPaneClick={() => {
              setCtxMenu(null);
              closePanel();
            }}
            onPaneContextMenu={onPaneContextMenu}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            // Clamp the auto-fit zoom so a single-node journey (the
            // landing state of the unified builder) doesn't blow the
            // Entry node up to fill the canvas. Real nodes render at
            // their intrinsic ~200px width.
            fitViewOptions={{ maxZoom: 1, padding: 0.25 }}
            minZoom={0.25}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              type: 'journeyBezier',
              markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: 'var(--border-strong)' },
            }}
            className="!bg-canvas"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
              color="var(--border-subtle)"
            />
            {showMiniMap && (
              <MiniMap
                className="!bottom-4 !right-4 !rounded-md !border !border-border-subtle !bg-surface !shadow-[var(--shadow-md)]"
                zoomable
                pannable
                nodeStrokeWidth={2}
                maskColor="rgba(15, 23, 42, 0.08)"
              />
            )}
          </ReactFlow>

          {/* Palette rail + slide-over drawer (absolute, left) */}
          <JourneyPaletteDrawer
            open={paletteOpen}
            category={paletteCategory}
            hasTrigger={triggerPresent}
            onOpenCategory={openPalette}
            onClose={() => setPaletteOpen(false)}
            onAddKind={addAtCenter}
            onOpenTemplates={() => setTemplateOpen(true)}
          />

          {/* Top-left: Use pre-built + Validate (with status dot).
              Palette + config share the right edge — top-level canvas controls anchor left. */}
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTemplateOpen(true)}
              className="inline-flex items-center rounded-md px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              Use pre-built journey
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setValidationOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md border border-border-default bg-surface px-3 py-1.5 text-[12px] font-medium text-text-primary shadow-[var(--shadow-xs)] transition-colors hover:bg-surface-raised"
              >
                <span className={['h-2 w-2 rounded-full', validationDotClass].join(' ')} aria-hidden />
                Validate journey
              </button>
              {validationOpen && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[340px] overflow-hidden rounded-md border border-border-subtle bg-surface shadow-[var(--shadow-popover)]">
                  <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={['h-2 w-2 rounded-full', validationDotClass].join(' ')} aria-hidden />
                      <p className="text-[12px] font-semibold text-text-primary">
                        {validation.issues.length === 0 ? (
                          <>All checks passed</>
                        ) : (
                          <>
                            <span className="tabular-nums">{passedCount}</span>
                            <span className="text-text-tertiary"> / </span>
                            <span className="tabular-nums">{validation.checks.length}</span>
                            <span className="ml-1 text-text-secondary">passing</span>
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setValidationOpen(false)}
                      className="rounded p-0.5 text-text-tertiary hover:bg-surface-raised hover:text-text-primary"
                      aria-label="Close"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  {validation.issues.length === 0 ? (
                    <p className="px-3 py-3 text-[12px] text-text-secondary">
                      Journey is ready. You can proceed to Review.
                    </p>
                  ) : (
                    <ul className="max-h-[280px] overflow-y-auto py-1">
                      {validation.issues.map((iss) => (
                        <li key={iss.id}>
                          <button
                            type="button"
                            className="flex w-full items-start gap-2 px-3 py-1.5 text-left text-[12px] text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                            onClick={() => {
                              if (iss.nodeId) focusNode(iss.nodeId);
                              setValidationOpen(false);
                            }}
                          >
                            <span
                              className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-error"
                              aria-hidden
                            />
                            <span className="flex-1 leading-snug">{iss.message}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Floating cluster bottom-left */}
          <JourneyFloatingControls
            minimapVisible={showMiniMap}
            onAddNode={() => openPalette(paletteCategory ?? 'messaging')}
            onZoomIn={() => zoomIn({ duration: 200 })}
            onZoomOut={() => zoomOut({ duration: 200 })}
            onFitView={() => fitView({ padding: 0.25, duration: 280, maxZoom: 1 })}
            onToggleMinimap={() => setShowMiniMap((m) => !m)}
            onShowShortcuts={() => setShortcutsOpen((v) => !v)}
          />

          {/* Shortcuts popover (anchored bottom-left, above the floating cluster) */}
          {shortcutsOpen && (
            <div className="absolute bottom-4 left-[60px] z-30 w-[280px] rounded-md border border-border-subtle bg-surface p-3 shadow-[var(--shadow-popover)]">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold text-text-primary">Keyboard shortcuts</p>
                <button
                  type="button"
                  onClick={() => setShortcutsOpen(false)}
                  className="text-text-tertiary hover:text-text-primary"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
              <ul className="mt-2 space-y-1 text-[12px] text-text-secondary">
                <ShortcutRow keys={['/']} label="Open node palette" />
                <ShortcutRow keys={['Esc']} label="Close palette / drawer" />
                <ShortcutRow keys={['Del']} label="Remove selected node" />
                <ShortcutRow keys={['⌘', 'D']} label="Duplicate selected" />
                <ShortcutRow keys={['⌘', 'Z']} label="Undo" />
                <ShortcutRow keys={['?']} label="Toggle this popover" />
              </ul>
            </div>
          )}

          {/* Starter overlay — only when blank */}
          {starterOpen && !templateOpen && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-canvas/85 p-6 backdrop-blur-sm">
              <div className="w-full max-w-3xl rounded-xl border border-border-subtle bg-surface p-6 shadow-[var(--shadow-xl)]">
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                    Get started
                  </p>
                  <h3 className="text-[18px] font-semibold text-text-primary">
                    Choose how you want to build this journey
                  </h3>
                  <p className="text-[13px] text-text-secondary">
                    Start with a proven template or build a custom flow from scratch.
                  </p>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setTemplateOpen(true)}
                    className="group flex h-full flex-col rounded-lg border border-brand-200 bg-gradient-to-br from-surface to-brand-50 p-5 text-left transition-all hover:shadow-[var(--shadow-md)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-500 text-white">
                          <Sparkles size={18} />
                        </span>
                        <span className="text-[13px] font-semibold text-text-primary">
                          Start with a pre-built journey
                        </span>
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-brand-600 transition-transform group-hover:translate-x-0.5"
                      />
                    </div>
                    <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">
                      Pick from proven flows: Cart Recovery, KYC re-engagement, Welcome onboarding, and more.
                    </p>
                    <p className="mt-3 text-[12px] font-semibold text-brand-600">Browse templates</p>
                  </button>
                  <button
                    type="button"
                    onClick={startFromScratch}
                    className="group flex h-full flex-col rounded-lg border border-border-subtle bg-surface p-5 text-left transition-all hover:border-border-default hover:shadow-[var(--shadow-md)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-text-primary text-white">
                          <PencilLine size={18} />
                        </span>
                        <span className="text-[13px] font-semibold text-text-primary">
                          Start from scratch
                        </span>
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-text-secondary transition-transform group-hover:translate-x-0.5"
                      />
                    </div>
                    <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">
                      Open the canvas with just the entry node. Add steps from the palette on the left rail.
                    </p>
                    <p className="mt-3 text-[12px] font-semibold text-text-primary">Open canvas</p>
                  </button>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-subtle px-4 py-3">
                  <p className="text-[12px] text-text-secondary">
                    You can always pick a template later from the templates rail icon.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStarterOpen(false)}
                    className="text-[12px] font-semibold text-text-secondary hover:text-text-primary"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Right-click context menu */}
          {ctxMenu && (
            <div
              className="fixed z-[60] min-w-[160px] rounded-md border border-border-subtle bg-surface py-1 text-[13px] shadow-[var(--shadow-popover)]"
              style={{ left: ctxMenu.x, top: ctxMenu.y }}
            >
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left hover:bg-surface-raised"
                onClick={() => runCtx('rename')}
              >
                Rename
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left hover:bg-surface-raised"
                onClick={() => runCtx('duplicate')}
              >
                Duplicate
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left hover:bg-surface-raised"
                onClick={() => runCtx('note')}
              >
                Add note
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-error hover:bg-error-soft"
                onClick={() => runCtx('delete')}
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Right-side config panel — keeps its existing width-transition behavior.
            Driven by `panelNode` (explicit click), not by the React Flow selected
            flag, so dragging never pops the drawer open. */}
        <JourneyNodeConfigPanel
          node={panelNode}
          onClose={closePanel}
          onPatch={onPatchNode}
          audienceSize={audienceSize}
        />
      </div>

      {/* Docked footer (Back / Save / Launch) — suppressed in Copilot mode
          where the page renders its own header-level controls. */}
      {!hideFooter && (
        <JourneyCanvasFooter
          onBack={onBack ?? (() => undefined)}
          onSaveDraft={onSaveDraft ?? (() => undefined)}
          onNext={onNext ?? (() => undefined)}
          isLastStep={isLastStep ?? false}
          nextDisabled={validation.issues.length > 0}
          nextDisabledReason={
            validation.issues.length > 0
              ? `${validation.issues.length} validation issue${validation.issues.length === 1 ? '' : 's'} — open the validate popover to review`
              : undefined
          }
        />
      )}

      <PrebuiltJourneyModal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onSelect={applyTemplate}
      />
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={i}
            className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border-subtle bg-bg-subtle px-1 font-mono text-[10px] font-semibold text-text-secondary"
          >
            {k}
          </kbd>
        ))}
      </span>
    </li>
  );
}

export function JourneyBuilderStep(props: JourneyBuilderStepProps) {
  return (
    <ReactFlowProvider>
      <JourneyBuilderCanvas {...props} />
    </ReactFlowProvider>
  );
}
