// import AudienceSelect from './components/AudienceSelect';
import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import DateRangeSelect from './components/DateRangeSelect';
import React, {useMemo, useState} from 'react';
import SortButton from './components/SortButton';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, H1, KpiTabTrigger, KpiTabValue, Recharts, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, ViewHeader, ViewHeaderActions, formatDisplayDate, formatNumber, formatPercentage} from '@tryghost/shade';
import {calculateYAxisWidth, getPeriodText, getYRange, getYTicks, sanitizeChartData} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useNewsletterStatsWithRange, useSubscriberCountWithRange} from '@src/hooks/useNewsletterStatsWithRange';
import type {TopNewslettersOrder} from '@src/hooks/useNewsletterStatsWithRange';

type Totals = {
    totalSubscribers: number;
    avgOpenRate: number;
    avgClickRate: number;
};

type SubscribersDataItem = {
    date: string;
    value: number;
};

type AvgsDataItem = {
    post_id: string;
    post_title: string;
    send_date: Date | string;
    sent_to: number;
    total_opens: number;
    open_rate: number;
    total_clicks: number;
    click_rate: number;
};

interface BarTooltipPayload {
    value: number;
    payload: AvgsDataItem;
}

interface BarTooltipProps {
    active?: boolean;
    payload?: BarTooltipPayload[];
    range?: number;
}

const BarTooltipContent = ({active, payload}: BarTooltipProps) => {
    if (!active || !payload?.length) {
        return null;
    }

    const currentItem = payload[0].payload;
    const sendDate = typeof currentItem.send_date === 'string' ?
        new Date(currentItem.send_date) : currentItem.send_date;

    return (
        <div className="min-w-[220px] max-w-[240px] rounded-lg border bg-background px-3 py-2 shadow-lg">
            <div className="mb-2 flex w-full flex-col border-b pb-2">
                <span className="text-sm font-semibold leading-tight">{currentItem.post_title}</span>
                <span className="text-sm text-muted-foreground">Sent on {formatDisplayDate(sendDate)}</span>
            </div>

            <div className="mb-1 flex w-full justify-between">
                <span className="font-medium text-muted-foreground">Sent</span>
                <div className="ml-2 w-full text-right font-mono">{formatNumber(currentItem.sent_to)}</div>
            </div>

            <div className="mb-1 flex w-full justify-between">
                <span className="font-medium text-muted-foreground">Opens</span>
                <div className="ml-2 w-full text-right font-mono">
                    <span className="text-muted-foreground">{formatNumber(currentItem.total_opens)} / </span>
                    {formatPercentage(currentItem.open_rate)}
                </div>
            </div>

            <div className="mb-1 flex w-full justify-between">
                <span className="font-medium text-muted-foreground">Clicks</span>
                <div className="ml-2 w-full text-right font-mono">
                    <span className="text-muted-foreground">{formatNumber(currentItem.total_clicks)} / </span>
                    {formatPercentage(currentItem.click_rate)}
                </div>
            </div>
        </div>
    );
};

const getBarColor = (value: number) => {
    let opacity;
    if (value <= 0.25) {
        opacity = 0.6;
    } else if (value >= 0.75) {
        opacity = 1.0;
    } else {
        // Interpolate between 0.6 and 1.0 for values between 0.25 and 0.75
        opacity = 0.6 + ((value - 0.25) * (0.4 / 0.5));
    }
    return `hsl(var(--chart-1) / ${opacity})`;
};

