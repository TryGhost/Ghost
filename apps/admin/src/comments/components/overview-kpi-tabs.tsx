import React, { useMemo, useState } from 'react';
import {
  BarChartLoadingIndicator,
  Card,
  CardContent,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Tabs,
  TabsList,
  type ChartConfig,
} from '@tryghost/shade/components';
import { KpiTabTrigger, KpiTabValue } from '@tryghost/shade/patterns';
import {
  type CommentsOverviewSeriesItem,
  type CommentsOverviewTotals,
} from '@tryghost/admin-x-framework/api/stats';
import {
  LucideIcon,
  Recharts,
  formatDisplayDateWithRange,
  formatNumber,
  formatPercentage,
} from '@tryghost/shade/utils';
import { STATS_RANGES } from '@/shared/analytics/constants';
import { getPreviousPeriodText } from '@/comments/utils/period-text';
import { truncateLeadingEmptyData } from '@/shared/analytics/chart-helpers';
import { type CommentFilterPatch } from '@/comments/apply-comment-filters';

type MetricKey = 'comments' | 'commenters' | 'reported';

type DiffDirection = 'up' | 'down' | 'same';

interface MetricDiff {
  direction: DiffDirection;
  diffValue: string;
  previousValue: number;
}

interface OverviewKpiTabsProps {
  totals: CommentsOverviewTotals | undefined;
  previousTotals: CommentsOverviewTotals | null | undefined;
  series: CommentsOverviewSeriesItem[] | undefined;
  seriesAggregation: 'day' | 'week' | 'month';
  range: number;
  isLoading: boolean;
  onApplyFilters: (patches: CommentFilterPatch[]) => void;
}

const TAB_CONFIG: Record<
  MetricKey,
  {
    label: string;
    color: string;
    seriesField: 'count' | 'commenters' | 'reported';
    totalsField: keyof CommentsOverviewTotals;
  }
> = {
  comments: {
    label: 'Comments',
    color: 'var(--chart-darkblue)',
    seriesField: 'count',
    totalsField: 'comments',
  },
  commenters: {
    label: 'Commenters',
    color: 'var(--chart-blue)',
    seriesField: 'commenters',
    totalsField: 'commenters',
  },
  reported: {
    label: 'Reported',
    color: 'var(--chart-rose)',
    seriesField: 'reported',
    totalsField: 'reported',
  },
};

const METRIC_KEYS: readonly MetricKey[] = ['comments', 'commenters', 'reported'];

function rawDateFromPayload(payload: { date?: string } | undefined): string | undefined {
  return typeof payload?.date === 'string' ? payload.date : undefined;
}

const calcDiff = (current: number, previous: number): MetricDiff => {
  if (previous === 0) {
    const direction: DiffDirection = current > 0 ? 'up' : 'same';
    return {
      direction,
      diffValue: current > 0 ? formatPercentage(1) : formatPercentage(0),
      previousValue: previous,
    };
  }
  const change = (current - previous) / previous;
  const direction: DiffDirection = change > 0 ? 'up' : change < 0 ? 'down' : 'same';
  return {
    direction,
    diffValue: formatPercentage(change),
    previousValue: previous,
  };
};

const buildDiffTooltip = (diff: MetricDiff, range: number): React.ReactNode => {
  const previousPeriodText = getPreviousPeriodText(range);
  if (!previousPeriodText) {
    return null;
  }
  const formattedPrevious = formatNumber(diff.previousValue);

  if (diff.direction === 'same') {
    return (
      <span>
        Unchanged from the <span className="font-semibold">{previousPeriodText}</span>
      </span>
    );
  }
  const directionText = diff.direction === 'up' ? 'up' : 'down';
  return (
    <span>
      You&apos;re trending{' '}
      <span className="font-semibold">
        {directionText} {diff.diffValue}
      </span>{' '}
      from <span className="font-semibold">{formattedPrevious}</span> compared to the{' '}
      <span className="font-semibold">{previousPeriodText}</span>
    </span>
  );
};

