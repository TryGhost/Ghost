import AudienceSelect from './components/AudienceSelect';
import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import DateRangeSelect from './components/DateRangeSelect';
import React, {useMemo, useState} from 'react';
import SortButton from './components/SortButton';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, H1, KpiTabTrigger, KpiTabValue, Recharts, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, ViewHeader, ViewHeaderActions, formatDisplayDate, formatNumber, formatPercentage} from '@tryghost/shade';
import {Navigate, useNavigate} from '@tryghost/admin-x-framework';
import {calculateYAxisWidth, getYRange, getYTicks, sanitizeChartData} from '@src/utils/chart-helpers';
import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

type TopNewslettersOrder = 'date desc' | 'open_rate desc' | 'click_rate desc';

type Totals = {
    totalSubscribers: number;
    avgOpenRate: number;
    avgClickRate: number;
};

type SubscribersDataItem = {
    date: string;
    value: number;
}

type AvgsDataItem = {
    post_id: string;
    post_title: string;
    send_date: Date;
    sent_to: number;
    total_opens: number;
    open_rate: number;
    total_clicks: number;
    click_rate: number;
};

interface BarTooltipPayload {
    value: number;
    payload: AvgsDataItem;
}

interface BarTooltipProps {
    active?: boolean;
    payload?: BarTooltipPayload[];
    range?: number;
}

const BarTooltipContent = ({active, payload}: BarTooltipProps) => {
    if (!active || !payload?.length) {
        return null;
    }

    const currentItem = payload[0].payload;

    return (
        <div className="min-w-[220px] max-w-[240px] rounded-lg border bg-background px-3 py-2 shadow-lg">
            <div className='mb-2 flex w-full flex-col border-b pb-2'>
                <span className='text-sm font-semibold leading-tight'>{currentItem.post_title}</span>
                <span className='text-sm text-muted-foreground'>Sent on {formatDisplayDate(currentItem.send_date)}</span>
            </div>

            <div className='mb-1 flex w-full justify-between'>
                <span className='font-medium text-muted-foreground'>Sent</span>
                <div className='ml-2 w-full text-right font-mono'>{formatNumber(currentItem.sent_to)}</div>
            </div>

            <div className='mb-1 flex w-full justify-between'>
                <span className='font-medium text-muted-foreground'>Opens</span>
                <div className='ml-2 w-full text-right font-mono'>
                    <span className='text-muted-foreground'>{formatNumber(currentItem.total_opens)} / </span>
                    {formatPercentage(currentItem.open_rate)}
                </div>
            </div>

            <div className='mb-1 flex w-full justify-between'>
                <span className='font-medium text-muted-foreground'>Clicks</span>
                <div className='ml-2 w-full text-right font-mono'>
                    <span className='text-muted-foreground'>{formatNumber(currentItem.total_clicks)} / </span>
                    {formatPercentage(currentItem.click_rate)}
                </div>
            </div>
        </div>
    );
};

const getBarColor = (value: number) => {
    let opacity;
    if (value <= 0.25) {
        opacity = 0.6;
    } else if (value >= 0.75) {
        opacity = 1.0;
    } else {
        // Interpolate between 0.6 and 1.0 for values between 0.25 and 0.75
        opacity = 0.6 + ((value - 0.25) * (0.4 / 0.5));
    }
    return `hsl(var(--chart-1) / ${opacity})`;
};

