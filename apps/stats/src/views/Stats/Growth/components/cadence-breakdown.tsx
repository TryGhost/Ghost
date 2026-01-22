import React, {useMemo, useState} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, EmptyIndicator, LucideIcon, Recharts, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, formatNumber} from '@tryghost/shade';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useSubscriptionStats} from '@tryghost/admin-x-framework/api/stats';

type CadenceBreakdownProps = {
    isLoading: boolean;
};

type BreakdownType = 'billing-period' | 'tiers';

// Custom tooltip component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({active, payload}: {active?: boolean; payload?: any[]}) => {
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

const CadenceBreakdown: React.FC<CadenceBreakdownProps> = ({isLoading}) => {
    const {data: subscriptionStatsResponse} = useSubscriptionStats();
    const {data: {tiers: tierObjects = []} = {}} = useBrowseTiers();
    const [breakdownType, setBreakdownType] = useState<BreakdownType>('billing-period');

    // Use all active paid tiers from the tiers API (excluding Free tier)
    const availableTiers = useMemo(() => {
        return tierObjects
            .filter(tier => tier.type === 'paid' && tier.active)
            .map(tier => ({
                id: tier.id,
                name: tier.name
            }));
    }, [tierObjects]);

    // Process subscription data for billing period breakdown (cadence)
    const billingPeriodData = useMemo(() => {
        if (!subscriptionStatsResponse?.meta?.totals) {
            return [];
        }

        // Aggregate totals by cadence across ALL tiers
        const cadenceTotals = subscriptionStatsResponse.meta.totals.reduce((acc, item) => {
            const cadence = item.cadence;
            if (!acc[cadence]) {
                acc[cadence] = 0;
            }
            acc[cadence] += item.count;
            return acc;
        }, {} as Record<string, number>);

        // Convert to array format for pie chart
        const chartData = Object.entries(cadenceTotals).map(([cadence, count]) => {
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
            }

            return {
                name: label,
                count,
                fill: fillGradient,
                color: solidColor
            };
        });

        return chartData;
    }, [subscriptionStatsResponse]);

    // Process subscription data for tier breakdown
    const tierData = useMemo(() => {
        if (!subscriptionStatsResponse?.meta?.totals || availableTiers.length === 0) {
            return [];
        }

        // Aggregate totals by tier across ALL cadences
        const tierTotals = subscriptionStatsResponse.meta.totals.reduce((acc, item) => {
            const tierId = item.tier;
            if (!acc[tierId]) {
                acc[tierId] = 0;
            }
            acc[tierId] += item.count;
            return acc;
        }, {} as Record<string, number>);

        // Color palette for tiers
        const tierColors = [
            {gradient: 'url(#gradientPurple)', solid: 'hsl(var(--chart-purple))'},
            {gradient: 'url(#gradientTeal)', solid: 'hsl(var(--chart-teal))'},
            {gradient: 'url(#gradientRose)', solid: 'hsl(var(--chart-rose))'},
            {gradient: 'url(#gradientBlue)', solid: 'hsl(var(--chart-blue))'},
            {gradient: 'url(#gradientOrange)', solid: 'hsl(var(--chart-orange))'}
        ];

        // Create chart data for ALL available tiers, including those with 0 subscribers
        const chartData = availableTiers.map((tier, index) => {
            const colorIndex = index % tierColors.length;
            const count = tierTotals[tier.id] || 0;

            return {
                name: tier.name,
                count,
                fill: tierColors[colorIndex].gradient,
                color: tierColors[colorIndex].solid
            };
        });

        return chartData;
    }, [subscriptionStatsResponse, availableTiers]);

    // Get the active chart data based on breakdown type
    const chartData = breakdownType === 'billing-period' ? billingPeriodData : tierData;

    const totalSubscriptions = useMemo(() => {
        return chartData.reduce((acc, curr) => acc + curr.count, 0);
    }, [chartData]);

    const chartConfig = useMemo(() => {
        const config: ChartConfig = {
            count: {
                label: 'Subscriptions'
            }
        };

        chartData.forEach((item) => {
            config[item.name.toLowerCase()] = {
                label: item.name,
                color: item.color
            };
        });

        return config;
    }, [chartData]) satisfies ChartConfig;

    // Calculate percentages for legend
    const percentages = useMemo(() => {
        if (totalSubscriptions === 0) {
            return [];
        }

        return chartData.map((item) => {
            return {
                label: item.name,
                count: item.count,
                percentage: ((item.count / totalSubscriptions) * 100).toFixed(1),
                color: item.color
            };
        });
    }, [chartData, totalSubscriptions]);

    // Get dynamic labels based on breakdown type
    const cardTitle = breakdownType === 'billing-period' ? 'Subscription breakdown' : 'Tier breakdown';
    const cardDescription = breakdownType === 'billing-period' ? 'Paid members by billing period' : 'Paid members by tier';

    // Don't render if loading or no data at all
    if (isLoading || !subscriptionStatsResponse?.meta?.totals || subscriptionStatsResponse.meta.totals.length === 0) {
        return null;
    }

    // Check if we have data
    const hasData = chartData.length > 0 && totalSubscriptions > 0;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className='flex flex-col gap-y-1.5'>
                        <CardTitle>{cardTitle}</CardTitle>
                        <CardDescription>{cardDescription}</CardDescription>
                    </div>
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
                                                            {formatNumber(totalSubscriptions)}
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
                            <div className='mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground'>
                                {percentages.map(item => (
                                    <div key={item.label} className='flex items-center gap-2'>
                                        <span
                                            className='size-2 rounded-full opacity-50'
                                            style={{backgroundColor: item.color}}
                                        />
                                        <span className='max-w-[120px] truncate whitespace-nowrap' title={item.label}>{item.label}</span>
                                        <span className='font-medium text-foreground'>
                                            {item.percentage}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="py-12">
                        <EmptyIndicator
                            description="No active paid subscriptions available."
                            title="No paid subscriptions"
                        >
                            <LucideIcon.ChartPie strokeWidth={1.5} />
                        </EmptyIndicator>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default CadenceBreakdown;
