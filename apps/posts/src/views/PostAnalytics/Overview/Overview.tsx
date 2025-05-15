import DateRangeSelect from '../components/DateRangeSelect';
import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import {BarChartLoadingIndicator, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, LucideIcon, Recharts, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatNumber, formatPercentage} from '@tryghost/shade';
import {GroupedLinkData, cleanTrackedUrl, sanitizeUrl} from '../Newsletter/Newsletter';
import {useMemo} from 'react';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {usePostNewsletterStats} from '@src/hooks/usePostNewsletterStats';

const Overview: React.FC = () => {
    const {postId} = useParams();
    const {topLinks, isLoading: isNewsletterStatsLoading} = usePostNewsletterStats(postId || '');
    const navigate = useNavigate();

    const opensChartData = [
        {opens: 0.71, fill: 'var(--color-opens)'}
    ];
    const opensChartConfig = {
        opens: {
            label: 'Opens',
            color: 'hsl(var(--chart-blue))'
        }
    } satisfies ChartConfig;

    const clicksChartData = [
        {clicks: 0.19, fill: 'var(--color-clicks)'}
    ];
    const clickschartConfig = {
        clicks: {
            label: 'Clicks',
            color: 'hsl(var(--chart-green))'
        }
    } satisfies ChartConfig;

    // Memoize link processing to avoid unnecessary recomputation on renders
    const displayLinks = useMemo(() => {
        // Process links data to group by URL
        const processedLinks = topLinks.reduce<Record<string, GroupedLinkData>>((acc, link) => {
            // For grouping, we use the clean URL (path only with hash)
            const cleanUrl = cleanTrackedUrl(link.url, false);

            if (!acc[cleanUrl]) {
                acc[cleanUrl] = {
                    url: cleanUrl,
                    clicks: 0,
                    edited: false
                };
            }

            acc[cleanUrl].clicks += link.clicks;
            acc[cleanUrl].edited = acc[cleanUrl].edited || link.edited;

            return acc;
        }, {});

        // Sort by click count and take only top 5
        return Object.values(processedLinks)
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 5);
    }, [topLinks]); // Only recalculate when topLinks changes

    const radialBarChartClassName = 'mx-auto aspect-square w-full min-h-[250px] max-w-[250px]';

    return (
        <>
            <PostAnalyticsHeader currentTab='Overview'>
                <DateRangeSelect />
            </PostAnalyticsHeader>
            <PostAnalyticsContent>
                <Card className='overflow-hidden p-0'>
                    <CardHeader className='hidden'>
                        <CardTitle>Newsletter performance</CardTitle>
                    </CardHeader>
                    <CardContent className='flex items-stretch p-0'>
                        <KpiCard className='grow' onClick={() => {
                            navigate(`/analytics/x/${postId}/web`);
                        }}>
                            <KpiCardLabel>
                                <LucideIcon.MousePointer size={16} strokeWidth={1.5} />
                                Unique visitors
                            </KpiCardLabel>
                            <KpiCardContent>
                                <KpiCardValue>{formatNumber(18997)}</KpiCardValue>
                            </KpiCardContent>
                        </KpiCard>
                        <KpiCard className='grow' onClick={() => {
                            navigate(`/analytics/x/${postId}/web`);
                        }}>
                            <KpiCardLabel>
                                <LucideIcon.Eye size={16} strokeWidth={1.5} />
                                Pageviews
                            </KpiCardLabel>
                            <KpiCardContent>
                                <KpiCardValue>{formatNumber(29127)}</KpiCardValue>
                            </KpiCardContent>
                        </KpiCard>
                        <KpiCard className='grow' onClick={() => {
                            navigate(`/analytics/x/${postId}/growth`);
                        }}>
                            <KpiCardLabel>
                                <LucideIcon.UserPlus size={16} strokeWidth={1.5} />
                                Conversions
                            </KpiCardLabel>
                            <KpiCardContent>
                                <KpiCardValue>{formatNumber(18997)}</KpiCardValue>
                            </KpiCardContent>
                        </KpiCard>
                        <KpiCard className='grow' onClick={() => {
                            navigate(`/analytics/x/${postId}/growth`);
                        }}>
                            <KpiCardLabel>
                                <LucideIcon.DollarSign size={16} strokeWidth={1.5} />
                                MRR impact
                            </KpiCardLabel>
                            <KpiCardContent>
                                <KpiCardValue>$91</KpiCardValue>
                            </KpiCardContent>
                        </KpiCard>
                    </CardContent>
                </Card>
                <Card className='group/card'>
                    <div className='group flex items-center justify-between gap-6'>
                        <CardHeader>
                            <CardTitle>Newsletter performance</CardTitle>
                            <CardDescription>How members interacted with this email</CardDescription>
                        </CardHeader>
                        <Button className='mr-6 opacity-0 transition-all group-hover/card:opacity-100' variant='outline' onClick={() => {
                            navigate(`/analytics/x/${postId}/newsletter`);
                        }}>
                                View more
                            <LucideIcon.ArrowRight />
                        </Button>
                    </div>
                    <CardContent>
                        {isNewsletterStatsLoading ?
                            <div className='flex min-h-[250px] items-center justify-center'>
                                <BarChartLoadingIndicator />
                            </div>
                            :
                            <div className='grid grid-cols-2 items-start gap-8'>
                                <div className='mx-auto flex size-full min-h-[250px] flex-wrap items-start justify-center gap-6'>
                                    <ChartContainer
                                        className={radialBarChartClassName}
                                        config={opensChartConfig}
                                    >
                                        <Recharts.RadialBarChart
                                            data={opensChartData}
                                            endAngle={-176}
                                            innerRadius={72}
                                            outerRadius={110}
                                            startAngle={90}
                                        >
                                            <Recharts.PolarGrid
                                                className="first:fill-muted last:fill-background"
                                                gridType="circle"
                                                polarRadius={[80, 64]}
                                                radialLines={false}
                                                stroke="none"
                                            />
                                            <Recharts.RadialBar cornerRadius={10} dataKey="opens" background />
                                            <Recharts.PolarRadiusAxis axisLine={false} tick={false} tickLine={false}>
                                                <Recharts.Label
                                                    content={({viewBox}) => {
                                                        if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                                            return (
                                                                <text
                                                                    dominantBaseline="middle"
                                                                    textAnchor="middle"
                                                                    x={viewBox.cx}
                                                                    y={viewBox.cy}
                                                                >
                                                                    <tspan
                                                                        className="fill-foreground text-[2.6rem] font-semibold"
                                                                        x={viewBox.cx}
                                                                        y={viewBox.cy}
                                                                    >
                                                                        {formatPercentage(opensChartData[0].opens)}
                                                                    </tspan>
                                                                    <tspan
                                                                        className="fill-muted-foreground font-medium"
                                                                        x={viewBox.cx}
                                                                        y={(viewBox.cy || 0) + 24}
                                                                    >
                                                                    Opens
                                                                    </tspan>
                                                                </text>
                                                            );
                                                        }
                                                    }}
                                                />
                                            </Recharts.PolarRadiusAxis>
                                        </Recharts.RadialBarChart>
                                    </ChartContainer>

                                    <ChartContainer
                                        className={radialBarChartClassName}
                                        config={clickschartConfig}
                                    >
                                        <Recharts.RadialBarChart
                                            data={clicksChartData}
                                            endAngle={29}
                                            innerRadius={72}
                                            outerRadius={110}
                                            startAngle={90}
                                        >
                                            <Recharts.PolarGrid
                                                className="first:fill-muted last:fill-background"
                                                gridType="circle"
                                                polarRadius={[80, 64]}
                                                radialLines={false}
                                                stroke="none"
                                            />
                                            <Recharts.RadialBar cornerRadius={10} dataKey="clicks" background />
                                            <Recharts.PolarRadiusAxis axisLine={false} tick={false} tickLine={false}>
                                                <Recharts.Label
                                                    content={({viewBox}) => {
                                                        if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                                            return (
                                                                <text
                                                                    dominantBaseline="middle"
                                                                    textAnchor="middle"
                                                                    x={viewBox.cx}
                                                                    y={viewBox.cy}
                                                                >
                                                                    <tspan
                                                                        className="fill-foreground text-[2.6rem] font-semibold"
                                                                        x={viewBox.cx}
                                                                        y={viewBox.cy}
                                                                    >
                                                                        {formatPercentage(clicksChartData[0].clicks)}
                                                                    </tspan>
                                                                    <tspan
                                                                        className="fill-muted-foreground font-medium"
                                                                        x={viewBox.cx}
                                                                        y={(viewBox.cy || 0) + 24}
                                                                    >
                                                                    Clicks
                                                                    </tspan>
                                                                </text>
                                                            );
                                                        }
                                                    }}
                                                />
                                            </Recharts.PolarRadiusAxis>
                                        </Recharts.RadialBarChart>
                                    </ChartContainer>
                                </div>
                                <div>
                                    {topLinks.length > 0
                                        ?
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className='w-full'>
                                                        <div className='flex items-center gap-1.5'>
                                                            <LucideIcon.Link size={16} strokeWidth={1.25}/>
                                                        Link clicks
                                                        </div>
                                                    </TableHead>
                                                    <TableHead className='w-[0%] text-nowrap text-right'>No. of members clicked</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {displayLinks.map((row) => {
                                                    return (
                                                        <TableRow key={row.url}>
                                                            <TableCell className='max-w-0'>
                                                                <div className='flex items-center gap-2'>
                                                                    {sanitizeUrl(row.url)}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className='text-right font-mono text-sm'>{formatNumber(row.clicks)}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                        :
                                        <div className='py-20 text-center text-sm text-gray-700'>
                                    You have no links in your post.
                                        </div>
                                    }
                                </div>
                            </div>
                        }
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Web performance</CardTitle>
                        <CardDescription>Unique visitors since you published this post</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div>Chart</div>
                    </CardContent>
                </Card>
                {/* <div className='grid grid-cols-2 gap-8'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Help box 1</CardTitle>
                        </CardHeader>
                        <CardContent>
                            Description...
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Help box 2</CardTitle>
                        </CardHeader>
                        <CardContent>
                            Description...
                        </CardContent>
                    </Card>
                </div> */}
            </PostAnalyticsContent>
        </>
    );
};

export default Overview;
