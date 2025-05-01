import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import DateRangeSelect from './components/DateRangeSelect';
import React, {useMemo, useState} from 'react';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, H1, Recharts, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, ViewHeader, ViewHeaderActions, formatDisplayDate, formatNumber} from '@tryghost/shade';
import {KpiTabTrigger, KpiTabValue} from './components/KpiTab';
import {Navigate} from '@tryghost/admin-x-framework';
import {calculateYAxisWidth, getYTicks} from '@src/utils/chart-helpers';
import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useGrowthStats} from '@src/hooks/useGrowthStats';

const GrowthKPIs: React.FC = () => {
    const [currentTab, setCurrentTab] = useState('total-members');
    const {settings, range} = useGlobalData();
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');

    // Get growth stats from custom hook
    const {chartData: allChartData, totals} = useGrowthStats(range);
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
        case 'mrr':
            // For MRR we'd need actual MRR data, but we can simulate it based on paid members
            const avgMrrPerMember = 958 / paidMembers; // Estimate based on total MRR / total paid members
            return allChartData.map(item => ({
                ...item,
                value: item.paid * avgMrrPerMember,
                formattedValue: `$${(item.paid * avgMrrPerMember).toFixed(0)}`,
                label: 'MRR'
            }));
        case 'total-members':
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
                            type='bump'
                        />
                    </Recharts.LineChart>
                </ChartContainer>
            </div>
        </Tabs>
    );
};

const Growth: React.FC = () => {
    const {range} = useGlobalData();
    
    // Get stats from custom hook
    const {isLoading} = useGrowthStats(range);
    
    // TODO: Replace this with real top posts data from API
    const mockTopPosts = [
        {id: 'post-001', title: 'Minimal & Functional White Desk Setup in Italy', freeMembers: 17, paidMembers: 7, mrr: 8},
        {id: 'post-002', title: 'The Ultimate Guide to Productivity Hacks', freeMembers: 12, paidMembers: 5, mrr: 6},
        {id: 'post-003', title: 'Building a Sustainable Morning Routine', freeMembers: 9, paidMembers: 4, mrr: 5},
        {id: 'post-004', title: 'Digital Nomad Lifestyle: Tips and Tricks', freeMembers: 8, paidMembers: 3, mrr: 4},
        {id: 'post-005', title: 'Minimalist Wardrobe: A Complete Guide', freeMembers: 7, paidMembers: 2, mrr: 3},
        {id: 'post-006', title: 'The Science of Habit Formation', freeMembers: 6, paidMembers: 2, mrr: 3},
        {id: 'post-007', title: 'Remote Work: Setting Up Your Home Office', freeMembers: 5, paidMembers: 2, mrr: 2},
        {id: 'post-008', title: 'Mindfulness Meditation for Beginners', freeMembers: 4, paidMembers: 1, mrr: 2},
        {id: 'post-009', title: 'Sustainable Living: Small Changes, Big Impact', freeMembers: 3, paidMembers: 1, mrr: 1},
        {id: 'post-010', title: 'The Art of Decluttering Your Digital Life', freeMembers: 3, paidMembers: 1, mrr: 1},
        {id: 'post-011', title: 'Healthy Meal Prep: Time-Saving Tips', freeMembers: 2, paidMembers: 1, mrr: 1},
        {id: 'post-012', title: 'Financial Freedom: A Step-by-Step Guide', freeMembers: 2, paidMembers: 1, mrr: 1},
        {id: 'post-013', title: 'The Power of Journaling for Personal Growth', freeMembers: 2, paidMembers: 0, mrr: 0},
        {id: 'post-014', title: 'Creating a Productive Workspace on a Budget', freeMembers: 1, paidMembers: 0, mrr: 0},
        {id: 'post-015', title: 'Simple Ways to Reduce Your Carbon Footprint', freeMembers: 1, paidMembers: 0, mrr: 0}
    ];

    return (
        <StatsLayout>
            <ViewHeader>
                <H1>Growth</H1>
                <ViewHeaderActions>
                    <DateRangeSelect />
                </ViewHeaderActions>
            </ViewHeader>
            <StatsView data={['a']} isLoading={isLoading}>
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
                                {mockTopPosts.map(post => (
                                    <TableRow key={post.id}>
                                        <TableCell className="font-medium">{post.title}</TableCell>
                                        <TableCell className='text-right font-mono text-sm'>+{formatNumber(post.freeMembers)}</TableCell>
                                        <TableCell className='text-right font-mono text-sm'>+{formatNumber(post.paidMembers)}</TableCell>
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
