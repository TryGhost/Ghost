import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import NewsletterOverview from './components/NewsletterOverview';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import WebOverview from './components/WebOverview';
import {BarChartLoadingIndicator, Button, Card, CardContent, CardHeader, CardTitle, LucideIcon, Skeleton, formatNumber, formatQueryDate, getRangeDates, getRangeForStartDate, sanitizeChartData} from '@tryghost/shade';
import {KPI_METRICS} from '../Web/components/Kpis';
import {KpiDataItem} from '@src/utils/kpi-helpers';
import {Post, useGlobalData} from '@src/providers/PostAnalyticsContext';
import {STATS_RANGES} from '@src/utils/constants';
import {centsToDollars} from '../Growth/Growth';
import {hasBeenEmailed, isPublishedOnly, useNavigate, useTinybirdQuery} from '@tryghost/admin-x-framework';
import {useAppContext} from '@src/App';
import {useEffect, useMemo} from 'react';
import {usePostReferrers} from '@src/hooks/usePostReferrers';

const Overview: React.FC = () => {
    const navigate = useNavigate();
    const {statsConfig, isLoading: isConfigLoading, post, isPostLoading, postId} = useGlobalData();
    const {totals, isLoading: isTotalsLoading, currencySymbol} = usePostReferrers(postId);
    const {appSettings} = useAppContext();
    const {emailTrackClicks: emailTrackClicksEnabled, emailTrackOpens: emailTrackOpensEnabled} = appSettings?.analytics || {};

    // Calculate chart range based on days between today and post publication date
    const chartRange = useMemo(() => {
        if (!post?.published_at) {
            return STATS_RANGES.ALL_TIME.value; // Fallback if no publication date
        }
        const calculatedRange = getRangeForStartDate(post.published_at);
        return calculatedRange;
    }, [post?.published_at]);

    const {startDate: chartStartDate, endDate: chartEndDate, timezone: chartTimezone} = getRangeDates(chartRange);

    // Params for KPI data (both chart and totals)
    const params = useMemo(() => {
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

    const {data: chartData, loading: chartLoading} = useTinybirdQuery({
        endpoint: 'api_kpis',
        statsConfig: statsConfig || {id: ''},
        params: params
    });

    // Calculate total visitors as a number for WebOverview component
    const totalVisitors = useMemo(() => {
        if (!chartData?.length) {
            return 0;
        }
        return chartData.reduce((sum, item) => {
            const visits = Number(item.visits);
            return sum + (isNaN(visits) ? 0 : visits);
        }, 0);
    }, [chartData]);

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
    const {data: sourcesData, loading: isSourcesLoading} = useTinybirdQuery({
        endpoint: 'api_top_sources',
        statsConfig: statsConfig || {id: ''},
        params: params
    });

    const kpiIsLoading = isConfigLoading || isTotalsLoading || isPostLoading || chartLoading;
    const chartIsLoading = isPostLoading || isConfigLoading || chartLoading;

    // Use the utility function from admin-x-framework
    const showNewsletterSection = hasBeenEmailed(post as Post) && emailTrackOpensEnabled && emailTrackClicksEnabled;
    const showWebSection = !post?.email_only && appSettings?.analytics.webAnalytics;

    // Redirect to Growth tab if this is a published-only post with web analytics disabled
    useEffect(() => {
        if (!isPostLoading && post && isPublishedOnly(post as Post) && !appSettings?.analytics.webAnalytics) {
            navigate(`/analytics/${postId}/growth`);
        }
    }, [isPostLoading, post, appSettings?.analytics.webAnalytics, navigate, postId]);

    // First we have to wait for the post to be loaded to determine what sections (web, newsletter etc.) should be displayed
    if (isPostLoading) {
        return (
            <BarChartLoadingIndicator />
        );
    }

    return (
        <>
            <PostAnalyticsHeader currentTab='Overview' />
            <PostAnalyticsContent>
                <div className='flex flex-col gap-8 lg:grid lg:grid-cols-2'>
                    {showWebSection && (
                        <WebOverview
                            chartData={processedChartData}
                            isLoading={chartIsLoading || kpiIsLoading || isSourcesLoading}
                            isNewsletterShown={showNewsletterSection}
                            range={chartRange}
                            sourcesData={sourcesData}
                            visitors={totalVisitors}
                        />
                    )}
                    {showNewsletterSection && (
                        <NewsletterOverview
                            isNewsletterStatsLoading={isPostLoading}
                            isWebShown={showWebSection}
                            post={post as Post}
                        />
                    )}
                    <Card className='group col-span-2 overflow-hidden p-0'>
                        <div className='relative flex items-center justify-between gap-6' data-testid='growth'>
                            <CardHeader>
                                <CardTitle className='flex items-center gap-1.5 text-lg'>
                                    <LucideIcon.Sprout size={16} strokeWidth={1.5} />
                                Growth
                                </CardTitle>
                            </CardHeader>
                            <Button className='absolute right-6 translate-x-10 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100' size='sm' variant='outline' onClick={() => {
                                navigate(`/analytics/${postId}/growth`);
                            }}>View more</Button>
                        </div>
                        <CardContent className='flex flex-col gap-8 px-0 md:grid md:grid-cols-3 md:items-stretch md:gap-0'>
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
                </div>
            </PostAnalyticsContent>
        </>
    );
};

export default Overview;
