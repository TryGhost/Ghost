import React, {useMemo, useState} from 'react';
import {BarChartLoadingIndicator, Card, CardContent, ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, KpiTabTrigger, KpiTabValue, Tabs, TabsList} from '@tryghost/shade/components';
import {CommentsOverviewSeriesItem, CommentsOverviewTotals} from '@tryghost/admin-x-framework/api/stats';
import {LucideIcon, Recharts, formatNumber, formatPercentage} from '@tryghost/shade/utils';
import {STATS_RANGES} from '@src/utils/constants';
import {formatDisplayDateWithRange, sanitizeChartData} from '@tryghost/shade/app';
import {getPreviousPeriodText} from '../utils/period-text';
import type {CommentFilterUpdate} from '../hooks/use-filter-state';

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
    range: number;
    isLoading: boolean;
    /**
     * Clicking a bar filters the moderation list to comments from that date.
     * On the Reported tab, also applies `reported=true`.
     */
    onAddFilters: (filters: CommentFilterUpdate[]) => void;
}

const TAB_CONFIG: Record<MetricKey, {label: string; color: string; seriesField: 'count' | 'commenters' | 'reported'; totalsField: keyof CommentsOverviewTotals}> = {
    comments: {label: 'Comments', color: 'var(--chart-darkblue)', seriesField: 'count', totalsField: 'comments'},
    commenters: {label: 'Commenters', color: 'var(--chart-blue)', seriesField: 'commenters', totalsField: 'commenters'},
    reported: {label: 'Reported', color: 'var(--chart-rose)', seriesField: 'reported', totalsField: 'reported'}
};

const METRIC_KEYS: readonly MetricKey[] = ['comments', 'commenters', 'reported'];

const calcDiff = (current: number, previous: number): MetricDiff => {
    if (previous === 0) {
        // No prior baseline — any positive value is a "new" 100% increase, zero
        // stays flat. Showing "∞%" would be noisy, so we cap at 100%.
        const direction: DiffDirection = current > 0 ? 'up' : 'same';
        return {
            direction,
            diffValue: current > 0 ? formatPercentage(1) : formatPercentage(0),
            previousValue: previous
        };
    }
    const change = (current - previous) / previous;
    const direction: DiffDirection = change > 0 ? 'up' : change < 0 ? 'down' : 'same';
    return {
        direction,
        diffValue: formatPercentage(change),
        previousValue: previous
    };
};

const buildDiffTooltip = (
    diff: MetricDiff,
    range: number
): React.ReactNode => {
    const previousPeriodText = getPreviousPeriodText(range);
    if (!previousPeriodText) {
        return null;
    }
    const formattedPrevious = formatNumber(diff.previousValue);

    if (diff.direction === 'same') {
        return (
            <span>
                Unchanged from the <span className='font-semibold'>{previousPeriodText}</span>
            </span>
        );
    }
    const directionText = diff.direction === 'up' ? 'up' : 'down';
    return (
        <span>
            You&apos;re trending <span className='font-semibold'>{directionText} {diff.diffValue}</span> from <span className='font-semibold'>{formattedPrevious}</span> compared to the <span className='font-semibold'>{previousPeriodText}</span>
        </span>
    );
};

export const shouldHideDiffs = (range: number) => (
    range === STATS_RANGES.ALL_TIME.value || range === STATS_RANGES.YEAR_TO_DATE.value
);

