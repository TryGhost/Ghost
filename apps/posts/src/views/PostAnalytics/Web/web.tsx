import AudienceSelect, {getAudienceFromFilterValues, getAudienceQueryParam} from '../components/audience-select';
import DateRangeSelect from '../components/date-range-select';
import Kpis from './components/kpis';
import Locations from './components/locations';
import PostAnalyticsContent from '../components/post-analytics-content';
import PostAnalyticsHeader from '../components/post-analytics-header';
import Sources from './components/sources';
import StatsFilter from '../components/stats-filter';
import {BarChartLoadingIndicator, Card, CardContent, EmptyIndicator, LucideIcon, NavbarActions, createFilter, formatQueryDate, getRangeDates, getRangeForStartDate} from '@tryghost/shade';
import {BaseSourceData, useNavigate, useParams, useTinybirdQuery} from '@tryghost/admin-x-framework';
import {KpiDataItem, getWebKpiValues} from '@src/utils/kpi-helpers';

import {useCallback, useEffect, useMemo} from 'react';
import {useFilterParams} from '@src/hooks/use-filter-params';
import {useGlobalData} from '@src/providers/post-analytics-context';

import {STATS_RANGES, UNKNOWN_LOCATION_VALUES} from '@src/utils/constants';
import {getPeriodText} from '@src/utils/chart-helpers';

interface ProcessedLocationData {
    location: string;
    visits: number;
    percentage: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface postAnalyticsProps {}

const Web: React.FC<postAnalyticsProps> = () => {
    const navigate = useNavigate();
    const {postId} = useParams();
    const {statsConfig, isLoading: isConfigLoading, range, audience: globalAudience, data: globalData, post, isPostLoading} = useGlobalData();

    // Use URL-synced filter state for bookmarking and sharing
    const {filters: utmFilters, setFilters: setUtmFilters} = useFilterParams();

    // Check if UTM tracking is enabled in labs
    const utmTrackingEnabled = globalData?.labs?.utmTracking || false;

    // Derive audience from filters when UTM tracking is enabled, otherwise use global state
    // This makes the URL the single source of truth for filters
    const audience = useMemo(() => {
        if (!utmTrackingEnabled) {
            return globalAudience;
        }
        const audienceFilter = utmFilters.find(f => f.field === 'audience');
        return getAudienceFromFilterValues(audienceFilter?.values as string[] | undefined);
    }, [utmTrackingEnabled, globalAudience, utmFilters]);

    // Redirect to Overview if this is an email-only post
    useEffect(() => {
        if (!isPostLoading && post?.email_only) {
            navigate(`/posts/analytics/${postId}`);
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

    // Scroll to top of the scrollable container
    const scrollToTop = useCallback(() => {
        const scrollContainer = document.querySelector('.overflow-y-scroll');
        if (scrollContainer) {
            scrollContainer.scrollTo({top: 0, behavior: 'smooth'});
        }
    }, []);

    // Convert filters to query parameters for Tinybird API
    // Note: Currently only 'is' operator is supported by Tinybird pipes
    const filterParams = useMemo(() => {
        const params: Record<string, string> = {};

        utmFilters.forEach((filter) => {
            const fieldKey = filter.field;
            const values = filter.values;

            // Skip audience filter - it's handled separately via member_status
            if (fieldKey === 'audience') {
                return;
            }

            // Check if we have a value to filter on
            // Allow empty string for 'source' field (used for "Direct" traffic)
            const hasValue = values && values.length > 0 && values[0] !== null && values[0] !== undefined;
            const isEmptySourceFilter = fieldKey === 'source' && values?.[0] === '';

            if (hasValue && (values[0] !== '' || isEmptySourceFilter)) {
                const value = String(values[0]);
                params[fieldKey] = value;
            }
        });

        return params;
    }, [utmFilters]);

    // Generic handler for click-to-filter on any field (source, location, etc.)
    const handleFilterClick = useCallback((field: string, value: string) => {
        setUtmFilters((prevFilters) => {
            const existingFilter = prevFilters.find(f => f.field === field);
            if (existingFilter) {
                // Update the existing filter
                return prevFilters.map((f) => {
                    return f.field === field ? {...f, values: [value]} : f;
                });
            }
            // Add a new filter
            return [...prevFilters, createFilter(field, 'is', [value])];
        });
        scrollToTop();
    }, [setUtmFilters, scrollToTop]);

    const handleLocationClick = useCallback((location: string) => handleFilterClick('location', location), [handleFilterClick]);
    const handleSourceClick = useCallback((source: string) => handleFilterClick('source', source), [handleFilterClick]);

    // Get params
    const params = useMemo(() => {
        const baseParams = {
            site_uuid: statsConfig?.id || '',
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate),
            timezone: timezone,
            member_status: getAudienceQueryParam(audience),
            post_uuid: '',
            ...filterParams
        };

        if (!isPostLoading && post?.uuid) {
            return {
                ...baseParams,
                post_uuid: post.uuid
            };
        }

        return baseParams;
    }, [isPostLoading, post, statsConfig?.id, startDate, endDate, timezone, audience, filterParams]);

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

    // Memoize the processed locations data with percentages
    const processedLocationsData = useMemo<ProcessedLocationData[]>(() => {
        const processed = locationsData?.map(row => ({
            location: String(row.location),
            visits: Number(row.visits),
            percentage: totalVisits > 0 ? (Number(row.visits) / totalVisits) : 0,
            isUnknown: UNKNOWN_LOCATION_VALUES.includes(String(row.location))
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

    // Check if filters are applied
    const hasFilters = utmFilters.length > 0;

    return (
        <>
            <PostAnalyticsHeader currentTab='Web'>
                {!utmTrackingEnabled ?
                    <NavbarActions>
                        <AudienceSelect />
                        <DateRangeSelect />
                    </NavbarActions>
                    :
                    <>
                        {hasFilters &&
                        <NavbarActions>
                            <DateRangeSelect />
                        </NavbarActions>
                        }
                        <NavbarActions className={`${hasFilters ? '!mt-0 [grid-area:subactions] lg:!mt-[25px]' : '[grid-area:actions]'}`}>
                            <StatsFilter
                                filters={utmFilters}
                                utmTrackingEnabled={utmTrackingEnabled}
                                onChange={setUtmFilters}
                            />
                            {!hasFilters && <DateRangeSelect />}
                        </NavbarActions>
                    </>
                }
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
                            <div className='flex flex-col gap-6 lg:grid lg:grid-cols-2'>
                                <Locations
                                    data={processedLocationsData}
                                    isLoading={isLocationsLoading}
                                    onLocationClick={utmTrackingEnabled ? handleLocationClick : undefined}
                                />
                                <Sources
                                    data={sourcesData as BaseSourceData[] | null}
                                    range={chartRange}
                                    siteIcon={siteIcon}
                                    siteUrl={siteUrl}
                                    totalVisitors={totalSourcesVisits}
                                    onSourceClick={utmTrackingEnabled ? handleSourceClick : undefined}
                                />
                            </div>
                        </>
                        :
                        <div className='grow'>
                            <EmptyIndicator
                                className='h-full'
                                description='Try adjusting filters to see more data.'
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
