import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import DateRangeSelect from './components/DateRangeSelect';
import React, {useState} from 'react';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, H1, Recharts, Tabs, TabsList, ViewHeader, ViewHeaderActions, formatDisplayDate, formatDuration, formatNumber, formatPercentage} from '@tryghost/shade';
import {KpiTabTrigger, KpiTabValue} from './components/KpiTab';
// import {calculateYAxisWidth, getYTicks} from '@src/utils/chart-helpers';
// import {getPeriodText} from '@src/utils/chart-helpers';
// import {getStatEndpointUrl, getToken} from '@src/config/stats-config';
// import {useGlobalData} from '@src/providers/GlobalDataProvider';
// import {useQuery} from '@tinybirdco/charts';

const GrowthKPIs:React.FC = ({}) => {
    const [currentTab, setCurrentTab] = useState('free-members');

    const chartConfig = {
        value: {
            label: 'Total members' // currentMetric.label
        }
    } satisfies ChartConfig;

    const chartData = [{
        date: '2025-01-05'
    }];

    return (
        <Tabs defaultValue="total-members" variant='underline'>
            <TabsList className="grid grid-cols-4 gap-5">
                <KpiTabTrigger value="total-members" onClick={() => {
                    setCurrentTab('total-members');
                }}>
                    <KpiTabValue label="Total members" value={formatNumber(1504)} />
                </KpiTabTrigger>
                <KpiTabTrigger value="free-members" onClick={() => {
                    setCurrentTab('free-members');
                }}>
                    <KpiTabValue label="Free members" value={formatNumber(1246)} />
                </KpiTabTrigger>
                <KpiTabTrigger value="paid-members" onClick={() => {
                    setCurrentTab('paid-members');
                }}>
                    <KpiTabValue label="Paid members" value={formatNumber(258)} />
                </KpiTabTrigger>
                <KpiTabTrigger value="mrr" onClick={() => {
                    setCurrentTab('mrr');
                }}>
                    {/* TODO: Add formatCurrency helper */}
                    <KpiTabValue label="MRR" value={'$958'} />
                </KpiTabTrigger>
            </TabsList>
            <div>
                <ChartContainer className='-mb-3 h-[16vw] max-h-[320px] w-full' config={chartConfig}>
                    <Recharts.LineChart
                        data={chartData}
                        margin={{
                            left: 0,
                            right: 20,
                            top: 12
                        }}
                        accessibilityLayer
                    >
                        <Recharts.CartesianGrid horizontal={false} vertical={false} />
                        <Recharts.XAxis
                            axisLine={false}
                            dataKey="date"
                            interval={0}
                            tickFormatter={formatDisplayDate}
                            tickLine={false}
                            tickMargin={8}
                            ticks={chartData && chartData.length > 0 ? [chartData[0].date, chartData[chartData.length - 1].date] : []}
                        />
                        <Recharts.YAxis
                            axisLine={false}
                            tickFormatter={(value) => {
                                switch (currentTab) {
                                case 'bounce-rate':
                                    return formatPercentage(value);
                                case 'visit-duration':
                                    return formatDuration(value);
                                case 'visits':
                                case 'views':
                                    return formatNumber(value);
                                default:
                                    return value.toLocaleString();
                                }
                            }}
                            tickLine={false}
                            // ticks={getYTicks(chartData || [])}
                            // width={calculateYAxisWidth(getYTicks(chartData || []), currentMetric.formatter)}
                        />
                        <ChartTooltip
                            content={<CustomTooltipContent />}
                            cursor={true}
                        />
                        <Recharts.Line
                            dataKey="value"
                            dot={false}
                            isAnimationActive={false}
                            stroke="hsl(var(--chart-1))"
                            strokeWidth={2}
                            type='bump'
                        />
                    </Recharts.LineChart>
                </ChartContainer>
            </div>
        </Tabs>
    );
};

const Growth:React.FC = () => {
    // const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    // const {range, audience} = useGlobalData();
    // const {startDate, endDate, timezone} = getRangeDates(range);

    // const params = {
    //     site_uuid: statsConfig?.id || '',
    //     date_from: formatQueryDate(startDate),
    //     date_to: formatQueryDate(endDate),
    //     timezone: timezone,
    //     member_status: getAudienceQueryParam(audience)
    // };

    // const {data, loading} = useQuery({
    //     endpoint: getStatEndpointUrl(statsConfig, 'api_top_pages'),
    //     token: getToken(statsConfig),
    //     params
    // });

    // const isLoading = isConfigLoading || loading;

    return (
        <StatsLayout>
            <ViewHeader>
                <H1>Growth</H1>
                <ViewHeaderActions>
                    <DateRangeSelect />
                </ViewHeaderActions>
            </ViewHeader>
            <StatsView data={['a']} isLoading={false}>
                <Card variant='plain'>
                    <CardContent>
                        <GrowthKPIs />
                    </CardContent>
                </Card>
                <Card variant='plain'>
                    <CardHeader>
                        <CardTitle>Top performing posts</CardTitle>
                        <CardDescription>Which posts drove the most growth</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className='w-[80%]'>Content</TableHead>
                                    <TableHead className='w-[20%] text-right'>Visitors</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.map((row) => {
                                    return (
                                        <TableRow key={row.pathname}>
                                            <TableCell className="font-medium"><a className='-mx-2 inline-block px-2 hover:underline' href={`${row.pathname}`} rel="noreferrer" target='_blank'>{row.pathname}</a></TableCell>
                                            <TableCell className='text-right font-mono text-sm'>{formatNumber(Number(row.visits))}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table> */}
                        Table
                    </CardContent>
                </Card>
            </StatsView>
        </StatsLayout>
    );
};

export default Growth;
