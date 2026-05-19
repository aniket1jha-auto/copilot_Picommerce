import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { DashboardWidget, DataSource } from '@/types/dashboard';
import { DATA_SOURCE_LABEL } from '@/types/dashboard';

/**
 * Renders a single dashboard widget. All numbers are mocked — the
 * shape mirrors what a real /metrics endpoint would return, so this
 * is the natural seam to swap in a fetch when we have a backend.
 */
export function WidgetRenderer({ widget }: { widget: DashboardWidget }) {
  return (
    <div className="flex h-full flex-col">
      <header className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="text-[13px] font-semibold text-text-primary">{widget.title}</h4>
        <span className="text-[10px] uppercase tracking-wide text-text-tertiary">
          {DATA_SOURCE_LABEL[widget.dataSource]}
        </span>
      </header>
      <div className="flex-1 min-h-0">{renderByType(widget)}</div>
    </div>
  );
}

function renderByType(widget: DashboardWidget) {
  switch (widget.type) {
    case 'kpi':
      return <KpiTile dataSource={widget.dataSource} />;
    case 'line_chart':
      return <LineChartView dataSource={widget.dataSource} />;
    case 'bar_chart':
      return <BarChartView dataSource={widget.dataSource} />;
    case 'table':
      return <TableView dataSource={widget.dataSource} />;
  }
}

/* ─── Mock data per source ────────────────────────────────────────────── */

interface KpiData {
  value: string;
  delta: number;
  deltaLabel: string;
  caption?: string;
}

function getKpiData(source: DataSource): KpiData {
  switch (source) {
    case 'campaign_overview':
      return { value: '14', delta: 2, deltaLabel: 'vs last week', caption: 'Active campaigns' };
    case 'channel_performance':
      return { value: '6.4%', delta: 1.2, deltaLabel: 'vs prev period', caption: 'Avg conversion rate' };
    case 'agent_calls':
      return { value: '2,140', delta: 8.2, deltaLabel: 'vs yesterday', caption: 'Calls today' };
    case 'revenue_trend':
      return { value: '₹18.6L', delta: 12.4, deltaLabel: 'vs last week', caption: 'Revenue this week' };
  }
}

function KpiTile({ dataSource }: { dataSource: DataSource }) {
  const data = getKpiData(dataSource);
  const positive = data.delta >= 0;
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-[28px] font-bold leading-tight tracking-tight text-text-primary">
        {data.value}
      </p>
      <div className="mt-1 flex items-center gap-1">
        {positive ? (
          <ArrowUpRight size={13} className="text-success" />
        ) : (
          <ArrowDownRight size={13} className="text-error" />
        )}
        <span className={`text-[12px] font-medium ${positive ? 'text-success' : 'text-error'}`}>
          {positive ? '+' : ''}
          {data.delta}%
        </span>
        <span className="text-[11px] text-text-tertiary">{data.deltaLabel}</span>
      </div>
      {data.caption && (
        <p className="mt-1 text-[11px] text-text-secondary">{data.caption}</p>
      )}
    </div>
  );
}

interface LinePoint {
  label: string;
  value: number;
}

function getLineData(source: DataSource): LinePoint[] {
  switch (source) {
    case 'agent_calls':
      return [
        { label: 'Mon', value: 1840 },
        { label: 'Tue', value: 2080 },
        { label: 'Wed', value: 1920 },
        { label: 'Thu', value: 2210 },
        { label: 'Fri', value: 2380 },
        { label: 'Sat', value: 1640 },
        { label: 'Sun', value: 2140 },
      ];
    case 'revenue_trend':
    default:
      return [
        { label: 'Mon', value: 220000 },
        { label: 'Tue', value: 260000 },
        { label: 'Wed', value: 240000 },
        { label: 'Thu', value: 310000 },
        { label: 'Fri', value: 340000 },
        { label: 'Sat', value: 210000 },
        { label: 'Sun', value: 286000 },
      ];
  }
}

function LineChartView({ dataSource }: { dataSource: DataSource }) {
  const data = useMemo(() => getLineData(dataSource), [dataSource]);
  return (
    <div style={{ minHeight: 160, height: '100%' }}>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 5, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #E5E7EB' }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#00BAF2"
            strokeWidth={2}
            dot={{ r: 3, fill: '#00BAF2' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface BarPoint {
  label: string;
  value: number;
}

function getBarData(source: DataSource): BarPoint[] {
  switch (source) {
    case 'channel_performance':
      return [
        { label: 'WhatsApp', value: 7.9 },
        { label: 'AI Voice', value: 7.7 },
        { label: 'Push', value: 3.6 },
        { label: 'SMS', value: 1.7 },
      ];
    case 'campaign_overview':
    default:
      return [
        { label: 'Recovery', value: 4820 },
        { label: 'KYC', value: 3140 },
        { label: 'Welcome', value: 2750 },
        { label: 'Cashback', value: 1980 },
      ];
  }
}

function BarChartView({ dataSource }: { dataSource: DataSource }) {
  const data = useMemo(() => getBarData(dataSource), [dataSource]);
  return (
    <div style={{ minHeight: 160, height: '100%' }}>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 5, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #E5E7EB' }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Bar dataKey="value" fill="#00BAF2" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TableRow {
  cells: Array<string | number>;
}

interface TableSpec {
  headers: string[];
  rows: TableRow[];
}

function getTableData(source: DataSource): TableSpec {
  switch (source) {
    case 'agent_calls':
      return {
        headers: ['Agent', 'Calls', 'Completion', 'Avg duration'],
        rows: [
          { cells: ['Sales — Coral', 412, '78%', '3m 24s'] },
          { cells: ['Recovery — Sage', 386, '82%', '2m 48s'] },
          { cells: ['Support — Verse', 298, '91%', '4m 10s'] },
          { cells: ['KYC — Alloy', 254, '74%', '2m 02s'] },
        ],
      };
    case 'campaign_overview':
      return {
        headers: ['Campaign', 'Sent', 'Converted', 'Conv %'],
        rows: [
          { cells: ['Loan Recovery — Apr', '49,200', '4,820', '9.8%'] },
          { cells: ['KYC Boost', '38,400', '3,140', '8.2%'] },
          { cells: ['Welcome Onboard', '22,100', '2,750', '12.4%'] },
          { cells: ['Cashback Push', '31,600', '1,980', '6.3%'] },
        ],
      };
    case 'channel_performance':
    default:
      return {
        headers: ['Channel', 'Sent', 'Delivered', 'Conv %'],
        rows: [
          { cells: ['WhatsApp', '27,400', '26,030', '7.9%'] },
          { cells: ['Push', '7,600', '7,258', '3.6%'] },
          { cells: ['SMS', '10,600', '9,530', '1.7%'] },
          { cells: ['AI Voice', '3,800', '3,610', '7.7%'] },
        ],
      };
  }
}

function TableView({ dataSource }: { dataSource: DataSource }) {
  const data = useMemo(() => getTableData(dataSource), [dataSource]);
  return (
    <div className="overflow-hidden rounded-md border border-[#F3F4F6]">
      <table className="min-w-full text-[12px]">
        <thead>
          <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
            {data.headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-text-tertiary"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-[#F3F4F6] last:border-0">
              {row.cells.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-3 py-2 ${ci === 0 ? 'font-medium text-text-primary' : 'text-text-secondary'} tabular-nums`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
