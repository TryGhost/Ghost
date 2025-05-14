import AudienceSelect from './components/AudienceSelect';
import DateRangeSelect from './components/DateRangeSelect';
// import Kpis from './components/Web/Kpis';
// import Locations from './components/Web/Locations';
import PostAnalyticsContent from './components/PostAnalyticsContent';
import PostAnalyticsHeader from './components/PostAnalyticsHeader';
import PostAnalyticsLayout from './layout/PostAnalyticsLayout';
// import Sources from './components/Web/Sources';
import {ViewHeader, ViewHeaderActions} from '@tryghost/shade';
// import {getRangeDates} from '@src/utils/chart-helpers';
// import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
// import {useGlobalData} from '@src/providers/GlobalDataProvider';
// import {useMemo} from 'react';
// import {useParams} from '@tryghost/admin-x-framework';

interface postAnalyticsProps {
    children?: React.ReactNode;
}

const Overview: React.FC<postAnalyticsProps> = ({children}) => {
    // const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    // const {range, audience} = useGlobalData();
    // const {startDate, endDate, timezone} = getRangeDates(range);
    // const {postId} = useParams();

    // const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
    //     searchParams: {
    //         filter: `id:${postId}`,
    //         fields: 'title,slug,published_at,uuid'
    //     }
    // });

    // const params = useMemo(() => {
    //     const baseParams = {
    //         site_uuid: statsConfig?.id || '',
    //         date_from: formatQueryDate(startDate),
    //         date_to: formatQueryDate(endDate),
    //         timezone: timezone,
    //         member_status: getAudienceQueryParam(audience),
    //         post_uuid: ''
    //     };

    //     if (!isPostLoading && post?.uuid) {
    //         return {
    //             ...baseParams,
    //             post_uuid: post.uuid
    //         };
    //     }

    //     return baseParams;
    // }, [isPostLoading, post, statsConfig?.id, startDate, endDate, timezone, audience]);

    // const isLoading = isConfigLoading || isPostLoading;

    return (
        <PostAnalyticsLayout>
            <ViewHeader className='items-end pb-4'>
                <PostAnalyticsHeader currentTab='Overview' />
                <ViewHeaderActions className='mb-2'>
                    <AudienceSelect />
                    <DateRangeSelect />
                </ViewHeaderActions>
            </ViewHeader>
            <PostAnalyticsContent>
                {/* {isLoading ? 'Loading' :
                    <>
                        <Kpis queryParams={params} />
                        <div className='grid grid-cols-2 gap-6'>
                            <Sources queryParams={params} />
                            <Locations queryParams={params} />
                        </div>
                    </>
                } */}
                {children || <div>Hey analytics overview</div>}
            </PostAnalyticsContent>
        </PostAnalyticsLayout>
    );
};

export default Overview;
