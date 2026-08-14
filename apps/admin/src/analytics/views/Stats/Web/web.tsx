import DateRangeSelect from '@/analytics/views/Stats/components/date-range-select';
import LocationsCard from '@/analytics/views/Stats/Locations/components/locations-card';
import React, {useCallback, useMemo, useRef} from 'react';
import SourcesCard from './components/sources-card';
import StatsFilter from '@/analytics/views/Stats/components/stats-filter';
import StatsHeader from '@/analytics/views/Stats/layout/stats-header';
import StatsLayout from '@/analytics/views/Stats/layout/stats-layout';
import StatsView from '@/analytics/views/Stats/layout/stats-view';
import TopContent from './components/top-content';
import WebKPIs, {type KpiDataItem} from './components/web-kpis';
import {Card, CardContent, NavbarActions} from '@tryghost/shade/components';
import {Navigate, useAppContext, useTinybirdQuery} from '@tryghost/admin-x-framework';
import {STATS_DEFAULT_SOURCE_ICON_URL} from '@/analytics/utils/constants';
import {createFilter} from '@tryghost/shade/patterns';
import {getScrollParent} from '@tryghost/shade/utils';
import {formatQueryDate, getRangeDates} from '@tryghost/shade/app';
import {getAudienceFromFilterValues, getAudienceQueryParam} from '@/analytics/utils/audience';
import {useFilterParams} from '@/analytics/hooks/use-filter-params';
import {useAnalytics} from '@/analytics/providers/analytics-context';
import {useAnalyticsData} from '@/analytics/hooks/use-analytics-data';

const Web: React.FC = () => {
    const {range} = useAnalytics();
    const {statsConfig, isLoading: isConfigLoading, site} = useAnalyticsData();
    const {startDate, endDate, timezone} = getRangeDates(range);
    const {appSettings} = useAppContext();
    const webAnalyticsEnabled = appSettings?.analytics?.webAnalytics === true;

    const containerRef = useRef<HTMLDivElement>(null);

    // Use URL-synced filter state for bookmarking and sharing
    const {filters: analyticsFilters, setFilters: setAnalyticsFilters} = useFilterParams();

    // Derive audience from filters - URL is the single source of truth
    const audience = useMemo(() => {
        const audienceFilter = analyticsFilters.find(f => f.field === 'audience');
        return getAudienceFromFilterValues(audienceFilter?.values as string[] | undefined);
    }, [analyticsFilters]);

    // Get site URL and icon for domain comparison and Direct traffic favicon
    const siteUrl = site.url;
    const siteIcon = site.icon;

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

                // Map filter field names to Tinybird parameter names
                // UTM fields map directly, but post needs special handling
                if (fieldKey === 'post') {
                    // Determine if the value is a post_uuid or a pathname
                    // Pathnames start with '/' while UUIDs don't
                    if (value.startsWith('/')) {
                        params.pathname = value;
                    } else {
                        params.post_uuid = value;
                    }
                } else {
                    params[fieldKey] = value;
                }
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

    // Prepare query parameters - memoized to prevent unnecessary refetches
    const params = useMemo(() => ({
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience),
        ...filterParams
    }), [statsConfig?.id, startDate, endDate, timezone, audience, filterParams]);

    // Get KPI data
    const {data: kpiData, loading: kpiLoading} = useTinybirdQuery({
        endpoint: 'api_kpis',
        statsConfig,
        params
    });

    // Get top sources data
    const {data: sourcesData, loading: isSourcesLoading} = useTinybirdQuery({
        endpoint: 'api_top_sources',
        statsConfig,
        params
    });

    // Get top locations data
    const {data: locationsData, loading: isLocationsLoading} = useTinybirdQuery({
        endpoint: 'api_top_locations',
        statsConfig,
        params
    });

    // Get total visitors for table
    const totalVisitors = kpiData?.length ? kpiData.reduce((sum, item) => sum + Number(item.visits), 0) : 0;

    // Calculate combined loading state
    const isPageLoading = isConfigLoading;

    if (!webAnalyticsEnabled) {
        return (
            <Navigate to='/' />
        );
    }

    // Check if filters are applied
    const hasFilters = analyticsFilters.length > 0;

    return (
        <StatsLayout ref={containerRef}>
            <StatsHeader>
                {hasFilters &&
                <NavbarActions>
                    <DateRangeSelect />
                </NavbarActions>
                }
                <NavbarActions className={`${hasFilters ? 'mt-0! [grid-area:subactions] lg:mt-[25px]!' : '[grid-area:actions]'}`}>
                    <StatsFilter
                        filters={analyticsFilters}
                        onChange={setAnalyticsFilters}
                    />
                    {!hasFilters && <DateRangeSelect />}
                </NavbarActions>
            </StatsHeader>
            <StatsView isLoading={isPageLoading} loadingComponent={<></>}>
                <Card>
                    <CardContent>
                        <WebKPIs
                            data={kpiData as KpiDataItem[] | null}
                            isLoading={kpiLoading}
                            range={range}
                        />
                    </CardContent>
                </Card>
                <div className='flex grid-cols-2 flex-col gap-6 lg:grid'>
                    <TopContent
                        audience={audience}
                        filterParams={filterParams}
                        range={range}
                        totalVisitors={totalVisitors}
                    />
                    <SourcesCard
                        data={sourcesData}
                        defaultSourceIconUrl={STATS_DEFAULT_SOURCE_ICON_URL}
                        isLoading={isSourcesLoading}
                        range={range}
                        siteIcon={siteIcon}
                        siteUrl={siteUrl}
                        totalVisitors={totalVisitors}
                        onSourceClick={handleSourceClick}
                    />
                </div>
                <LocationsCard
                    data={locationsData}
                    isLoading={isLocationsLoading}
                    range={range}
                    onLocationClick={handleLocationClick}
                />
            </StatsView>
        </StatsLayout>
    );
};

export default Web;
