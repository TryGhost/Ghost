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
import { Inline } from '@tryghost/shade/primitives';
import { GhCustomTooltipContent, KpiTabTrigger, KpiTabValue } from '@tryghost/shade/patterns';
import {
  Recharts,
  abbreviateNumber,
  calculateYAxisWidth,
  formatDisplayDateWithRange,
  formatNumber,
  getYRange,
} from '@tryghost/shade/utils';
import { useShade } from '@tryghost/shade/app';
import type { CommentsOverviewStats } from '@tryghost/admin-x-framework/api/stats';

const TABS: Record<CommentsAnalyticsTab, { label: string; color: string; inverted?: boolean }> = {
  comments: { label: 'Comments', color: 'var(--chart-darkblue)' },
  commenters: { label: 'Commenters', color: 'var(--chart-teal)' },
  reported: { label: 'Reported', color: 'var(--chart-rose)', inverted: true },
};

// A rail tab is ~78px: past the trend arrow there is room for "999", "9.9k" or "99k"
const formatKpi = (value: number) => {
  if (value >= 10000 && value < 999500) {
    return `${formatNumber(Math.round(value / 1000))}k`;
  }
  return value >= 1000 ? abbreviateNumber(value) : formatNumber(value);
};

const CommentsKpis: React.FC<{
  stats: CommentsOverviewStats | undefined;
  range: number;
  comparisonDays?: number;
  tab: CommentsAnalyticsTab;
  isLoading: boolean;
  showCommenters?: boolean;
  onTabChange: (tab: CommentsAnalyticsTab) => void;
}> = ({ stats, range, comparisonDays, tab, isLoading, showCommenters = true, onTabChange }) => {
  const tabs = COMMENTS_ANALYTICS_TABS.filter((key) => showCommenters || key !== 'commenters');
  const { label, color } = TABS[tab];
  // admin7Design charts are flat, like the newsletter analytics bars
  const { admin7Design } = useShade();
  const displayRange = stats ? DISPLAY_RANGE_BY_INTERVAL[stats.interval] : 30;

  const chartData = useMemo(
    () =>
      stats?.series.map((row) => ({
        date: row.date,
        value: row[tab],
        formattedValue: formatNumber(row[tab]),
        label,
      })) ?? [],
    [stats, tab, label],
  );

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
      <TabsList className={showCommenters ? 'grid grid-cols-3' : 'grid grid-cols-2'}>
        {tabs.map((key) => {
          const trend = stats
            ? getTrend(stats.totals[key], stats.previous_totals[key], range)
            : { direction: 'hidden' as const, value: '' };
          return (
            <KpiTabTrigger key={key} className="h-auto p-4" value={key}>
              <KpiTabValue
                data-testid={`comments-analytics-kpi-${key}`}
                diffDirection={trend.direction}
                diffInverted={TABS[key].inverted}
                diffTooltip={getComparisonText(trend.value, comparisonDays ?? range)}
                diffValue=""
                label={TABS[key].label}
                value={stats ? formatKpi(stats.totals[key]) : '–'}
              />
            </KpiTabTrigger>
          );
        })}
      </TabsList>
      <div className="mt-4 h-[200px] px-4">
        {isLoading ? (
          <Inline className="size-full" justify="center">
            <BarChartLoadingIndicator />
          </Inline>
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
                content={<GhCustomTooltipContent color={color} range={displayRange} />}
                cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                isAnimationActive={false}
              />
              <defs>
                <linearGradient id="commentsAnalyticsBar" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={admin7Design ? 1 : 0.8} />
                </linearGradient>
              </defs>
              <Recharts.Bar
                activeBar={{ fillOpacity: 1 }}
                dataKey="value"
                fill="url(#commentsAnalyticsBar)"
                fillOpacity={0.9}
                isAnimationActive={false}
                maxBarSize={24}
                radius={4}
              />
            </Recharts.BarChart>
          </ChartContainer>
        )}
      </div>
    </Tabs>
  );
};

export default CommentsKpis;
