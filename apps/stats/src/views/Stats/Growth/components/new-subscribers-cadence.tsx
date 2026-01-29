import React, {useMemo, useState} from 'react';
import moment from 'moment';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, EmptyIndicator, LucideIcon, Recharts, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, formatNumber, formatQueryDate, getRangeDates} from '@tryghost/shade';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useMemberCountHistory, useSubscriptionStats} from '@tryghost/admin-x-framework/api/stats';

type NewSubscribersCadenceProps = {
    isLoading: boolean;
    range: number;
};

type BreakdownType = 'billing-period' | 'tiers';

type CadenceChartDataItem = {
    id: string;
    name: string;
    count: number;
    fill: string;
    color: string;
};

// Custom tooltip component
const CustomTooltip = ({active, payload}: {
    active?: boolean;
    payload?: Array<{value: number; name: string; payload: CadenceChartDataItem}>;
}) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm">
                <div className="flex items-center gap-2">
                    <div
                        className="size-2 rounded-full opacity-50"
                        style={{backgroundColor: data.payload.color}}
                    />
                    <span className="font-medium">{data.name}</span>
                    <span className="font-mono">{formatNumber(data.value)}</span>
                </div>
            </div>
        );
    }
    return null;
};

const NewSubscribersCadence: React.FC<NewSubscribersCadenceProps> = ({isLoading, range}) => {
    const {data: subscriptionStatsResponse} = useSubscriptionStats();
    const {data: memberCountResponse} = useMemberCountHistory({
        searchParams: {
            date_from: formatQueryDate(getRangeDates(range).startDate)
        }
    });
    const {data: {tiers: tierObjects = []} = {}} = useBrowseTiers();
    const [breakdownType, setBreakdownType] = useState<BreakdownType>('billing-period');

    // Calculate date range for filtering
    const {startDate, endDate} = useMemo(() => getRangeDates(range), [range]);
    const dateFrom = useMemo(() => formatQueryDate(startDate), [startDate]);
    const dateTo = useMemo(() => formatQueryDate(endDate), [endDate]);

    // Use all active paid tiers from the tiers API (excluding Free tier)
    const availableTiers = useMemo(() => {
        return tierObjects
            .filter(tier => tier.type === 'paid' && tier.active)
            .map(tier => ({
                id: tier.id,
                name: tier.name
            }));
    }, [tierObjects]);

    // Calculate complimentary member signups (change in comped) within date range
    const compedSignups = useMemo(() => {
        if (!memberCountResponse?.stats || memberCountResponse.stats.length === 0) {
            return 0;
        }

        const stats = memberCountResponse.stats;
        const dateFromMoment = moment(dateFrom);
        const dateToMoment = moment(dateTo);

        // Filter stats to the date range
        const filteredStats = stats.filter((item) => {
            const itemDate = moment(item.date);
            return itemDate.isSameOrAfter(dateFromMoment) && itemDate.isSameOrBefore(dateToMoment);
        });

        if (filteredStats.length === 0) {
            return 0;
        }

        // Sort by date to get first and last in range
        const sortedStats = [...filteredStats].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const firstComped = sortedStats[0].comped;
        const lastComped = sortedStats[sortedStats.length - 1].comped;

        // Return the delta (new complimentary signups in the period)
        // Only return positive values (new signups, not removals)
        const delta = lastComped - firstComped;
        return delta > 0 ? delta : 0;
    }, [memberCountResponse, dateFrom, dateTo]);

    // Process subscription data for billing period breakdown (cadence) - NEW SUBSCRIBERS in date range
    const billingPeriodData = useMemo(() => {
        if (!subscriptionStatsResponse?.stats) {
            return [];
        }

        const dateFromMoment = moment(dateFrom);
        const dateToMoment = moment(dateTo);

        // Filter stats to the date range and sum signups by cadence
        const cadenceTotals = subscriptionStatsResponse.stats
            .filter((item) => {
                const itemDate = moment(item.date);
                return itemDate.isSameOrAfter(dateFromMoment) && itemDate.isSameOrBefore(dateToMoment);
            })
            .reduce((acc, item) => {
                const cadence = item.cadence;
                if (!acc[cadence]) {
                    acc[cadence] = 0;
                }
                acc[cadence] += item.signups; // Sum signups, not count
                return acc;
            }, {} as Record<string, number>);

        // Add complimentary signups if any exist
        if (compedSignups > 0) {
            cadenceTotals.complimentary = compedSignups;
        }

        // Convert to array format for pie chart
        const chartData = Object.entries(cadenceTotals).map(([cadence, count], index) => {
            // Map cadence values to display labels and colors
            let label = cadence;
            let fillGradient = 'url(#gradientPurple)';
            let solidColor = 'hsl(var(--chart-purple))';

            if (cadence === 'month') {
                label = 'Monthly';
                fillGradient = 'url(#gradientPurple)';
                solidColor = 'hsl(var(--chart-purple))';
            } else if (cadence === 'year') {
                label = 'Annual';
                fillGradient = 'url(#gradientTeal)';
                solidColor = 'hsl(var(--chart-teal))';
            } else if (cadence === 'complimentary') {
                label = 'Complimentary';
                fillGradient = 'url(#gradientBlue)';
                solidColor = 'hsl(var(--chart-blue))';
            }

            return {
                id: `cadence-${index}`,
                name: label,
                count,
                fill: fillGradient,
                color: solidColor
            };
        });

        return chartData;
    }, [subscriptionStatsResponse, dateFrom, dateTo, compedSignups]);

    // Process subscription data for tier breakdown - NEW SUBSCRIBERS in date range
    const tierData = useMemo(() => {
        if (!subscriptionStatsResponse?.stats || availableTiers.length === 0) {
            return [];
        }

        const dateFromMoment = moment(dateFrom);
        const dateToMoment = moment(dateTo);

        // Filter stats to the date range and sum signups by tier
        const tierTotals = subscriptionStatsResponse.stats
            .filter((item) => {
                const itemDate = moment(item.date);
                return itemDate.isSameOrAfter(dateFromMoment) && itemDate.isSameOrBefore(dateToMoment);
            })
            .reduce((acc, item) => {
                const tierId = item.tier;
                if (!acc[tierId]) {
                    acc[tierId] = 0;
                }
                acc[tierId] += item.signups; // Sum signups, not count
                return acc;
            }, {} as Record<string, number>);

        // Color palette for tiers (10 distinct colors)
        const tierColors = [
            {gradient: 'url(#gradientPurple)', solid: 'hsl(var(--chart-purple))'},
            {gradient: 'url(#gradientTeal)', solid: 'hsl(var(--chart-teal))'},
            {gradient: 'url(#gradientBlue)', solid: 'hsl(var(--chart-blue))'},
            {gradient: 'url(#gradientRose)', solid: 'hsl(var(--chart-rose))'},
            {gradient: 'url(#gradientOrange)', solid: 'hsl(var(--chart-orange))'},
            {gradient: 'url(#gradientGreen)', solid: 'hsl(var(--chart-green))'},
            {gradient: 'url(#gradientAmber)', solid: 'hsl(var(--chart-amber))'},
            {gradient: 'url(#gradientYellow)', solid: 'hsl(var(--chart-yellow))'},
            {gradient: 'url(#gradientDarkblue)', solid: 'hsl(var(--chart-darkblue))'},
            {gradient: 'url(#gradientGray)', solid: 'hsl(var(--chart-darkgray))'}
        ];

        // Create chart data for ALL available tiers, including those with 0 signups
        // First, create data with counts
        const unsortedData = availableTiers.map((tier) => {
            const count = tierTotals[tier.id] || 0;
            return {
                id: tier.id,
                name: tier.name,
                count
            };
        });

        // Sort by count descending (highest first)
        const sortedData = [...unsortedData].sort((a, b) => b.count - a.count);

        // Assign colors based on sorted order
        const chartData = sortedData.map((tier, index) => {
            const colorIndex = index % tierColors.length;
            return {
                ...tier,
                fill: tierColors[colorIndex].gradient,
                color: tierColors[colorIndex].solid
            };
        });

        return chartData;
    }, [subscriptionStatsResponse, availableTiers, dateFrom, dateTo]);

    // Get the active chart data based on breakdown type
    const chartData = breakdownType === 'billing-period' ? billingPeriodData : tierData;

    const totalSignups = useMemo(() => {
        return chartData.reduce((acc, curr) => acc + curr.count, 0);
    }, [chartData]);

    const chartConfig = useMemo(() => {
        const config: ChartConfig = {
            count: {
                label: 'Subscriptions'
            }
        };

        chartData.forEach((item) => {
            config[item.id] = {
                label: item.name,
                color: item.color
            };
        });

        return config;
    }, [chartData]) satisfies ChartConfig;

    // Calculate percentages for legend
    const percentages = useMemo(() => {
        if (totalSignups === 0) {
            return [];
        }

        return chartData.map((item) => {
            return {
                label: item.name,
                count: item.count,
                percentage: ((item.count / totalSignups) * 100),
                color: item.color
            };
        });
    }, [chartData, totalSignups]);

    // Don't render if loading or no subscription data at all
    if (isLoading || !subscriptionStatsResponse?.stats) {
        return null;
    }

    // Check if we have data
    const hasData = chartData.length > 0 && totalSignups > 0;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-1.5">
                    <div className='flex flex-col gap-1.5'>
                        <CardTitle>Paid subscription breakdown</CardTitle>
                        <CardDescription>New paid subscriptions {getPeriodText(range)}</CardDescription>
                    </div>
                    {availableTiers.length > 1 && (
                        <div>
                            <Select value={breakdownType} onValueChange={value => setBreakdownType(value as BreakdownType)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align='end'>
                                    <SelectItem value="billing-period">Billing period</SelectItem>
                                    <SelectItem value="tiers">Tiers</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {hasData ? (
                    <>
                        <ChartContainer
                            className="mx-auto aspect-square h-[250px] min-h-[250px] w-full"
                            config={chartConfig}
                        >
                            <Recharts.PieChart>
                                <defs>
                                    <linearGradient id="gradientPurple" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="hsl(var(--chart-purple))" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="hsl(var(--chart-purple))" stopOpacity={0.6} />
                                    </linearGradient>
                                    <linearGradient id="gradientTeal" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="hsl(var(--chart-teal))" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="hsl(var(--chart-teal))" stopOpacity={0.6} />
                                    </linearGradient>
                                    <linearGradient id="gradientRose" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="hsl(var(--chart-rose))" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="hsl(var(--chart-rose))" stopOpacity={0.6} />
                                    </linearGradient>
                                    <linearGradient id="gradientBlue" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="hsl(var(--chart-blue))" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="hsl(var(--chart-blue))" stopOpacity={0.6} />
                                    </linearGradient>
                                    <linearGradient id="gradientOrange" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="hsl(var(--chart-orange))" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="hsl(var(--chart-orange))" stopOpacity={0.6} />
                                    </linearGradient>
                                    <linearGradient id="gradientGreen" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="hsl(var(--chart-green))" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="hsl(var(--chart-green))" stopOpacity={0.6} />
                                    </linearGradient>
                                    <linearGradient id="gradientAmber" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="hsl(var(--chart-amber))" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="hsl(var(--chart-amber))" stopOpacity={0.6} />
                                    </linearGradient>
                                    <linearGradient id="gradientYellow" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="hsl(var(--chart-yellow))" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="hsl(var(--chart-yellow))" stopOpacity={0.6} />
                                    </linearGradient>
                                    <linearGradient id="gradientDarkblue" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="hsl(var(--chart-darkblue))" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="hsl(var(--chart-darkblue))" stopOpacity={0.6} />
                                    </linearGradient>
                                    <linearGradient id="gradientGray" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="hsl(var(--chart-darkgray))" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="hsl(var(--chart-darkgray))" stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                                <ChartTooltip
                                    content={<CustomTooltip />}
                                    cursor={false}
                                />
                                <Recharts.Pie
                                    animationBegin={0}
                                    animationDuration={1000}
                                    data={chartData}
                                    dataKey="count"
                                    innerRadius={70}
                                    nameKey="name"
                                    strokeWidth={5}
                                >
                                    <Recharts.Label
                                        content={({viewBox}) => {
                                            if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                                return (
                                                    <text
                                                        dominantBaseline="middle"
                                                        textAnchor="middle"
                                                        x={viewBox.cx}
                                                        y={viewBox.cy}
                                                    >
                                                        <tspan
                                                            className="fill-foreground text-2xl font-semibold tracking-tight"
                                                            x={viewBox.cx}
                                                            y={viewBox.cy}
                                                        >
                                                            {formatNumber(totalSignups)}
                                                        </tspan>
                                                        <tspan
                                                            className="fill-muted-foreground"
                                                            x={viewBox.cx}
                                                            y={(viewBox.cy || 0) + 20}
                                                        >
                                                            Total
                                                        </tspan>
                                                    </text>
                                                );
                                            }
                                        }}
                                    />
                                </Recharts.Pie>
                            </Recharts.PieChart>
                        </ChartContainer>
                        {percentages.length > 0 && (
                            <div className='mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground'>
                                {percentages.map(item => (
                                    <div key={item.label} className='flex items-center gap-2'>
                                        <span
                                            className='size-2 rounded-full opacity-50'
                                            style={{backgroundColor: item.color}}
                                        />
                                        <span className='max-w-[150px] truncate whitespace-nowrap' title={item.label}>{item.label}</span>
                                        <span className='font-medium text-foreground'>
                                            {Math.round(Number(item.percentage) || 0)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="py-12">
                        <EmptyIndicator
                            description={`No new paid subscriptions ${getPeriodText(range)}.`}
                            title="No new subscribers"
                        >
                            <LucideIcon.ChartPie strokeWidth={1.5} />
                        </EmptyIndicator>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default NewSubscribersCadence;
