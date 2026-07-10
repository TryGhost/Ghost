import DateRangeSelect from '@/shared/analytics/date-range-select';
import Kpis from './components/kpis';
import Locations from './components/locations';
import PostAnalyticsContent from '@/posts/analytics/components/post-analytics-content';
import PostAnalyticsHeader from '@/posts/analytics/components/post-analytics-header';
import Sources from './components/sources';
import StatsFilter from '@/shared/analytics/stats-filter';
import {BarChartLoadingIndicator, Card, CardContent, EmptyIndicator, NavbarActions} from '@tryghost/shade/components';
import {Navigate, useNavigate, useParams, useTinybirdQuery} from '@tryghost/admin-x-framework';
import {type KpiDataItem, getWebKpiValues} from '@/posts/analytics/utils/kpi-helpers';
import {LucideIcon, getScrollParent} from '@tryghost/shade/utils';
import {STATS_RANGES, UNKNOWN_LOCATION_VALUES} from '@/shared/analytics/constants';
import {createFilter} from '@tryghost/shade/patterns';
import {formatQueryDate, getRangeDates, getRangeForStartDate} from '@tryghost/shade/app';
import {getAudienceFromFilterValues, getAudienceQueryParam} from '@/shared/analytics/audience';
import {getPeriodText} from '@/shared/analytics/chart-helpers';
import {useAppContext} from '@tryghost/admin-x-framework';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {POST_ANALYTICS_FILTER_FIELDS, useFilterParams} from '@/shared/analytics/use-filter-params';
import {useAnalyticsData} from '@/shared/analytics/use-analytics-data';
import {usePostAnalytics} from '@/posts/analytics/providers/post-analytics-context';

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
    const {statsConfig, isLoading: isConfigLoading, site} = useAnalyticsData();
    const {range, setRange, post, isPostLoading} = usePostAnalytics();
    const {appSettings} = useAppContext();
    const containerRef = useRef<HTMLElement>(null);

    // Use URL-synced filter state for bookmarking and sharing. The 'post'
    // field is not offered here — the surface is already scoped to one post.
    const {filters: analyticsFilters, setFilters: setAnalyticsFilters} = useFilterParams({
        supportedFields: POST_ANALYTICS_FILTER_FIELDS,
        trackingSource: 'post-analytics'
    });

    // Derive audience from filters - URL is the single source of truth
    const audience = useMemo(() => {
        const audienceFilter = analyticsFilters.find(f => f.field === 'audience');
        return getAudienceFromFilterValues(audienceFilter?.values as string[] | undefined);
    }, [analyticsFilters]);

    // Redirect to Overview if this is an email-only post
    useEffect(() => {
        if (!isPostLoading && post?.email_only) {
            navigate(`/posts/analytics/${postId}`);
        }
    }, [isPostLoading, post?.email_only, navigate, postId]);

    // Calculate chart range based on days between today and post publication date
    const chartRange = useMemo(() => {
        if (!post?.published_at) {
            return STATS_RANGES.allTime.value; // Fallback if no publication date
        }
        const calculatedRange = getRangeForStartDate(post.published_at);
        // Resolve the selected range to a concrete day count before clamping to
        // the post's age — "Year to date" is the sentinel -1, not a day count
        const {startDate: rangeStart, endDate: rangeEnd} = getRangeDates(range);
        const rangeInDays = rangeEnd.diff(rangeStart, 'days') + 1;
        if (rangeInDays > calculatedRange) {
            return calculatedRange;
        }
        return range;
    }, [post?.published_at, range]);

    const {startDate, endDate, timezone} = getRangeDates(chartRange);

    // Scroll to top of the scrollable container
    const scrollToTop = useCallback(() => {
        const scrollContainer = getScrollParent(containerRef.current);
        if (scrollContainer) {
            scrollContainer.scrollTo({top: 0, behavior: 'smooth'});
        }
    }, []);

    // Convert filters to query parameters for Tinybird API
    // Note: Currently only 'is' operator is supported by Tinybird pipes
    const filterParams = useMemo(() => {
        const params: Record<string, string> = {};

        analyticsFilters.forEach((filter) => {
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
    }, [analyticsFilters]);

    // Generic handler for click-to-filter on any field (source, location, etc.)
    const handleFilterClick = useCallback((field: string, value: string) => {
        setAnalyticsFilters((prevFilters) => {
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
    }, [setAnalyticsFilters, scrollToTop]);

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
        statsConfig,
        params: params
    });

    // Get locations data
    const {data: locationsData, loading: isLocationsLoading} = useTinybirdQuery({
        endpoint: 'api_top_locations',
        statsConfig,
        params: params
    });

    // Get sources data
    const {data: sourcesData, loading: isSourcesLoading} = useTinybirdQuery({
        endpoint: 'api_top_sources',
        statsConfig,
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

    // Get site URL and icon for source favicons
    const siteUrl = site.url;
    const siteIcon = site.icon;

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
    const hasFilters = analyticsFilters.length > 0;

    // The Web tab is hidden when analytics is off, but a direct link can still land
    // here — redirect to Overview instead of an empty "No visitors" state. Only once
    // settings have loaded, else enabled sites get bounced mid-load.
    if (appSettings && !appSettings.analytics?.webAnalytics) {
        return <Navigate to={`/posts/analytics/${postId}`} replace />;
    }

    return (
        <>
            <PostAnalyticsHeader currentTab='Web'>
                {hasFilters &&
                <NavbarActions>
                    <DateRangeSelect range={range} onRangeChange={setRange} />
                </NavbarActions>
                }
                <NavbarActions className={`${hasFilters ? 'mt-0! [grid-area:subactions] lg:mt-[25px]!' : '[grid-area:actions]'}`}>
                    <StatsFilter
                        filters={analyticsFilters}
                        postUuid={post?.uuid}
                        range={range}
                        onChange={setAnalyticsFilters}
                    />
                    {!hasFilters && <DateRangeSelect range={range} onRangeChange={setRange} />}
                </NavbarActions>
            </PostAnalyticsHeader>
            <PostAnalyticsContent ref={containerRef}>
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
                                    onLocationClick={handleLocationClick}
                                />
                                <Sources
                                    data={sourcesData}
                                    range={chartRange}
                                    siteIcon={siteIcon}
                                    siteUrl={siteUrl}
                                    totalVisitors={totalSourcesVisits}
                                    onSourceClick={handleSourceClick}
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
