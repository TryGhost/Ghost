import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import NewsletterOverview from './components/NewsletterOverview';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import WebOverview from './components/WebOverview';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, Separator, Skeleton, formatNumber, formatQueryDate, getRangeDates, getRangeForStartDate, sanitizeChartData} from '@tryghost/shade';
import {KPI_METRICS} from '../Web/components/Kpis';
import {KpiDataItem, getWebKpiValues} from '@src/utils/kpi-helpers';
import {Post, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {STATS_RANGES} from '@src/utils/constants';
import {centsToDollars} from '../Growth/Growth';
import {getStatEndpointUrl, getToken, hasBeenEmailed, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';
import {useMemo} from 'react';
import {usePostReferrers} from '@src/hooks/usePostReferrers';
import {useQuery} from '@tinybirdco/charts';

const Overview: React.FC = () => {
    const {postId} = useParams();
    const navigate = useNavigate();
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    const {totals, isLoading: isTotalsLoading, currencySymbol} = usePostReferrers(postId || '');
    const {startDate, endDate, timezone} = getRangeDates(STATS_RANGES.ALL_TIME.value);

    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            include: 'email,authors,tags,tiers,count.clicks,count.signups,count.paid_conversions'
        }
    });

    // Calculate chart range based on days between today and post publication date
    const chartRange = useMemo(() => {
        if (!post?.published_at) {
            return STATS_RANGES.ALL_TIME.value; // Fallback if no publication date
        }
        const calculatedRange = getRangeForStartDate(post.published_at);
        return calculatedRange;
    }, [post?.published_at]);

    const {startDate: chartStartDate, endDate: chartEndDate, timezone: chartTimezone} = getRangeDates(chartRange);

    // KPI params for overview data
    const params = useMemo(() => {
        const baseParams = {
            site_uuid: statsConfig?.id || '',
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate),
            timezone: timezone,
            post_uuid: ''
        };

        if (!isPostLoading && post?.uuid) {
            return {
                ...baseParams,
                post_uuid: post.uuid
            };
        }

        return baseParams;
    }, [isPostLoading, post, statsConfig?.id, startDate, endDate, timezone]);

    // Chart params for chart data
    const chartParams = useMemo(() => {
        const baseParams = {
            site_uuid: statsConfig?.id || '',
            date_from: formatQueryDate(chartStartDate),
            date_to: formatQueryDate(chartEndDate),
            timezone: chartTimezone,
            post_uuid: ''
        };

        if (!isPostLoading && post?.uuid) {
            return {
                ...baseParams,
                post_uuid: post.uuid
            };
        }

        return baseParams;
    }, [isPostLoading, post, statsConfig?.id, chartStartDate, chartEndDate, chartTimezone]);

    const {data, loading: tbLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_kpis'),
        token: getToken(statsConfig),
        params: params
    });

    const {data: chartData, loading: chartLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_kpis'),
        token: getToken(statsConfig),
        params: chartParams
    });

    const kpiValues = getWebKpiValues(data as unknown as KpiDataItem[] | null);

    // Process chart data for WebOverview
    const currentMetric = KPI_METRICS.visits;
    const processedChartData = sanitizeChartData<KpiDataItem>(chartData as KpiDataItem[] || [], chartRange, currentMetric.dataKey as keyof KpiDataItem, 'sum')?.map((item: KpiDataItem) => {
        const value = Number(item[currentMetric.dataKey]);
        return {
            date: String(item.date),
            value,
            formattedValue: currentMetric.formatter(value),
            label: currentMetric.label
        };
    });

    const kpiIsLoading = isConfigLoading || isTotalsLoading || isPostLoading || tbLoading;
    const chartIsLoading = isPostLoading || isConfigLoading || chartLoading;
    const typedPost = post as Post;

    // Use the utility function from admin-x-framework
    const showNewsletterSection = hasBeenEmailed(typedPost);

    return (
        <>
            <PostAnalyticsHeader currentTab='Overview'>
                <div className='flex items-center gap-1 text-nowrap rounded-full bg-green/10 px-3 py-px pr-4 text-xs text-green-600'>
                    <LucideIcon.FlaskConical size={16} strokeWidth={1.5} />
                    Viewing Analytics (beta)
                    <Button className='pl-1 pr-0 text-green-600 !underline' size='sm' variant='link' onClick={() => {
                        navigate(`/posts/analytics/${postId}`, {crossApp: true});
                    }}>Switch back</Button>
                </div>
            </PostAnalyticsHeader>
            <PostAnalyticsContent>
                <Card className='overflow-hidden p-0'>
                    <CardHeader className='hidden'>
                        <CardTitle>Post performance</CardTitle>
                    </CardHeader>
                    <CardContent className='grid grid-cols-4 items-stretch p-0'>
                        {kpiIsLoading ?
                            Array.from({length: 4}, (_, i) => (
                                <div key={i} className='h-[98px] gap-1 border-r px-6 py-5 last:border-r-0'>
                                    <Skeleton className='w-2/3' />
                                    <Skeleton className='h-7 w-12' />
                                </div>
                            ))
                            :
                            <>
                                <KpiCard className='grow' onClick={() => {
                                    navigate(`/analytics/beta/${postId}/web`);
                                }}>
                                    <KpiCardLabel>
                                        <LucideIcon.MousePointer size={16} strokeWidth={1.5} />
                                    Unique visitors
                                    </KpiCardLabel>
                                    <KpiCardContent>
                                        <KpiCardValue>{kpiValues.visits}</KpiCardValue>
                                    </KpiCardContent>
                                </KpiCard>
                                <KpiCard className='grow' onClick={() => {
                                    navigate(`/analytics/beta/${postId}/web/?tab=views`);
                                }}>
                                    <KpiCardLabel>
                                        <LucideIcon.Eye size={16} strokeWidth={1.5} />
                                    Pageviews
                                    </KpiCardLabel>
                                    <KpiCardContent>
                                        <KpiCardValue>{kpiValues.views}</KpiCardValue>
                                    </KpiCardContent>
                                </KpiCard>
                                <KpiCard className='grow' onClick={() => {
                                    navigate(`/analytics/beta/${postId}/growth`);
                                }}>
                                    <KpiCardLabel>
                                        <LucideIcon.UserPlus size={16} strokeWidth={1.5} />
                                    Conversions
                                    </KpiCardLabel>
                                    <KpiCardContent>
                                        <KpiCardValue>{formatNumber((totals?.free_members || 0) + (totals?.paid_members || 0))}</KpiCardValue>
                                    </KpiCardContent>
                                </KpiCard>
                                <KpiCard className='grow' onClick={() => {
                                    navigate(`/analytics/beta/${postId}/growth`);
                                }}>
                                    <KpiCardLabel>
                                        <LucideIcon.DollarSign size={16} strokeWidth={1.5} />
                                    MRR impact
                                    </KpiCardLabel>
                                    <KpiCardContent>
                                        <KpiCardValue>{currencySymbol}{centsToDollars(totals?.mrr || 0)}</KpiCardValue>
                                    </KpiCardContent>
                                </KpiCard>
                            </>
                        }
                    </CardContent>
                </Card>
                {showNewsletterSection && (
                    <NewsletterOverview isNewsletterStatsLoading={isPostLoading} post={typedPost} />
                )}
                <Card className='group/card'>
                    <div className='flex items-center justify-between gap-6'>
                        <CardHeader>
                            <CardTitle>Web performance</CardTitle>
                            <CardDescription>Unique visitors since you published this post</CardDescription>
                        </CardHeader>
                        <Button className='mr-6 opacity-0 transition-all group-hover/card:opacity-100' variant='outline' onClick={() => {
                            navigate(`/analytics/beta/${postId}/web`);
                        }}>
                                View more
                            <LucideIcon.ArrowRight />
                        </Button>
                    </div>
                    <CardContent>
                        <Separator />
                        <WebOverview
                            chartData={processedChartData}
                            isLoading={chartIsLoading}
                            range={chartRange}
                        />
                    </CardContent>
                </Card>
            </PostAnalyticsContent>
        </>
    );
};

export default Overview;
