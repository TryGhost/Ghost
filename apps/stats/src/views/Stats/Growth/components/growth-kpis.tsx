import React, {useEffect, useMemo, useState} from 'react';
import moment from 'moment';
import {BarChartLoadingIndicator, ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, GhAreaChart, GhAreaChartDataItem, KpiDropdownButton, KpiTabTrigger, KpiTabValue, Recharts, Separator, Tabs, TabsContent, TabsList, TabsTrigger, centsToDollars, formatDisplayDateWithRange, formatNumber, getRangeDates} from '@tryghost/shade';
import {DiffDirection} from '@hooks/use-growth-stats';
import {STATS_RANGES} from '@src/utils/constants';
import {determineAggregationStrategy, sanitizeChartData} from '@src/utils/chart-helpers';
import {useAppContext} from '@src/app';
import {useGlobalData} from '@src/providers/global-data-provider';
import {useLabsFlag} from '@src/hooks/use-labs-flag';
import {useNavigate, useSearchParams} from '@tryghost/admin-x-framework';

type ChartDataItem = {
    date: string;
    value: number;
    free: number;
    paid: number;
    comped: number;
    mrr: number;
    paid_subscribed?: number;
    paid_canceled?: number;
    formattedValue: string;
    label?: string;
};

type Totals = {
    totalMembers: number;
    freeMembers: number;
    paidMembers: number;
    mrr: number;
    percentChanges: {
        total: string;
        free: string;
        paid: string;
        mrr: string;
    };
    directions: {
        total: DiffDirection;
        free: DiffDirection;
        paid: DiffDirection;
        mrr: DiffDirection;
    };
};

type KpiTab = 'total-members' | 'free-members' | 'paid-members' | 'mrr';

const isValidTab = (tab: string | null | undefined): tab is KpiTab => {
    return tab === 'total-members' || tab === 'free-members' || tab === 'paid-members' || tab === 'mrr';
};

// Extended data type for paid members chart with additional tooltip fields
type PaidMembersChartDataItem = GhAreaChartDataItem & {
    comped: number;
    paid_subscribed?: number;
};

