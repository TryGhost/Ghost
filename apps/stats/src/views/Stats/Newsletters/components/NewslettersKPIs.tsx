import React, {useEffect, useMemo, useState} from 'react';
import {AvgsDataItem} from '../Newsletters';
import {BarChartLoadingIndicator, ChartConfig, ChartContainer, ChartTooltip, GhAreaChart, KpiTabTrigger, KpiTabValue, Recharts, Tabs, TabsList, calculateYAxisWidth, formatDisplayDate, formatNumber, formatPercentage} from '@tryghost/shade';
import {sanitizeChartData} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useNavigate, useSearchParams} from '@tryghost/admin-x-framework';

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

type Totals = {
    totalSubscribers: number;
    avgOpenRate: number;
    avgClickRate: number;
};

type SubscribersDataItem = {
    date: string;
    value: number;
};

const NewsletterKPIs: React.FC<{
    subscribersData: SubscribersDataItem[]
    avgsData: AvgsDataItem[];
    totals: Totals;
    isLoading: boolean;
    isAvgsLoading: boolean;
    initialTab?: string;
}> = ({
    subscribersData: allSubscribersData,
    avgsData,
    totals,
    isLoading,
    isAvgsLoading,
    initialTab = 'total-subscribers'
}) => {
    const [currentTab, setCurrentTab] = useState(initialTab);
    const [isHoveringClickable, setIsHoveringClickable] = useState(false);
    const {range} = useGlobalData();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const {totalSubscribers, avgOpenRate, avgClickRate} = totals;

    // Update current tab if initialTab changes
    useEffect(() => {
        setCurrentTab(initialTab);
    }, [initialTab]);

    // Function to update tab and URL
    const handleTabChange = (tabValue: string) => {
        setCurrentTab(tabValue);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('tab', tabValue);
        navigate(`?${newSearchParams.toString()}`, {replace: true});
    };

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

    const barChartConfig = {
        open_rate: {
            label: 'Open rate'
        }
    } satisfies ChartConfig;

    const barDomain = [0, 1];
    const barTicks = [0, 1];

    const tabConfig = {
        'total-subscribers': {
            color: 'hsl(var(--chart-darkblue))',
            datakey: 'value'
        },
        'avg-open-rate': {
            color: 'hsl(var(--chart-blue))',
            datakey: 'open_rate'
        },
        'avg-click-rate': {
            color: 'hsl(var(--chart-teal))',
            datakey: 'click_rate'
        }
    };

    if (isLoading) {
        return (
            <div className='-mb-6 flex h-[calc(16vw+132px)] w-full items-start justify-center'>
                <BarChartLoadingIndicator />
            </div>
        );
    }

    return (
        <Tabs defaultValue={initialTab} variant='kpis'>
            <TabsList className="-mx-6 grid grid-cols-3">
                <KpiTabTrigger value="total-subscribers" onClick={() => {
                    handleTabChange('total-subscribers');
                }}>
                    <KpiTabValue
                        color={tabConfig['total-subscribers'].color}
                        label="Total subscribers"
                        value={formatNumber(totalSubscribers)}
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="avg-open-rate" onClick={() => {
                    handleTabChange('avg-open-rate');
                }}>
                    <KpiTabValue
                        className={isAvgsLoading ? 'opacity-50' : ''}
                        color={tabConfig['avg-open-rate'].color}
                        label="Avg. open rate"
                        value={formatPercentage(avgOpenRate)}
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="avg-click-rate" onClick={() => {
                    handleTabChange('avg-click-rate');
                }}>
                    <KpiTabValue
                        className={isAvgsLoading ? 'opacity-50' : ''}
                        color={tabConfig['avg-click-rate'].color}
                        label="Avg. click rate"
                        value={formatPercentage(avgClickRate)}
                    />
                </KpiTabTrigger>
            </TabsList>
            <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
                {(currentTab === 'total-subscribers') &&
                    <GhAreaChart
                        className='-mb-3 h-[16vw] max-h-[320px] w-full'
                        color={tabConfig['total-subscribers'].color}
                        data={subscribersData}
                        id="mrr"
                        range={range}
                    />
                }

                {(currentTab === 'avg-open-rate' || currentTab === 'avg-click-rate') &&
                    <>
                        {isAvgsLoading ?
                            <div className='h-[320px] w-full items-center justify-center'>
                                <BarChartLoadingIndicator />
                            </div>
                            :
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
                                        <defs>
                                            <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
                                                <stop offset="0%" stopColor={tabConfig[currentTab].color} stopOpacity={0.8} />
                                                <stop offset="100%" stopColor={tabConfig[currentTab].color} stopOpacity={0.6} />
                                            </linearGradient>
                                        </defs>
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
                                            cursor={false}
                                            isAnimationActive={false}
                                            position={{y: 10}}
                                        />
                                        <Recharts.Bar
                                            activeBar={{fillOpacity: 1}}
                                            dataKey={tabConfig[currentTab].datakey}
                                            fill='url(#barGradient)'
                                            fillOpacity={0.6}
                                            isAnimationActive={false}
                                            maxBarSize={32}
                                            minPointSize={3}
                                            radius={4}
                                        />
                                    </Recharts.BarChart>
                                </ChartContainer>
                                <div className="-mt-6 text-center text-sm text-muted-foreground">
                                    Newsletters {currentTab === 'avg-open-rate' ? 'opens' : 'clicks'} in this period
                                </div>
                            </>
                        }
                    </>
                }
            </div>
        </Tabs>
    );
};

export default NewsletterKPIs;
