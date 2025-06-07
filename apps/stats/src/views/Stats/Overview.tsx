import DateRangeSelect from './components/DateRangeSelect';
import FeatureImagePlaceholder from './components/FeatureImagePlaceholder';
import React, {useMemo} from 'react';
import StatsHeader from './layout/StatsHeader';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, GhAreaChart, GhAreaChartDataItem, KpiCardHeader, KpiCardHeaderLabel, KpiCardHeaderValue, LucideIcon, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, centsToDollars, cn, formatDisplayDate, formatNumber, formatQueryDate, getRangeDates, sanitizeChartData} from '@tryghost/shade';
import {STATS_RANGES} from '@src/utils/constants';
import {getAudienceQueryParam} from './components/AudienceSelect';
import {getPeriodText} from '@src/utils/chart-helpers';
import {getStatEndpointUrl, getToken, useNavigate} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useGrowthStats} from '@src/hooks/useGrowthStats';
import {useLatestPostStats} from '@src/hooks/useLatestPostStats';
import {useQuery} from '@tinybirdco/charts';
import {useTopPostsViews} from '@src/hooks/useTopPostsViews';

interface OverviewKPICardProps {
    linkto: string;
    title: string;
    iconName?: keyof typeof LucideIcon;
    description: string;
    diffDirection?: 'up' | 'down' | 'same' | 'empty';
    diffValue?: string;
    color?: string;
    formattedValue: string;
    children?: React.ReactNode;
    onClick?: () => void;
}

const OverviewKPICard: React.FC<OverviewKPICardProps> = ({
    // linkto,
    title,
    iconName,
    description,
    color,
    diffDirection,
    diffValue,
    formattedValue,
    children,
    onClick
}) => {
    // const navigate = useNavigate();
    const {range} = useGlobalData();
    const IconComponent = iconName && LucideIcon[iconName] as LucideIcon.LucideIcon;

    return (
        <Card className={onClick && 'group transition-all hover:!cursor-pointer hover:bg-accent/50'} onClick={onClick}>
            <CardHeader className='hidden'>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <KpiCardHeader className='grow gap-2 border-none pb-2'>
                <KpiCardHeaderLabel className={onClick && 'transition-all group-hover:text-foreground'}>
                    {color && <span className='inline-block size-2 rounded-full opacity-50' style={{backgroundColor: color}}></span>}
                    {IconComponent && <IconComponent size={16} strokeWidth={1.5} />}
                    {title}
                </KpiCardHeaderLabel>
                <KpiCardHeaderValue
                    diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : diffDirection}
                    diffValue={diffValue}
                    value={formattedValue}
                />
            </KpiCardHeader>
            <CardContent>
                {children}
            </CardContent>
        </Card>
    );
};

interface HelpCardProps {
    className?: string;
    title: string;
    description: string;
    url: string;
    children?: React.ReactNode;
}

export const HelpCard: React.FC<HelpCardProps> = ({
    className,
    title,
    description,
    url,
    children
}) => {
    return (
        <a className={cn(
            'block rounded-xl border bg-card p-6 transition-all hover:shadow-xs hover:bg-accent group/card',
            className
        )} href={url} rel='noreferrer' target='_blank'>
            <div className='flex items-center gap-6'>
                {children}
                <div className='flex flex-col gap-0.5 leading-tight'>
                    <span className='text-base font-semibold'>{title}</span>
                    <span className='text-sm font-normal text-muted-foreground'>{description}</span>
                </div>
            </div>
        </a>
    );
};

interface WebKpiDataItem {
    date: string;
    [key: string]: string | number;
}

type GrowthChartDataItem = {
    date: string;
    value: number;
    free: number;
    paid: number;
    comped: number;
    mrr: number;
    formattedValue: string;
    label?: string;
};

interface TopPostViewsStats {
    post_id: string;
    title: string;
    published_at: string;
    views: number;
    open_rate: number | null;
    members: number;
    feature_image: string;
}