// Custom tooltip for paid members chart
const PaidMembersTooltipContent = ({active, payload, range, color, showBreakdown}: {
    active?: boolean;
    payload?: Array<{value: number; payload: PaidMembersChartDataItem}>;
    range?: number;
    color?: string;
    showBreakdown?: boolean;
}) => {
    if (!active || !payload?.length) {
        return null;
    }

    const data = payload[0].payload;
    const {date, formattedValue, label, comped} = data;
    const paidSubscriptions = data.value - (comped || 0);

    return (
        <div className="min-w-[200px] rounded-lg border bg-background px-3 py-2 shadow-lg">
            {date && <div className="mb-1 text-sm text-foreground">{formatDisplayDateWithRange(date, range || 0)}</div>}
            <div className='flex flex-col gap-1'>
                {showBreakdown && (
                    <>
                        <div className='flex items-center gap-2'>
                            <div className='flex grow items-center justify-between gap-5'>
                                <div className="text-sm text-muted-foreground">Paid subscriptions</div>
                                <div className="font-mono text-sm">{formatNumber(paidSubscriptions)}</div>
                            </div>
                        </div>
                        <div className='flex items-center gap-2'>
                            <div className='flex grow items-center justify-between gap-5'>
                                <div className="text-sm text-muted-foreground">Complimentary</div>
                                <div className="font-mono text-sm">{(comped !== undefined && comped > 0) ? (formatNumber(comped)) : '0'}</div>
                            </div>
                        </div>
                        <Separator />
                    </>
                )}
                <div className='flex items-center gap-2'>
                    <span className='inline-block size-2 rounded-full opacity-50' style={{backgroundColor: color || 'hsl(var(--chart-purple))'}}></span>
                    <div className='flex grow items-center justify-between gap-5'>
                        {label && <div className="text-sm text-muted-foreground">{label}</div>}
                        <div className="font-mono font-medium">{formattedValue}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GrowthKPIs: React.FC<{
    chartData: ChartDataItem[];
    subscriptionData?: {date: string; signups: number; cancellations: number}[];
    totals: Totals;
    initialTab?: string;
    currencySymbol: string;
    isLoading: boolean;
    onTabChange?: (tab: KpiTab) => void;
}> = ({chartData: allChartData, subscriptionData, totals, initialTab, currencySymbol, isLoading, onTabChange}) => {
    const validatedInitialTab = isValidTab(initialTab) ? initialTab : 'total-members';
    const [currentTab, setCurrentTab] = useState<KpiTab>(validatedInitialTab);
    const [paidChartTab, setPaidChartTab] = useState('total');
    const {range} = useGlobalData();
    const {appSettings} = useAppContext();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const showPaidBreakdown = useLabsFlag('paidBreakdownCharts');

    // Update current tab if initialTab changes
    useEffect(() => {
        setCurrentTab(validatedInitialTab);
    }, [validatedInitialTab]);

    // Function to update tab and URL
    const handleTabChange = (tabValue: KpiTab) => {
        setCurrentTab(tabValue);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('tab', tabValue);
        navigate(`?${newSearchParams.toString()}`, {replace: true});
        // Notify parent component of tab change
        if (onTabChange) {
            onTabChange(tabValue);
        }
    };

    const {totalMembers, freeMembers, paidMembers, mrr, percentChanges, directions} = totals;

    // Create chart data based on selected tab
    const chartData = useMemo(() => {
        if (!allChartData || allChartData.length === 0) {
            return [];
        }

        // First sanitize the data based on the selected field
        let sanitizedData: ChartDataItem[] = [];
        let fieldName: keyof ChartDataItem = 'value';

        switch (currentTab) {
        case 'free-members':
            fieldName = 'free';
            break;
        case 'paid-members':
            fieldName = 'paid';
            break;
        case 'mrr': {
            fieldName = 'mrr';
            break;
        }
        default:
            fieldName = 'value';
        }

        sanitizedData = sanitizeChartData(allChartData, range, fieldName, 'exact');

        // Then map the sanitized data to the final format
        let processedData: GhAreaChartDataItem[] = [];

        switch (currentTab) {
        case 'free-members':
            processedData = sanitizedData.map((item) => {
                return {
                    ...item,
                    value: item.free,
                    formattedValue: formatNumber(item.free),
                    label: 'Free members'
                };
            });
            break;
        case 'paid-members':
            processedData = sanitizedData.map((item) => {
                return {
                    ...item,
                    value: item.paid,
                    formattedValue: formatNumber(item.paid),
                    label: 'Paid members',
                    comped: item.comped,
                    paid_subscribed: item.paid_subscribed
                };
            });
            break;
        case 'mrr':
            processedData = sanitizedData.map((item) => {
                return {
                    ...item,
                    value: centsToDollars(item.mrr),
                    formattedValue: `${currencySymbol}${formatNumber(centsToDollars(item.mrr))}`,
                    label: 'MRR'
                };
            });
            break;
        default:
            processedData = sanitizedData.map((item) => {
                // Note: item.paid already includes comped members
                const currentTotal = item.free + item.paid;
                return {
                    ...item,
                    value: currentTotal,
                    formattedValue: formatNumber(currentTotal),
                    label: 'Total members'
                };
            });
        }

        return processedData;
    }, [currentTab, allChartData, range, currencySymbol]);

    const tabConfig = {
        'total-members': {
            color: 'hsl(var(--chart-darkblue))'
        },
        'free-members': {
            color: 'hsl(var(--chart-blue))'
        },
        'paid-members': {
            color: 'hsl(var(--chart-purple))'
        },
        mrr: {
            color: 'hsl(var(--chart-teal))'
        }
    };

    // Helper function to fill missing data points with zeros (only used when flag is disabled)
    const fillMissingDataPoints = (data: {date: string; signups: number; cancellations: number}[], dateRange: number) => {
        // For "Today" (dateRange = 1), show just one data point for the current date
        if (dateRange === 1) {
            const today = moment().format('YYYY-MM-DD');
            const todayData = data.find(item => item.date === today);

            return [{
                date: today,
                signups: todayData?.signups || 0,
                cancellations: todayData?.cancellations || 0
            }];
        }

        const {startDate, endDate} = getRangeDates(dateRange);
        const dateSpan = moment(endDate).diff(moment(startDate), 'days');
        const strategy = determineAggregationStrategy(dateRange, dateSpan, 'sum');

        // Create a map of existing data by date
        const dataMap = new Map(data.map(item => [item.date, item]));

        const filledData: {date: string; signups: number; cancellations: number}[] = [];
        const currentDate = moment(startDate);
        const endMoment = moment(endDate);

        while (currentDate.isSameOrBefore(endMoment)) {
            let dateKey: string;
            let increment: moment.unitOfTime.DurationConstructor;

            switch (strategy) {
            case 'weekly':
                dateKey = currentDate.startOf('week').format('YYYY-MM-DD');
                increment = 'week';
                break;
            case 'monthly':
                dateKey = currentDate.startOf('month').format('YYYY-MM-DD');
                increment = 'month';
                break;
            default:
                dateKey = currentDate.format('YYYY-MM-DD');
                increment = 'day';
            }

            const existingData = dataMap.get(dateKey);
            if (existingData) {
                filledData.push(existingData);
            } else {
                filledData.push({
                    date: dateKey,
                    signups: 0,
                    cancellations: 0
                });
            }

            currentDate.add(1, increment);
        }

        return filledData;
    };

    // Legacy paid change chart data (only computed when flag is disabled)
    const paidChangeChartData = useMemo(() => {
        // Only compute when flag is disabled and we're on paid-members tab
        if (showPaidBreakdown || currentTab !== 'paid-members') {
            return [];
        }

        // Use subscription data if available (like Ember dashboard), otherwise fall back to member data
        if (subscriptionData && subscriptionData.length > 0) {
            // For "Today" range, show just the change for today
            if (range === 1) {
                const today = moment().format('YYYY-MM-DD');
                const todayData = subscriptionData.find(item => item.date === today);

                return [{
                    date: formatDisplayDateWithRange(today, range),
                    new: todayData?.signups || 0,
                    cancelled: -(todayData?.cancellations || 0) // Negative for the stacked bar chart
                }];
            }

            // Apply proper aggregation to subscription data using 'sum' aggregation type FIRST
            // This will properly sum signups and cancellations within each time period
            const signupsData = sanitizeChartData(subscriptionData, range, 'signups', 'sum');
            const cancellationsData = sanitizeChartData(subscriptionData, range, 'cancellations', 'sum');

            // Combine the aggregated data
            const combinedData = signupsData.map(item => ({
                date: item.date,
                signups: item.signups || 0,
                cancellations: cancellationsData.find(c => c.date === item.date)?.cancellations || 0
            }));

            // Add any cancellation-only dates that might be missing from signups
            cancellationsData.forEach((cancelItem) => {
                if (!combinedData.find(item => item.date === cancelItem.date)) {
                    combinedData.push({
                        date: cancelItem.date,
                        signups: 0,
                        cancellations: cancelItem.cancellations || 0
                    });
                }
            });

            // Sort by date
            combinedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Now fill missing data points with zeros to ensure consistent display
            const filledData = fillMissingDataPoints(combinedData, range);

            return filledData.map((item) => {
                return {
                    date: formatDisplayDateWithRange(item.date, range),
                    new: item.signups || 0,
                    cancelled: -(item.cancellations || 0) // Negative for the stacked bar chart
                };
            });
        } else {
            // Fall back to member count data
            if (!allChartData || allChartData.length === 0) {
                return [];
            }

            // For "Today" range, show just today's change
            if (range === 1) {
                const today = moment().format('YYYY-MM-DD');
                const todayData = allChartData.find(item => item.date === today);

                return [{
                    date: formatDisplayDateWithRange(today, range),
                    new: todayData?.paid_subscribed || 0,
                    cancelled: -(todayData?.paid_canceled || 0) // Negative for the stacked bar chart
                }];
            }

            const sanitizedData = sanitizeChartData(allChartData, range, 'paid', 'exact');

            return sanitizedData.map((item) => {
                return {
                    date: formatDisplayDateWithRange(item.date, range),
                    new: item.paid_subscribed || 0,
                    cancelled: -(item.paid_canceled || 0) // Negative for the stacked bar chart
                };
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showPaidBreakdown, currentTab, allChartData, subscriptionData, range]);

    const paidChangeChartConfig = {
        new: {
            label: 'New',
            color: 'hsl(var(--chart-teal))'
        },
        cancelled: {
            label: 'Cancelled',
            color: 'hsl(var(--chart-rose))'
        }
    } satisfies ChartConfig;

    if (isLoading) {
        return (
            <div className='-mb-6 flex h-[calc(16vw+132px)] w-full items-start justify-center'>
                <BarChartLoadingIndicator />
            </div>
        );
    }

    const areaChartClassname = '-mb-3 h-[16vw] max-h-[320px] w-full min-h-[180px]';

    return (
        <Tabs defaultValue={validatedInitialTab} variant='kpis'>
            <TabsList className={`-mx-6 ${appSettings?.paidMembersEnabled ? 'hidden grid-cols-4 lg:!visible lg:!grid' : 'grid grid-cols-4'}`}>
                <KpiTabTrigger className={!appSettings?.paidMembersEnabled ? 'cursor-auto after:hidden' : ''} value="total-members" onClick={() => {
                    if (appSettings?.paidMembersEnabled) {
                        handleTabChange('total-members');
                    }
                }}>
                    <KpiTabValue
                        color='hsl(var(--chart-darkblue))'
                        diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.total}
                        diffValue={percentChanges.total}
                        label="Total members"
                        value={formatNumber(totalMembers)}
                    />
                </KpiTabTrigger>
                {appSettings?.paidMembersEnabled &&
                <>

                    <KpiTabTrigger value="free-members" onClick={() => {
                        handleTabChange('free-members');
                    }}>
                        <KpiTabValue
                            color='hsl(var(--chart-blue))'
                            diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.free}
                            diffValue={percentChanges.free}
                            label="Free members"
                            value={formatNumber(freeMembers)}
                        />
                    </KpiTabTrigger>
                    <KpiTabTrigger value="paid-members" onClick={() => {
                        handleTabChange('paid-members');
                    }}>
                        <KpiTabValue
                            color='hsl(var(--chart-purple))'
                            diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.paid}
                            diffValue={percentChanges.paid}
                            label="Paid members"
                            value={formatNumber(paidMembers)}
                        />
                    </KpiTabTrigger>
                    <KpiTabTrigger value="mrr" onClick={() => {
                        handleTabChange('mrr');
                    }}>
                        <KpiTabValue
                            color='hsl(var(--chart-teal))'
                            diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.mrr}
                            diffValue={percentChanges.mrr}
                            label="MRR"
                            value={`${currencySymbol}${formatNumber(centsToDollars(mrr))}`}
                        />
                    </KpiTabTrigger>
                </>
                }
            </TabsList>
            {appSettings?.paidMembersEnabled &&
                <DropdownMenu>
                    <DropdownMenuTrigger className='lg:hidden' asChild>
                        <KpiDropdownButton>
                            {currentTab === 'total-members' &&
                                <KpiTabValue
                                    color='hsl(var(--chart-darkblue))'
                                    diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.total}
                                    diffValue={percentChanges.total}
                                    label="Total members"
                                    value={formatNumber(totalMembers)}
                                />
                            }
                            {currentTab === 'free-members' &&
                                <KpiTabValue
                                    color='hsl(var(--chart-blue))'
                                    diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.free}
                                    diffValue={percentChanges.free}
                                    label="Free members"
                                    value={formatNumber(freeMembers)}
                                />
                            }
                            {currentTab === 'paid-members' &&
                                <KpiTabValue
                                    color='hsl(var(--chart-purple))'
                                    diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.paid}
                                    diffValue={percentChanges.paid}
                                    label="Paid members"
                                    value={formatNumber(paidMembers)}
                                />
                            }
                            {currentTab === 'mrr' &&
                                <KpiTabValue
                                    color='hsl(var(--chart-teal))'
                                    diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.mrr}
                                    diffValue={percentChanges.mrr}
                                    label="MRR"
                                    value={`${currencySymbol}${formatNumber(centsToDollars(mrr))}`}
                                />
                            }
                        </KpiDropdownButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className="w-56">
                        <DropdownMenuItem onClick={() => handleTabChange('total-members')}>Total members</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTabChange('free-members')}>Free members</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTabChange('paid-members')}>Paid members</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTabChange('mrr')}>MRR</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            }
            <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
                {currentTab === 'paid-members' && !showPaidBreakdown ? (
                    // Legacy behavior: Total/Change tabs with embedded bar chart
                    <Tabs
                        defaultValue={paidChartTab}
                        variant="button-sm"
                        onValueChange={(value) => {
                            setPaidChartTab(value);
                        }}
                    >
                        <div className='mb-4 mt-2 flex w-full items-center justify-start'>
                            <TabsList className="flex items-center">
                                <TabsTrigger value="total">
                                Total
                                </TabsTrigger>
                                <TabsTrigger value="change">
                                Change
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        <TabsContent value="total">
                            <GhAreaChart
                                className={areaChartClassname}
                                color={tabConfig[currentTab].color}
                                data={chartData}
                                dataFormatter={formatNumber}
                                id="paid-members"
                                range={range}
                            />
                        </TabsContent>
                        <TabsContent value="change">
                            <ChartContainer className='mt-6 aspect-auto h-[200px] w-full md:h-[220px] xl:h-[260px]' config={paidChangeChartConfig}>
                                <Recharts.BarChart
                                    data={paidChangeChartData}
                                    stackOffset='sign'
                                >
                                    <defs>
                                        <linearGradient id="tealGradient" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor={'var(--color-new)'} stopOpacity={0.8} />
                                            <stop offset="100%" stopColor={'var(--color-new)'} stopOpacity={0.6} />
                                        </linearGradient>
                                    </defs>
                                    <defs>
                                        <linearGradient id="roseGradient" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor={'var(--color-cancelled)'} stopOpacity={0.6} />
                                            <stop offset="100%" stopColor={'var(--color-cancelled)'} stopOpacity={0.8} />
                                        </linearGradient>
                                    </defs>
                                    <Recharts.CartesianGrid vertical={false} />
                                    <Recharts.XAxis
                                        axisLine={false}
                                        dataKey="date"
                                        tickFormatter={() => ('')}
                                        tickLine={false}
                                        tickMargin={10}
                                    />
                                    <Recharts.YAxis
                                        axisLine={false}
                                        tickFormatter={(value) => {
                                            return value < 0 ? formatNumber(value * -1) : formatNumber(value);
                                        }}
                                        tickLine={false}
                                    />
                                    <ChartTooltip
                                        content={<ChartTooltipContent
                                            className='!min-w-[120px] px-3 py-2'
                                            formatter={(value, name, payload, index) => {
                                                const rawValue = Number(value);
                                                let displayValue = '0';
                                                if (rawValue === 0) {
                                                    displayValue = '0';
                                                } else {
                                                    displayValue = rawValue < 0 ? formatNumber(rawValue * -1) : formatNumber(rawValue);
                                                }

                                                // Calculate net change (new + cancelled, since cancelled is negative)
                                                const newValue = Number(payload?.payload?.new || 0);
                                                const cancelledValue = Number(payload?.payload?.cancelled || 0);
                                                const netChange = newValue + cancelledValue;
                                                const netChangeFormatted = netChange === 0 ? '0' : (netChange > 0 ? `+${formatNumber(netChange)}` : formatNumber(netChange));

                                                return (
                                                    <div className='flex w-full flex-col'>
                                                        {index === 0 &&
                                                            <div className="mb-1 text-sm font-medium text-foreground">
                                                                {payload?.payload?.date}
                                                            </div>
                                                        }
                                                        <div className='flex w-full items-center justify-between gap-4'>
                                                            <div className='flex items-center gap-1'>
                                                                <div
                                                                    className="size-2 shrink-0 rounded-full bg-[var(--color-bg)] opacity-50"
                                                                    style={{
                                                                        '--color-bg': `var(--color-${name})`
                                                                    } as React.CSSProperties}
                                                                />
                                                                <span className='text-sm text-muted-foreground'>
                                                                    {paidChangeChartConfig[name as keyof typeof paidChangeChartConfig]?.label || name}
                                                                </span>
                                                            </div>
                                                            <div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
                                                                {displayValue}
                                                            </div>
                                                        </div>
                                                        {index === 1 &&
                                                            <div className='mt-1 flex w-full items-center justify-between gap-4 border-t pt-1'>
                                                                <span className='text-sm text-muted-foreground'>
                                                                    Net change
                                                                </span>
                                                                <div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
                                                                    {netChangeFormatted}
                                                                </div>
                                                            </div>
                                                        }
                                                    </div>
                                                );
                                            }}
                                            hideLabel
                                        />}
                                        cursor={false}
                                        isAnimationActive={false}
                                        position={{y: 10}}
                                    />
                                    <Recharts.Bar
                                        activeBar={{fillOpacity: 1}}
                                        dataKey="new"
                                        fill='url(#tealGradient)'
                                        fillOpacity={0.75}
                                        maxBarSize={32}
                                        minPointSize={3}
                                        radius={[4, 4, 0, 0]}
                                        stackId="a"
                                    />
                                    <Recharts.Bar
                                        activeBar={{fillOpacity: 1}}
                                        dataKey="cancelled"
                                        fill='url(#roseGradient)'
                                        fillOpacity={0.75}
                                        maxBarSize={32}
                                        radius={[4, 4, 0, 0]}
                                        stackId="a"
                                    />
                                </Recharts.BarChart>
                            </ChartContainer>
                            <div className='flex items-center justify-center gap-6 text-sm text-muted-foreground'>
                                <div className='flex items-center gap-1'>
                                    <span className='size-2 rounded-full opacity-50'
                                        style={{
                                            backgroundColor: paidChangeChartConfig.new.color
                                        }}
                                    ></span>
                                    New
                                </div>
                                <div className='flex items-center gap-1'>
                                    <span className='size-2 rounded-full opacity-50'
                                        style={{
                                            backgroundColor: paidChangeChartConfig.cancelled.color
                                        }}
                                    ></span>
                                    Cancelled
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                ) : (
                    // New behavior (flag enabled) or non-paid-members tabs
                    <GhAreaChart
                        className={areaChartClassname}
                        color={tabConfig[currentTab].color}
                        data={chartData}
                        dataFormatter={currentTab === 'mrr'
                            ?
                            (value: number) => {
                                return `${currencySymbol}${formatNumber(value)}`;
                            } :
                            formatNumber}
                        id={currentTab}
                        range={range}
                        tooltipContent={currentTab === 'paid-members' && showPaidBreakdown ? <PaidMembersTooltipContent color={tabConfig['paid-members'].color} range={range} showBreakdown={showPaidBreakdown} /> : undefined}
                    />
                )}
            </div>
        </Tabs>
    );
};

export default GrowthKPIs;
