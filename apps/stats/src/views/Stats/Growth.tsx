import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import DateRangeSelect from './components/DateRangeSelect';
import React, {useState} from 'react';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, H1, Recharts, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, ViewHeader, ViewHeaderActions, formatDisplayDate, formatDuration, formatNumber, formatPercentage} from '@tryghost/shade';
import {KpiTabTrigger, KpiTabValue} from './components/KpiTab';
import {Navigate} from '@tryghost/admin-x-framework';
import {calculateYAxisWidth, getYTicks} from '@src/utils/chart-helpers';
import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

const GrowthKPIs:React.FC = ({}) => {
    const [currentTab, setCurrentTab] = useState('free-members');
    const {settings} = useGlobalData();
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');

    if (!labs.trafficAnalyticsAlpha) {
        return <Navigate to='/' />;
    }

    const chartConfig = {
        value: {
            label: 'Total members'
        }
    } satisfies ChartConfig;

    const chartData = [
        {
            date: '2025-03-30',
            value: 0,
            formattedValue: '0',
            label: 'Total members'
        },
        {
            date: '2025-03-31',
            value: 0,
            formattedValue: '0',
            label: 'Total members'
        },
        {
            date: '2025-04-01',
            value: 0,
            formattedValue: '0',
            label: 'Total members'
        },
        {
            date: '2025-04-02',
            value: 0,
            formattedValue: '0',
            label: 'Total members'
        },
        {
            date: '2025-04-03',
            value: 15,
            formattedValue: '15',
            label: 'Total members'
        },
        {
            date: '2025-04-04',
            value: 5,
            formattedValue: '5',
            label: 'Total members'
        },
        {
            date: '2025-04-05',
            value: 8,
            formattedValue: '8',
            label: 'Total members'
        },
        {
            date: '2025-04-06',
            value: 0,
            formattedValue: '0',
            label: 'Total members'
        },
        {
            date: '2025-04-07',
            value: 7,
            formattedValue: '7',
            label: 'Total members'
        },
        {
            date: '2025-04-08',
            value: 4,
            formattedValue: '4',
            label: 'Total members'
        },
        {
            date: '2025-04-09',
            value: 4,
            formattedValue: '4',
            label: 'Total members'
        },
        {
            date: '2025-04-10',
            value: 1,
            formattedValue: '1',
            label: 'Total members'
        },
        {
            date: '2025-04-11',
            value: 0,
            formattedValue: '0',
            label: 'Total members'
        },
        {
            date: '2025-04-12',
            value: 0,
            formattedValue: '0',
            label: 'Total members'
        },
        {
            date: '2025-04-13',
            value: 0,
            formattedValue: '0',
            label: 'Total members'
        },
        {
            date: '2025-04-14',
            value: 0,
            formattedValue: '0',
            label: 'Total members'
        },
        {
            date: '2025-04-15',
            value: 0,
            formattedValue: '0',
            label: 'Total members'
        },
        {
            date: '2025-04-16',
            value: 0,
            formattedValue: '0',
            label: 'Total members'
        },
        {
            date: '2025-04-17',
            value: 8,
            formattedValue: '8',
            label: 'Total members'
        },
        {
            date: '2025-04-18',
            value: 2,
            formattedValue: '2',
            label: 'Total members'
        },
        {
            date: '2025-04-19',
            value: 3,
            formattedValue: '3',
            label: 'Total members'
        },
        {
            date: '2025-04-20',
            value: 2,
            formattedValue: '2',
            label: 'Total members'
        },
        {
            date: '2025-04-21',
            value: 5,
            formattedValue: '5',
            label: 'Total members'
        },
        {
            date: '2025-04-22',
            value: 5,
            formattedValue: '5',
            label: 'Total members'
        },
        {
            date: '2025-04-23',
            value: 4,
            formattedValue: '4',
            label: 'Total members'
        },
        {
            date: '2025-04-24',
            value: 6,
            formattedValue: '6',
            label: 'Total members'
        },
        {
            date: '2025-04-25',
            value: 1,
            formattedValue: '1',
            label: 'Total members'
        },
        {
            date: '2025-04-26',
            value: 0,
            formattedValue: '0',
            label: 'Total members'
        },
        {
            date: '2025-04-27',
            value: 3,
            formattedValue: '3',
            label: 'Total members'
        },
        {
            date: '2025-04-28',
            value: 14,
            formattedValue: '14',
            label: 'Total members'
        },
        {
            date: '2025-04-29',
            value: 10,
            formattedValue: '10',
            label: 'Total members'
        }
    ];

    return (
        <Tabs defaultValue="total-members" variant='underline'>
            <TabsList className="grid grid-cols-4 gap-5">
                <KpiTabTrigger value="total-members" onClick={() => {
                    setCurrentTab('total-members');
                }}>
                    <KpiTabValue diffDirection='up' diffValue={'+3%'} label="Total members" value={formatNumber(1504)} />
                </KpiTabTrigger>
                <KpiTabTrigger value="free-members" onClick={() => {
                    setCurrentTab('free-members');
                }}>
                    <KpiTabValue diffDirection='down' diffValue={'-1.2%'} label="Free members" value={formatNumber(1246)} />
                </KpiTabTrigger>
                <KpiTabTrigger value="paid-members" onClick={() => {
                    setCurrentTab('paid-members');
                }}>
                    <KpiTabValue diffDirection='up' diffValue={'-1.3%'} label="Paid members" value={formatNumber(258)} />
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
    // const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    // const {startDate, endDate, timezone} = getRangeDates(range);

    // const isLoading = isConfigLoading || loading;

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
