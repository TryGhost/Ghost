import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, Label, Pie, PieChart, Separator} from '@tryghost/shade';
import React from 'react';
import {Metric, MetricLabel, MetricValue} from './Metric';

const Feedback = () => {
    const chartData = [
        {browser: 'chrome', visitors: 98, fill: 'var(--color-chrome)'},
        {browser: 'safari', visitors: 17, fill: 'var(--color-safari)'}
    ];
    const chartConfig = {
        visitors: {
            label: 'Reactions'
        },
        chrome: {
            label: 'More like this',
            color: 'hsl(var(--chart-1))'
        },
        safari: {
            label: 'Less like this',
            color: 'hsl(var(--chart-5))'
        }
    } satisfies ChartConfig;

    const totalVisitors = React.useMemo(() => {
        return chartData.reduce((acc, curr) => acc + curr.visitors, 0);
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Feedback</CardTitle>
                <CardDescription>17 reactions</CardDescription>
            </CardHeader>
            <CardContent>
                <Separator />
                <div className='grid grid-cols-2 gap-5 py-5'>
                    <Metric>
                        <MetricLabel>More like this</MetricLabel>
                        <MetricValue>98</MetricValue>
                    </Metric>

                    <Metric>
                        <MetricLabel>Less like this</MetricLabel>
                        <MetricValue>17</MetricValue>
                    </Metric>
                </div>
                <ChartContainer
                    className="mx-auto aspect-square h-[250px] min-h-[250px] w-full"
                    config={chartConfig}
                >
                    <PieChart>
                        <ChartTooltip
                            content={<ChartTooltipContent hideLabel />}
                            cursor={false}
                        />
                        <Pie
                            data={chartData}
                            dataKey="visitors"
                            innerRadius={60}
                            nameKey="browser"
                            strokeWidth={5}
                        >
                            <Label
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
                                                    {totalVisitors.toLocaleString()}
                                                </tspan>
                                                <tspan
                                                    className="fill-muted-foreground"
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 20}
                                                >
                                                        Reactions
                                                </tspan>
                                            </text>
                                        );
                                    }
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
            <CardFooter>
                <Button className='h-auto p-0' variant='link'>Details &rarr;</Button>
            </CardFooter>
        </Card>
    );
};

export default Feedback;