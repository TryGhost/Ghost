import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import DateRangeSelect from './components/DateRangeSelect';
import PostMenu from './components/PostMenu';
import React, {useMemo, useState} from 'react';
import SortButton from './components/SortButton';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, H1, KpiTabTrigger, KpiTabValue, Recharts, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, ViewHeader, ViewHeaderActions, formatDisplayDate, formatNumber} from '@tryghost/shade';
import {DiffDirection, useGrowthStats} from '@src/hooks/useGrowthStats';
import {calculateYAxisWidth, getPeriodText, getYRange, getYTicks, sanitizeChartData} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useTopPostsStatsWithRange} from '@src/hooks/useTopPostsStatsWithRange';

// TODO: Move to @tryghost/shade
const centsToDollars = (value: number) => {
    return Math.round(value / 100);
};

type TopPostsOrder = 'free_members desc' | 'paid_members desc' | 'mrr desc';

type ChartDataItem = {
    date: string;
    value: number;
    free: number;
    paid: number;
    comped: number;
    mrr: number;
    formattedValue: string;
    label?: string;
};

type Totals = {
    totalMembers: number;
    freeMembers: number;
    paidMembers: number;
    mrr: number;
    percentChanges: {
        total: string;
        free: string;
        paid: string;
        mrr: string;
    };
    directions: {
        total: DiffDirection;
        free: DiffDirection;
        paid: DiffDirection;
        mrr: DiffDirection;
    };
};

