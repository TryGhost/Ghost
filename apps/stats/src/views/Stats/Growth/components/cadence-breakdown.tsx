import React, {useMemo} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, Recharts, formatNumber} from '@tryghost/shade';
import {useSubscriptionStats} from '@tryghost/admin-x-framework/api/stats';

type CadenceBreakdownProps = {
    isLoading: boolean;
};

const CadenceBreakdown: React.FC<CadenceBreakdownProps> = ({isLoading}) => {
    const {data: subscriptionStatsResponse} = useSubscriptionStats();

    // Process subscription data to get cadence breakdown
    const cadenceData = useMemo(() => {
        if (!subscriptionStatsResponse?.meta?.totals) {
            return [];
        }

        // Aggregate totals by cadence across all tiers
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
            // Map cadence values to display labels
            let label = cadence;
            let fillColor = 'hsl(var(--chart-purple))';

            if (cadence === 'month') {
                label = 'Monthly';
                fillColor = 'hsl(var(--chart-purple))';
            } else if (cadence === 'year') {
                label = 'Annual';
                fillColor = 'hsl(var(--chart-teal))';
            }

            return {
                cadence: label,
                count,
                fill: fillColor
            };
        });

        return chartData;
    }, [subscriptionStatsResponse]);

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
                color: item.fill
            };
        });

        return config;
    }, [cadenceData]) satisfies ChartConfig;

    // Calculate percentages for legend
    const cadencePercentages = useMemo(() => {
        if (totalSubscriptions === 0) {
            return [];
        }

        return cadenceData.map(item => ({
            label: item.cadence,
            count: item.count,
            percentage: ((item.count / totalSubscriptions) * 100).toFixed(1),
            color: item.fill
        }));
    }, [cadenceData, totalSubscriptions]);

    // Don't render if loading or no data
    if (isLoading || cadenceData.length === 0 || totalSubscriptions === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Subscription breakdown</CardTitle>
                <CardDescription>Paid members by billing period</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer
                    className="mx-auto aspect-square h-[250px] min-h-[250px] w-full"
                    config={chartConfig}
                >
                    <Recharts.PieChart>
                        <ChartTooltip
                            content={<ChartTooltipContent hideLabel />}
                            cursor={false}
                        />
                        <Recharts.Pie
                            data={cadenceData}
                            dataKey="count"
                            innerRadius={60}
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
            </CardContent>
        </Card>
    );
};

export default CadenceBreakdown;
