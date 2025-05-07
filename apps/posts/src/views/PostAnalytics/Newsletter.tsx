import KpiCard, {KpiCardContent, KpiCardIcon, KpiCardLabel, KpiCardValue} from './components/KpiCard';
import PostAnalyticsContent from './components/PostAnalyticsContent';
import PostAnalyticsHeader from './components/PostAnalyticsHeader';
import PostAnalyticsLayout from './layout/PostAnalyticsLayout';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, LucideIcon, Recharts, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ViewHeader, formatNumber, formatPercentage} from '@tryghost/shade';
import {calculateYAxisWidth} from '@src/utils/chart-helpers';

interface postAnalyticsProps {}

const Newsletter: React.FC<postAnalyticsProps> = () => {
    // const {isLoading: isConfigLoading} = useGlobalData();
    // const {postId} = useParams();
    // const {stats: postReferrers, totals, isLoading} = usePostReferrers(postId || '');

    const isLoading = false;

    const barDomain = [0, 1];
    const barTicks = [0, 0.25, 0.5, 0.75, 1];
    const chartData = [
        {metric: 'Opened', current: 0.73, average: 0.64},
        {metric: 'Clicked', current: 0.26, average: 0.08}
    ];
    const chartConfig = {
        current: {
            label: 'This post',
            color: 'hsl(var(--chart-1))'
        },
        average: {
            label: 'Your average newsletter',
            color: 'hsl(var(--chart-gray))'
        }
    } satisfies ChartConfig;

    return (
        <PostAnalyticsLayout>
            <ViewHeader className='items-end pb-4'>
                <PostAnalyticsHeader currentTab='Growth' />
            </ViewHeader>
            <PostAnalyticsContent>
                {isLoading ? 'Loading' :
                    <div className='flex flex-col items-stretch gap-6'>
                        <Card>
                            <CardHeader className='hidden'>
                                <CardTitle>Newsletters</CardTitle>
                                <CardDescription>How did this post perform</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className='-mx-1 grid grid-cols-3 gap-6 pt-5'>
                                    <KpiCard className='border-none p-0'>
                                        <KpiCardIcon>
                                            <LucideIcon.Send strokeWidth={1.5} />
                                        </KpiCardIcon>
                                        <KpiCardContent>
                                            <KpiCardLabel>Sent</KpiCardLabel>
                                            <KpiCardValue>{formatNumber(47968)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='border-none p-0'>
                                        <KpiCardIcon>
                                            <LucideIcon.MailOpen strokeWidth={1.5} />
                                        </KpiCardIcon>
                                        <KpiCardContent>
                                            <KpiCardLabel>Opened</KpiCardLabel>
                                            <KpiCardValue>{formatNumber(24865)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='border-none p-0'>
                                        <KpiCardIcon>
                                            <LucideIcon.MousePointerClick strokeWidth={1.5} />
                                        </KpiCardIcon>
                                        <KpiCardContent>
                                            <KpiCardLabel>Clicked</KpiCardLabel>
                                            <KpiCardValue>{formatNumber(1094)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                </div>
                                <ChartContainer className='mt-10 max-h-[320px] w-full' config={chartConfig}>
                                    <Recharts.BarChart barCategoryGap={24} data={chartData} accessibilityLayer>
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
                                            dataKey="metric"
                                            tickFormatter={value => (value)}
                                            tickLine={false}
                                            tickMargin={10}
                                        />
                                        <ChartTooltip
                                            content={
                                                <ChartTooltipContent
                                                    className="text-muted-foreground"
                                                    formatter={(value, name) => (
                                                        <>
                                                            <div
                                                                className="size-2.5 shrink-0 rounded-[2px] bg-[--color-bg]"
                                                                style={{'--color-bg': `var(--color-${name})`} as React.CSSProperties
                                                                }
                                                            />
                                                            {chartConfig[name as keyof typeof chartConfig]?.label || name}
                                                            <div className="ml-auto flex items-baseline gap-0.5 pl-2 font-mono font-medium tabular-nums text-foreground">
                                                                {formatPercentage(value)}
                                                            </div>
                                                        </>
                                                    )}
                                                    hideLabel
                                                />
                                            }
                                            cursor={false}
                                        />
                                        {/* <Recharts.Bar
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
                                        </Recharts.Bar> */}
                                        <Recharts.Bar
                                            barSize={48}
                                            dataKey="current"
                                            fill="var(--color-current)"
                                            radius={0}
                                        />
                                        <Recharts.Bar
                                            barSize={48}
                                            dataKey="average"
                                            fill="var(--color-average)"
                                            radius={0}
                                        />
                                        <ChartLegend content={<ChartLegendContent />} />
                                    </Recharts.BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Email clicks</CardTitle>
                                <CardDescription>Which links got the most clicks</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Separator />
                                {/* {postReferrers.length > 0
                                    ?
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Source</TableHead>
                                                <TableHead className='w-[110px] text-right'>Free members</TableHead>
                                                <TableHead className='w-[110px] text-right'>Paid members</TableHead>
                                                <TableHead className='w-[110px] text-right'>MRR</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {postReferrers?.map(row => (
                                                <TableRow key={row.source}>
                                                    <TableCell>
                                                        <a className='inline-flex items-center gap-2 font-medium' href={`https://${row.source}`} rel="noreferrer" target='_blank'>
                                                            <img
                                                                className="size-4"
                                                                src={`https://www.faviconextractor.com/favicon/${row.source || 'direct'}?larger=true`}
                                                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                                    e.currentTarget.src = STATS_DEFAULT_SOURCE_ICON_URL;
                                                                }} />
                                                            <span>{row.source || 'Direct'}</span>
                                                        </a>
                                                    </TableCell>
                                                    <TableCell className='text-right font-mono text-sm'>+{formatNumber(row.free_members)}</TableCell>
                                                    <TableCell className='text-right font-mono text-sm'>+{formatNumber(row.paid_members)}</TableCell>
                                                    <TableCell className='text-right font-mono text-sm'>+${centsToDollars(row.mrr)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    :
                                    <div className='py-20 text-center text-sm text-gray-700'>
                                    Once someone signs up on this post, sources will show here.
                                    </div>
                                } */}
                            </CardContent>
                        </Card>
                    </div>
                }
            </PostAnalyticsContent>
        </PostAnalyticsLayout>
    );
};

export default Newsletter;
