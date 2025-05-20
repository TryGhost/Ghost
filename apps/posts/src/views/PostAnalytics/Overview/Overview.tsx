import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import NewsletterOverview from './components/NewsletterOverview';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import WebOverview from './components/WebOverview';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, Separator, formatNumber, formatQueryDate, getRangeDates} from '@tryghost/shade';
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
    const {totals, isLoading} = usePostReferrers(postId || '');
    const {startDate, endDate, timezone} = getRangeDates(STATS_RANGES.ALL_TIME.value);

    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            fields: 'title,slug,published_at,uuid,email,status,count,feature_image',
            include: 'email,authors,tags,tiers,count.clicks,count.signups,count.paid_conversions'
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
    const typedPost = post as Post;
    
    // Use the utility function from admin-x-framework
    const showNewsletterSection = hasBeenEmailed(typedPost);

    return (
        <>
            <PostAnalyticsHeader currentTab='Overview'>
                <div className='flex items-center gap-1 rounded-full bg-green/10 px-3 py-px pr-4 text-nowrap text-xs text-green-600'>
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
                        <CardTitle>Newsletter performance</CardTitle>
                    </CardHeader>
                    <CardContent className='flex items-stretch p-0'>
                        {kpiIsLoading ?
                            ''
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
                                        <KpiCardValue>{formatNumber(kpiValues.visits)}</KpiCardValue>
                                    </KpiCardContent>
                                </KpiCard>
                                <KpiCard className='grow' onClick={() => {
                                    navigate(`/analytics/beta/${postId}/web`);
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
                                        <KpiCardValue>${centsToDollars(totals?.mrr || 0)}</KpiCardValue>
                                    </KpiCardContent>
                                </KpiCard>
                            </>
                        }
                    </CardContent>
                </Card>
                {showNewsletterSection && (
                    <Card className='group/card'>
                        <div className='flex items-center justify-between gap-6'>
                            <CardHeader>
                                <CardTitle>Newsletter performance</CardTitle>
                                <CardDescription>How members interacted with this email</CardDescription>
                            </CardHeader>
                            <Button className='mr-6 opacity-0 transition-all group-hover/card:opacity-100' variant='outline' onClick={() => {
                                navigate(`/analytics/beta/${postId}/newsletter`);
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
                        <WebOverview />
                    </CardContent>
                </Card>
            </PostAnalyticsContent>
        </>
    );
};

export default Overview;
