import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useKpiData, useTopSourcesData} from '@src/hooks/api';
import {useMemo} from 'react';

export interface SourcesData {
    source?: string | number;
    visits?: number;
    [key: string]: unknown;
    percentage?: number;
}

export const useWebData = () => {
    const {isLoading: isConfigLoading, range, data} = useGlobalData();

    // Extract site information
    const siteInfo = useMemo(() => ({
        url: data?.url as string | undefined,
        icon: data?.icon as string | undefined
    }), [data]);

    // Get KPI data using unified hook
    const {data: kpiData, loading: kpiLoading} = useKpiData();

    // Get top sources data using unified hook
    const {data: sourcesData, loading: isSourcesLoading} = useTopSourcesData();

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