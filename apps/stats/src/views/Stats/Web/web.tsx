import AudienceSelect, {getAudienceFromFilterValues, getAudienceQueryParam} from '../components/audience-select';
import DateRangeSelect from '../components/date-range-select';
import LocationsCard from '../Locations/components/locations-card';
import React, {useCallback, useMemo} from 'react';
import SourcesCard from './components/sources-card';
import StatsFilter from '../components/stats-filter';
import StatsHeader from '../layout/stats-header';
import StatsLayout from '../layout/stats-layout';
import StatsView from '../layout/stats-view';
import TopContent from './components/top-content';
import WebKPIs, {KpiDataItem} from './components/web-kpis';
import {Card, CardContent, NavbarActions, createFilter, formatDuration, formatNumber, formatPercentage, formatQueryDate, getRangeDates} from '@tryghost/shade';
import {KpiMetric} from '@src/types/kpi';
import {Navigate, useAppContext, useTinybirdQuery} from '@tryghost/admin-x-framework';
import {STATS_DEFAULT_SOURCE_ICON_URL} from '@src/utils/constants';
import {useFilterParams} from '@hooks/use-filter-params';
import {useGlobalData} from '@src/providers/global-data-provider';

interface SourcesData {
    source?: string | number;
    visits?: number;
    [key: string]: unknown;
    percentage?: number;
}

export const KPI_METRICS: Record<string, KpiMetric> = {
    visits: {
        dataKey: 'visits',
        label: 'Visitors',
        chartColor: 'hsl(var(--chart-blue))',
        formatter: formatNumber
    },
    views: {
        dataKey: 'pageviews',
        label: 'Pageviews',
        chartColor: 'hsl(var(--chart-teal))',
        formatter: formatNumber
    },
    'bounce-rate': {
        dataKey: 'bounce_rate',
        label: 'Bounce rate',
        chartColor: 'hsl(var(--chart-teal))',
        formatter: formatPercentage
    },
    'visit-duration': {
        dataKey: 'avg_session_sec',
        label: 'Visit duration',
        chartColor: 'hsl(var(--chart-teal))',
        formatter: formatDuration
    }
};

const Web: React.FC = () => {
    const {statsConfig, isLoading: isConfigLoading, range, audience: globalAudience, data} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);
    const {appSettings} = useAppContext();

    // Use URL-synced filter state for bookmarking and sharing
    const {filters: utmFilters, setFilters: setUtmFilters} = useFilterParams();

    // Check if UTM tracking is enabled in labs
    const utmTrackingEnabled = data?.labs?.utmTracking || false;

    // Derive audience from filters when UTM tracking is enabled, otherwise use global state
    // This makes the URL the single source of truth for filters
    const audience = useMemo(() => {
        if (!utmTrackingEnabled) {
            return globalAudience;
        }
        const audienceFilter = utmFilters.find(f => f.field === 'audience');
        return getAudienceFromFilterValues(audienceFilter?.values as string[] | undefined);
    }, [utmTrackingEnabled, globalAudience, utmFilters]);

    // Get site URL and icon for domain comparison and Direct traffic favicon
    const siteUrl = data?.url as string | undefined;
    const siteIcon = data?.icon as string | undefined;

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

    if (!appSettings?.analytics.webAnalytics) {
        return (
            <Navigate to='/' />
        );
    }

    // Check if filters are applied
    const hasFilters = utmFilters.length > 0;

    return (
        <StatsLayout>
            <StatsHeader>
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
                        <NavbarActions className={`${hasFilters ? '!mt-0 [grid-area:subactions] lg:!mt-6' : '[grid-area:actions]'}`}>
                            <StatsFilter
                                filters={utmFilters}
                                utmTrackingEnabled={utmTrackingEnabled}
                                onChange={setUtmFilters}
                            />
                            {!hasFilters && <DateRangeSelect />}
                        </NavbarActions>
                    </>
                }
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
                        range={range}
                        totalVisitors={totalVisitors}
                        utmFilterParams={filterParams}
                    />
                    <SourcesCard
                        data={sourcesData as SourcesData[] | null}
                        defaultSourceIconUrl={STATS_DEFAULT_SOURCE_ICON_URL}
                        isLoading={isSourcesLoading}
                        range={range}
                        siteIcon={siteIcon}
                        siteUrl={siteUrl}
                        totalVisitors={totalVisitors}
                        onSourceClick={utmTrackingEnabled ? handleSourceClick : undefined}
                    />
                </div>
                <LocationsCard
                    data={locationsData}
                    isLoading={isLocationsLoading}
                    range={range}
                    onLocationClick={utmTrackingEnabled ? handleLocationClick : undefined}
                />
            </StatsView>
        </StatsLayout>
    );
};

export default Web;
