import React, {useEffect, useMemo, useState} from 'react';
import moment from 'moment';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, Recharts, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, formatDisplayDateWithRange, formatNumber, getRangeDates} from '@tryghost/shade';
import {determineAggregationStrategy, getPeriodText, sanitizeChartData} from '@src/utils/chart-helpers';

type PaidMembersChangeChartProps = {
    subscriptionData?: {date: string; signups: number; cancellations: number}[];
    memberData: {
        date: string;
        paid_subscribed?: number;
        paid_canceled?: number;
    }[];
    range: number;
    isLoading: boolean;
};

// Helper function to fill missing data points with zeros
// Moved outside component to prevent recreation on each render
const fillMissingDataPoints = (data: {date: string; signups: number; cancellations: number}[], dateRange: number, overrideStrategy?: 'none' | 'weekly' | 'monthly' | 'monthly-exact') => {
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
    const strategy = determineAggregationStrategy(dateRange, dateSpan, 'sum', overrideStrategy);

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
            // Use clone() to avoid mutating currentDate when computing the period key
            dateKey = currentDate.clone().startOf('week').format('YYYY-MM-DD');
            increment = 'week';
            break;
        case 'monthly':
            // Use clone() to avoid mutating currentDate when computing the period key
            dateKey = currentDate.clone().startOf('month').format('YYYY-MM-DD');
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

        // Only mutate currentDate here for loop progression
        currentDate.add(1, increment);
    }

    return filledData;
};

type ResolutionOption = 'daily' | 'weekly' | 'monthly';

// Helper to calculate actual date span for YTD ranges
const getActualDateSpan = (range: number): number => {
    if (range === -1) {
        // Year to date - calculate days from Jan 1 to today
        const {startDate, endDate} = getRangeDates(range);
        return moment(endDate).diff(moment(startDate), 'days');
    }
    return range;
};

// Helper to determine available resolutions based on range
const getAvailableResolutions = (range: number): ResolutionOption[] => {
    const actualSpan = getActualDateSpan(range);

    if (actualSpan < 30) {
        return ['daily']; // No dropdown for < 30 days
    } else if (actualSpan >= 91) {
        return ['weekly', 'monthly'];
    } else {
        return ['daily', 'weekly'];
    }
};

// Helper to get default resolution for a range
const getDefaultResolution = (range: number): ResolutionOption => {
    const actualSpan = getActualDateSpan(range);

    if (actualSpan < 30) {
        return 'daily';
    } else if (actualSpan >= 91) {
        return 'monthly';
    } else {
        return 'weekly';
    }
};

const PaidMembersChangeChart: React.FC<PaidMembersChangeChartProps> = ({
    subscriptionData,
    memberData,
    range,
    isLoading
}) => {
    // State for user-selected resolution
    const [selectedResolution, setSelectedResolution] = useState<ResolutionOption>(() => getDefaultResolution(range));

    // Reset to default when range changes
    useEffect(() => {
        setSelectedResolution(getDefaultResolution(range));
    }, [range]);

    // Get available resolutions for current range
    const availableResolutions = useMemo(() => getAvailableResolutions(range), [range]);

    // Map resolution to aggregation strategy
    const aggregationStrategy = useMemo(() => {
        switch (selectedResolution) {
        case 'daily':
            return 'none' as const;
        case 'weekly':
            return 'weekly' as const;
        case 'monthly':
            return 'monthly' as const;
        }
    }, [selectedResolution]);

    const paidChangeChartData = useMemo(() => {
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
            const signupsData = sanitizeChartData(subscriptionData, range, 'signups', 'sum', aggregationStrategy);
            const cancellationsData = sanitizeChartData(subscriptionData, range, 'cancellations', 'sum', aggregationStrategy);

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
            const filledData = fillMissingDataPoints(combinedData, range, aggregationStrategy);

            return filledData.map((item) => {
                // Use effective range for formatting based on selected resolution
                let effectiveRange = range;
                if (selectedResolution === 'weekly' && range < 91) {
                    effectiveRange = 91; // Force "Week of" formatting
                } else if (selectedResolution === 'monthly' && range < 365) {
                    effectiveRange = 365; // Force "MMM YYYY" formatting
                }

                return {
                    date: formatDisplayDateWithRange(item.date, effectiveRange),
                    new: item.signups || 0,
                    cancelled: -(item.cancellations || 0) // Negative for the stacked bar chart
                };
            });
        } else {
            // Fall back to member count data
            if (!memberData || memberData.length === 0) {
                return [];
            }

            // For "Today" range, show just today's change
            if (range === 1) {
                const today = moment().format('YYYY-MM-DD');
                const todayData = memberData.find(item => item.date === today);

                return [{
                    date: formatDisplayDateWithRange(today, range),
                    new: todayData?.paid_subscribed || 0,
                    cancelled: -(todayData?.paid_canceled || 0) // Negative for the stacked bar chart
                }];
            }

            const sanitizedData = sanitizeChartData(memberData, range, 'paid_subscribed', 'exact');

            return sanitizedData.map((item) => {
                return {
                    date: formatDisplayDateWithRange(item.date, range),
                    new: item.paid_subscribed || 0,
                    cancelled: -(item.paid_canceled || 0) // Negative for the stacked bar chart
                };
            });
        }
    }, [memberData, subscriptionData, range, aggregationStrategy, selectedResolution]);

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

    if (isLoading || paidChangeChartData.length === 0) {
        return null;
    }

    // Capitalize first letter for display
    const formatResolution = (resolution: ResolutionOption): string => {
        return resolution.charAt(0).toUpperCase() + resolution.slice(1);
    };

    return (
        <Card data-testid='paid-members-change-card'>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className='flex flex-col gap-y-1.5'>
                        <CardTitle>Paid members change</CardTitle>
                        <CardDescription>New and cancelled paid subscriptions {getPeriodText(range)}</CardDescription>
                    </div>
                    {availableResolutions.length > 1 && (
                        <div>
                            <Select value={selectedResolution} onValueChange={value => setSelectedResolution(value as ResolutionOption)}>
                                <SelectTrigger className="w-[110px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align='end'>
                                    {availableResolutions.map(resolution => (
                                        <SelectItem key={resolution} value={resolution}>
                                            {formatResolution(resolution)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div>
                    <ChartContainer className='aspect-auto h-[200px] w-full md:h-[220px] xl:h-[260px]' config={paidChangeChartConfig}>
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
                            <Recharts.CartesianGrid stroke="hsl(var(--border))" vertical={false} />
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
                    <div className='mt-3 flex items-center justify-center gap-6 text-sm text-muted-foreground'>
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
                </div>
            </CardContent>
        </Card>
    );
};

export default PaidMembersChangeChart;
