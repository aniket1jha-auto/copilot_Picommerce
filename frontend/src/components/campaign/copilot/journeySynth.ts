import type {
  JourneyFlowEdge,
  JourneyFlowNode,
  JourneyNodeKind,
} from '@/components/campaign/journey/journeyTypes';
import { TRIGGER_KINDS } from '@/components/campaign/journey/journeyTypes';
import { createJourneyNode } from '@/components/campaign/journey/journeyConstants';
import type { ChannelKey } from './copilotEngine';
import type { CopilotTemplate } from './templateCatalog';

/**
 * Converts the copilot's accumulated journey steps into a React Flow graph
 * compatible with the existing journey builder canvas.
 *
 * v1 layout: linear chain in the main row. Wait nodes and fallback steps go
 * inline. Conditional fallbacks are tagged on the node's data label so the
 * intent is preserved; users can rewire branch handles in the canvas.
 */

const CHANNEL_TO_KIND: Record<ChannelKey, JourneyNodeKind> = {
  whatsapp: 'whatsapp_message',
  sms: 'sms',
  rcs: 'rcs_message',
  ai_voice: 'voice_agent',
};

export interface SynthStep {
  /** Stable key the chat side uses to address this step. */
  key: string;
  channel: ChannelKey;
  templateId?: string;
  templateName?: string;
  waitBeforeHours?: number;
  fallback?: 'on_failure' | 'on_no_response' | null;
}

function markNeeds(n: JourneyFlowNode): JourneyFlowNode {
  const kind = n.data.kind as string;
  if ((TRIGGER_KINDS as readonly string[]).includes(kind)) return n;
  if (kind === 'exit' || kind === 'note') return n;
  return { ...n, data: { ...n.data, needsConfig: true, configured: false } };
}

function makeEdge(
  source: string,
  target: string,
  sourceHandle?: string,
): JourneyFlowEdge {
  return {
    id: `je_${source}_${target}_${sourceHandle ?? 'd'}`,
    source,
    target,
    sourceHandle,
    type: 'journeyBezier',
    animated: true,
    style: { stroke: '#94A3B8', strokeWidth: 1.5 },
  };
}

function nodeLabel(step: SynthStep): string {
  const base = {
    whatsapp: 'WhatsApp',
    sms: 'SMS',
    rcs: 'RCS',
    ai_voice: 'AI Voice',
  }[step.channel];
  if (step.templateName) return `${base} · ${step.templateName.replace(/^.*?·\s*/, '')}`;
  return base;
}

export function synthesizeJourney(steps: SynthStep[]): {
  nodes: JourneyFlowNode[];
  edges: JourneyFlowEdge[];
} {
  const X_GAP = 220;
  const Y_MAIN = 220;

  const start = createJourneyNode('entry_trigger', { x: 120, y: Y_MAIN });
  const nodes: JourneyFlowNode[] = [start];
  const edges: JourneyFlowEdge[] = [];

  if (steps.length === 0) {
    return { nodes, edges };
  }

  let cursorX = 120 + X_GAP;
  let prevId = start.id;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Insert a wait node BEFORE this step if requested
    if (step.waitBeforeHours && step.waitBeforeHours > 0) {
      const w = markNeeds(createJourneyNode('wait', { x: cursorX, y: Y_MAIN }));
      w.data = {
        ...w.data,
        label: `Wait ${formatDuration(step.waitBeforeHours)}`,
        durationHours: step.waitBeforeHours,
      };
      nodes.push(w);
      edges.push(makeEdge(prevId, w.id));
      prevId = w.id;
      cursorX += X_GAP;
    }

    const kind = CHANNEL_TO_KIND[step.channel];
    const node = markNeeds(createJourneyNode(kind, { x: cursorX, y: Y_MAIN }));
    node.data = {
      ...node.data,
      label: nodeLabel(step),
      ...(step.templateId ? { templateId: step.templateId } : {}),
      ...(step.fallback
        ? {
            copilotFallback: step.fallback,
            note:
              step.fallback === 'on_failure'
                ? 'Fallback when previous channel delivery fails'
                : 'Fallback when previous channel gets no response',
          }
        : {}),
    };
    nodes.push(node);
    edges.push(makeEdge(prevId, node.id));
    prevId = node.id;
    cursorX += X_GAP;
  }

  // Tail exit node
  const exit = createJourneyNode('exit', { x: cursorX, y: Y_MAIN });
  nodes.push(exit);
  edges.push(makeEdge(prevId, exit.id));

  return { nodes, edges };
}

function formatDuration(hours: number): string {
  if (hours < 1) {
    const m = Math.round(hours * 60);
    return `${m}m`;
  }
  if (hours < 24) {
    const h = Math.round(hours * 10) / 10;
    return `${h}h`;
  }
  const d = Math.round((hours / 24) * 10) / 10;
  return `${d}d`;
}

/**
 * For internal display (mini diagram, summaries) — returns a friendly label
 * for a step.
 */
export function describeStep(step: SynthStep): string {
  const base = nodeLabel(step);
  if (step.fallback === 'on_failure') return `${base} (on delivery fail)`;
  if (step.fallback === 'on_no_response') return `${base} (on no response)`;
  return base;
}

export function describeWait(hours: number): string {
  return `Wait ${formatDuration(hours)}`;
}

export function isStepMissingTemplate(step: SynthStep): boolean {
  return !step.templateId;
}

/** Apply a chosen template to the step, mutating a copy. */
export function setStepTemplate(step: SynthStep, tpl: CopilotTemplate): SynthStep {
  return { ...step, templateId: tpl.id, templateName: tpl.name };
}
