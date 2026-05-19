import { create } from 'zustand';
import type { Dashboard, DashboardWidget, DataSource, WidgetType } from '@/types/dashboard';

/**
 * In-memory store for user-built dashboards.
 *
 * Tier A: no drag-drop, no resize. Widgets stack vertically in the
 * order they were added; users reorder via "move up / move down"
 * buttons on each widget. Two demo dashboards are seeded so the
 * empty state has something to bounce off.
 */

let widgetCounter = 0;
const nextWidgetId = () => `dw-${++widgetCounter}-${Date.now().toString(36)}`;

function seedWidget(
  type: WidgetType,
  title: string,
  dataSource: DataSource,
): DashboardWidget {
  return { id: nextWidgetId(), type, title, dataSource };
}

const seededDashboards: Dashboard[] = [
  {
    id: 'dash-default-1',
    name: 'Executive Overview',
    description: 'Headline KPIs the leadership team checks every morning.',
    widgets: [
      seedWidget('kpi', 'Active campaigns', 'campaign_overview'),
      seedWidget('kpi', 'Conversion rate', 'channel_performance'),
      seedWidget('kpi', 'Revenue this week', 'revenue_trend'),
      seedWidget('line_chart', 'Revenue trend (7d)', 'revenue_trend'),
      seedWidget('bar_chart', 'Conversion by channel', 'channel_performance'),
    ],
    createdAt: '2026-04-12T09:00:00Z',
    updatedAt: '2026-05-10T11:15:00Z',
  },
  {
    id: 'dash-default-2',
    name: 'Agent Operations',
    description: 'Call volume, completion, and per-agent breakdown.',
    widgets: [
      seedWidget('kpi', 'Total calls today', 'agent_calls'),
      seedWidget('line_chart', 'Call volume (7d)', 'agent_calls'),
      seedWidget('table', 'Agent leaderboard', 'agent_calls'),
    ],
    createdAt: '2026-04-22T08:30:00Z',
    updatedAt: '2026-05-12T14:40:00Z',
  },
];

interface DashboardsState {
  dashboards: Dashboard[];

  getDashboard: (id: string) => Dashboard | undefined;
  createDashboard: (input: Pick<Dashboard, 'name'> & Partial<Pick<Dashboard, 'description'>>) => Dashboard;
  updateDashboard: (id: string, patch: Partial<Pick<Dashboard, 'name' | 'description'>>) => void;
  deleteDashboard: (id: string) => void;

  addWidget: (dashboardId: string, widget: Omit<DashboardWidget, 'id'>) => DashboardWidget | null;
  removeWidget: (dashboardId: string, widgetId: string) => void;
  updateWidget: (
    dashboardId: string,
    widgetId: string,
    patch: Partial<Pick<DashboardWidget, 'title' | 'type' | 'dataSource'>>,
  ) => void;
  moveWidget: (dashboardId: string, widgetId: string, direction: 'up' | 'down') => void;
}

let dashIdCounter = 0;
const nextDashId = () => `dash-${++dashIdCounter}-${Date.now().toString(36)}`;

function touch(d: Dashboard): Dashboard {
  return { ...d, updatedAt: new Date().toISOString() };
}

export const useDashboardsStore = create<DashboardsState>((set, get) => ({
  dashboards: seededDashboards,

  getDashboard: (id) => get().dashboards.find((d) => d.id === id),

  createDashboard: (input) => {
    const now = new Date().toISOString();
    const d: Dashboard = {
      id: nextDashId(),
      name: input.name,
      description: input.description,
      widgets: [],
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ dashboards: [d, ...s.dashboards] }));
    return d;
  },

  updateDashboard: (id, patch) =>
    set((s) => ({
      dashboards: s.dashboards.map((d) => (d.id === id ? touch({ ...d, ...patch }) : d)),
    })),

  deleteDashboard: (id) =>
    set((s) => ({ dashboards: s.dashboards.filter((d) => d.id !== id) })),

  addWidget: (dashboardId, widget) => {
    const newWidget: DashboardWidget = { id: nextWidgetId(), ...widget };
    let added: DashboardWidget | null = null;
    set((s) => ({
      dashboards: s.dashboards.map((d) => {
        if (d.id !== dashboardId) return d;
        added = newWidget;
        return touch({ ...d, widgets: [...d.widgets, newWidget] });
      }),
    }));
    return added;
  },

  removeWidget: (dashboardId, widgetId) =>
    set((s) => ({
      dashboards: s.dashboards.map((d) =>
        d.id === dashboardId
          ? touch({ ...d, widgets: d.widgets.filter((w) => w.id !== widgetId) })
          : d,
      ),
    })),

  updateWidget: (dashboardId, widgetId, patch) =>
    set((s) => ({
      dashboards: s.dashboards.map((d) =>
        d.id === dashboardId
          ? touch({
              ...d,
              widgets: d.widgets.map((w) => (w.id === widgetId ? { ...w, ...patch } : w)),
            })
          : d,
      ),
    })),

  moveWidget: (dashboardId, widgetId, direction) =>
    set((s) => ({
      dashboards: s.dashboards.map((d) => {
        if (d.id !== dashboardId) return d;
        const idx = d.widgets.findIndex((w) => w.id === widgetId);
        if (idx === -1) return d;
        const target = direction === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= d.widgets.length) return d;
        const next = [...d.widgets];
        [next[idx], next[target]] = [next[target], next[idx]];
        return touch({ ...d, widgets: next });
      }),
    })),
}));
