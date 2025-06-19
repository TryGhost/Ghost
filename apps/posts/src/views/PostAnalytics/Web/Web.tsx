import AudienceSelect, {getAudienceQueryParam} from '../components/AudienceSelect';
import DateRangeSelect from '../components/DateRangeSelect';
import EmptyStatView from '../components/EmptyStatView';
import Kpis from './components/Kpis';
import Locations from './components/Locations';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import Sources from './components/Sources';
import {BarChartLoadingIndicator, Card, CardContent, formatQueryDate, getRangeDates} from '@tryghost/shade';
import {BaseSourceData, getStatEndpointUrl, getToken} from '@tryghost/admin-x-framework';
import {KpiDataItem, getWebKpiValues} from '@src/utils/kpi-helpers';

import {useGlobalData} from '@src/providers/PostAnalyticsContext';
import {useMemo} from 'react';

import {useQuery} from '@tinybirdco/charts';

// Array of values that represent unknown locations
const UNKNOWN_LOCATIONS = ['NULL', 'ᴺᵁᴸᴸ', ''];

interface ProcessedLocationData {
    location: string;
    visits: number;
    percentage: number;
}

interface postAnalyticsProps {}

const Web: React.FC<postAnalyticsProps> = () => {
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    const {range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    // Get global data for site info
    const {data: globalData} = useGlobalData();

    // Get post data from context
    const {post, isPostLoading} = useGlobalData();

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

    // Get locations data
    const {data: locationsData, loading: isLocationsLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_locations'),
        token: getToken(statsConfig),
        params: params
    });

    // Get sources data
    const {data: sourcesData, loading: isSourcesLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_sources'),
        token: getToken(statsConfig),
        params: params
    });

    // Calculate total visits for percentage calculation
    const totalVisits = useMemo(() => locationsData?.reduce((sum, row) => sum + Number(row.visits), 0) || 0,
        [locationsData]
    );

    // Calculate total visits for sources percentage calculation
    const totalSourcesVisits = useMemo(() => {
        if (!sourcesData) {
            return 0;
        }
        return sourcesData.reduce((sum, source) => sum + Number(source.visits || 0), 0);
    }, [sourcesData]);

    // Get site URL and icon from global data
    const siteUrl = globalData?.url as string | undefined;
    const siteIcon = globalData?.icon as string | undefined;

    // TEMPORARY: For testing levernews.com direct traffic grouping
    // Remove this line when done testing
    const testingSiteUrl = siteUrl || 'https://levernews.com';

    // Memoize the processed locations data with percentages
    const processedLocationsData = useMemo<ProcessedLocationData[]>(() => {
        const processed = locationsData?.map(row => ({
            location: String(row.location),
            visits: Number(row.visits),
            percentage: totalVisits > 0 ? (Number(row.visits) / totalVisits) : 0,
            isUnknown: UNKNOWN_LOCATIONS.includes(String(row.location))
        })) || [];

        // Separate known and unknown locations
        const knownLocations = processed.filter(item => !item.isUnknown);
        const unknownLocations = processed.filter(item => item.isUnknown);

        // Combine unknown locations into a single entry
        const combinedUnknown = unknownLocations.length > 0 ? [{
            location: 'Unknown',
            visits: unknownLocations.reduce((sum, item) => sum + item.visits, 0),
            percentage: unknownLocations.reduce((sum, item) => sum + item.percentage, 0)
        }] : [];

        // Return combined array with known locations first, followed by the combined unknown entry
        return [...knownLocations, ...combinedUnknown];
    }, [locationsData, totalVisits]);

    const isPageLoading = isConfigLoading || isPostLoading || isKpisLoading || isLocationsLoading || isSourcesLoading;

    const kpiValues = getWebKpiValues(kpiData as unknown as KpiDataItem[] | null);

    return (
        <>
            <PostAnalyticsHeader currentTab='Web'>
                <AudienceSelect />
                <DateRangeSelect />
            </PostAnalyticsHeader>
            <PostAnalyticsContent>
                {isPageLoading ?
                    <Card className='size-full' variant='plain'>
                        <CardContent className='size-full items-center justify-center'>
                            <BarChartLoadingIndicator />
                        </CardContent>
                    </Card>
                    :
                    kpiData && kpiData.length !== 0 && kpiValues.visits !== '0' ?
                        <>
                            <Kpis data={kpiData as KpiDataItem[] | null} />
                            <div className='grid grid-cols-2 gap-8'>
                                <Locations
                                    data={processedLocationsData}
                                    isLoading={isLocationsLoading}
                                />
                                <Sources
                                    data={sourcesData as BaseSourceData[] | null}
                                    range={range}
                                    siteIcon={siteIcon}
                                    siteUrl={testingSiteUrl}
                                    totalVisitors={totalSourcesVisits}
                                />
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
