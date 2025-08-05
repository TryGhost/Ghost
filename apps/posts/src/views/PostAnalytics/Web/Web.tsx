import AudienceSelect, {getAudienceQueryParam} from '../components/AudienceSelect';
import DateRangeSelect from '../components/DateRangeSelect';
import Kpis from './components/Kpis';
import Locations from './components/Locations';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import Sources from './components/Sources';
import {BarChartLoadingIndicator, Card, CardContent, EmptyIndicator, LucideIcon, formatQueryDate, getRangeDates, getRangeForStartDate} from '@tryghost/shade';
import {BaseSourceData, useNavigate, useParams, useTinybirdQuery} from '@tryghost/admin-x-framework';
import {KpiDataItem, getWebKpiValues} from '@src/utils/kpi-helpers';

import {useEffect, useMemo} from 'react';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';

import {STATS_RANGES} from '@src/utils/constants';
import {getPeriodText} from '@src/utils/chart-helpers';

// Array of values that represent unknown locations
const UNKNOWN_LOCATIONS = ['NULL', 'ᴺᵁᴸᴸ', ''];

interface ProcessedLocationData {
    location: string;
    visits: number;
    percentage: number;
}

interface postAnalyticsProps {}

const Web: React.FC<postAnalyticsProps> = () => {
    const navigate = useNavigate();
    const {postId} = useParams();
    const {statsConfig, isLoading: isConfigLoading, range, audience, data: globalData, post, isPostLoading} = useGlobalData();

    // Redirect to Overview if this is an email-only post
    useEffect(() => {
        if (!isPostLoading && post?.email_only) {
            navigate(`/analytics/${postId}`);
        }
    }, [isPostLoading, post?.email_only, navigate, postId]);

    // Calculate chart range based on days between today and post publication date
    const chartRange = useMemo(() => {
        if (!post?.published_at) {
            return STATS_RANGES.ALL_TIME.value; // Fallback if no publication date
        }
        const calculatedRange = getRangeForStartDate(post.published_at);
        if (range > calculatedRange) {
            return calculatedRange;
        }
        return range;
    }, [post?.published_at, range]);

    const {startDate, endDate, timezone} = getRangeDates(chartRange);

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
    const {data: kpiData, loading: isKpisLoading} = useTinybirdQuery({
        endpoint: 'api_kpis',
        statsConfig: statsConfig || {id: ''},
        params: params
    });

    // Get locations data
    const {data: locationsData, loading: isLocationsLoading} = useTinybirdQuery({
        endpoint: 'api_top_locations',
        statsConfig: statsConfig || {id: ''},
        params: params
    });

    // Get sources data
    const {data: sourcesData, loading: isSourcesLoading} = useTinybirdQuery({
        endpoint: 'api_top_sources',
        statsConfig: statsConfig || {id: ''},
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
                            <Kpis
                                data={kpiData as KpiDataItem[] | null}
                                range={chartRange}
                            />
                            <div className='flex flex-col gap-8 lg:grid lg:grid-cols-2'>
                                <Locations
                                    data={processedLocationsData}
                                    isLoading={isLocationsLoading}
                                />
                                <Sources
                                    data={sourcesData as BaseSourceData[] | null}
                                    range={chartRange}
                                    siteIcon={siteIcon}
                                    siteUrl={testingSiteUrl}
                                    totalVisitors={totalSourcesVisits}
                                />
                            </div>
                        </>
                        :
                        <div className='grow'>
                            <EmptyIndicator
                                className='h-full'
                                description='Try adjusting your date range to see more data.'
                                title={`No visitors ${getPeriodText(range)}`}
                            >
                                <LucideIcon.Globe strokeWidth={1.5} />
                            </EmptyIndicator>
                        </div>
                }
            </PostAnalyticsContent>
        </>
    );
};

export default Web;
