import * as React from 'react';
import {Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, Recharts, Separator} from '@tryghost/shade';
import {Metric, MetricLabel, MetricPercentage, MetricValue} from './Metric';

interface NewsletterPerformanceProps extends React.ComponentProps<typeof Card> {};

const NewsletterPerformance: React.FC<NewsletterPerformanceProps> = (props) => {
    const chartData = [
        {metric: 'Sent', current: 1697, avg: 1524},
        {metric: 'Opened', current: 1184, avg: 867},
        {metric: 'Clicked', current: 750, avg: 478}
    ];

    const chartConfig = {
        current: {
            label: 'This post',
            color: 'hsl(var(--chart-1))'
        },
        avg: {
            label: 'Your average post',
            color: 'hsl(var(--chart-5))'
        }
    } satisfies ChartConfig;

    return (
        <Card {...props}>
            <CardHeader>
                <CardTitle>Newsletter performance</CardTitle>
                <CardDescription>
                    <Badge variant='success'>Sent</Badge> 19 Sept 2024
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Separator />
                <div className='grid grid-cols-3 py-5'>
                    <Metric className='pl-6'>
                        <MetricLabel>Sent</MetricLabel>
                        <MetricValue>1,697 <MetricPercentage>100%</MetricPercentage></MetricValue>
                    </Metric>

                    <Metric className='pl-6'>
                        <MetricLabel>Opened</MetricLabel>
                        <MetricValue>1,184 <MetricPercentage>69%</MetricPercentage></MetricValue>
                    </Metric>

                    <Metric className='pl-6'>
                        <MetricLabel>Clicked</MetricLabel>
                        <MetricValue>750 <MetricPercentage>44%</MetricPercentage></MetricValue>
                    </Metric>
                </div>
                <ChartContainer className='-mx-1 aspect-auto h-[250px] min-h-[250px] w-[calc(100%+8px)]' config={chartConfig}>
                    <Recharts.BarChart data={chartData} dataKey='metric' accessibilityLayer>
                        <Recharts.CartesianGrid vertical={false} />
                        <Recharts.XAxis
                            axisLine={false}
                            dataKey="metric"
                            tickLine={false}
                            tickMargin={10}
                            hide
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Recharts.Bar dataKey="current" fill="var(--color-current)" radius={4} />
                        <Recharts.Bar dataKey="avg" fill="var(--color-avg)" radius={4} />
                    </Recharts.BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
};

export default NewsletterPerformance;
