import DateRangeSelect from '../components/DateRangeSelect';
import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import NewsletterOverview from './components/NewsletterPerformance';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import WebOverview from './components/WebPerformance';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, Separator, formatNumber, formatQueryDate} from '@tryghost/shade';
import {KpiDataItem, getWebKpiValues} from '@src/utils/kpi-helpers';
import {centsToDollars} from '../Growth/Growth';
import {getRangeDates} from '@src/utils/chart-helpers';
import {getStatEndpointUrl, getToken, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useMemo} from 'react';
import {usePostReferrers} from '@src/hooks/usePostReferrers';
import {useQuery} from '@tinybirdco/charts';

const Overview: React.FC = () => {
    const {postId} = useParams();
    const navigate = useNavigate();
    const {range, statsConfig, isLoading: isConfigLoading} = useGlobalData();
    const {totals, isLoading} = usePostReferrers(postId || '');
    const {startDate, endDate, timezone} = getRangeDates(range);

    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            fields: 'title,slug,published_at,uuid'
        }
    });

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

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_kpis'),
        token: getToken(statsConfig),
        params: params
    });

    const kpiValues = getWebKpiValues(data as unknown as KpiDataItem[] | null);

    const kpiIsLoading = isLoading || isConfigLoading || loading;

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
                        {kpiIsLoading ?
                            ''
                            :
                            <>
                                <KpiCard className='grow' onClick={() => {
                                    navigate(`/analytics/x/${postId}/web`);
                                }}>
                                    <KpiCardLabel>
                                        <LucideIcon.MousePointer size={16} strokeWidth={1.5} />
                                    Unique visitors
                                    </KpiCardLabel>
                                    <KpiCardContent>
                                        <KpiCardValue>{formatNumber(kpiValues.visits)}</KpiCardValue>
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
                                        <KpiCardValue>{formatNumber(kpiValues.views)}</KpiCardValue>
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
                                        <KpiCardValue>{formatNumber((totals?.free_members || 0) + (totals?.paid_members || 0))}</KpiCardValue>
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
                                        <KpiCardValue>${centsToDollars(totals?.mrr || 0)}</KpiCardValue>
                                    </KpiCardContent>
                                </KpiCard>
                            </>
                        }
                    </CardContent>
                </Card>
                <Card className='group/card'>
                    <div className='flex items-center justify-between gap-6'>
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
                        <Separator />
                        <NewsletterOverview />
                    </CardContent>
                </Card>
                <Card className='group/card'>
                    <div className='flex items-center justify-between gap-6'>
                        <CardHeader>
                            <CardTitle>Web performance</CardTitle>
                            <CardDescription>Unique visitors since you published this post</CardDescription>
                        </CardHeader>
                        <Button className='mr-6 opacity-0 transition-all group-hover/card:opacity-100' variant='outline' onClick={() => {
                            navigate(`/analytics/x/${postId}/web`);
                        }}>
                                View more
                            <LucideIcon.ArrowRight />
                        </Button>
                    </div>
                    <CardContent>
                        <Separator />
                        <WebOverview />
                    </CardContent>
                </Card>
            </PostAnalyticsContent>
        </>
    );
};

export default Overview;
