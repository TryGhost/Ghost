import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import NewsletterOverview from './components/NewsletterOverview';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import WebOverview from './components/WebOverview';
import {Button, Card, CardContent, CardHeader, CardTitle, LucideIcon, Skeleton, formatNumber, formatQueryDate, getRangeDates, getRangeForStartDate, sanitizeChartData} from '@tryghost/shade';
import {KPI_METRICS} from '../Web/components/Kpis';
import {KpiDataItem, getWebKpiValues} from '@src/utils/kpi-helpers';
import {Post, useGlobalData} from '@src/providers/PostAnalyticsContext';
import {STATS_RANGES} from '@src/utils/constants';
import {centsToDollars} from '../Growth/Growth';
import {getStatEndpointUrl, getToken, hasBeenEmailed, useNavigate} from '@tryghost/admin-x-framework';
import {useAppContext} from '@src/App';
import {useMemo} from 'react';
import {usePostReferrers} from '@src/hooks/usePostReferrers';
import {useQuery} from '@tinybirdco/charts';

const Overview: React.FC = () => {
    const navigate = useNavigate();
    const {statsConfig, isLoading: isConfigLoading, post, isPostLoading, postId} = useGlobalData();
    const {totals, isLoading: isTotalsLoading, currencySymbol} = usePostReferrers(postId);
    const {startDate, endDate, timezone} = getRangeDates(STATS_RANGES.ALL_TIME.value);
    const {appSettings} = useAppContext();

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

    // Get sources data
    const {data: sourcesData, loading: isSourcesLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_sources'),
        token: getToken(statsConfig),
        params: params
    });

    const kpiIsLoading = isConfigLoading || isTotalsLoading || isPostLoading || tbLoading;
    const chartIsLoading = isPostLoading || isConfigLoading || chartLoading;
    const typedPost = post as Post;

    // Use the utility function from admin-x-framework
    const showNewsletterSection = hasBeenEmailed(typedPost);

    return (
        <>
            <PostAnalyticsHeader currentTab='Overview'>
                <div className='flex items-center gap-1 text-nowrap rounded-md bg-purple/10 px-2 py-px pr-3 text-xs text-purple-600'>
                    <LucideIcon.FlaskConical size={16} strokeWidth={1.5} />
                    Viewing Analytics (beta)
                    <Button className='pl-1 pr-0 text-purple-600 !underline' size='sm' variant='link' onClick={() => {
                        navigate(`/posts/analytics/${postId}`, {crossApp: true});
                    }}>Switch back</Button>
                </div>
            </PostAnalyticsHeader>
            <PostAnalyticsContent>
                <div className={showNewsletterSection ? 'grid grid-cols-2 gap-8' : ''}>
                    <WebOverview
                        chartData={processedChartData}
                        fullWidth={!showNewsletterSection}
                        isLoading={chartIsLoading || kpiIsLoading || isSourcesLoading}
                        range={chartRange}
                        sourcesData={sourcesData}
                        visitors={kpiValues.visits}
                    />
                    {showNewsletterSection && (
                        <NewsletterOverview isNewsletterStatsLoading={isPostLoading} post={typedPost} />
                    )}
                </div>
                <Card className='group overflow-hidden p-0'>
                    <div className='relative flex items-center justify-between gap-6'>
                        <CardHeader>
                            <CardTitle className='flex items-center gap-1.5 text-lg'>
                                <LucideIcon.Sprout size={16} strokeWidth={1.5} />
                                Growth
                            </CardTitle>
                        </CardHeader>
                        <Button className='absolute right-6 translate-x-10 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100' size='sm' variant='outline' onClick={() => {
                            navigate(`/analytics/beta/${postId}/growth`);
                        }}>View more</Button>
                    </div>
                    <CardContent className='grid grid-cols-3 items-stretch px-0'>
                        {kpiIsLoading ?
                            Array.from({length: 3}, (_, i) => (
                                <div key={i} className='h-[98px] gap-1 border-r px-6 py-5 last:border-r-0'>
                                    <Skeleton className='w-2/3' />
                                    <Skeleton className='h-7 w-12' />
                                </div>
                            ))
                            :
                            <>
                                <KpiCard className='grow gap-1 py-0'>
                                    <KpiCardLabel>
                                        Free members
                                    </KpiCardLabel>
                                    <KpiCardContent>
                                        <KpiCardValue className='text-[2.2rem]'>{formatNumber((totals?.free_members || 0))}</KpiCardValue>
                                    </KpiCardContent>
                                </KpiCard>
                                {appSettings?.paidMembersEnabled &&
                                <>
                                    <KpiCard className='grow gap-1 py-0'>
                                        <KpiCardLabel>
                                        Paid members
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue className='text-[2.2rem]'>{formatNumber((totals?.paid_members || 0))}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='grow gap-1 py-0'>
                                        <KpiCardLabel>
                                        MRR impact
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue className='text-[2.2rem]'>{currencySymbol}{centsToDollars(totals?.mrr || 0)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                </>
                                }
                            </>
                        }
                    </CardContent>
                </Card>
            </PostAnalyticsContent>
        </>
    );
};

export default Overview;
