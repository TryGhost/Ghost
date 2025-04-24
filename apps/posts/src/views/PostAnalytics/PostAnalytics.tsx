import AudienceSelect, {getAudienceQueryParam} from './components/AudienceSelect';
import DateRangeSelect from './components/DateRangeSelect';
import Kpis from './components/Web/Kpis';
import Locations from './components/Web/Locations';
import PostAnalyticsContent from './components/PostAnalyticsContent';
import PostAnalyticsLayout from './layout/PostAnalyticsLayout';
import Sources from './components/Web/Sources';
import moment from 'moment-timezone';
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, H1, ViewHeader, ViewHeaderActions, formatQueryDate} from '@tryghost/shade';
import {Post, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {getRangeDates} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useMemo} from 'react';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';

interface postAnalyticsProps {}

interface PostWithPublishedAt extends Post {
    published_at?: string;
}

const PostAnalytics: React.FC<postAnalyticsProps> = () => {
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    const {range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);
    const {postId} = useParams();
    const navigate = useNavigate();

    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            fields: 'title,slug,published_at'
        }
    });

    // Type assertion for post
    const typedPost = post as PostWithPublishedAt;

    const params = useMemo(() => {
        const baseParams = {
            site_uuid: statsConfig?.id || '',
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate),
            timezone: timezone,
            member_status: getAudienceQueryParam(audience),
            pathname: ''
        };

        if (!isPostLoading && post?.slug) {
            return {
                ...baseParams,
                pathname: `/${post.slug}/`
            };
        }

        return baseParams;
    }, [isPostLoading, post, statsConfig?.id, startDate, endDate, timezone, audience]);

    const isLoading = isConfigLoading || isPostLoading;

    return (
        <PostAnalyticsLayout>
            <ViewHeader className='items-end pb-4 before:hidden'>
                <div className='flex w-full max-w-[700px] grow flex-col'>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink className='cursor-pointer' onClick={() => navigate('/posts/', {crossApp: true})}>
                                Posts
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink className='cursor-pointer' onClick={() => navigate(`/posts/analytics/${postId}`, {crossApp: true})}>
                                Analytics
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>
                                Web
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <H1 className='mt-0.5 min-h-[35px] indent-0'>
                        {post && post.title}
                    </H1>
                    {typedPost && typedPost.published_at && (
                        <div className='mt-1 text-sm text-grey-600'>
                            Published on your site on {moment.utc(typedPost.published_at).format('D MMM YYYY')} at {moment.utc(typedPost.published_at).format('HH:mm')}
                        </div>
                    )}
                </div>
                <ViewHeaderActions className='mb-2'>
                    <AudienceSelect />
                    <DateRangeSelect />
                </ViewHeaderActions>
            </ViewHeader>
            <PostAnalyticsContent>
                {isLoading ? 'Loading' :
                    <>
                        <Kpis queryParams={params} />
                        <div className='grid grid-cols-2 gap-8'>
                            <Sources queryParams={params} />
                            <Locations queryParams={params} />
                        </div>
                    </>
                }
            </PostAnalyticsContent>
        </PostAnalyticsLayout>
    );
};

export default PostAnalytics;