const OverviewKpiTabs: React.FC<OverviewKpiTabsProps> = ({
  totals,
  previousTotals,
  series,
  seriesAggregation,
  range,
  isLoading,
  onApplyFilters,
}) => {
  const [currentTab, setCurrentTab] = useState<MetricKey>('comments');
  const config = TAB_CONFIG[currentTab];
  const gradientId = `comments-bar-gradient-${currentTab}`;
  const isDailyAggregation = seriesAggregation === 'day';
  const displayRange =
    seriesAggregation === 'month'
      ? STATS_RANGES.last12Months.value
      : seriesAggregation === 'week'
        ? STATS_RANGES.last3Months.value
        : range;

  const handleBarClick = (data: unknown) => {
    const record = data as { date?: string; payload?: { date?: string } } | undefined;
    const date = rawDateFromPayload(record) ?? rawDateFromPayload(record?.payload);
    if (!isDailyAggregation || !date) {
      return;
    }
    const patches: CommentFilterPatch[] = [{ field: 'created_at', value: date }];
    if (currentTab === 'reported') {
      patches.push({ field: 'reported', value: 'true', operator: 'is' });
    }
    onApplyFilters(patches);
  };

  const chartData = useMemo(() => {
    if (!series || series.length === 0) {
      return [] as { date: string; value: number; formattedValue: string }[];
    }
    const points = series.map((point) => {
      const rawValue = Number(point[config.seriesField]) || 0;
      return {
        date: point.date,
        value: rawValue,
        formattedValue: formatNumber(rawValue),
      };
    });
    // "All time" is a fixed 1000-day window, so a younger site gets a run of
    // empty leading buckets. Trim them like the other analytics charts do.
    return range === STATS_RANGES.allTime.value
      ? truncateLeadingEmptyData(points, 'value')
      : points;
  }, [series, config.seriesField, range]);

  const chartConfig: ChartConfig = {
    value: { label: config.label, color: config.color },
  };

  const diffsHidden = range === STATS_RANGES.allTime.value;
  const diffs = useMemo(() => {
    if (diffsHidden || !totals || !previousTotals) {
      return null;
    }
    const buildEntry = (key: MetricKey) => {
      const field = TAB_CONFIG[key].totalsField;
      const diff = calcDiff(totals[field], previousTotals[field]);
      return { ...diff, tooltip: buildDiffTooltip(diff, range) };
    };
    return {
      comments: buildEntry('comments'),
      commenters: buildEntry('commenters'),
      reported: buildEntry('reported'),
    };
  }, [diffsHidden, totals, previousTotals, range]);

  return (
    <Card>
      <Tabs
        value={currentTab}
        variant="kpis"
        onValueChange={(value) => setCurrentTab(value as MetricKey)}
      >
        <TabsList className="-mx-px grid grid-cols-3">
          {METRIC_KEYS.map((key) => {
            const cfg = TAB_CONFIG[key];
            const diff = diffs?.[key];
            return (
              <KpiTabTrigger key={key} className="px-3 py-4" value={key}>
                <KpiTabValue
                  data-testid={`kpi-value-${key}`}
                  diffDirection={diff && diff.direction !== 'same' ? diff.direction : 'hidden'}
                  diffTooltip={diff && diff.direction !== 'same' ? diff.tooltip : undefined}
                  diffValue={diff?.diffValue}
                  label={cfg.label}
                  value={totals ? formatNumber(totals[cfg.totalsField]) : '—'}
                />
              </KpiTabTrigger>
            );
          })}
        </TabsList>
        <CardContent className="p-3 pt-4">
          {isLoading ? (
            <div className="flex h-[220px] items-center justify-center">
              <BarChartLoadingIndicator />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <LucideIcon.BarChart3 className="opacity-40" size={32} strokeWidth={1.5} />
              No {config.label.toLowerCase()} in this period
            </div>
          ) : (
            <ChartContainer
              className={`aspect-auto h-[220px] w-full ${isDailyAggregation ? '[&_.recharts-bar-rectangle]:cursor-pointer' : ''}`}
              config={chartConfig}
            >
              <Recharts.BarChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={config.color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={config.color} stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <Recharts.CartesianGrid stroke="var(--border)" vertical={false} />
                <Recharts.XAxis
                  axisLine={false}
                  dataKey="date"
                  tickFormatter={(date: string) => formatDisplayDateWithRange(date, displayRange)}
                  tickLine={false}
                  tickMargin={10}
                />
                <Recharts.YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickFormatter={(value: number) => formatNumber(value)}
                  tickLine={false}
                  width={28}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="min-w-[140px]"
                      formatter={(value, _name, item) => {
                        const payload = item?.payload as { date?: string } | undefined;
                        const rawDate = rawDateFromPayload(payload);
                        const tooltipDate = rawDate
                          ? formatDisplayDateWithRange(rawDate, displayRange)
                          : '';
                        return (
                          <div className="flex w-full flex-col">
                            {tooltipDate && (
                              <div className="mb-1 text-sm font-medium text-foreground">
                                {tooltipDate}
                              </div>
                            )}
                            <div className="flex w-full items-center justify-between gap-4">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="inline-block size-2 rounded-full opacity-50"
                                  style={{ backgroundColor: config.color }}
                                />
                                <span className="text-sm text-muted-foreground">
                                  {config.label}
                                </span>
                              </div>
                              <span className="font-mono font-medium text-foreground tabular-nums">
                                {formatNumber(Number(value))}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                      hideLabel
                    />
                  }
                  cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                />
                <Recharts.Bar
                  activeBar={{ fillOpacity: 1 }}
                  dataKey="value"
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                  maxBarSize={32}
                  minPointSize={2}
                  radius={[4, 4, 0, 0]}
                  onClick={isDailyAggregation ? (data) => handleBarClick(data) : undefined}
                />
              </Recharts.BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default OverviewKpiTabs;
