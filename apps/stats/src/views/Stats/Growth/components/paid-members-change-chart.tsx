import React, {useMemo} from 'react';
import moment from 'moment';
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, Recharts, formatDisplayDateWithRange, formatNumber, getRangeDates} from '@tryghost/shade';
import {determineAggregationStrategy, sanitizeChartData} from '@src/utils/chart-helpers';

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

const PaidMembersChangeChart: React.FC<PaidMembersChangeChartProps> = ({
    subscriptionData,
    memberData,
    range,
    isLoading
}) => {
    // Helper function to fill missing data points with zeros
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
    }, [memberData, subscriptionData, range]);

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

    return (
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
    );
};

export default PaidMembersChangeChart;
