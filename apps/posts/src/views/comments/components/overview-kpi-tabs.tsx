import React, {useMemo, useState} from 'react';
import {BarChartLoadingIndicator, Card, CardContent, ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, KpiTabTrigger, KpiTabValue, Tabs, TabsList} from '@tryghost/shade/components';
import {CommentsOverviewSeriesItem, CommentsOverviewTotals} from '@tryghost/admin-x-framework/api/stats';
import {LucideIcon, Recharts, formatNumber} from '@tryghost/shade/utils';
import {formatDisplayDateWithRange, sanitizeChartData} from '@tryghost/shade/app';

type MetricKey = 'comments' | 'commenters' | 'reported';

interface OverviewKpiTabsProps {
    totals: CommentsOverviewTotals | undefined;
    series: CommentsOverviewSeriesItem[] | undefined;
    range: number;
    isLoading: boolean;
    /**
     * Clicking a bar filters the moderation list to comments from that date.
     * On the Reported tab, also applies `reported=true`.
     */
    onAddFilter: (field: string, value: string, operator?: string) => void;
}

const TAB_CONFIG: Record<MetricKey, {label: string; color: string; seriesField: 'count' | 'commenters' | 'reported'}> = {
    comments: {label: 'Comments', color: 'var(--chart-darkblue)', seriesField: 'count'},
    commenters: {label: 'Commenters', color: 'var(--chart-blue)', seriesField: 'commenters'},
    reported: {label: 'Reported', color: 'var(--chart-rose)', seriesField: 'reported'}
};

const OverviewKpiTabs: React.FC<OverviewKpiTabsProps> = ({totals, series, range, isLoading, onAddFilter}) => {
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
        onAddFilter('created_at', payload.date, 'is');
        if (currentTab === 'reported') {
            onAddFilter('reported', 'true', 'is');
        }
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

    const commentsValue = totals ? formatNumber(totals.comments) : '—';
    const commentersValue = totals ? formatNumber(totals.commenters) : '—';
    const reportedValue = totals ? formatNumber(totals.reported) : '—';

    return (
        <Card className='[&_[data-testid^="kpi-value"]]:!text-2xl'>
            <Tabs value={currentTab} variant='kpis' onValueChange={value => setCurrentTab(value as MetricKey)}>
                <TabsList className='-mx-px grid grid-cols-3'>
                    <KpiTabTrigger className='px-3 py-4' value='comments'>
                        <KpiTabValue
                            color={TAB_CONFIG.comments.color}
                            data-testid='kpi-value-comments'
                            diffDirection='hidden'
                            label='Comments'
                            value={commentsValue}
                        />
                    </KpiTabTrigger>
                    <KpiTabTrigger className='px-3 py-4' value='commenters'>
                        <KpiTabValue
                            color={TAB_CONFIG.commenters.color}
                            data-testid='kpi-value-commenters'
                            diffDirection='hidden'
                            label='Commenters'
                            value={commentersValue}
                        />
                    </KpiTabTrigger>
                    <KpiTabTrigger className='px-3 py-4' value='reported'>
                        <KpiTabValue
                            color={TAB_CONFIG.reported.color}
                            data-testid='kpi-value-reported'
                            diffDirection='hidden'
                            label='Reported'
                            value={reportedValue}
                        />
                    </KpiTabTrigger>
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
