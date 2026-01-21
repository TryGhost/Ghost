import React, {useMemo, useState} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, EmptyIndicator, LucideIcon, Recharts, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, formatNumber} from '@tryghost/shade';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useSubscriptionStats} from '@tryghost/admin-x-framework/api/stats';

type CadenceBreakdownProps = {
    isLoading: boolean;
};

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
    const [selectedTier, setSelectedTier] = useState<string>('all');

    // Use all active paid tiers from the tiers API (excluding Free tier)
    const availableTiers = useMemo(() => {
        return tierObjects
            .filter(tier => tier.type === 'paid' && tier.active)
            .map(tier => ({
                id: tier.id,
                name: tier.name
            }));
    }, [tierObjects]);

    // Only show tier filter if there are multiple tiers
    const showTierFilter = availableTiers.length > 1;

    // Process subscription data to get cadence breakdown
    const cadenceData = useMemo(() => {
        if (!subscriptionStatsResponse?.meta?.totals) {
            return [];
        }

        // Filter totals by selected tier (if not 'all')
        const filteredTotals = selectedTier === 'all'
            ? subscriptionStatsResponse.meta.totals
            : subscriptionStatsResponse.meta.totals.filter(item => item.tier === selectedTier);

        // Aggregate totals by cadence
        const cadenceTotals = filteredTotals.reduce((acc, item) => {
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
                cadence: label,
                count,
                fill: fillGradient,
                color: solidColor
            };
        });

        return chartData;
    }, [subscriptionStatsResponse, selectedTier]);

    const totalSubscriptions = useMemo(() => {
        return cadenceData.reduce((acc, curr) => acc + curr.count, 0);
    }, [cadenceData]);

    const chartConfig = useMemo(() => {
        const config: ChartConfig = {
            count: {
                label: 'Subscriptions'
            }
        };

        cadenceData.forEach((item) => {
            config[item.cadence.toLowerCase()] = {
                label: item.cadence,
                color: item.color
            };
        });

        return config;
    }, [cadenceData]) satisfies ChartConfig;

    // Calculate percentages for legend
    const cadencePercentages = useMemo(() => {
        if (totalSubscriptions === 0) {
            return [];
        }

        return cadenceData.map((item) => {
            return {
                label: item.cadence,
                count: item.count,
                percentage: ((item.count / totalSubscriptions) * 100).toFixed(1),
                color: item.color
            };
        });
    }, [cadenceData, totalSubscriptions]);

    // Don't render if loading or no data at all
    if (isLoading || !subscriptionStatsResponse?.meta?.totals || subscriptionStatsResponse.meta.totals.length === 0) {
        return null;
    }

    // Check if we have data for the selected tier
    const hasDataForSelectedTier = cadenceData.length > 0 && totalSubscriptions > 0;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className='flex flex-col gap-y-1.5'>
                        <CardTitle>Subscription breakdown</CardTitle>
                        <CardDescription>Paid members by billing period</CardDescription>
                    </div>
                    {showTierFilter && (
                        <Select value={selectedTier} onValueChange={setSelectedTier}>
                            <SelectTrigger className="w-full max-w-[120px]">
                                <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All tiers</SelectItem>
                                {availableTiers.map((tier) => {
                                    return (
                                        <SelectItem key={tier.id} value={tier.id}>
                                            {tier.name}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {hasDataForSelectedTier ? (
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
                                </defs>
                                <ChartTooltip
                                    content={<CustomTooltip />}
                                    cursor={false}
                                />
                                <Recharts.Pie
                                    data={cadenceData}
                                    dataKey="count"
                                    innerRadius={70}
                                    nameKey="cadence"
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
                        {cadencePercentages.length > 0 && (
                            <div className='mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground'>
                                {cadencePercentages.map(item => (
                                    <div key={item.label} className='flex items-center gap-2'>
                                        <span
                                            className='size-2 rounded-full opacity-50'
                                            style={{backgroundColor: item.color}}
                                        />
                                        <span>{item.label}</span>
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
                            description="This tier has no active paid subscriptions."
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
