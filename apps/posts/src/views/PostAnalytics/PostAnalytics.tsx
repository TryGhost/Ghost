import AudienceSelect, {getAudienceQueryParam} from './components/AudienceSelect';
import DateRangeSelect from './components/DateRangeSelect';
import Kpis from './components/Web/Kpis';
import Locations from './components/Web/Locations';
import PostAnalyticsLayout from './layout/PostAnalyticsLayout';
import PostAnalyticsView from './components/PostAnalyticsView';
import Sources from './components/Web/Sources';
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Card, CardContent, CardDescription, CardHeader, CardTitle, H1, ViewHeader, ViewHeaderActions, formatQueryDate} from '@tryghost/shade';
import {getPeriodText, getRangeDates} from '@src/utils/chart-helpers';
import {getStatEndpointUrl, getToken} from '@src/config/stats-config';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {useQuery} from '@tinybirdco/charts';

interface postAnalyticsProps {};

const PostAnalytics: React.FC<postAnalyticsProps> = () => {
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    const {range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);
    const {postId} = useParams();
    const navigate = useNavigate();

    const params = {
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience)
    };

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_pages'),
        token: getToken(statsConfig),
        params
    });

    const isLoading = isConfigLoading || loading;

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
                    <H1 className='mt-0.5 min-h-[35px] indent-0'>Post title</H1>
                </div>
                <ViewHeaderActions className='mb-2'>
                    <AudienceSelect />
                    <DateRangeSelect />
                </ViewHeaderActions>
            </ViewHeader>
            <PostAnalyticsView data={data} isLoading={isLoading}>
                <Card>
                    <CardContent>
                        <Kpis />
                    </CardContent>
                </Card>
                <div className='grid grid-cols-2 gap-8'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Top sources</CardTitle>
                            <CardDescription>Your highest viewed posts or pages {getPeriodText(range)}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Sources />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Locations</CardTitle>
                            <CardDescription>Where are your readers {getPeriodText(range)}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Locations />
                        </CardContent>
                    </Card>
                </div>
            </PostAnalyticsView>
        </PostAnalyticsLayout>
    );
};

export default PostAnalytics;
