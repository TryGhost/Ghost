import AudienceSelect, {getAudienceQueryParam} from '../components/audience-select';
import DateRangeSelect from '../components/date-range-select';
import LocationsCard from '../Locations/components/locations-card';
import React, {useEffect, useMemo, useState} from 'react';
import SourcesCard from './components/sources-card';
import StatsFilter from '../components/stats-filter';
import StatsHeader from '../layout/stats-header';
import StatsLayout from '../layout/stats-layout';
import StatsView from '../layout/stats-view';
import TopContent from './components/top-content';
import WebKPIs, {KpiDataItem} from './components/web-kpis';
import {AUDIENCE_BITS, STATS_DEFAULT_SOURCE_ICON_URL} from '@src/utils/constants';
import {Card, CardContent, Filter, formatDuration, formatNumber, formatPercentage, formatQueryDate, getRangeDates} from '@tryghost/shade';
import {KpiMetric} from '@src/types/kpi';
import {Navigate, useAppContext, useTinybirdQuery} from '@tryghost/admin-x-framework';
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
    const {statsConfig, isLoading: isConfigLoading, range, audience, data} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);
    const {appSettings} = useAppContext();
    const [utmFilters, setUtmFilters] = useState<Filter[]>([]);

    // Sync audience filter values when global audience state changes
    // Note: We never automatically create or remove the audience filter here.
    // The filter is created when the user explicitly adds it via StatsFilter UI,
    // and removed when the user explicitly removes it (via the X button).
    // This ensures the filter stays visible even when all options are selected.
    useEffect(() => {
        setUtmFilters((prevFilters) => {
            // Check if audience filter already exists
            const audienceFilter = prevFilters.find(f => f.field === 'audience');

            // Only update if the filter already exists - don't auto-create or auto-remove
            if (audienceFilter) {
                const audienceValues: string[] = [];
                if ((audience & AUDIENCE_BITS.PUBLIC) !== 0) {
                    audienceValues.push('undefined');
                }
                if ((audience & AUDIENCE_BITS.FREE) !== 0) {
                    audienceValues.push('free');
                }
                if ((audience & AUDIENCE_BITS.PAID) !== 0) {
                    audienceValues.push('paid');
                }

                // Update the filter values to match the global audience state
                return prevFilters.map((f) => {
                    if (f.field === 'audience') {
                        return {...f, values: audienceValues};
                    }
                    return f;
                });
            }

            // No changes needed - filter doesn't exist
            return prevFilters;
        });
    }, [audience]); // Only depend on audience, not utmFilters to avoid loops

    // Check if UTM tracking is enabled in labs
    const utmTrackingEnabled = data?.labs?.utmTracking || false;

    // Get site URL and icon for domain comparison and Direct traffic favicon
    const siteUrl = data?.url as string | undefined;
    const siteIcon = data?.icon as string | undefined;

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

    // Prepare query parameters - memoized to prevent unnecessary refetches
    const params = useMemo(() => ({
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience),
        ...filterParams
    }), [statsConfig?.id, startDate, endDate, timezone, audience, filterParams]);

    const queryParams: Record<string, string> = {
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        member_status: getAudienceQueryParam(audience)
    };

    if (timezone) {
        queryParams.timezone = timezone;
    }

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

    return (
        <StatsLayout>
            <StatsHeader>
                {!utmTrackingEnabled && <AudienceSelect />}
                <DateRangeSelect />
            </StatsHeader>
            {utmTrackingEnabled && (
                <StatsFilter
                    filters={utmFilters}
                    utmTrackingEnabled={utmTrackingEnabled}
                    onChange={setUtmFilters}
                />
            )}
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
                <div className='flex grid-cols-2 flex-col gap-8 lg:grid'>
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
                    />
                </div>
                <LocationsCard
                    data={locationsData}
                    isLoading={isLocationsLoading}
                    range={range}
                />
            </StatsView>
        </StatsLayout>
    );
};

export default Web;
