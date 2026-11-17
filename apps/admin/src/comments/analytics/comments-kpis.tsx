import React, { useMemo } from 'react';
import {
  BarChartLoadingIndicator,
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  Tabs,
  TabsList,
} from '@tryghost/shade/components';
import {
  COMMENTS_ANALYTICS_TABS,
  type CommentsAnalyticsTab,
  DISPLAY_RANGE_BY_INTERVAL,
  getComparisonText,
  getTrend,
} from './comments-analytics-helpers';
import { KpiTabTrigger, KpiTabValue } from '@tryghost/shade/patterns';
import {
  Recharts,
  calculateYAxisWidth,
  formatDisplayDateWithRange,
  formatNumber,
  getYRange,
} from '@tryghost/shade/utils';
import { STATS_RANGES } from '@/shared/analytics/constants';
import { truncateLeadingEmptyData } from '@/shared/analytics/chart-helpers';
import type { CommentsOverviewStats } from '@tryghost/admin-x-framework/api/stats';

const TABS: Record<CommentsAnalyticsTab, { label: string; color: string; inverted?: boolean }> = {
  comments: { label: 'Comments', color: 'var(--chart-blue)' },
  commenters: { label: 'Commenters', color: 'var(--chart-teal)' },
  reported: { label: 'Reported', color: 'var(--chart-orange)', inverted: true },
};

type ChartRow = { date: string; value: number };

const ChartTooltipContent: React.FC<{
  active?: boolean;
  payload?: { payload: ChartRow }[];
  label: string;
  displayRange: number;
}> = ({ active, payload, label, displayRange }) => {
  if (!active || !payload?.length) {
    return null;
  }
  const { date, value } = payload[0].payload;
  return (
    <div className="min-w-[160px] rounded-lg border bg-background px-3 py-2 shadow-lg">
      <div className="mb-1 text-sm text-foreground">
        {formatDisplayDateWithRange(date, displayRange)}
      </div>
      <div className="flex items-center justify-between gap-5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{formatNumber(value)}</span>
      </div>
    </div>
  );
};

const CommentsKpis: React.FC<{
  stats: CommentsOverviewStats | undefined;
  range: number;
  tab: CommentsAnalyticsTab;
  isLoading: boolean;
  onTabChange: (tab: CommentsAnalyticsTab) => void;
}> = ({ stats, range, tab, isLoading, onTabChange }) => {
  const { label, color } = TABS[tab];
  const displayRange = stats ? DISPLAY_RANGE_BY_INTERVAL[stats.interval] : 30;

  const chartData = useMemo(() => {
    if (!stats) {
      return [];
    }
    const series =
      range === STATS_RANGES.allTime.value
        ? truncateLeadingEmptyData(stats.series, 'comments')
        : stats.series;
    return series.map((row) => ({ date: row.date, value: row[tab] }));
  }, [stats, range, tab]);

  const yRange = getYRange(chartData);
  const yTicks = [0, Math.max(yRange.max, 1)];
  const xTicks = chartData.length ? [chartData[0].date, chartData[chartData.length - 1].date] : [];
  const chartConfig = { value: { label } } satisfies ChartConfig;

  return (
    <Tabs
      data-testid="comments-analytics-kpis"
      value={tab}
      variant="kpis"
      onValueChange={(value) => onTabChange(value as CommentsAnalyticsTab)}
    >
      <TabsList className="grid grid-cols-3">
        {COMMENTS_ANALYTICS_TABS.map((key) => {
          const trend = stats
            ? getTrend(stats.totals[key], stats.previous_totals[key], range)
            : { direction: 'hidden' as const, value: '' };
          return (
            <KpiTabTrigger key={key} className="h-auto p-4" value={key}>
              <KpiTabValue
                data-testid={`comments-analytics-kpi-${key}`}
                diffDirection={trend.direction}
                diffInverted={TABS[key].inverted}
                diffTooltip={getComparisonText(range)}
                diffValue={trend.value}
                label={TABS[key].label}
                value={stats ? formatNumber(stats.totals[key]) : '–'}
              />
            </KpiTabTrigger>
          );
        })}
      </TabsList>
      <div className="mt-4 h-[200px] px-4">
        {isLoading ? (
          <div className="flex size-full items-center justify-center">
            <BarChartLoadingIndicator />
          </div>
        ) : (
          <ChartContainer className="aspect-auto size-full" config={chartConfig}>
            <Recharts.BarChart data={chartData} margin={{ top: 8, left: 0, right: 24 }}>
              <Recharts.CartesianGrid stroke="var(--border)" vertical={false} />
              <Recharts.XAxis
                axisLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
                dataKey="date"
                interval={0}
                tickFormatter={(value: string) =>
                  formatDisplayDateWithRange(value, displayRange === 90 ? 30 : displayRange)
                }
                tickLine={false}
                tickMargin={8}
                ticks={xTicks}
              />
              <Recharts.YAxis
                allowDecimals={false}
                axisLine={false}
                domain={yTicks}
                tickFormatter={(value: number) => formatNumber(value)}
                tickLine={false}
                ticks={yTicks}
                width={calculateYAxisWidth(yTicks, formatNumber)}
              />
              <ChartTooltip
                content={<ChartTooltipContent displayRange={displayRange} label={label} />}
                cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                isAnimationActive={false}
              />
              <Recharts.Bar
                dataKey="value"
                fill={color}
                isAnimationActive={false}
                maxBarSize={24}
                radius={[3, 3, 0, 0]}
              />
            </Recharts.BarChart>
          </ChartContainer>
        )}
      </div>
    </Tabs>
  );
};

export default CommentsKpis;