const NewsletterKPIs: React.FC<{
    subscribersData: SubscribersDataItem[]
    avgsData: AvgsDataItem[];
    totals: Totals;
}> = ({
    subscribersData: allSubscribersData,
    avgsData,
    totals
}) => {
    const [currentTab, setCurrentTab] = useState('total-subscribers');
    const {range} = useGlobalData();

    const {totalSubscribers, avgOpenRate, avgClickRate} = totals;

    // Sanitize subscribers data
    const subscribersData = useMemo(() => {
        if (!allSubscribersData || allSubscribersData.length === 0) {
            return [];
        }

        let sanitizedData: SubscribersDataItem[] = [];

        // Then map the sanitized data to the final format
        sanitizedData = sanitizeChartData(allSubscribersData, range, 'value', 'exact');

        const processedData = sanitizedData.map(item => ({
            ...item,
            value: item.value,
            formattedValue: formatNumber(item.value),
            label: 'Subscribers'
        }));

        return processedData;
    }, [allSubscribersData, range]);

    const subscribersChartConfig = {
        value: {
            label: 'Newsletter subscribers'
        }
    } satisfies ChartConfig;

    const barChartConfig = {
        open_rate: {
            label: 'Open rate'
        }
    } satisfies ChartConfig;

    const barDomain = [0, 1];
    const barTicks = [0, 0.25, 0.5, 0.75, 1];

    return (
        <Tabs defaultValue="total-subscribers" variant='kpis'>
            <TabsList className="-mx-6 grid grid-cols-3">
                <KpiTabTrigger value="total-subscribers" onClick={() => {
                    setCurrentTab('total-subscribers');
                }}>
                    <KpiTabValue
                        label="Total subscribers"
                        value={formatNumber(totalSubscribers)}
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="avg-open-rate" onClick={() => {
                    setCurrentTab('avg-open-rate');
                }}>
                    <KpiTabValue
                        label="Avg. open rate"
                        value={formatPercentage(avgOpenRate)}
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="avg-click-rate" onClick={() => {
                    setCurrentTab('avg-click-rate');
                }}>
                    <KpiTabValue
                        label="Avg. click rate"
                        value={formatPercentage(avgClickRate)}
                    />
                </KpiTabTrigger>
            </TabsList>
            <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
                {currentTab === 'total-subscribers' &&
                <ChartContainer className='-mb-3 h-[16vw] max-h-[320px] w-full' config={subscribersChartConfig}>
                    <Recharts.LineChart
                        data={subscribersData}
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
                            ticks={subscribersData.length > 0 ? [subscribersData[0].date, subscribersData[subscribersData.length - 1].date] : []}
                        />
                        <Recharts.YAxis
                            axisLine={false}
                            domain={[getYRange(subscribersData).min, getYRange(subscribersData).max]}
                            tickFormatter={value => formatNumber(value)}
                            tickLine={false}
                            ticks={getYTicks(subscribersData)}
                            width={calculateYAxisWidth(getYTicks(subscribersData), value => formatNumber(value))}
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
                }

                {(currentTab === 'avg-open-rate' || currentTab === 'avg-click-rate') &&
                <>
                    <ChartContainer className='max-h-[320px] w-full' config={barChartConfig}>
                        <Recharts.BarChart data={avgsData} accessibilityLayer>
                            <Recharts.CartesianGrid vertical={false} />
                            <Recharts.YAxis
                                axisLine={false}
                                domain={barDomain}
                                tickFormatter={value => formatPercentage(value)}
                                tickLine={false}
                                ticks={barTicks}
                                width={calculateYAxisWidth(barTicks, value => formatPercentage(value))}
                            />
                            <Recharts.XAxis
                                axisLine={false}
                                dataKey="post_id"
                                tickFormatter={() => ('')}
                                tickLine={false}
                                tickMargin={10}
                            />
                            <ChartTooltip
                                content={<BarTooltipContent />}
                                cursor={false}
                            />
                            <Recharts.Bar
                                dataKey={currentTab === 'avg-open-rate' ? 'open_rate' : 'click_rate'}
                                fill="hsl(var(--chart-1))"
                                isAnimationActive={false}
                                maxBarSize={32}
                                radius={0}>
                                {avgsData.map(entry => (
                                    <Recharts.Cell
                                        key={`cell-${entry.post_id}`}
                                        fill={getBarColor(entry[currentTab === 'avg-open-rate' ? 'open_rate' : 'click_rate'])}
                                    />
                                ))}
                            </Recharts.Bar>
                        </Recharts.BarChart>
                    </ChartContainer>
                    <div className='-mt-6 text-center text-sm text-muted-foreground'>
                        Newsletters {currentTab === 'avg-open-rate' ? 'opens' : 'clicks'} in this period
                    </div>
                </>
                }
            </div>
        </Tabs>
    );
};

