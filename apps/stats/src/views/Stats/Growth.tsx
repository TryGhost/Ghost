import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import DateRangeSelect from './components/DateRangeSelect';
import React, {useMemo, useState} from 'react';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import moment from 'moment';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, H1, Recharts, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, ViewHeader, ViewHeaderActions, formatDisplayDate, formatNumber} from '@tryghost/shade';
import {KpiTabTrigger, KpiTabValue} from './components/KpiTab';
import {MemberStatusItem, useMemberCountHistory} from '@tryghost/admin-x-framework/api/stats';
import {Navigate} from '@tryghost/admin-x-framework';
import {calculateYAxisWidth, getYTicks} from '@src/utils/chart-helpers';
import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

// Type for direction values
type DiffDirection = 'up' | 'down' | 'same';

// Helper function to convert range to date parameters
const getRangeDates = (rangeInDays: number) => {
    const endDate = moment().format('YYYY-MM-DD');
    let startDate;
    
    if (rangeInDays === 1) {
        // Today
        startDate = endDate;
    } else if (rangeInDays === 1000) {
        // All time - use a far past date
        startDate = '2010-01-01';
    } else {
        // Specific range
        startDate = moment().subtract(rangeInDays - 1, 'days').format('YYYY-MM-DD');
    }
    
    return {startDate, endDate};
};

// Extract the calculation to a separate function to avoid conditional hook calls
const calculateTotals = (memberData: MemberStatusItem[]) => {
    if (!memberData.length) {
        return {
            totalMembers: 0,
            freeMembers: 0,
            paidMembers: 0,
            percentChanges: {
                total: '0%',
                free: '0%',
                paid: '0%'
            },
            directions: {
                total: 'same' as DiffDirection,
                free: 'same' as DiffDirection,
                paid: 'same' as DiffDirection
            }
        };
    }
    
    // Get latest values
    const latest = memberData[memberData.length - 1];
    
    // Calculate total members
    const totalMembers = latest.free + latest.paid + latest.comped;
    
    // Calculate percentage changes if we have enough data
    const percentChanges = {
        total: '0%',
        free: '0%',
        paid: '0%'
    };
    
    const directions = {
        total: 'same' as DiffDirection,
        free: 'same' as DiffDirection,
        paid: 'same' as DiffDirection
    };
    
    if (memberData.length > 1) {
        // Get first day in range
        const first = memberData[0];
        const firstTotal = first.free + first.paid + first.comped;
        
        if (firstTotal > 0) {
            const totalChange = ((totalMembers - firstTotal) / firstTotal) * 100;
            percentChanges.total = `${Math.abs(totalChange).toFixed(1)}%`;
            directions.total = totalChange > 0 ? 'up' : totalChange < 0 ? 'down' : 'same';
        }
        
        if (first.free > 0) {
            const freeChange = ((latest.free - first.free) / first.free) * 100;
            percentChanges.free = `${Math.abs(freeChange).toFixed(1)}%`;
            directions.free = freeChange > 0 ? 'up' : freeChange < 0 ? 'down' : 'same';
        }
        
        if (first.paid > 0) {
            const paidChange = ((latest.paid - first.paid) / first.paid) * 100;
            percentChanges.paid = `${Math.abs(paidChange).toFixed(1)}%`;
            directions.paid = paidChange > 0 ? 'up' : paidChange < 0 ? 'down' : 'same';
        }
    }
    
    return {
        totalMembers,
        freeMembers: latest.free,
        paidMembers: latest.paid,
        percentChanges,
        directions
    };
};

// Format chart data outside component
const formatChartData = (memberData: MemberStatusItem[]) => {
    return memberData.map(item => ({
        date: item.date,
        value: item.free + item.paid + item.comped,
        formattedValue: formatNumber(item.free + item.paid + item.comped),
        label: 'Total members'
    }));
};

const GrowthKPIs:React.FC = () => {
    const [currentTab, setCurrentTab] = useState('free-members');
    const {settings, range} = useGlobalData();
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');

    // Get date range using useMemo to prevent unnecessary recalculations
    const {startDate, endDate} = useMemo(() => getRangeDates(range), [range]);

    // Fetch member count history from API
    const {data: memberCountResponse} = useMemberCountHistory({
        searchParams: {
            date_from: startDate,
            date_to: endDate
        }
    });
    
    // Wrap memberData in useMemo to maintain stable reference
    const memberData = useMemo(() => memberCountResponse?.data || [], [memberCountResponse?.data]);
    
    // Use useMemo to calculate totals
    const totalsData = useMemo(() => calculateTotals(memberData), [memberData]);
    
    // Destructure the totals
    const {
        totalMembers,
        freeMembers,
        paidMembers,
        percentChanges,
        directions
    } = totalsData;

    // Chart data
    const chartData = useMemo(() => formatChartData(memberData), [memberData]);

    if (!labs.trafficAnalyticsAlpha) {
        return <Navigate to='/' />;
    }

    const chartConfig = {
        value: {
            label: 'Total members'
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
                            ticks={chartData && chartData.length > 0 ? [chartData[0].date, chartData[chartData.length - 1].date] : []}
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
                                    return value;
                                default:
                                    return value.toLocaleString();
                                }
                            }}
                            tickLine={false}
                            ticks={getYTicks(chartData || [])}
                            width={calculateYAxisWidth(getYTicks(chartData || []), formatNumber)}
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
    const {range} = useGlobalData();
    // Use useMemo to prevent unnecessary recalculations
    const {startDate, endDate} = useMemo(() => getRangeDates(range), [range]);
    
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

    // Get member count data to determine if we're loading
    const {isLoading} = useMemberCountHistory({
        searchParams: {
            date_from: startDate,
            date_to: endDate
        }
    });

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