const Overview: React.FC = () => {
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    const {range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);
    const {isLoading: isGrowthStatsLoading, chartData: growthChartData, totals: growthTotals} = useGrowthStats(range);
    const {isLoading: isLatestPostLoading, stats: latestPostStats} = useLatestPostStats();
    const navigate = useNavigate();
    const {data: topPostsData, isLoading: isTopPostsLoading} = useTopPostsViews({startDate, endDate, limit: 5, timezone});

    /* Get visitors
    /* ---------------------------------------------------------------------- */
    const visitorsParams = {
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience)
    };

    const {data: visitorsData, loading: isVisitorsLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_kpis'),
        token: getToken(statsConfig),
        params: visitorsParams
    });

    const visitorsChartData = useMemo(() => {
        return sanitizeChartData<WebKpiDataItem>(visitorsData as WebKpiDataItem[] || [], range, 'visits' as keyof WebKpiDataItem, 'sum')?.map((item: WebKpiDataItem) => {
            const value = Number(item.visits);
            return {
                date: String(item.date),
                value,
                formattedValue: formatNumber(value),
                label: 'Visitors'
            };
        });
    }, [visitorsData, range]);
    const visitorsYRange: [number, number] = [0, Math.max(...(visitorsChartData?.map((item: GhAreaChartDataItem) => item.value) || [0]))];

    /* Get members
    /* ---------------------------------------------------------------------- */
    // Create chart data based on selected tab
    const membersChartData = useMemo(() => {
        if (!growthChartData || growthChartData.length === 0) {
            return [];
        }

        let sanitizedData: GrowthChartDataItem[] = [];
        const fieldName: keyof GrowthChartDataItem = 'value';

        sanitizedData = sanitizeChartData<GrowthChartDataItem>(growthChartData, range, fieldName, 'exact');

        // Then map the sanitized data to the final format
        const processedData: GhAreaChartDataItem[] = sanitizedData.map(item => ({
            date: item.date,
            value: item.free + item.paid + item.comped,
            formattedValue: formatNumber(item.free + item.paid + item.comped),
            label: 'Members'
        }));

        return processedData;
    }, [growthChartData, range]);

    /* Get MRR
    /* ---------------------------------------------------------------------- */
    // Create chart data based on selected tab
    const mrrChartData = useMemo(() => {
        if (!growthChartData || growthChartData.length === 0) {
            return [];
        }

        let sanitizedData: GrowthChartDataItem[] = [];
        const fieldName: keyof GrowthChartDataItem = 'mrr';

        sanitizedData = sanitizeChartData<GrowthChartDataItem>(growthChartData, range, fieldName, 'exact');

        // Then map the sanitized data to the final format
        const processedData: GhAreaChartDataItem[] = sanitizedData.map(item => ({
            date: item.date,
            value: centsToDollars(item.mrr),
            formattedValue: `$${formatNumber(centsToDollars(item.mrr))}`,
            label: 'MRR'
        }));

        return processedData;
    }, [growthChartData, range]);

    /* Calculate KPI values
    /* ---------------------------------------------------------------------- */
    const kpiValues = useMemo(() => {
        // Visitors data
        if (!visitorsData?.length) {
            return {visits: '0'};
        }

        const totalVisits = visitorsData.reduce((sum, item) => sum + Number(item.visits), 0);

        return {
            visits: formatNumber(totalVisits)
        };
    }, [visitorsData]);

    const isLoading = isConfigLoading || isVisitorsLoading || isGrowthStatsLoading || isLatestPostLoading || isTopPostsLoading;
    const areaChartClassName = '-mb-3 h-[10vw] max-h-[200px] hover:!cursor-pointer';

    return (
        <StatsLayout>
            <StatsHeader>
                <DateRangeSelect />
            </StatsHeader>
            <StatsView isLoading={isLoading}>
                <div className='grid grid-cols-3 gap-8'>
                    <OverviewKPICard
                        color='hsl(var(--chart-blue))'
                        description='Number of individual people who visited your website'
                        diffDirection='empty'
                        formattedValue={kpiValues.visits}
                        linkto='/web/'
                        title='Unique visitors'
                        onClick={() => {
                            navigate('/web/');
                        }}
                    >
                        <GhAreaChart
                            className={areaChartClassName}
                            color='hsl(var(--chart-blue))'
                            data={visitorsChartData}
                            id="visitors"
                            range={range}
                            showHorizontalLines={false}
                            showYAxisValues={false}
                            syncId="overview-charts"
                            yAxisRange={visitorsYRange}
                        />
                    </OverviewKPICard>

                    <OverviewKPICard
                        color='hsl(var(--chart-teal))'
                        description='How number of members of your publication changed over time'
                        diffDirection={growthTotals.directions.total}
                        diffValue={growthTotals.percentChanges.total}
                        formattedValue={formatNumber(growthTotals.totalMembers)}
                        linkto='/growth/'
                        title='Members'
                        onClick={() => {
                            navigate('/growth/');
                        }}
                    >
                        <GhAreaChart
                            className={areaChartClassName}
                            color='hsl(var(--chart-teal))'
                            data={membersChartData}
                            id="members"
                            range={range}
                            showHorizontalLines={false}
                            showYAxisValues={false}
                            syncId="overview-charts"
                        />
                    </OverviewKPICard>

                    <OverviewKPICard
                        color='hsl(var(--chart-purple))'
                        description='Monthly recurring revenue changes over time'
                        diffDirection={growthTotals.directions.mrr}
                        diffValue={growthTotals.percentChanges.mrr}
                        formattedValue={`$${formatNumber(centsToDollars(growthTotals.mrr))}`}
                        linkto='/growth/'
                        title='MRR'
                        onClick={() => {
                            navigate('/growth/');
                        }}
                    >
                        <GhAreaChart
                            className={areaChartClassName}
                            color='hsl(var(--chart-purple))'
                            data={mrrChartData}
                            id="mrr"
                            range={range}
                            showHorizontalLines={false}
                            showYAxisValues={false}
                            syncId="overview-charts"
                        />
                    </OverviewKPICard>
                </div>
                <div className='grid grid-cols-3 gap-8'>
                    <Card className={`group/card ${latestPostStats && 'transition-all hover:cursor-pointer hover:bg-accent/50'}`} onClick={() => {
                        if (latestPostStats) {
                            navigate(`/posts/analytics/beta/${latestPostStats.id}`, {crossApp: true});
                        }
                    }}>
                        <CardHeader>
                            <CardTitle className='flex items-baseline justify-between leading-snug'>
                                Latest post performance
                                {/* {latestPostStats && (
                                    <Button
                                        className='-translate-x-2 opacity-0 transition-all group-hover/card:translate-x-0 group-hover/card:opacity-100'
                                        variant='outline'
                                    >
                                        Details
                                        <LucideIcon.ArrowRight size={16} strokeWidth={1.5} />
                                    </Button>
                                )} */}
                            </CardTitle>
                            <CardDescription className='hidden'>How your last post did</CardDescription>
                        </CardHeader>
                        <CardContent className='flex flex-col items-stretch gap-6'>
                            {latestPostStats ? (
                                <>
                                    <div className='flex flex-col items-stretch'>
                                        {latestPostStats.feature_image ?
                                            <div className='aspect-video w-full rounded-md bg-cover' style={{
                                                backgroundImage: `url(${latestPostStats.feature_image})`
                                            }}></div>
                                            :
                                            <Separator />
                                        }
                                        <div className='mt-4 text-xl font-semibold leading-tight tracking-tight'>{latestPostStats.title}</div>
                                        <div className='mt-0.5 text-sm text-muted-foreground'>Published {formatDisplayDate(latestPostStats.published_at)} {new Date(latestPostStats.published_at).toLocaleDateString()}</div>
                                    </div>
                                    <div className='flex flex-col items-stretch gap-2 text-sm'>
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center gap-1 font-medium text-muted-foreground'>
                                                <LucideIcon.MousePointer size={16} strokeWidth={1.5} />
                                                Visitors
                                            </div>
                                            <div className='font-mono'>{formatNumber(latestPostStats.visitors)}</div>
                                        </div>
                                        {latestPostStats.open_rate &&
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center gap-1 font-medium text-muted-foreground'>
                                                <LucideIcon.MailOpen size={16} strokeWidth={1.5} />
                                                Open rate
                                            </div>
                                            <div className='font-mono'>{`${Math.round(latestPostStats.open_rate)}%`}</div>
                                        </div>
                                        }
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center gap-1 font-medium text-muted-foreground'>
                                                <LucideIcon.User size={16} strokeWidth={1.5} />
                                                Members
                                            </div>
                                            <div className='font-mono'>{latestPostStats.member_delta > 0 ? `+${latestPostStats.member_delta}` : latestPostStats.member_delta}</div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className='flex flex-col items-center justify-center gap-4 py-8 text-center text-muted-foreground'>
                                    <LucideIcon.FileText size={32} strokeWidth={1.5} />
                                    <div>No published posts yet</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card className='group/card lg:col-span-2'>
                        <CardHeader>
                            <CardTitle className='flex items-baseline justify-between leading-snug'>
                                Top posts {getPeriodText(range)}
                                {/* <Button className='-translate-x-2 opacity-0 transition-all group-hover/card:translate-x-0 group-hover/card:opacity-100' variant='outline'>
                                    View all
                                    <LucideIcon.ArrowRight size={16} strokeWidth={1.5} />
                                </Button> */}
                            </CardTitle>
                            <CardDescription className='hidden'>Most viewed posts in this period</CardDescription>
                        </CardHeader>
                        <CardContent className='-mt-4'>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className='pl-0'>Post title</TableHead>
                                        <TableHead className='text-right'>Visitors</TableHead>
                                        <TableHead className='whitespace-nowrap text-right'>Open rate</TableHead>
                                        <TableHead className='text-right'>Members</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topPostsData?.stats?.[0]?.map((post: TopPostViewsStats) => (
                                        <TableRow key={post.post_id} className='hover:cursor-pointer' onClick={() => {
                                            navigate(`/posts/analytics/beta/${post.post_id}`, {crossApp: true});
                                        }}>
                                            <TableCell className='font-'>
                                                <div className='flex items-center gap-4'>
                                                    {post.feature_image ?
                                                        <div className='aspect-[4/3] w-20 shrink-0 rounded-md bg-cover' style={{
                                                            backgroundImage: `url(${post.feature_image})`
                                                        }}></div>
                                                        :
                                                        <FeatureImagePlaceholder className='aspect-[4/3] w-20 shrink-0' />
                                                    }
                                                    <div className='flex flex-col'>
                                                        <span className='font-semibold leading-[1.35em]'>{post.title}</span>
                                                        <span className='text-xs text-muted-foreground'>{formatDisplayDate(post.published_at)}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className='text-right font-mono'>
                                                {formatNumber(post.views)}
                                            </TableCell>
                                            <TableCell className='text-right font-mono'>
                                                {post.open_rate ? `${Math.round(post.open_rate)}%` : <>&mdash;</>}
                                            </TableCell>
                                            <TableCell className='text-right font-mono'>
                                                {post.members > 0 ? `+${formatNumber(post.members)}` : '0'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!topPostsData?.stats?.[0] || topPostsData.stats?.[0].length === 0) && (
                                        <TableRow>
                                            <TableHead
                                                className='text-center font-normal text-muted-foreground'
                                                colSpan={4}
                                            >
                                                No data for the selected period
                                            </TableHead>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                {/*
                TBD
                <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
                    <H3 className='-mb-4 mt-4 lg:col-span-2'>Grow your audience</H3>
                    <HelpCard
                        description='Find out how to review the performance of your content and get the most out of post analytics in Ghost.'
                        title='Analytics in Ghost'
                        url='https://ghost.org/help'>
                        <div className='flex h-18 w-[100px] min-w-[100px] items-center justify-center rounded-md bg-gradient-to-r from-muted-foreground/15 to-muted-foreground/10 p-4 opacity-80 transition-all group-hover/card:opacity-100'>
                            <LucideIcon.Sprout className='text-muted-foreground' size={40} strokeWidth={1} />
                        </div>
                    </HelpCard>
                    <HelpCard
                        description='Use these content distribution tactics to get more people to discover your work and increase engagement.'
                        title='How to reach more people?'
                        url='https://ghost.org/help'>
                        <div className='flex h-18 w-[100px] min-w-[100px] items-center justify-center rounded-md bg-gradient-to-r from-muted-foreground/15 to-muted-foreground/10 p-4 opacity-80 transition-all group-hover/card:opacity-100'>
                            <LucideIcon.ChartColumnIncreasing className='text-muted-foreground' size={40} strokeWidth={1} />
                        </div>
                    </HelpCard>
                </div> */}
            </StatsView>
        </StatsLayout>
    );
};

export default Overview;