import { useMemo } from 'react';
import { AlertTriangle, Plus, X } from 'lucide-react';
import type { Goal, GoalType, GoalPropertyFilter } from './journeyTypes';
import {
  BUSINESS_EVENTS,
  PROPERTY_FILTER_OPERATORS,
  eventsForGoalType,
  findGoalEvent,
} from '@/data/goalEvents';

/**
 * Editor for the campaign's primary goal — rendered as a sub-block of
 * the Entry trigger config panel between Audience and Schedule.
 *
 * Four fields:
 *   1. Goal type      — segmented control (conversion / engagement / delivery / custom)
 *   2. Goal event     — grouped dropdown; filtered by goal type
 *   3. Property filter — optional, only for business events
 *   4. Description    — short why-it-matters textarea
 *
 * The `targetValue` / `targetUnit` fields still exist on the Goal type
 * for back-compat (some legacy goals may have them set, and the copilot
 * can still capture them from free text), but they're not exposed in
 * the UI anymore.
 *
 * The data shape is the first item of `EntryTriggerNodeData.goals`;
 * the panel owns the persistence and passes a single Goal in/out.
 */

interface Props {
  goal: Goal | undefined;
  onChange: (next: Goal | undefined) => void;
}

const GOAL_TYPES: Array<{
  id: GoalType;
  label: string;
  hint: string;
  warning?: boolean;
}> = [
  { id: 'conversion', label: 'Conversion', hint: 'User completes a business action' },
  { id: 'engagement', label: 'Engagement', hint: 'User interacts with our message' },
  { id: 'delivery', label: 'Delivery', hint: 'We successfully reach the user', warning: true },
  { id: 'custom', label: 'Custom', hint: 'Composite or custom metric' },
];

const DESCRIPTION_MAX = 280;

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptyGoal(): Goal {
  return {
    id: newId('goal'),
    type: 'conversion',
    event: '',
    eventLabel: '',
    eventChannel: null,
    propertyFilters: [],
    targetValue: 0,
    targetUnit: 'percent',
    description: '',
  };
}

