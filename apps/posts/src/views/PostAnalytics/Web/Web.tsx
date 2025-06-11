import AudienceSelect, {getAudienceQueryParam} from '../components/AudienceSelect';
import DateRangeSelect from '../components/DateRangeSelect';
import EmptyStatView from '../components/EmptyStatView';
import Kpis from './components/Kpis';
import Locations from './components/Locations';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import Sources from './components/Sources';
import {BarChartLoadingIndicator, Card, CardContent, formatQueryDate, getRangeDates} from '@tryghost/shade';
import {KpiDataItem, getWebKpiValues} from '@src/utils/kpi-helpers';
import {getStatEndpointUrl, getToken} from '@tryghost/admin-x-framework';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';
import {useMemo} from 'react';
import {useParams} from '@tryghost/admin-x-framework';
import {useQuery} from '@tinybirdco/charts';

interface postAnalyticsProps {}

const Web: React.FC<postAnalyticsProps> = () => {
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    const {range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);
    const {postId} = useParams();

    // Get post data
    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            fields: 'title,slug,published_at,uuid'
        }
    });

    // Get params
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

    // Get web kpi data
    const {data: kpiData, loading: isKpisLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_kpis'),
        token: getToken(statsConfig),
        params: params
    });

    const isPageLoading = isConfigLoading || isPostLoading || isKpisLoading;

    const kpiValues = getWebKpiValues(kpiData as unknown as KpiDataItem[] | null);

    return (
        <>
            <PostAnalyticsHeader currentTab='Web'>
                <AudienceSelect />
                <DateRangeSelect />
            </PostAnalyticsHeader>
            <PostAnalyticsContent>
                {isPageLoading ?
                    <Card className='size-full'>
                        <CardContent className='size-full items-center justify-center'>
                            <BarChartLoadingIndicator />
                        </CardContent>
                    </Card>
                    :
                    kpiData && kpiData.length !== 0 && kpiValues.visits !== '0' ?
                        <>
                            <Kpis data={kpiData as KpiDataItem[] | null} />
                            <div className='grid grid-cols-2 gap-8'>
                                <Locations queryParams={params} />
                                <Sources queryParams={params} />
                            </div>
                        </>
                        :
                        <div className='mt-10 grow'>
                            <EmptyStatView />
                        </div>
                }
            </PostAnalyticsContent>
        </>
    );
};

export default Web;
