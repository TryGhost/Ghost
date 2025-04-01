import React from 'react';
import {Card, CardContent, CardHeader, ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, Recharts, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade';
import {useQuery} from '@tinybirdco/charts';

interface KpiTabTriggerProps extends React.ComponentProps<typeof TabsTrigger> {
    children: React.ReactNode;
}

const KpiTabTrigger: React.FC<KpiTabTriggerProps> = ({children, ...props}) => {
    return (
        <TabsTrigger className='h-auto' {...props}>
            {children}
        </TabsTrigger>
    );
};

interface KpiTabValueProps {
    label: string;
    value: string | number;
}

const KpiTabValue: React.FC<KpiTabValueProps> = ({label, value}) => {
    return (
        <div className='flex w-full flex-col items-start'>
            <span className='text-lg'>{label}</span>
            <span className='text-[2.3rem] tracking-tighter'>{value}</span>
        </div>
    );
};

const Kpis:React.FC = () => {
    const params = {
        site_uuid: '',
        date_from: '2025-03-01',
        date_to: '2025-03-31'
        // ...additionalParams
    };

    const {data, loading} = useQuery({
        endpoint: 'https://api.tinybird.co/v0/pipes/api_kpis__v7.json',
        token: '',
        params
    });

    // const chartData = [
    //     {month: 'January', desktop: 186},
    //     {month: 'February', desktop: 305},
    //     {month: 'March', desktop: 237},
    //     {month: 'April', desktop: 73},
    //     {month: 'May', desktop: 209},
    //     {month: 'June', desktop: 214}
    // ];

    const chartData = data?.map(item => ({
        date: item.date,
        visits: item.visits
    }));

    const chartConfig = {
        visits: {
            label: 'Visits',
            color: 'hsl(var(--chart-1))'
        }
    } satisfies ChartConfig;

    // console.log('Transformed Data:', JSON.stringify(chartData, null, 2));

    return (
        <Card className='col-span-2'>
            <Tabs defaultValue="visits" variant='underline'>
                <CardHeader>
                    <TabsList className="grid w-full grid-cols-4">
                        <KpiTabTrigger value="visits">
                            <KpiTabValue label="Unique visits" value="1,783" />
                        </KpiTabTrigger>
                        <KpiTabTrigger value="views">
                            <KpiTabValue label="Pageviews" value="3,945" />
                        </KpiTabTrigger>
                        <KpiTabTrigger value="bounce-rate">
                            <KpiTabValue label="Bounce rate" value="25%" />
                        </KpiTabTrigger>
                        <KpiTabTrigger value="visit-duration">
                            <KpiTabValue label="Visit duration" value="4m 20s" />
                        </KpiTabTrigger>
                    </TabsList>
                </CardHeader>
                <CardContent className='min-h-[20vw]'>
                    <TabsContent value="visits">
                        {loading ? 'Loading' :
                            <ChartContainer className='max-h-[20vw] w-full' config={chartConfig}>
                                <Recharts.LineChart
                                    data={chartData}
                                    margin={{
                                        left: 12,
                                        right: 12
                                    }}
                                    accessibilityLayer
                                >
                                    <Recharts.CartesianGrid vertical={false} />
                                    <Recharts.XAxis
                                        axisLine={false}
                                        dataKey="date"
                                        // tickFormatter={value => value.slice(0, 3)}
                                        tickLine={false}
                                        tickMargin={8}
                                    />
                                    <ChartTooltip
                                        content={<ChartTooltipContent hideLabel />}
                                        cursor={false}
                                    />
                                    <Recharts.Line
                                        dataKey="visits"
                                        dot={false}
                                        stroke="var(--color-visits)"
                                        strokeWidth={2}
                                        type='linear'
                                    />
                                </Recharts.LineChart>
                            </ChartContainer>
                        }
                    </TabsContent>
                    <TabsContent value="views">
                        Pageviews chart
                    </TabsContent>
                    <TabsContent value="bounce-rate">
                        Bounce chart
                    </TabsContent>
                    <TabsContent value="visit-duration">
                        Visit duration chart
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
    );
};

export default Kpis;