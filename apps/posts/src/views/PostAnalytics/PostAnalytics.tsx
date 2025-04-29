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
            fields: 'title,slug,published_at,uuid'
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
            post_uuid: ''
        };

        if (!isPostLoading && post?.uuid) {
            return {
                ...baseParams,
                post_uuid: post.uuid
            };
        }

        return baseParams;
    }, [isPostLoading, post, statsConfig?.id, startDate, endDate, timezone, audience]);

    const isLoading = isConfigLoading || isPostLoading;

    return (
        <PostAnalyticsLayout>
            <ViewHeader className='items-end pb-4'>
                <div className='flex w-full max-w-[700px] grow flex-col'>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink className='cursor-pointer leading-[24px]' onClick={() => navigate('/posts/', {crossApp: true})}>
                                Posts
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink className='cursor-pointer leading-[24px]' onClick={() => navigate(`/posts/analytics/${postId}`, {crossApp: true})}>
                                Analytics
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage className='leading-[24px]'>
                                Web
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <H1 className='min-h-[35px] indent-0 leading-[1.2em]'>
                        {post && post.title}
                    </H1>
                    {typedPost && typedPost.published_at && (
<<<<<<< Updated upstream
                        <div className='text-grey-600 flex h-9 items-center justify-start text-sm leading-[1.65em]'>
=======
                        <div className='text-grey-600 mt-1 text-sm'>
>>>>>>> Stashed changes
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
