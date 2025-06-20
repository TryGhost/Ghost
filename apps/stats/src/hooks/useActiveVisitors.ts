import {getStatEndpointUrl, getToken} from '@tryghost/admin-x-framework';
import {useEffect, useState} from 'react';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useQuery} from '@tinybirdco/charts';

export const useActiveVisitors = () => {
    const {statsConfig} = useGlobalData();
    const [refreshKey, setRefreshKey] = useState(0);

    // Set up 60-second interval
    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshKey(prev => prev + 1);
        }, 60000); // 60 seconds

        return () => clearInterval(interval);
    }, []);

    const params = {
        site_uuid: statsConfig?.id || '',
        // Add refreshKey to force refetch
        _refresh: refreshKey
    };

    const {data, loading, error} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_active_visitors'),
        token: getToken(statsConfig),
        params
    });

    const activeVisitors = data?.[0]?.active_visitors || 0;

    return {
        activeVisitors,
        isLoading: loading,
        error
    };
}; 