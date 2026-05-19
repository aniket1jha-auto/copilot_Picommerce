/**
 * Custom dashboards / reports — Tier A.
 *
 * Lightweight schema for the Reporting section under Observe. Users
 * create dashboards (named collections of widgets) and add widgets
 * one at a time from a small catalog. Each widget is bound to a
 * mock data source — when a real backend lands, only the data-fetch
 * layer changes.
 */

export type WidgetType = 'kpi' | 'line_chart' | 'bar_chart' | 'table';

export type DataSource =
  | 'campaign_overview'
  | 'channel_performance'
  | 'agent_calls'
  | 'revenue_trend';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  dataSource: DataSource;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  createdAt: string;
  updatedAt: string;
}

/* ─── Catalog labels ──────────────────────────────────────────────────── */

export const WIDGET_TYPE_LABEL: Record<WidgetType, string> = {
  kpi: 'KPI tile',
  line_chart: 'Line chart',
  bar_chart: 'Bar chart',
  table: 'Table',
};

export const WIDGET_TYPE_DESCRIPTION: Record<WidgetType, string> = {
  kpi: 'A single big number with delta vs. previous period.',
  line_chart: 'Time-series line for one metric across recent periods.',
  bar_chart: 'Compare a metric across discrete categories.',
  table: 'Rows of records with multiple columns.',
};

export const DATA_SOURCE_LABEL: Record<DataSource, string> = {
  campaign_overview: 'Campaign overview',
  channel_performance: 'Channel performance',
  agent_calls: 'Agent calls',
  revenue_trend: 'Revenue trend',
};

export const DATA_SOURCE_DESCRIPTION: Record<DataSource, string> = {
  campaign_overview: 'High-level campaign metrics — sent, delivered, converted.',
  channel_performance: 'Per-channel reach, engagement, conversion, ROI.',
  agent_calls: 'AI voice / chat agent call volume + completion.',
  revenue_trend: 'Revenue and spend across the last 7 / 30 days.',
};

/**
 * Some (widget type × data source) combinations don't make sense
 * (e.g. KPI tile from a table-shaped data source). This helper
 * narrows the picker UI to the compatible options.
 */
export function compatibleDataSources(type: WidgetType): DataSource[] {
  switch (type) {
    case 'kpi':
      return ['campaign_overview', 'channel_performance', 'agent_calls', 'revenue_trend'];
    case 'line_chart':
      return ['revenue_trend', 'agent_calls'];
    case 'bar_chart':
      return ['channel_performance', 'campaign_overview'];
    case 'table':
      return ['channel_performance', 'campaign_overview', 'agent_calls'];
  }
}