const Newsletters: React.FC = () => {
    // const {range} = useGlobalData();
    const [sortBy, setSortBy] = useState<TopNewslettersOrder>('date desc');
    const navigate = useNavigate();
    const {settings} = useGlobalData();
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');

    // Get stats from custom hook once
    // const {isLoading, chartData, totals} = useGrowthStats(range);
    // const {data: topPostsData} = useTopPostsStatsWithRange(range, sortBy);
    // const topPosts = topPostsData?.stats || [];

    const isLoading = false;

    // Mock data
    const totals = {
        totalSubscribers: 20800,
        avgOpenRate: 0.74,
        avgClickRate: 0.36
    };

    const mockSubscribers:SubscribersDataItem[] = [
        {date: '2025-04-01', value: 15000},
        {date: '2025-04-02', value: 15150},
        {date: '2025-04-03', value: 15280},
        {date: '2025-04-04', value: 15420},
        {date: '2025-04-05', value: 15550},
        {date: '2025-04-06', value: 15700},
        {date: '2025-04-07', value: 15830},
        {date: '2025-04-08', value: 15990},
        {date: '2025-04-09', value: 16140},
        {date: '2025-04-10', value: 16280},
        {date: '2025-04-11', value: 16450},
        {date: '2025-04-12', value: 16620},
        {date: '2025-04-13', value: 16790},
        {date: '2025-04-14', value: 16940},
        {date: '2025-04-15', value: 17100},
        {date: '2025-04-16', value: 17260},
        {date: '2025-04-17', value: 17430},
        {date: '2025-04-18', value: 17590},
        {date: '2025-04-19', value: 17750},
        {date: '2025-04-20', value: 17920},
        {date: '2025-04-21', value: 18080},
        {date: '2025-04-22', value: 18240},
        {date: '2025-04-23', value: 18410},
        {date: '2025-04-24', value: 18570},
        {date: '2025-04-25', value: 18730},
        {date: '2025-04-26', value: 18900},
        {date: '2025-04-27', value: 19060},
        {date: '2025-04-28', value: 19220},
        {date: '2025-04-29', value: 19390},
        {date: '2025-04-30', value: 19550}
    ];

    const mockAvgsData: AvgsDataItem[] = [
        {post_id: '1', post_title: 'Weekly tech digest with an extra long title that should wrap in two lines', send_date: new Date('2025-04-11'), sent_to: 20800, total_opens: 17680, total_clicks: 8320, open_rate: 0.73, click_rate: 0.37},
        {post_id: '2', post_title: 'Product Updates', send_date: new Date('2025-04-12'), sent_to: 20600, total_opens: 16480, total_clicks: 8240, open_rate: 0.78, click_rate: 0.43},
        // {post_id: '3', post_title: 'Community Spotlight', send_date: new Date('2025-04-13'), sent_to: 20400, total_opens: 14280, total_clicks: 8160, open_rate: 0.49, click_rate: 0.41},
        // {post_id: '4', post_title: 'Industry News', send_date: new Date('2025-04-14'), sent_to: 20200, total_opens: 12120, total_clicks: 8080, open_rate: 0.64, click_rate: 0.4},
        {post_id: '5', post_title: 'Feature Announcement', send_date: new Date('2025-04-15'), sent_to: 20000, total_opens: 10000, total_clicks: 8000, open_rate: 0.5, click_rate: 0.32},
        {post_id: '6', post_title: 'Monthly Roundup', send_date: new Date('2025-04-16'), sent_to: 19800, total_opens: 12870, total_clicks: 5940, open_rate: 0.76, click_rate: 0.16},
        {post_id: '7', post_title: 'User Success Stories', send_date: new Date('2025-04-17'), sent_to: 19600, total_opens: 11760, total_clicks: 3920, open_rate: 0.39, click_rate: 0.21},
        // {post_id: '8', post_title: 'Tips & Tricks', send_date: new Date('2025-04-18'), sent_to: 19400, total_opens: 10670, total_clicks: 2910, open_rate: 0.52, click_rate: 0.15},
        {post_id: '9', post_title: 'Platform Updates', send_date: new Date('2025-04-19'), sent_to: 19200, total_opens: 9600, total_clicks: 4800, open_rate: 0.48, click_rate: 0.25},
        {post_id: '10', post_title: 'New Features Guide', send_date: new Date('2025-04-20'), sent_to: 19000, total_opens: 8550, total_clicks: 4275, open_rate: 0.43, click_rate: 0.225},
        // {post_id: '11', post_title: 'Community News', send_date: new Date('2025-04-21'), sent_to: 18800, total_opens: 7520, total_clicks: 3760, open_rate: 0.38, click_rate: 0.20},
        {post_id: '12', post_title: 'Product Roadmap', send_date: new Date('2025-04-22'), sent_to: 18600, total_opens: 8370, total_clicks: 4185, open_rate: 0.45, click_rate: 0.225},
        // {post_id: '13', post_title: 'User Feedback', send_date: new Date('2025-04-23'), sent_to: 18400, total_opens: 7360, total_clicks: 3680, open_rate: 0.42, click_rate: 0.20},
        // {post_id: '14', post_title: 'Platform Tips', send_date: new Date('2025-04-24'), sent_to: 18200, total_opens: 8190, total_clicks: 4095, open_rate: 0.41, click_rate: 0.225},
        {post_id: '15', post_title: 'Feature Deep Dive', send_date: new Date('2025-04-25'), sent_to: 18000, total_opens: 7200, total_clicks: 3600, open_rate: 0.40, click_rate: 0.20},
        // {post_id: '16', post_title: 'Community Updates', send_date: new Date('2025-04-26'), sent_to: 17800, total_opens: 8010, total_clicks: 4005, open_rate: 0.45, click_rate: 0.225},
        {post_id: '17', post_title: 'Product News', send_date: new Date('2025-04-27'), sent_to: 17600, total_opens: 7040, total_clicks: 3520, open_rate: 0.44, click_rate: 0.20},
        {post_id: '18', post_title: 'User Guide', send_date: new Date('2025-04-28'), sent_to: 17400, total_opens: 7830, total_clicks: 3915, open_rate: 0.41, click_rate: 0.225}
        // {post_id: '19', post_title: 'Platform News', send_date: new Date('2025-04-29'), sent_to: 17200, total_opens: 6880, total_clicks: 3440, open_rate: 0.37, click_rate: 0.20},
        // {post_id: '20', post_title: 'Feature Updates', send_date: new Date('2025-04-30'), sent_to: 17000, total_opens: 7650, total_clicks: 3825, open_rate: 0.45, click_rate: 0.225}
    ];

    if (!labs.trafficAnalyticsAlpha) {
        return <Navigate to='/web/' />;
    }

    return (
        <StatsLayout>
            <ViewHeader className='before:hidden'>
                <H1>Newsletters</H1>
                <ViewHeaderActions>
                    <AudienceSelect />
                    <DateRangeSelect />
                </ViewHeaderActions>
            </ViewHeader>
            <StatsView data={mockSubscribers} isLoading={isLoading}>
                <Card>
                    <CardContent>
                        <NewsletterKPIs avgsData={mockAvgsData} subscribersData={mockSubscribers} totals={totals} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top newsletters</CardTitle>
                        <CardDescription>Which newsletters performed best in this period</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Separator/>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        Title
                                    </TableHead>
                                    <TableHead>
                                        <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='date desc'>
                                            Date
                                        </SortButton>
                                    </TableHead>
                                    <TableHead className='w-[10%] text-right'>
                                        <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='open_rate desc'>
                                            Open rate
                                        </SortButton>
                                    </TableHead>
                                    <TableHead className='w-[10%] text-right'>
                                        <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='click_rate desc'>
                                            Clicks
                                        </SortButton>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mockAvgsData.map(post => (
                                    <TableRow key={post.post_id}>
                                        <TableCell className="font-medium">
                                            <div className='group/link inline-flex items-center gap-2'>
                                                {post.post_id ?
                                                    <Button className='h-auto whitespace-normal p-0 text-left hover:!underline' title="View post analytics" variant='link' onClick={() => {
                                                        navigate(`/posts/analytics/${post.post_id}`, {crossApp: true});
                                                    }}>
                                                        {post.post_title}
                                                    </Button>
                                                    :
                                                    <>
                                                        {post.post_title}
                                                    </>
                                                }
                                            </div>
                                        </TableCell>
                                        <TableCell className='text-sm text-muted-foreground'>
                                            {formatDisplayDate(post.send_date)}
                                        </TableCell>
                                        <TableCell className={`text-right font-mono text-sm ${post.total_opens === 0 && 'text-gray-700'}`}>
                                            <span className='group-hover:hidden'>{formatPercentage(post.open_rate)}</span>
                                            <span className='hidden group-hover:!visible group-hover:!block'>{formatNumber(post.total_opens)}</span>
                                        </TableCell>
                                        <TableCell className={`text-right font-mono text-sm ${post.total_clicks === 0 && 'text-gray-700'}`}>
                                            <span className='group-hover:hidden'>{formatPercentage(post.click_rate)}</span>
                                            <span className='hidden group-hover:!visible group-hover:!block'>{formatNumber(post.total_clicks)}</span>
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

export default Newsletters;