const OverviewKpiTabs: React.FC<OverviewKpiTabsProps> = ({totals, previousTotals, series, range, isLoading, onAddFilters}) => {
    const [currentTab, setCurrentTab] = useState<MetricKey>('comments');

    const config = TAB_CONFIG[currentTab];

    // `sanitizeChartData` aggregates to weekly at range ≥ 91 and monthly for
    // YTD / 12-month ranges. A bar in those buckets represents a range, not a
    // single day, so clicking it would filter to only the bucket's start date
    // — misleading. We only enable bar clicks on daily-bucket ranges.
    const isDailyAggregation = range < 91;

    const handleBarClick = (payload: {date?: string} | undefined) => {
        if (!isDailyAggregation || !payload?.date) {
            return;
        }
        const filters: CommentFilterUpdate[] = [{field: 'created_at', value: payload.date, operator: 'is'}];
        if (currentTab === 'reported') {
            filters.push({field: 'reported', value: 'true', operator: 'is'});
        }
        onAddFilters(filters);
    };

    const chartData = useMemo(() => {
        if (!series || series.length === 0) {
            return [] as {date: string; value: number; formattedValue: string}[];
        }
        const aggregated = sanitizeChartData<CommentsOverviewSeriesItem>(series, range, config.seriesField, 'sum');
        return aggregated.map((point) => {
            const rawValue = (point[config.seriesField] as number) || 0;
            return {
                date: point.date,
                value: rawValue,
                formattedValue: formatNumber(rawValue)
            };
        });
    }, [series, range, config.seriesField]);

    const chartConfig: ChartConfig = {
        value: {label: config.label, color: config.color}
    };

    // No meaningful prior period to compare against on "All time" or YTD.
    const diffsHidden = shouldHideDiffs(range);
    const diffs = useMemo(() => {
        if (diffsHidden || !totals || !previousTotals) {
            return null;
        }
        const buildEntry = (key: MetricKey) => {
            const field = TAB_CONFIG[key].totalsField;
            const diff = calcDiff(totals[field], previousTotals[field]);
            return {...diff, tooltip: buildDiffTooltip(diff, range)};
        };
        return {
            comments: buildEntry('comments'),
            commenters: buildEntry('commenters'),
            reported: buildEntry('reported')
        };
    }, [diffsHidden, totals, previousTotals, range]);

    return (
        // The `:not([data-testid$="-diff"])` carve-out keeps the !text-2xl
        // override off the diff badge (which also matches `kpi-value-*`).
        <Card className='[&_[data-testid^="kpi-value-"]:not([data-testid$="-diff"])]:!text-2xl'>
            <Tabs value={currentTab} variant='kpis' onValueChange={value => setCurrentTab(value as MetricKey)}>
                <TabsList className='-mx-px grid grid-cols-3'>
                    {METRIC_KEYS.map((key) => {
                        const cfg = TAB_CONFIG[key];
                        const diff = diffs?.[key];
                        return (
                            <KpiTabTrigger key={key} className='px-3 py-4' value={key}>
                                <KpiTabValue
                                    data-testid={`kpi-value-${key}`}
                                    label={cfg.label}
                                    value={totals ? formatNumber(totals[cfg.totalsField]) : '—'}
                                    diffIconOnly
                                    {...(diff && diff.direction !== 'same'
                                        ? {diffDirection: diff.direction, diffValue: diff.diffValue, diffTooltip: diff.tooltip}
                                        : {diffDirection: 'hidden' as const})}
                                />
                            </KpiTabTrigger>
                        );
                    })}
                </TabsList>
                <CardContent className='p-3 pt-4'>
                    {isLoading ? (
                        <div className='flex h-[220px] items-center justify-center'>
                            <BarChartLoadingIndicator />
                        </div>
                    ) : chartData.length === 0 ? (
                        <div className='flex h-[220px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground'>
                            <LucideIcon.BarChart3 className='opacity-40' size={32} strokeWidth={1.5} />
                            No {config.label.toLowerCase()} in this period
                        </div>
                    ) : (
                        <ChartContainer
                            className={`aspect-auto h-[220px] w-full ${isDailyAggregation ? '[&_.recharts-bar-rectangle]:cursor-pointer' : ''}`}
                            config={chartConfig}
                        >
                            <Recharts.BarChart
                                data={chartData}
                                margin={{top: 8, right: 4, bottom: 0, left: 0}}
                            >
                                <defs>
                                    <linearGradient id='commentsBarGradient' x1='0' x2='0' y1='0' y2='1'>
                                        <stop offset='0%' stopColor={config.color} stopOpacity={0.9} />
                                        <stop offset='100%' stopColor={config.color} stopOpacity={0.65} />
                                    </linearGradient>
                                </defs>
                                <Recharts.CartesianGrid stroke='var(--border)' vertical={false} />
                                <Recharts.XAxis
                                    axisLine={false}
                                    dataKey='date'
                                    tickFormatter={date => formatDisplayDateWithRange(date, range)}
                                    tickLine={false}
                                    tickMargin={10}
                                />
                                <Recharts.YAxis
                                    allowDecimals={false}
                                    axisLine={false}
                                    tickFormatter={value => formatNumber(value)}
                                    tickLine={false}
                                    width={28}
                                />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            className='min-w-[140px]'
                                            formatter={(value, _name, payload) => {
                                                const rawDate = payload?.payload?.date as string | undefined;
                                                const tooltipDate = rawDate ? formatDisplayDateWithRange(rawDate, range) : '';
                                                return (
                                                    <div className='flex w-full flex-col'>
                                                        {tooltipDate && (
                                                            <div className='mb-1 text-sm font-medium text-foreground'>{tooltipDate}</div>
                                                        )}
                                                        <div className='flex w-full items-center justify-between gap-4'>
                                                            <div className='flex items-center gap-1.5'>
                                                                <span
                                                                    className='inline-block size-2 rounded-full opacity-50'
                                                                    style={{backgroundColor: config.color}}
                                                                />
                                                                <span className='text-sm text-muted-foreground'>{config.label}</span>
                                                            </div>
                                                            <span className='font-mono font-medium text-foreground tabular-nums'>
                                                                {formatNumber(Number(value))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                            hideLabel
                                        />
                                    }
                                    cursor={{fill: 'var(--muted)', opacity: 0.5}}
                                />
                                <Recharts.Bar
                                    activeBar={{fillOpacity: 1}}
                                    dataKey='value'
                                    fill='url(#commentsBarGradient)'
                                    isAnimationActive={false}
                                    maxBarSize={32}
                                    minPointSize={2}
                                    radius={[4, 4, 0, 0]}
                                    onClick={isDailyAggregation ? data => handleBarClick(data as {date?: string}) : undefined}
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
