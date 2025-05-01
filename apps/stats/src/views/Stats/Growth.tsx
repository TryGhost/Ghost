import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import DateRangeSelect from './components/DateRangeSelect';
import React, {useMemo, useState} from 'react';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, H1, Recharts, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, ViewHeader, ViewHeaderActions, formatDisplayDate, formatNumber} from '@tryghost/shade';
import {DiffDirection, useGrowthStats} from '@src/hooks/useGrowthStats';
import {KpiTabTrigger, KpiTabValue} from './components/KpiTab';
import {Navigate} from '@tryghost/admin-x-framework';
import {calculateYAxisWidth, getYTicks} from '@src/utils/chart-helpers';
import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useTopPostsStatsWithRange} from '@src/hooks/useTopPostsStatsWithRange';

type ChartDataItem = {
    date: string;
    value: number;
    free: number;
    paid: number;
    comped: number;
    formattedValue: string;
    label?: string;
};

type Totals = {
    totalMembers: number;
    freeMembers: number;
    paidMembers: number;
    percentChanges: {
        total: string;
        free: string;
        paid: string;
    };
    directions: {
        total: DiffDirection;
        free: DiffDirection;
        paid: DiffDirection;
    };
};

const GrowthKPIs: React.FC<{
    chartData: ChartDataItem[];
    totals: Totals;
}> = ({chartData: allChartData, totals}) => {
    const [currentTab, setCurrentTab] = useState('total-members');
    const {settings} = useGlobalData();
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');

    const {totalMembers, freeMembers, paidMembers, percentChanges, directions} = totals;

    // Create chart data based on selected tab
    const chartData = useMemo(() => {
        if (!allChartData || allChartData.length === 0) {
            return [];
        }

        switch (currentTab) {
        case 'free-members':
            return allChartData.map(item => ({
                ...item,
                value: item.free,
                formattedValue: formatNumber(item.free),
                label: 'Free members'
            }));
        case 'paid-members':
            return allChartData.map(item => ({
                ...item,
                value: item.paid,
                formattedValue: formatNumber(item.paid),
                label: 'Paid members'
            }));
        case 'mrr': {
            // TODO: replace the hard-coded 958 once real MRR is available
            const avgMrrPerMember = paidMembers > 0 ? 958 / paidMembers : 0;
            return allChartData.map(item => ({
                ...item,
                value: item.paid * avgMrrPerMember,
                formattedValue: `$${(item.paid * avgMrrPerMember).toFixed(0)}`,
                label: 'MRR'
            }));
        }
        default:
            return allChartData;
        }
    }, [currentTab, allChartData, paidMembers]);

    if (!labs.trafficAnalyticsAlpha) {
        return <Navigate to='/' />;
    }

    const chartConfig = {
        value: {
            label: currentTab === 'mrr' ? 'MRR' : 'Members'
        }
    } satisfies ChartConfig;

    return (
        <Tabs defaultValue="total-members" variant='underline'>
            <TabsList className="grid grid-cols-4 gap-5">
                <KpiTabTrigger value="total-members" onClick={() => {
                    setCurrentTab('total-members');
                }}>
                    <KpiTabValue
                        diffDirection={directions.total}
                        diffValue={percentChanges.total}
                        label="Total members"
                        value={formatNumber(totalMembers)}
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="free-members" onClick={() => {
                    setCurrentTab('free-members');
                }}>
                    <KpiTabValue
                        diffDirection={directions.free}
                        diffValue={percentChanges.free}
                        label="Free members"
                        value={formatNumber(freeMembers)}
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="paid-members" onClick={() => {
                    setCurrentTab('paid-members');
                }}>
                    <KpiTabValue
                        diffDirection={directions.paid}
                        diffValue={percentChanges.paid}
                        label="Paid members"
                        value={formatNumber(paidMembers)}
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="mrr" onClick={() => {
                    setCurrentTab('mrr');
                }}>
                    {/* TODO: Add formatCurrency helper */}
                    <KpiTabValue diffDirection='same' diffValue={'$0'} label="MRR" value={'$958'} />
                </KpiTabTrigger>
            </TabsList>
            <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
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
                            ticks={chartData.length > 0 ? [chartData[0].date, chartData[chartData.length - 1].date] : []}
                        />
                        <Recharts.YAxis
                            axisLine={false}
                            domain={['dataMin', 'auto']}
                            tickFormatter={(value) => {
                                switch (currentTab) {
                                case 'total-members':
                                case 'free-members':
                                case 'paid-members':
                                    return formatNumber(value);
                                case 'mrr':
                                    return `$${value}`;
                                default:
                                    return value.toLocaleString();
                                }
                            }}
                            tickLine={false}
                            ticks={getYTicks(chartData)}
                            width={calculateYAxisWidth(getYTicks(chartData), formatNumber)}
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
                            type='monotone'
                        />
                    </Recharts.LineChart>
                </ChartContainer>
            </div>
        </Tabs>
    );
};

const Growth: React.FC = () => {
    const {range} = useGlobalData();

    // Get stats from custom hook once
    const {isLoading, chartData, totals} = useGrowthStats(range);

    const {data: topPostsData} = useTopPostsStatsWithRange(range, 'free_members desc');

    const topPosts = topPostsData?.stats || [];

    return (
        <StatsLayout>
            <ViewHeader>
                <H1>Growth</H1>
                <ViewHeaderActions>
                    <DateRangeSelect />
                </ViewHeaderActions>
            </ViewHeader>
            <StatsView data={chartData} isLoading={isLoading}>
                <Card variant='plain'>
                    <CardContent>
                        <GrowthKPIs chartData={chartData} totals={totals} />
                    </CardContent>
                </Card>
                <Card variant='plain'>
                    <CardHeader>
                        <CardTitle>Top performing posts</CardTitle>
                        <CardDescription>Which posts drove the most growth</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead className='w-[110px] text-right'>Free members</TableHead>
                                    <TableHead className='w-[110px] text-right'>Paid members</TableHead>
                                    <TableHead className='text-right'>MRR</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topPosts.map(post => (
                                    <TableRow key={post.post_id}>
                                        <TableCell className="font-medium">{post.title}</TableCell>
                                        <TableCell className='text-right font-mono text-sm'>+{formatNumber(post.free_members)}</TableCell>
                                        <TableCell className='text-right font-mono text-sm'>+{formatNumber(post.paid_members)}</TableCell>
                                        <TableCell className='text-right font-mono text-sm'>+${post.mrr}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </StatsView>
        </StatsLayout>
    );
};

export default Growth;
