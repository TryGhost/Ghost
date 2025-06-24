import {formatQueryDate, getRangeDates} from '@tryghost/shade';
import {getAudienceQueryParam} from '../../components/AudienceSelect';
import {getStatEndpointUrl, getToken} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useMemo} from 'react';
import {useQuery} from '@tinybirdco/charts';

export interface SourcesData {
    source?: string | number;
    visits?: number;
    [key: string]: unknown;
    percentage?: number;
}

export const useWebData = () => {
    const {statsConfig, isLoading: isConfigLoading, range, audience, data} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    // Extract site information
    const siteInfo = useMemo(() => ({
        url: data?.url as string | undefined,
        icon: data?.icon as string | undefined
    }), [data]);

    // Build query parameters
    const queryParams = useMemo(() => {
        const baseParams = {
            site_uuid: statsConfig?.id || '',
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate),
            member_status: getAudienceQueryParam(audience)
        };

        if (timezone) {
            return {...baseParams, timezone};
        }

        return baseParams;
    }, [statsConfig?.id, startDate, endDate, audience, timezone]);

    // Get KPI data
    const {data: kpiData, loading: kpiLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_kpis'),
        token: getToken(statsConfig),
        params: queryParams
    });

    // Get top sources data
    const {data: sourcesData, loading: isSourcesLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_sources'),
        token: getToken(statsConfig),
        params: queryParams
    });

    // Calculate total visitors
    const totalVisitors = useMemo(() => {
        return kpiData?.length ? kpiData.reduce((sum, item) => sum + Number(item.visits), 0) : 0;
    }, [kpiData]);

    return {
        // Data
        kpiData,
        sourcesData,
        siteInfo,
        totalVisitors,
        range,
        
        // Loading states
        isConfigLoading,
        kpiLoading,
        isSourcesLoading,
        isPageLoading: isConfigLoading
    };
};