const NewsletterKPIs: React.FC<{
    subscribersData: SubscribersDataItem[]
    avgsData: AvgsDataItem[];
    totals: Totals;
}> = ({
    subscribersData: allSubscribersData,
    avgsData,
    totals
}) => {
    const [currentTab, setCurrentTab] = useState('total-subscribers');
    const {range} = useGlobalData();

    const {totalSubscribers, avgOpenRate, avgClickRate} = totals;

    // Sanitize subscribers data and convert deltas to cumulative values
    const subscribersData = useMemo(() => {
        if (!allSubscribersData || allSubscribersData.length === 0) {
            return [];
        }

        let sanitizedData: SubscribersDataItem[] = [];

        // First sanitize the data based on range
        sanitizedData = sanitizeChartData(allSubscribersData, range, 'value', 'exact');

        // Convert deltas to cumulative counts
        let runningTotal = totalSubscribers;

        // Go backwards through the array to calculate cumulative values
        // Starting from the current total and subtracting deltas
        const cumulativeData = [...sanitizedData]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((item) => {
                runningTotal -= item.value;
                return {
                    date: item.date,
                    value: runningTotal + item.value // Value for this specific day
                };
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Map the data for display
        const processedData = cumulativeData.map(item => ({
            ...item,
            formattedValue: formatNumber(item.value),
            label: 'Subscribers'
        }));

        return processedData;
    }, [allSubscribersData, totalSubscribers, range]);

    const subscribersChartConfig = {
        value: {
            label: 'Newsletter subscribers'
        }
    } satisfies ChartConfig;

    const barChartConfig = {
        open_rate: {
            label: 'Open rate'
        }
    } satisfies ChartConfig;

    const barDomain = [0, 1];
    const barTicks = [0, 0.25, 0.5, 0.75, 1];

    return (
        <Tabs defaultValue="total-subscribers" variant='kpis'>
            <TabsList className="-mx-6 grid grid-cols-3">
                <KpiTabTrigger value="total-subscribers" onClick={() => {
                    setCurrentTab('total-subscribers');
                }}>
                    <KpiTabValue
                        label="Total subscribers"
                        value={formatNumber(totalSubscribers)}
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="avg-open-rate" onClick={() => {
                    setCurrentTab('avg-open-rate');
                }}>
                    <KpiTabValue
                        label="Avg. open rate"
                        value={formatPercentage(avgOpenRate)}
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="avg-click-rate" onClick={() => {
                    setCurrentTab('avg-click-rate');
                }}>
                    <KpiTabValue
                        label="Avg. click rate"
                        value={formatPercentage(avgClickRate)}
                    />
                </KpiTabTrigger>
            </TabsList>
            <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
                {currentTab === 'total-subscribers' &&
                <ChartContainer className='-mb-3 h-[16vw] max-h-[320px] w-full' config={subscribersChartConfig}>
                    <Recharts.LineChart
                        data={subscribersData}
                        margin={{
                            left: 0,
                            right: 20,
                            top: 12
                        }}
                        accessibilityLayer
                    >
                        <Recharts.CartesianGrid horizontal={false} vertical={false} />
                        <Recharts.XAxis
                            axisLine={{stroke: 'hsl(var(--border))', strokeWidth: 1}}
                            dataKey="date"
                            interval={0}
                            stroke="hsl(var(--gray-300))"
                            tickFormatter={formatDisplayDate}
                            tickLine={false}
                            tickMargin={8}
                            ticks={subscribersData.length > 0 ? [subscribersData[0].date, subscribersData[subscribersData.length - 1].date] : []}
                        />
                        <Recharts.YAxis
                            axisLine={false}
                            domain={[getYRange(subscribersData).min, getYRange(subscribersData).max]}
                            tickFormatter={value => formatNumber(value)}
                            tickLine={false}
                            ticks={getYTicks(subscribersData)}
                            width={calculateYAxisWidth(getYTicks(subscribersData), value => formatNumber(value))}
                        />
                        <ChartTooltip
                            content={<CustomTooltipContent range={range} />}
                            cursor={true}
                        />
                        <Recharts.Line
                            dataKey="value"
                            dot={false}
                            isAnimationActive={false}
                            stroke="hsl(var(--chart-1))"
                            strokeWidth={2}
                            type='monotone'
                        />
                    </Recharts.LineChart>
                </ChartContainer>
                }

                {(currentTab === 'avg-open-rate' || currentTab === 'avg-click-rate') &&
                <>
                    <ChartContainer className='max-h-[320px] w-full' config={barChartConfig}>
                        <Recharts.BarChart data={avgsData} accessibilityLayer>
                            <Recharts.CartesianGrid vertical={false} />
                            <Recharts.YAxis
                                axisLine={false}
                                domain={barDomain}
                                tickFormatter={value => formatPercentage(value)}
                                tickLine={false}
                                ticks={barTicks}
                                width={calculateYAxisWidth(barTicks, value => formatPercentage(value))}
                            />
                            <Recharts.XAxis
                                axisLine={false}
                                dataKey="post_id"
                                tickFormatter={() => ('')}
                                tickLine={false}
                                tickMargin={10}
                            />
                            <ChartTooltip
                                content={<BarTooltipContent />}
                                cursor={false}
                            />
                            <Recharts.Bar
                                activeBar={{fill: 'hsl(var(--chart-1) / 0.8)'}}
                                dataKey={currentTab === 'avg-open-rate' ? 'open_rate' : 'click_rate'}
                                fill="hsl(var(--chart-1))"
                                isAnimationActive={false}
                                maxBarSize={32}
                                radius={0}>
                                {avgsData.map(entry => (
                                    <Recharts.Cell
                                        key={`cell-${entry.post_id}`}
                                        fill={getBarColor(entry[currentTab === 'avg-open-rate' ? 'open_rate' : 'click_rate'])}
                                    />
                                ))}
                            </Recharts.Bar>
                        </Recharts.BarChart>
                    </ChartContainer>
                    <div className="-mt-6 text-center text-sm text-muted-foreground">
                        Newsletters {currentTab === 'avg-open-rate' ? 'opens' : 'clicks'} in this period
                    </div>
                </>
                }
            </div>
        </Tabs>
    );
};

const Newsletters: React.FC = () => {
    const {range} = useGlobalData();
    const [sortBy, setSortBy] = useState<TopNewslettersOrder>('date desc');
    const navigate = useNavigate();

    // Get stats from real data using the new hooks
    const {data: newsletterStatsData, isLoading: isStatsLoading} = useNewsletterStatsWithRange(range);
    const {data: subscriberStatsData, isLoading: isSubscriberStatsLoading} = useSubscriberCountWithRange(range);

    // Prepare the data - wrap in useMemo to avoid dependency changes
    const newsletterStats = useMemo(() => {
        if (!newsletterStatsData?.stats || newsletterStatsData?.stats.length === 0) {
            return [];
        }

        // Clone the data for sorting
        const stats = [...newsletterStatsData.stats];

        // Apply client-side sorting
        const [field, direction = 'desc'] = sortBy.split(' ');

        return stats.sort((a, b) => {
            let valueA, valueB;

            // Handle different sort fields
            if (field === 'date') {
                valueA = new Date(a.send_date).getTime();
                valueB = new Date(b.send_date).getTime();
            } else if (field === 'open_rate') {
                valueA = a.open_rate || 0;
                valueB = b.open_rate || 0;
            } else if (field === 'click_rate') {
                valueA = a.click_rate || 0;
                valueB = b.click_rate || 0;
            } else {
                return 0;
            }

            // Apply sort direction
            return direction === 'desc' ? valueB - valueA : valueA - valueB;
        });
    }, [newsletterStatsData, sortBy]);

    // Calculate totals
    const totals = useMemo(() => {
        if (!newsletterStatsData?.stats || newsletterStatsData.stats.length === 0) {
            return {
                totalSubscribers: subscriberStatsData?.stats?.[0]?.total || 0,
                avgOpenRate: 0,
                avgClickRate: 0
            };
        }

        // Use all stats for calculating averages, not just the sorted/limited ones
        const allStats = newsletterStatsData.stats;

        // Calculate average open and click rates from all stats
        const totalOpenRate = allStats.reduce((sum, stat) => sum + (stat.open_rate || 0), 0);
        const totalClickRate = allStats.reduce((sum, stat) => sum + (stat.click_rate || 0), 0);

        return {
            totalSubscribers: subscriberStatsData?.stats?.[0]?.total || 0,
            avgOpenRate: totalOpenRate / allStats.length,
            avgClickRate: totalClickRate / allStats.length
        };
    }, [newsletterStatsData, subscriberStatsData]);

    // Create subscribers data from newsletter subscriber stats
    const subscribersData = useMemo(() => {
        if (!subscriberStatsData?.stats?.[0]?.deltas || subscriberStatsData.stats?.[0]?.deltas.length === 0) {
            return [];
        }

        // Convert to the required format - already in the correct format
        return subscriberStatsData.stats[0].deltas;
    }, [subscriberStatsData]);

    const isLoading = isStatsLoading || isSubscriberStatsLoading;

    // Convert string dates to Date objects for AvgsDataItem compatibility
    const avgsData: AvgsDataItem[] = newsletterStats.map(stat => ({
        ...stat,
        send_date: new Date(stat.send_date)
    }));

    return (
        <StatsLayout>
            <ViewHeader className='before:hidden'>
                <H1>Newsletters</H1>
                <ViewHeaderActions>
                    {/* <AudienceSelect /> */}
                    <DateRangeSelect />
                </ViewHeaderActions>
            </ViewHeader>
            <StatsView data={subscribersData} isLoading={isLoading}>
                <Card>
                    <CardContent>
                        <NewsletterKPIs avgsData={avgsData} subscribersData={subscribersData} totals={totals} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top newsletters</CardTitle>
                        <CardDescription>Performance of newsletters sent {getPeriodText(range)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Separator/>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        Title
                                    </TableHead>
                                    <TableHead>
                                        <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='date desc'>
                                            Date
                                        </SortButton>
                                    </TableHead>
                                    <TableHead className='w-[10%] text-right'>
                                        <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='open_rate desc'>
                                            Open rate
                                        </SortButton>
                                    </TableHead>
                                    <TableHead className='w-[10%] text-right'>
                                        <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='click_rate desc'>
                                            Clicks
                                        </SortButton>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {newsletterStats.map(post => (
                                    <TableRow key={post.post_id}>
                                        <TableCell className="font-medium">
                                            <div className='group/link inline-flex items-center gap-2'>
                                                {post.post_id ?
                                                    <Button className='h-auto whitespace-normal p-0 text-left hover:!underline' title="View post analytics" variant='link' onClick={() => {
                                                        navigate(`/posts/analytics/${post.post_id}`, {crossApp: true});
                                                    }}>
                                                        {post.post_title}
                                                    </Button>
                                                    :
                                                    <>
                                                        {post.post_title}
                                                    </>
                                                }
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDisplayDate(new Date(post.send_date))}
                                        </TableCell>
                                        <TableCell className={`text-right font-mono text-sm ${post.total_opens === 0 && 'text-gray-700'}`}>
                                            <span className="group-hover:hidden">{formatPercentage(post.open_rate)}</span>
                                            <span className="hidden group-hover:!visible group-hover:!block">{formatNumber(post.total_opens)}</span>
                                        </TableCell>
                                        <TableCell className={`text-right font-mono text-sm ${post.total_clicks === 0 && 'text-gray-700'}`}>
                                            <span className="group-hover:hidden">{formatPercentage(post.click_rate)}</span>
                                            <span className="hidden group-hover:!visible group-hover:!block">{formatNumber(post.total_clicks)}</span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </StatsView>
        </StatsLayout>
    );
};

// Export the component directly now that we handle the feature flag in routes.tsx
export default Newsletters;
