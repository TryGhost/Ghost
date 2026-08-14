import DisabledSourcesIndicator from '../components/disabled-sources-indicator';
import GiftLinkModal from '../modals/gift-link-modal';
import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/kpi-card';
import NewsletterOverview from './components/newsletter-overview';
import PostAnalyticsContent from '../components/post-analytics-content';
import PostAnalyticsHeader from '../components/post-analytics-header';
import WebOverview from './components/web-overview';
import {BarChartLoadingIndicator, Button, Card, CardContent, CardHeader, CardTitle, Skeleton} from '@tryghost/shade/components';
import {KPI_METRICS} from '../Web/components/kpis';
import {KpiDataItem} from '@src/utils/kpi-helpers';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {Post, useGlobalData} from '@src/providers/post-analytics-context';
import {STATS_RANGES} from '@src/utils/constants';
import {centsToDollars} from '../Growth/growth';
import {formatQueryDate, getRangeDates, getRangeForStartDate, sanitizeChartData} from '@tryghost/shade/app';
import {hasBeenEmailed, isPublishedOnly, useNavigate, useTinybirdQuery} from '@tryghost/admin-x-framework';
import {useActiveGiftLink} from '@tryghost/admin-x-framework/api/gift-links';
import {useAppContext} from '@src/providers/posts-app-context';
import {useCanManageGiftLink} from '@src/hooks/use-can-manage-gift-link';
import {useEffect, useMemo, useState} from 'react';
import {useGiftLinkUsage} from '@src/hooks/use-gift-link-usage';
import {usePostReferrers} from '@hooks/use-post-referrers';

const Overview: React.FC = () => {
    const navigate = useNavigate();
    const {statsConfig, isLoading: isConfigLoading, post, isPostLoading, postId} = useGlobalData();
    const {totals, isLoading: isTotalsLoading, currencySymbol} = usePostReferrers(postId);
    const {appSettings} = useAppContext();
    const {emailTrackClicks: emailTrackClicksEnabled, emailTrackOpens: emailTrackOpensEnabled} = appSettings?.analytics || {};
    const webAnalyticsEnabled = appSettings?.analytics?.webAnalytics === true;

    // Gift link card: only for eligible posts. Read the active link (without
    // minting) to scope the usage count to the current token, matching the modal.
    const canManageGiftLink = useCanManageGiftLink(post);
    const {token: giftToken, isLoading: giftTokenLoading, error: giftTokenError} = useActiveGiftLink(postId, {enabled: canManageGiftLink});
    const {usage: giftLinkUsage, loading: giftLinkUsageLoading, error: giftLinkUsageError} = useGiftLinkUsage({postUuid: post?.uuid, token: giftToken, tokenLoading: giftTokenLoading, tokenError: giftTokenError, enabled: canManageGiftLink});
    const [isGiftLinkOpen, setIsGiftLinkOpen] = useState(false);

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
        statsConfig,
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
        statsConfig,
        params: params
    });

    const kpiIsLoading = isConfigLoading || isTotalsLoading || isPostLoading || chartLoading;
    const chartIsLoading = isPostLoading || isConfigLoading || chartLoading;

    // Use the utility function from admin-x-framework
    const showNewsletterSection = hasBeenEmailed(post as Post) && emailTrackOpensEnabled && emailTrackClicksEnabled;
    const showWebSection = !post?.email_only && webAnalyticsEnabled;
    const showGrowthSection = appSettings?.analytics.membersTrackSources;
    const showGiftLinkCard = Boolean(canManageGiftLink && post && appSettings?.analytics.webAnalytics);

    // Redirect to Growth tab if this is a published-only post with web analytics disabled
    // Only redirect if Growth section is available
    useEffect(() => {
        if (!isPostLoading && post && isPublishedOnly(post as Post) && !webAnalyticsEnabled && showGrowthSection) {
            navigate(`/posts/analytics/${postId}/growth`, {replace: true});
        }
    }, [isPostLoading, post, webAnalyticsEnabled, navigate, postId, showGrowthSection]);

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
                <div className='flex flex-col gap-6 lg:grid lg:grid-cols-2'>
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
                    {(showGrowthSection || showGiftLinkCard) && (
                        <div className='col-span-2 flex flex-col gap-6 lg:grid lg:grid-cols-3'>
                            {showGrowthSection && (
                                <Card className={`group overflow-hidden p-0 ${showGiftLinkCard ? 'lg:col-span-2' : 'lg:col-span-3'}`} data-testid='growth'>
                                    <div className='relative flex items-center justify-between gap-6'>
                                        <CardHeader>
                                            <CardTitle className='flex items-center gap-1.5 text-lg'>
                                                <LucideIcon.Sprout size={16} strokeWidth={1.5} />
                                Growth
                                    </CardTitle>
                                </CardHeader>
                                <Button className='absolute right-6 translate-x-10 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 focus-visible:translate-x-0 focus-visible:opacity-100' size='sm' variant='outline' onClick={() => {
                                    navigate(`/posts/analytics/${postId}/growth`);
                                }}>View more</Button>
                            </div>
                            <CardContent className='flex flex-col gap-6 px-0 md:grid md:grid-cols-3 md:items-stretch md:gap-0'>
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
                                            <KpiCardValue className='text-[2.2rem]'>{currencySymbol}{formatNumber(centsToDollars(totals?.mrr || 0))}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                </>
                                        }
                                    </>
                                }
                            </CardContent>
                                </Card>
                            )}
                            {showGiftLinkCard && (
                                <Card className={`group/datalist overflow-hidden ${showGrowthSection ? 'lg:col-span-1' : 'lg:col-span-3'}`} data-testid='gift-link-card'>
                                    <div className='relative flex items-center justify-between gap-6'>
                                        <CardHeader>
                                            <CardTitle className='flex items-center gap-1.5 text-lg'>
                                                <LucideIcon.Gift size={16} strokeWidth={1.5} />
                                                Gift link
                                            </CardTitle>
                                        </CardHeader>
                                        <Button
                                            className='absolute right-6 translate-x-10 opacity-0 transition-all duration-300 group-hover/datalist:translate-x-0 group-hover/datalist:opacity-100 focus-visible:translate-x-0 focus-visible:opacity-100'
                                            size='sm'
                                            variant='outline'
                                            onClick={() => setIsGiftLinkOpen(true)}
                                        >
                                            Share
                                        </Button>
                                    </div>
                                    {!giftLinkUsageLoading && !giftLinkUsageError && (
                                        <CardContent className='flex flex-col gap-1'>
                                            <span className='text-sm text-muted-foreground'>
                                                Visitors
                                            </span>
                                            <span className='text-[2.2rem] leading-none font-semibold'>
                                                {formatNumber(giftLinkUsage?.visits ?? 0)}
                                            </span>
                                        </CardContent>
                                    )}
                                </Card>
                            )}
                        </div>
                    )}
                    {!showWebSection && !showNewsletterSection && !showGrowthSection && !showGiftLinkCard && (
                        <DisabledSourcesIndicator className='col-span-2 py-20' />
                    )}
                </div>
            </PostAnalyticsContent>
            {showGiftLinkCard && (
                <GiftLinkModal
                    key={postId}
                    open={isGiftLinkOpen}
                    postId={postId}
                    onOpenChange={setIsGiftLinkOpen}
                />
            )}
        </>
    );
};

export default Overview;