const GrowthKPIs: React.FC<{
    chartData: ChartDataItem[];
    totals: Totals;
}> = ({chartData: allChartData, totals}) => {
    const [currentTab, setCurrentTab] = useState('total-members');
    const {range} = useGlobalData();

    const {totalMembers, freeMembers, paidMembers, mrr, percentChanges, directions} = totals;

    // Create chart data based on selected tab
    const chartData = useMemo(() => {
        if (!allChartData || allChartData.length === 0) {
            return [];
        }

        // First sanitize the data based on the selected field
        let sanitizedData: ChartDataItem[] = [];
        let fieldName: keyof ChartDataItem = 'value';

        switch (currentTab) {
        case 'free-members':
            fieldName = 'free';
            break;
        case 'paid-members':
            fieldName = 'paid';
            break;
        case 'mrr': {
            fieldName = 'mrr';
            break;
        }
        default:
            fieldName = 'value';
        }

        sanitizedData = sanitizeChartData(allChartData, range, fieldName, 'exact');

        // Then map the sanitized data to the final format
        let processedData: ChartDataItem[] = [];

        switch (currentTab) {
        case 'free-members':
            processedData = sanitizedData.map(item => ({
                ...item,
                value: item.free,
                formattedValue: formatNumber(item.free),
                label: 'Free members'
            }));
            break;
        case 'paid-members':
            processedData = sanitizedData.map(item => ({
                ...item,
                value: item.paid,
                formattedValue: formatNumber(item.paid),
                label: 'Paid members'
            }));
            break;
        case 'mrr':
            processedData = sanitizedData.map(item => ({
                ...item,
                value: centsToDollars(item.mrr),
                formattedValue: `$${formatNumber(centsToDollars(item.mrr))}`,
                label: 'MRR'
            }));
            break;
        default:
            processedData = sanitizedData.map(item => ({
                ...item,
                value: item.free + item.paid + item.comped,
                formattedValue: formatNumber(item.free + item.paid + item.comped),
                label: 'Total members'
            }));
        }

        return processedData;
    }, [currentTab, allChartData, range]);

    const chartConfig = {
        value: {
            label: currentTab === 'mrr' ? 'MRR' : 'Members'
        }
    } satisfies ChartConfig;

    return (
        <Tabs defaultValue="total-members" variant='kpis'>
            <TabsList className="-mx-6 grid grid-cols-4">
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
                    <KpiTabValue
                        diffDirection={directions.mrr}
                        diffValue={percentChanges.mrr}
                        label="MRR"
                        value={`$${formatNumber(centsToDollars(mrr))}`}
                    />
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
                            axisLine={{stroke: 'hsl(var(--border))', strokeWidth: 1}}
                            dataKey="date"
                            interval={0}
                            stroke="hsl(var(--gray-300))"
                            tickFormatter={formatDisplayDate}
                            tickLine={false}
                            tickMargin={8}
                            ticks={chartData.length > 0 ? [chartData[0].date, chartData[chartData.length - 1].date] : []}
                        />
                        <Recharts.YAxis
                            axisLine={false}
                            domain={[getYRange(chartData).min, getYRange(chartData).max]}
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
                            width={calculateYAxisWidth(getYTicks(chartData), (value) => {
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
                            })}
                        />
                        <ChartTooltip
                            content={<CustomTooltipContent range={range} />}
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
    const [sortBy, setSortBy] = useState<TopPostsOrder>('free_members desc');
    const navigate = useNavigate();

    // Get stats from custom hook once
    const {isLoading, chartData, totals} = useGrowthStats(range);

    const {data: topPostsData} = useTopPostsStatsWithRange(range, sortBy);

    const topPosts = topPostsData?.stats || [];

    return (
        <StatsLayout>
            <ViewHeader className='before:hidden'>
                <H1>Growth</H1>
                <ViewHeaderActions>
                    <DateRangeSelect />
                </ViewHeaderActions>
            </ViewHeader>
            <StatsView data={chartData} isLoading={isLoading}>
                <Card>
                    <CardContent>
                        <GrowthKPIs chartData={chartData} totals={totals} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top performing posts</CardTitle>
                        <CardDescription>Which posts drove the most growth {getPeriodText(range)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Separator/>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        Title
                                    </TableHead>
                                    <TableHead className='text-right'>
                                        <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='free_members desc'>
                                            Free members
                                        </SortButton>
                                    </TableHead>
                                    <TableHead className='text-right'>
                                        <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='paid_members desc'>
                                            Paid members
                                        </SortButton>
                                    </TableHead>
                                    <TableHead className='text-right'>
                                        <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='mrr desc'>
                                            MRR
                                        </SortButton>
                                    </TableHead>
                                    <TableHead className='w-[32px] text-right'></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topPosts.map(post => (
                                    <TableRow key={post.post_id}>
                                        <TableCell className="font-medium">
                                            <div className='group/link inline-flex items-center gap-2'>
                                                {post.post_id ?
                                                    <Button className='h-auto whitespace-normal p-0 text-left hover:!underline' title="View post analytics" variant='link' onClick={() => {
                                                        navigate(`/posts/analytics/${post.post_id}`, {crossApp: true});
                                                    }}>
                                                        {post.title}
                                                    </Button>
                                                    :
                                                    <>
                                                        {post.title}
                                                    </>
                                                }
                                                {/* <a className='-mx-2 inline-flex min-h-6 items-center gap-1 rounded-sm px-2 opacity-0 hover:underline group-hover/link:opacity-75' href={`${row.pathname}`} rel="noreferrer" target='_blank'>
                                                    <LucideIcon.SquareArrowOutUpRight size={12} strokeWidth={2.5} />
                                                </a> */}
                                            </div>
                                        </TableCell>
                                        <TableCell className={`text-right font-mono text-sm ${post.free_members === 0 && 'text-gray-700'}`}>
                                            {(post.free_members > 0 && '+')}{formatNumber(post.free_members)}
                                        </TableCell>
                                        <TableCell className={`text-right font-mono text-sm ${post.paid_members === 0 && 'text-gray-700'}`}>
                                            {(post.paid_members > 0 && '+')}{formatNumber(post.paid_members)}
                                        </TableCell>
                                        <TableCell className={`text-right font-mono text-sm ${post.mrr === 0 && 'text-gray-700'}`}>
                                            {/* TODO: Update to use actual currency */}
                                            {(post.mrr > 0 && '+')}${(post.mrr / 100).toFixed(0)}
                                        </TableCell>
                                        <TableCell className='text-right text-gray-700 hover:text-black'>
                                            <PostMenu pathName='' postId={post.post_id} />
                                        </TableCell>
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
