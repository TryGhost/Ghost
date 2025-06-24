import {BaseStatsParams, StatsApiEndpoint, StatsQueryParams} from './config';
import {formatQueryDate, getRangeDates} from '@tryghost/shade';
import {getAudienceQueryParam} from '@src/views/Stats/components/AudienceSelect';
import {getStatEndpointUrl, getToken} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useMemo} from 'react';
import {useQuery} from '@tinybirdco/charts';

interface StatsQueryOptions {
    endpoint: StatsApiEndpoint;
    params?: Partial<StatsQueryParams>;
    enabled?: boolean;
}

export const useStatsQuery = <T = unknown>(options: StatsQueryOptions) => {
    const {statsConfig, range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    // Build default parameters for date-based queries
    const defaultParams: BaseStatsParams = useMemo(() => ({
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience)
    }), [statsConfig?.id, startDate, endDate, timezone, audience]);

    // Merge with provided params
    const queryParams = useMemo(() => ({
        ...defaultParams,
        ...options.params
    }), [defaultParams, options.params]);

    const {data, loading, error} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, options.endpoint),
        token: getToken(statsConfig),
        params: queryParams,
        enabled: options.enabled ?? true
    });

    return {
        data: data as T,
        loading,
        error,
        params: queryParams
    };
};

// Specialized hooks for common patterns
export const useKpiData = () => {
    return useStatsQuery({
        endpoint: 'api_kpis'
    });
};

export const useTopSourcesData = () => {
    return useStatsQuery({
        endpoint: 'api_top_sources'
    });
};

export const useTopLocationsData = () => {
    return useStatsQuery({
        endpoint: 'api_top_locations'
    });
};

export const useActiveVisitorsData = (enabled: boolean = true, refreshKey?: number) => {
    const {statsConfig} = useGlobalData();
    
    const params = useMemo(() => ({
        site_uuid: statsConfig?.id || '',
        ...(refreshKey !== undefined && {_refresh: refreshKey})
    }), [statsConfig?.id, refreshKey]);

    return useStatsQuery({
        endpoint: 'api_active_visitors',
        params,
        enabled
    });
};