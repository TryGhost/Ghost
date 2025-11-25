import AudienceSelect, {getAudienceQueryParam} from '../components/AudienceSelect';
import DateRangeSelect from '../components/DateRangeSelect';
import React, {useMemo, useState} from 'react';
import SourcesCard from './components/SourcesCard';
import StatsFilter from '../components/StatsFilter';
import StatsHeader from '../layout/StatsHeader';
import StatsLayout from '../layout/StatsLayout';
import StatsView from '../layout/StatsView';
import TopContent from './components/TopContent';
import WebKPIs, {KpiDataItem} from './components/WebKPIs';
import {Card, CardContent, Filter, formatDuration, formatNumber, formatPercentage, formatQueryDate, getRangeDates} from '@tryghost/shade';
import {KpiMetric} from '@src/types/kpi';
import {Navigate, useAppContext, useTinybirdQuery} from '@tryghost/admin-x-framework';
import {STATS_DEFAULT_SOURCE_ICON_URL} from '@src/utils/constants';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

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

    // Check if UTM tracking is enabled in labs
    const utmTrackingEnabled = data?.labs?.utmTracking || false;

    // Get site URL and icon for domain comparison and Direct traffic favicon
    const siteUrl = data?.url as string | undefined;
    const siteIcon = data?.icon as string | undefined;

    // Convert all filters to query parameters
    // Note: Currently only 'is' operator is supported by Tinybird pipes
    // Use a stable reference for the dependency to avoid unnecessary recalculations
    const filterParamsKey = useMemo(() => {
        // Create a stable key based only on filters with actual non-empty values
        return utmFilters
            .filter(f => f.values && f.values.length > 0 && f.values[0] !== '' && f.values[0] !== null && f.values[0] !== undefined)
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

            // Only handle 'is' operator with exact match and non-empty values
            if (values && values.length > 0 && values[0] !== '' && values[0] !== null && values[0] !== undefined) {
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
