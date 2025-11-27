import AudienceSelect, {getAudienceQueryParam} from '../components/audience-select';
import DateRangeSelect from '../components/date-range-select';
import React, {useEffect, useMemo, useState} from 'react';
import SourcesCard from './components/sources-card';
import StatsFilter from '../components/stats-filter';
import StatsHeader from '../layout/stats-header';
import StatsLayout from '../layout/stats-layout';
import StatsView from '../layout/stats-view';
import TopContent from './components/top-content';
import WebKPIs, {KpiDataItem} from './components/web-kpis';
import {Card, CardContent, Filter, createFilter, formatDuration, formatNumber, formatPercentage, formatQueryDate, getRangeDates} from '@tryghost/shade';
import {KpiMetric} from '@src/types/kpi';
import {Navigate, useAppContext, useTinybirdQuery} from '@tryghost/admin-x-framework';
import {STATS_DEFAULT_SOURCE_ICON_URL} from '@src/utils/constants';
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

// Audience bit values matching StatsFilter and AudienceSelect
const AUDIENCE_BITS = {
    PUBLIC: 1 << 0, // 1
    FREE: 1 << 1, // 2
    PAID: 1 << 2 // 4
};

const Web: React.FC = () => {
    const {statsConfig, isLoading: isConfigLoading, range, audience, data} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);
    const {appSettings} = useAppContext();
    const [utmFilters, setUtmFilters] = useState<Filter[]>([]);

    // Initialize filters based on current audience state when component mounts or audience changes
    // Only create audience filter if audience is not the default "all audiences" state
    useEffect(() => {
        const ALL_AUDIENCES = AUDIENCE_BITS.PUBLIC | AUDIENCE_BITS.FREE | AUDIENCE_BITS.PAID;
        const isDefaultAudience = audience === ALL_AUDIENCES;
        
        setUtmFilters(prevFilters => {
            // Check if audience filter already exists
            const hasAudienceFilter = prevFilters.some(f => f.field === 'audience');
            
            // If audience is not default and filter doesn't exist, create it
            if (!isDefaultAudience && !hasAudienceFilter) {
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
                
                if (audienceValues.length > 0) {
                    return [...prevFilters, createFilter('audience', 'is', audienceValues)];
                }
            }
            
            // If audience is default and filter exists, remove it
            if (isDefaultAudience && hasAudienceFilter) {
                return prevFilters.filter(f => f.field !== 'audience');
            }
            
            // No changes needed
            return prevFilters;
        });
    }, [audience]); // Only depend on audience, not utmFilters to avoid loops

    // Check if UTM tracking is enabled in labs
    const utmTrackingEnabled = data?.labs?.utmTracking || false;

    // Get site URL and icon for domain comparison and Direct traffic favicon
    const siteUrl = data?.url as string | undefined;
    const siteIcon = data?.icon as string | undefined;

    // Convert all filters to query parameters
    // Note: Currently only 'is' operator is supported by Tinybird pipes
    // Use a stable reference for the dependency to avoid unnecessary recalculations
    const filterParamsKey = useMemo(() => {
        // Create a stable key based only on filters with actual values
        // Allow empty string for 'source' field (used for "Direct" traffic)
        return utmFilters
            .filter((f) => {
                const hasValue = f.values && f.values.length > 0 && f.values[0] !== null && f.values[0] !== undefined;
                const isEmptySourceFilter = f.field === 'source' && f.values?.[0] === '';
                return hasValue && (f.values![0] !== '' || isEmptySourceFilter);
            })
            .map(f => `${f.field}:${f.values![0]}`)
            .sort()
            .join('|');
    }, [utmFilters]);

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
                // UTM fields map directly, but post and source need mapping
                if (fieldKey === 'post') {
                    params.post_uuid = value;
                } else {
                    // UTM fields and other fields map directly
                    params[fieldKey] = value;
                }
            }
        });

        return params;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterParamsKey]); // Depend on the key, not the full filters array

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
                <div className='flex min-h-[460px] grid-cols-2 flex-col gap-8 lg:grid'>
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
            </StatsView>
        </StatsLayout>
    );
};

export default Web;
