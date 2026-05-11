import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { usePhaseData } from '@/hooks/usePhaseData';
import { formatINR } from '@/utils/format';
import { theme } from '@/styles/theme';

function formatXAxisDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' });
}

function formatYAxisValue(value: number): string {
  if (value === 0) return 'AED 0';
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    const rounded = Math.round(m * 10) / 10;
    return `AED ${rounded}M`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `AED ${Math.round(k)}K`;
  }
  return `AED ${Math.round(value)}`;
}

function CustomTooltip(props: TooltipProps<number, string>) {
  const { active, payload, label } = props as { active?: boolean; payload?: Array<{ dataKey: string; value: number }>; label?: string };
  if (!active || !payload || payload.length === 0) return null;

  const revenue = payload.find((p: { dataKey: string; value: number }) => p.dataKey === 'revenue')?.value ?? 0;
  const cost = payload.find((p: { dataKey: string; value: number }) => p.dataKey === 'cost')?.value ?? 0;

  return (
    <div className="rounded-lg bg-white px-3 py-2.5 shadow-lg ring-1 ring-[#E5E7EB]">
      <p className="mb-1.5 text-xs font-medium text-text-secondary">
        {formatXAxisDate(label as string)}
      </p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: theme.colors.success }}
          />
          <span className="text-xs text-text-secondary">Revenue</span>
          <span className="ml-auto pl-4 text-xs font-semibold text-text-primary">
            {formatINR(Number(revenue))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: theme.colors.warning }}
          />
          <span className="text-xs text-text-secondary">Spend</span>
          <span className="ml-auto pl-4 text-xs font-semibold text-text-primary">
            {formatINR(Number(cost))}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CostRevenueChart() {
  const { analytics, isDay30 } = usePhaseData();

  if (!isDay30 || !analytics || analytics.revenueVsCostTrend.length === 0) {
    return null;
  }

  const data = analytics.revenueVsCostTrend;

  // Show every ~15-day tick — filter to avoid overlap
  const tickDates = data
    .filter((_, i) => {
      const date = new Date(data[i].date);
      const day = date.getDate();
      return day === 1 || day === 15 || i === 0 || i === data.length - 1;
    })
    .map((d) => d.date);

  const spendGradientId = 'costGradient';
  const revenueGradientId = 'revenueGradient';

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-[#E5E7EB]">
      <h2 className="mb-4 text-sm font-semibold text-text-primary">
        Cost vs Revenue — Last 90 Days
      </h2>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, left: 8, bottom: 0 }}
        >
          <defs>
            <linearGradient id={spendGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={theme.colors.warning}
                stopOpacity={0.22}
              />
              <stop
                offset="95%"
                stopColor={theme.colors.warning}
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient
              id={revenueGradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={theme.colors.success}
                stopOpacity={0.22}
              />
              <stop
                offset="95%"
                stopColor={theme.colors.success}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#F3F4F6"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            ticks={tickDates}
            tickFormatter={formatXAxisDate}
            tick={{ fontSize: 11, fill: theme.colors.text.secondary }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />

          <YAxis
            tickFormatter={formatYAxisValue}
            tick={{ fontSize: 11, fill: theme.colors.text.secondary }}
            axisLine={false}
            tickLine={false}
            width={52}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Spend area (rendered first = behind) */}
          <Area
            type="monotone"
            dataKey="cost"
            name="Spend"
            stroke={theme.colors.warning}
            strokeWidth={2}
            fill={`url(#${spendGradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: theme.colors.warning, strokeWidth: 0 }}
          />

          {/* Revenue area (rendered on top) */}
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={theme.colors.success}
            strokeWidth={2}
            fill={`url(#${revenueGradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: theme.colors.success, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: theme.colors.success }}
          />
          <span className="text-xs text-text-secondary">Revenue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: theme.colors.warning }}
          />
          <span className="text-xs text-text-secondary">Spend</span>
        </div>
      </div>
    </div>
  );
}