export function EntryGoalEditor({ goal, onChange }: Props) {
  // Have we ever picked a goal type? Used to gate the rest of the form.
  const hasType = !!goal?.type;

  function setType(type: GoalType) {
    if (!goal) {
      onChange({ ...emptyGoal(), type });
      return;
    }
    // Switching type resets event (since the picker is filtered),
    // but keeps target/description so the user doesn't lose context.
    onChange({ ...goal, type, event: '', eventLabel: '', eventChannel: null });
  }

  function patch(patch: Partial<Goal>) {
    if (!goal) return;
    onChange({ ...goal, ...patch });
  }

  function addFilter() {
    if (!goal) return;
    const next: GoalPropertyFilter = {
      id: newId('flt'),
      property: '',
      operator: 'equals',
      value: '',
    };
    onChange({ ...goal, propertyFilters: [...goal.propertyFilters, next] });
  }

  function updateFilter(id: string, p: Partial<GoalPropertyFilter>) {
    if (!goal) return;
    onChange({
      ...goal,
      propertyFilters: goal.propertyFilters.map((f) => (f.id === id ? { ...f, ...p } : f)),
    });
  }

  function removeFilter(id: string) {
    if (!goal) return;
    onChange({ ...goal, propertyFilters: goal.propertyFilters.filter((f) => f.id !== id) });
  }

  /* ─── Event dropdown contents (filtered by type) ──────────────────── */
  const eventGroups = useMemo(() => {
    if (!goal?.type) return { business: [], engagement: [] };
    return eventsForGoalType(goal.type);
  }, [goal?.type]);

  /* ─── Is the selected event a business event? Drives filter UI. ──── */
  const selectedEvent = findGoalEvent(goal?.event);
  const isBusinessEvent = selectedEvent?.group === 'business';

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-text-secondary">
        Define what success looks like. The AI uses this to measure performance and suggest
        improvements.
      </p>

      {/* 1. Goal type — segmented control */}
      <div>
        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
          Goal type
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {GOAL_TYPES.map((opt) => {
            const active = goal?.type === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setType(opt.id)}
                className={`flex flex-col items-start gap-0.5 rounded-md border px-2.5 py-1.5 text-left transition-colors ${
                  active
                    ? 'border-cyan bg-cyan/5 text-text-primary'
                    : 'border-[#E5E7EB] bg-white text-text-secondary hover:border-[#D1D5DB] hover:text-text-primary'
                }`}
              >
                <span className="flex items-center gap-1 text-[12.5px] font-medium">
                  {opt.label}
                  {opt.warning && (
                    <AlertTriangle
                      size={10}
                      className="text-amber-500"
                      aria-label="Delivery is a weak proxy for outcomes"
                    />
                  )}
                </span>
                <span className="text-[10px] text-text-tertiary leading-snug">{opt.hint}</span>
              </button>
            );
          })}
        </div>
        {!hasType && (
          <p className="mt-1.5 text-[11px] text-text-tertiary">Pick a goal type to continue.</p>
        )}
      </div>

      {/* 2. Goal event — grouped dropdown */}
      {hasType && goal && (
        <div>
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
            Goal event
          </p>
          <select
            value={goal.event}
            onChange={(e) => {
              const id = e.target.value;
              if (!id) {
                patch({ event: '', eventLabel: '', eventChannel: null });
                return;
              }
              const def = findGoalEvent(id);
              patch({
                event: id,
                eventLabel: def?.label ?? id,
                eventChannel: def?.channel ?? null,
              });
            }}
            className="w-full rounded-md border border-[#E5E7EB] bg-white px-2 py-2 text-sm"
          >
            <option value="">Select an event…</option>
            {eventGroups.business.length > 0 && (
              <optgroup label="BUSINESS EVENTS">
                {eventGroups.business.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </optgroup>
            )}
            {eventGroups.engagement.length > 0 && (
              <optgroup label="CAMPAIGN ENGAGEMENT EVENTS">
                {eventGroups.engagement.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {goal.type === 'custom' && (
            <button
              type="button"
              onClick={() => {
                // Stub for now — full custom-metric modal is a follow-up.
                window.alert(
                  'Custom-metric builder coming soon. For now, pick a base event below or describe the metric in the description field.',
                );
              }}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-cyan hover:underline"
            >
              <Plus size={11} />
              Define custom metric
            </button>
          )}
        </div>
      )}

      {/* 3. Property filter — only for business events */}
      {hasType && goal && isBusinessEvent && (
        <div>
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
            Property filter (optional)
          </p>
          {goal.propertyFilters.length === 0 ? (
            <button
              type="button"
              onClick={addFilter}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan hover:underline"
            >
              <Plus size={11} />
              Add filter
            </button>
          ) : (
            <div className="space-y-1.5">
              {goal.propertyFilters.map((f) => (
                <PropertyFilterRow
                  key={f.id}
                  filter={f}
                  eventId={goal.event}
                  onChange={(p) => updateFilter(f.id, p)}
                  onRemove={() => removeFilter(f.id)}
                />
              ))}
              <button
                type="button"
                onClick={addFilter}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan hover:underline"
              >
                <Plus size={11} />
                Add filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Description — why does this matter */}
      {hasType && goal && (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
              Why does this matter? (optional)
            </p>
            <span className="text-[10px] text-text-tertiary tabular-nums">
              {goal.description.length}/{DESCRIPTION_MAX}
            </span>
          </div>
          <textarea
            value={goal.description}
            maxLength={DESCRIPTION_MAX}
            onChange={(e) => patch({ description: e.target.value })}
            rows={3}
            placeholder="e.g., Get cart abandoners to complete purchase, especially first-time buyers worried about UPI auto-debit"
            className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 text-sm leading-snug"
          />
          <p className="mt-1 text-[10.5px] text-text-tertiary">
            Helps the AI copilot give you better recommendations.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Property filter row ─────────────────────────────────────────────── */

function PropertyFilterRow({
  filter,
  eventId,
  onChange,
  onRemove,
}: {
  filter: GoalPropertyFilter;
  eventId: string;
  onChange: (p: Partial<GoalPropertyFilter>) => void;
  onRemove: () => void;
}) {
  const eventDef = useMemo(
    () => BUSINESS_EVENTS.find((e) => e.id === eventId) ?? null,
    [eventId],
  );
  const properties = eventDef?.properties ?? [];

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={filter.property}
        onChange={(e) => onChange({ property: e.target.value })}
        className="min-w-0 flex-1 rounded-md border border-[#E5E7EB] bg-white px-1.5 py-1 text-[12px]"
      >
        <option value="">property</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <select
        value={filter.operator}
        onChange={(e) => onChange({ operator: e.target.value })}
        className="rounded-md border border-[#E5E7EB] bg-white px-1.5 py-1 text-[12px]"
      >
        {PROPERTY_FILTER_OPERATORS.map((op) => (
          <option key={op.id} value={op.id}>
            {op.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={filter.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder="value"
        className="min-w-0 flex-1 rounded-md border border-[#E5E7EB] px-2 py-1 text-[12px]"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove filter"
        className="rounded-md p-1 text-text-tertiary hover:bg-error-soft hover:text-error"
      >
        <X size={12} />
      </button>
    </div>
  );
}

/**
 * One-line summary used on the entry node card (and as a label
 * anywhere the goal needs to be shown compactly).
 *
 * Format: "🎯 <type> on <event> [(filters)]"
 * Example: "🎯 conversion on transaction_completed (amount > ₹500)"
 */
export function summarizeGoal(goal: Goal | undefined): string | null {
  if (!goal || !goal.type || !goal.event) return null;
  const filterStr =
    goal.propertyFilters.length > 0
      ? ` (${goal.propertyFilters
          .filter((f) => f.property && f.value)
          .map((f) => `${f.property} ${operatorSymbol(f.operator)} ${f.value}`)
          .join(', ')})`
      : '';
  return `${goal.type} on ${goal.eventLabel || goal.event}${filterStr}`;
}

function operatorSymbol(op: string): string {
  switch (op) {
    case 'equals':
      return '=';
    case 'not_equals':
      return '!=';
    case 'gt':
      return '>';
    case 'gte':
      return '>=';
    case 'lt':
      return '<';
    case 'lte':
      return '<=';
    case 'contains':
      return '∋';
    default:
      return op;
  }
}
