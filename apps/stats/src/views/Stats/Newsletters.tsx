// import AudienceSelect from './components/AudienceSelect';
import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import DateRangeSelect from './components/DateRangeSelect';
import NewsletterSelect from './components/NewsletterSelect';
import React, {useMemo, useState} from 'react';
import SortButton from './components/SortButton';
import StatsHeader from './layout/StatsHeader';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {AlignedAxisTick, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, KpiTabTrigger, KpiTabValue, Recharts, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, calculateYAxisWidth, formatDisplayDate, formatDisplayDateWithRange, formatNumber, formatPercentage, getYRange, getYRangeWithMinPadding} from '@tryghost/shade';
import {getPeriodText, sanitizeChartData} from '@src/utils/chart-helpers';
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
    const [isHoveringClickable, setIsHoveringClickable] = useState(false);
    const {range} = useGlobalData();
    const navigate = useNavigate();

    const {totalSubscribers, avgOpenRate, avgClickRate} = totals;

    // Sanitize subscribers data and convert deltas to cumulative values
    const subscribersData = useMemo(() => {
        if (!allSubscribersData || allSubscribersData.length === 0) {
            return [];
        }

        let sanitizedData: SubscribersDataItem[] = [];

        // First sanitize the data based on range
        sanitizedData = sanitizeChartData(allSubscribersData, range, 'value', 'exact');

        // Convert from deltas to running count (backwards from total)
        let runningTotal = totalSubscribers;
        const cumulativeData = [...sanitizedData].reverse().map((item) => {
            runningTotal -= item.value;
            return {
                ...item,
                value: runningTotal + item.value // Current day's value is before the day's change
            };
        }).reverse();

        // Map the data for display
        const processedData = cumulativeData.map(item => ({
            ...item,
            formattedValue: formatNumber(item.value),
            label: 'Total Subscribers'
        }));

        return processedData;
    }, [allSubscribersData, range, totalSubscribers]);

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
    const barTicks = [0, 1];

    const yRange = [getYRange(subscribersData).min, getYRange(subscribersData).max];
    const yRangeWithMinPadding = getYRangeWithMinPadding({min: yRange[0], max: yRange[1]});

    const tabConfig = {
        'total-subscribers': {
            color: 'hsl(var(--chart-purple))',
            datakey: 'value'
        },
        'avg-open-rate': {
            color: 'hsl(var(--chart-blue))',
            datakey: 'open_rate'
        },
        'avg-click-rate': {
            color: 'hsl(var(--chart-green))',
            datakey: 'click_rate'
        }
    };

    return (
        <Tabs defaultValue="total-subscribers" variant='kpis'>
            <TabsList className="-mx-6 grid grid-cols-3">
                <KpiTabTrigger value="total-subscribers" onClick={() => {
                    setCurrentTab('total-subscribers');
                }}>
                    <KpiTabValue
                        color={tabConfig['total-subscribers'].color}
                        label="Total subscribers"
                        value={formatNumber(totalSubscribers)}
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="avg-open-rate" onClick={() => {
                    setCurrentTab('avg-open-rate');
                }}>
                    <KpiTabValue
                        color={tabConfig['avg-open-rate'].color}
                        label="Avg. open rate"
                        value={formatPercentage(avgOpenRate)}
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="avg-click-rate" onClick={() => {
                    setCurrentTab('avg-click-rate');
                }}>
                    <KpiTabValue
                        color={tabConfig['avg-click-rate'].color}
                        label="Avg. click rate"
                        value={formatPercentage(avgClickRate)}
                    />
                </KpiTabTrigger>
            </TabsList>
            <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
                {(currentTab === 'total-subscribers') &&
                <ChartContainer className='-mb-3 h-[16vw] max-h-[320px] min-h-[280px] w-full' config={subscribersChartConfig}>
                    <Recharts.AreaChart
                        data={subscribersData}
                        margin={{
                            left: 4,
                            right: 4,
                            top: 12
                        }}
                    >
                        <Recharts.CartesianGrid horizontal={false} vertical={false} />
                        <Recharts.XAxis
                            axisLine={{stroke: 'hsl(var(--border))', strokeWidth: 1}}
                            dataKey="date"
                            interval={0}
                            stroke="hsl(var(--gray-300))"
                            tick={props => <AlignedAxisTick {...props} formatter={value => formatDisplayDateWithRange(value, range)} />}
                            tickFormatter={value => formatDisplayDateWithRange(value, range)}
                            tickLine={false}
                            tickMargin={8}
                            ticks={subscribersData.length > 0 ? [subscribersData[0].date, subscribersData[subscribersData.length - 1].date] : []}
                        />
                        <Recharts.YAxis
                            allowDataOverflow={true}
                            axisLine={false}
                            domain={yRangeWithMinPadding}
                            scale="linear"
                            tickFormatter={value => formatNumber(value)}
                            tickLine={false}
                            ticks={yRange}
                            width={calculateYAxisWidth(yRange, (value: number) => formatNumber(value))}
                        />
                        <ChartTooltip
                            content={<CustomTooltipContent color={tabConfig['total-subscribers'].color} range={range} />}
                            cursor={true}
                            isAnimationActive={false}
                            position={{y: 20}}
                        />
                        <defs>
                            <linearGradient id="fillChart" x1="0" x2="0" y1="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor={tabConfig['total-subscribers'].color}
                                    stopOpacity={0.8}
                                />
                                <stop
                                    offset="95%"
                                    stopColor={tabConfig['total-subscribers'].color}
                                    stopOpacity={0.1}
                                />
                            </linearGradient>
                        </defs>
                        <Recharts.Area
                            dataKey={tabConfig['total-subscribers'].datakey}
                            fill="url(#fillChart)"
                            fillOpacity={0.2}
                            isAnimationActive={false}
                            stackId="a"
                            stroke={tabConfig['total-subscribers'].color}
                            strokeWidth={2}
                            type="linear"
                        />
                    </Recharts.AreaChart>
                </ChartContainer>
                }

                {(currentTab === 'avg-open-rate' || currentTab === 'avg-click-rate') &&
                <>
                    <ChartContainer className='max-h-[320px] w-full' config={barChartConfig}>
                        <Recharts.BarChart
                            className={isHoveringClickable ? '!cursor-pointer' : ''}
                            data={avgsData}
                            margin={{
                                top: 20
                            }}
                            onClick={(e) => {
                                if (e.activePayload && e.activePayload![0].payload.post_id) {
                                    navigate(`/posts/analytics/beta/${e.activePayload![0].payload.post_id}`, {crossApp: true});
                                }
                            }}
                            onMouseLeave={() => setIsHoveringClickable(false)}
                            onMouseMove={(e) => {
                                setIsHoveringClickable(!!(e.activePayload && e.activePayload[0].payload.post_id));
                            }}
                        >
                            <Recharts.CartesianGrid horizontal={false} vertical={false} />
                            <Recharts.XAxis
                                axisLine={{stroke: 'hsl(var(--border))', strokeWidth: 1}}
                                dataKey="post_id"
                                interval={0}
                                stroke="hsl(var(--gray-300))"
                                tickFormatter={() => ('')}
                                tickLine={false}
                                tickMargin={10}
                            />
                            <Recharts.YAxis
                                axisLine={false}
                                domain={barDomain}
                                tickFormatter={value => formatPercentage(value)}
                                tickLine={false}
                                ticks={barTicks}
                                width={calculateYAxisWidth(barTicks, (value: number) => formatPercentage(value))}
                            />
                            <ChartTooltip
                                content={<BarTooltipContent />}
                                isAnimationActive={false}
                                position={{y: 10}}
                            />
                            <Recharts.Bar
                                activeBar={{fillOpacity: 1}}
                                dataKey={tabConfig[currentTab].datakey}
                                fill={tabConfig[currentTab].color}
                                fillOpacity={0.6}
                                isAnimationActive={false}
                                maxBarSize={32}
                                minPointSize={2}
                                radius={0}
                            />
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
    const {range, selectedNewsletterId} = useGlobalData();
    const [sortBy, setSortBy] = useState<TopNewslettersOrder>('date desc');
    const navigate = useNavigate();

    // Get stats from real data using the new hooks with selected newsletter
    const {data: newsletterStatsData, isLoading: isStatsLoading} = useNewsletterStatsWithRange(
        range,
        sortBy,
        selectedNewsletterId || undefined
    );
    const {data: subscriberStatsData, isLoading: isSubscriberStatsLoading} = useSubscriberCountWithRange(
        range,
        selectedNewsletterId || undefined
    );

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
            <StatsHeader>
                <NewsletterSelect />
                <DateRangeSelect />
            </StatsHeader>
            <StatsView data={subscribersData} isLoading={isLoading}>
                <Card>
                    <CardContent>
                        <NewsletterKPIs avgsData={avgsData} subscribersData={subscribersData} totals={totals} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top newsletters</CardTitle>
                        <CardDescription>
                            Your best performing newsletters {getPeriodText(range)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Separator/>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        Title
                                    </TableHead>
                                    <TableHead className='w-[60px]'>
                                        <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='date desc'>
                                            Date
                                        </SortButton>
                                    </TableHead>
                                    <TableHead className='w-[90px] text-right'>
                                        <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='sent_to desc'>
                                            Sent
                                        </SortButton>
                                    </TableHead>
                                    <TableHead className='w-[90px] text-right'>
                                        <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='open_rate desc'>
                                            Opens
                                        </SortButton>
                                    </TableHead>
                                    <TableHead className='w-[90px] text-right'>
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
                                                        navigate(`/posts/analytics/beta/${post.post_id}`, {crossApp: true});
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
                                        <TableCell className="whitespace-nowrap text-sm">
                                            {formatDisplayDate(new Date(post.send_date))}
                                        </TableCell>
                                        <TableCell className='text-right font-mono text-sm'>
                                            {formatNumber(post.sent_to)}
                                        </TableCell>
                                        <TableCell className='text-right font-mono text-sm'>
                                            <span className="group-hover:hidden">{formatPercentage(post.open_rate)}</span>
                                            <span className="hidden group-hover:!visible group-hover:!block">{formatNumber(post.total_opens)}</span>
                                        </TableCell>
                                        <TableCell className='text-right font-mono text-sm'>
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
