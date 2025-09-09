import React, {useEffect, useMemo, useState} from 'react';
import {AvgsDataItem} from '../Newsletters';
import {BarChartLoadingIndicator, ChartConfig, ChartContainer, ChartTooltip, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, EmptyIndicator, GhAreaChart, KpiDropdownButton, KpiTabTrigger, KpiTabValue, LucideIcon, Recharts, Tabs, TabsList, calculateYAxisWidth, formatDisplayDate, formatNumber, formatPercentage} from '@tryghost/shade';
import {getPeriodText, sanitizeChartData} from '@src/utils/chart-helpers';
import {useAppContext, useNavigate, useSearchParams} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

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
    const sendDate = currentItem.send_date;

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
    const {appSettings} = useAppContext();
    const {emailTrackClicks: emailTrackClicksEnabled, emailTrackOpens: emailTrackOpensEnabled} = appSettings?.analytics || {};

    const {totalSubscribers, avgOpenRate, avgClickRate} = totals;

    // Sanitize subscribers data (API returns cumulative values, not deltas)
    const subscribersData = useMemo(() => {
        if (!allSubscribersData || allSubscribersData.length === 0) {
            return [];
        }

        let sanitizedData: SubscribersDataItem[] = [];

        // First sanitize the data based on range
        // Use 'exact' aggregation type since we have cumulative values
        sanitizedData = sanitizeChartData(allSubscribersData, range, 'value', 'exact');

        const processedData = sanitizedData.map(item => ({
            ...item,
            formattedValue: formatNumber(item.value),
            label: 'Total Subscribers'
        }));

        return processedData;
    }, [allSubscribersData, range]);

    const subscribersDiff = useMemo(() => {
        if (!subscribersData || subscribersData.length <= 1) {
            return {
                direction: 'same' as const,
                value: '0%'
            };
        }

        const prev = subscribersData[subscribersData.length - 2]?.value ?? 0;
        const curr = subscribersData[subscribersData.length - 1]?.value ?? 0;

        // Calculate direction
        let direction: 'up' | 'down' | 'same' = 'same';
        if (curr > prev) {
            direction = 'up';
        } else if (curr < prev) {
            direction = 'down';
        }

        // Calculate percentage difference
        let value: string;
        if (prev === 0) {
            value = curr === 0 ? '0%' : '+100%';
        } else {
            const diff = ((curr - prev) / prev) * 100;
            const rounded = Math.round(diff * 10) / 10;
            value = `${diff >= 0 ? '+' : ''}${rounded}%`;
        }

        return {direction, value};
    }, [subscribersData]);

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

    const barChartConfig = {
        open_rate: {
            label: 'Open rate'
        }
    } satisfies ChartConfig;

    const tabConfig = useMemo(() => ({
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
    }), []);

    // Calculate dynamic domain and ticks based on current tab's data
    const {barDomain, barTicks} = useMemo(() => {
        if (!avgsData || avgsData.length === 0 || currentTab === 'total-subscribers') {
            return {barDomain: [0, 1], barTicks: [0, 1]};
        }

        const dataKey = tabConfig[currentTab as keyof typeof tabConfig]?.datakey;
        if (!dataKey) {
            return {barDomain: [0, 1], barTicks: [0, 1]};
        }

        // Extract values for the current data key
        const values = avgsData.map(item => item[dataKey as keyof AvgsDataItem]).filter(val => typeof val === 'number') as number[];

        if (values.length === 0) {
            return {barDomain: [0, 1], barTicks: [0, 1]};
        }

        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);

        // Round to nearest 0.1
        const roundedMin = Math.floor(minValue * 10) / 10;
        const roundedMax = Math.ceil(maxValue * 10) / 10;

        // Ensure we have some padding and don't have the same min/max
        const finalMin = Math.max(0, roundedMin);
        const finalMax = roundedMax === finalMin ? finalMin + 0.1 : roundedMax;

        return {
            barDomain: [finalMin, finalMax],
            barTicks: [finalMin, finalMax]
        };
    }, [avgsData, currentTab, tabConfig]);

    if (isLoading) {
        return (
            <div className='-mb-6 flex h-[calc(16vw+132px)] w-full items-start justify-center'>
                <BarChartLoadingIndicator />
            </div>
        );
    }

    let gridClass = 'grid-cols-3';
    if (!emailTrackClicksEnabled || !emailTrackOpensEnabled) {
        gridClass = 'grid-cols-2';
    }
    if (!emailTrackClicksEnabled && !emailTrackOpensEnabled) {
        gridClass = 'grid-cols-1';
    }

    const showAvgLine = (currentTab === 'avg-open-rate' && avgOpenRate > barDomain[0] && avgOpenRate < barDomain[1]) || (currentTab === 'avg-click-rate' && avgClickRate > barDomain[0] && avgClickRate < barDomain[1]);
    const avgValue = currentTab === 'avg-open-rate' ? avgOpenRate : avgClickRate;

    return (
        <Tabs defaultValue={initialTab} variant='kpis'>
            <TabsList className={`-mx-6 hidden grid-cols-3 md:!visible md:!grid ${gridClass}`}>
                <KpiTabTrigger className={`${!emailTrackOpensEnabled && !emailTrackClicksEnabled && 'cursor-auto after:hidden'}`} value="total-subscribers" onClick={() => {
                    handleTabChange('total-subscribers');
                }}>
                    <KpiTabValue
                        color={tabConfig['total-subscribers'].color}
                        diffDirection={subscribersDiff.direction}
                        diffValue={subscribersDiff.value}
                        label="Total subscribers"
                        value={formatNumber(totalSubscribers)}
                    />
                </KpiTabTrigger>

                {emailTrackOpensEnabled &&
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
                }

                {emailTrackClicksEnabled &&
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
                }
            </TabsList>
            <DropdownMenu>
                <DropdownMenuTrigger className='md:hidden' asChild>
                    <KpiDropdownButton>
                        {currentTab === 'total-subscribers' &&
                                <KpiTabValue
                                    color={tabConfig['total-subscribers'].color}
                                    label="Total subscribers"
                                    value={formatNumber(totalSubscribers)}
                                />
                        }
                        {currentTab === 'avg-open-rate' && emailTrackOpensEnabled &&
                                <KpiTabValue
                                    className={isAvgsLoading ? 'opacity-50' : ''}
                                    color={tabConfig['avg-open-rate'].color}
                                    label="Avg. open rate"
                                    value={formatPercentage(avgOpenRate)}
                                />
                        }
                        {currentTab === 'avg-click-rate' && emailTrackClicksEnabled &&
                                <KpiTabValue
                                    className={isAvgsLoading ? 'opacity-50' : ''}
                                    color={tabConfig['avg-click-rate'].color}
                                    label="Avg. click rate"
                                    value={formatPercentage(avgClickRate)}
                                />
                        }
                    </KpiDropdownButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className="w-56">
                    <DropdownMenuItem onClick={() => handleTabChange('total-subscribers')}>Total subscribers</DropdownMenuItem>

                    {emailTrackOpensEnabled &&
                            <DropdownMenuItem onClick={() => handleTabChange('avg-open-rate')}>Avg. open rate</DropdownMenuItem>
                    }

                    {emailTrackClicksEnabled &&
                            <DropdownMenuItem onClick={() => handleTabChange('avg-click-rate')}>Avg. click rate</DropdownMenuItem>
                    }
                </DropdownMenuContent>
            </DropdownMenu>
            <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
                {(currentTab === 'total-subscribers') &&
                    <GhAreaChart
                        className='-mb-3 h-[16vw] max-h-[320px] min-h-[180px] w-full'
                        color={tabConfig['total-subscribers'].color}
                        data={subscribersData}
                        id="mrr"
                        range={range}
                    />
                }

                {((currentTab === 'avg-open-rate' && emailTrackOpensEnabled) || (currentTab === 'avg-click-rate' && emailTrackClicksEnabled)) &&
                    <>
                        {isAvgsLoading ?
                            <div className='h-[320px] w-full items-center justify-center'>
                                <BarChartLoadingIndicator />
                            </div>
                            :
                            avgsData && avgsData.length > 0 ?
                                <>
                                    <ChartContainer className='aspect-auto h-[200px] w-full md:h-[220px] xl:h-[320px]' config={barChartConfig}>
                                        <Recharts.BarChart
                                            className={isHoveringClickable ? '!cursor-pointer' : ''}
                                            data={avgsData}
                                            margin={{
                                                top: 20
                                            }}
                                            onClick={(e) => {
                                                if (e.activePayload && e.activePayload![0].payload.post_id) {
                                                    navigate(`/posts/analytics/${e.activePayload![0].payload.post_id}`, {crossApp: true});
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
                                            <Recharts.CartesianGrid horizontal={true} vertical={false} />
                                            <Recharts.XAxis
                                                axisLine={{stroke: 'hsl(var(--border))', strokeWidth: 1}}
                                                dataKey="post_id"
                                                interval={0}
                                                stroke="hsl(var(--border))"
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
                                            {showAvgLine &&
                                                <Recharts.ReferenceLine label={{value: `${formatPercentage(avgValue)}`, position: 'left', offset: 8, fill: 'hsl(var(--muted-foreground))'}} opacity={0.5} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" y={avgValue} />
                                            }
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
                                    <div className="-mt-4 text-center text-sm text-muted-foreground">
                                    Newsletters {currentTab === 'avg-open-rate' ? 'opens' : 'clicks'} in this period
                                    </div>
                                </>
                                :
                                <EmptyIndicator
                                    className='size-full py-20'
                                    title={`No newsletters ${getPeriodText(range)}`}
                                >
                                    <LucideIcon.Mail strokeWidth={1.5} />
                                </EmptyIndicator>
                        }
                    </>
                }
            </div>
        </Tabs>
    );
};

export default NewsletterKPIs;
