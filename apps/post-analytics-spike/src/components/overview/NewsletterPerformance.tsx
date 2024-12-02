import {Bar, BarChart, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CartesianGrid, ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, Separator, XAxis} from '@tryghost/shade';
import {Metric, MetricLabel, MetricPercentage, MetricValue} from './Metric';

const NewsletterPerformance = () => {
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
        <Card className='col-span-2'>
            <CardHeader>
                <CardTitle>Newsletter performance</CardTitle>
                <CardDescription><span className='inline-block rounded-md bg-green-100 px-1 py-0.5 text-xs font-medium text-green'>Sent</span> — September 19 2024</CardDescription>
            </CardHeader>
            <CardContent>
                <Separator />
                <div className='grid grid-cols-3 py-5'>
                    <Metric className='pl-6'>
                        <MetricLabel>Sent</MetricLabel>
                        <MetricValue>1,697</MetricValue>
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
                    <BarChart data={chartData} dataKey='metric' accessibilityLayer>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            axisLine={false}
                            dataKey="metric"
                            tickLine={false}
                            tickMargin={10}
                            hide
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="current" fill="var(--color-current)" radius={4} />
                        <Bar dataKey="avg" fill="var(--color-avg)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter>
                <Button className='h-auto p-0' variant='link'>Details &rarr;</Button>
            </CardFooter>
        </Card>
    );
};

export default NewsletterPerformance;