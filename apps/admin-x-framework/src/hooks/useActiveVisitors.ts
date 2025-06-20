import {useEffect, useState} from 'react';
import {getStatEndpointUrl, getToken} from '../utils/stats-config';
import {StatsConfig} from '../providers/FrameworkProvider';
import {useAppContext} from '../providers/AppProvider';
import {useQuery} from '@tinybirdco/charts';

interface UseActiveVisitorsOptions {
    postUuid?: string;
    statsConfig?: StatsConfig | null;
}

export const useActiveVisitors = (options: UseActiveVisitorsOptions = {}) => {
    const {postUuid, statsConfig} = options;
    const {appSettings} = useAppContext();
    const enabled = appSettings?.analytics?.webAnalytics ?? false;
    const [refreshKey, setRefreshKey] = useState(0);
    const [lastKnownCount, setLastKnownCount] = useState<number | null>(null);

    // Set up 60-second interval only if enabled
    useEffect(() => {
        if (!enabled) {
            return;
        }

        const interval = setInterval(() => {
            setRefreshKey(prev => prev + 1);
        }, 60000); // 60 seconds

        return () => clearInterval(interval);
    }, [enabled]);

    const params = {
        site_uuid: statsConfig?.id || '',
        // Add postUuid if provided
        ...(postUuid && {post_uuid: postUuid}),
        // Add refreshKey to force refetch
        _refresh: refreshKey
    };

    const {data, loading, error} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig || undefined, 'api_active_visitors'),
        token: getToken(statsConfig || undefined),
        params
    });

    const currentCount = data?.[0]?.active_visitors;
    
    // Update last known count when we get new data
    useEffect(() => {
        if (enabled && currentCount !== undefined && typeof currentCount === 'number') {
            setLastKnownCount(currentCount);
        }
    }, [enabled, currentCount]);

    const activeVisitors = enabled ? (lastKnownCount || 0) : 0;
    // Only show loading on initial load (when we have no last known count)
    const isInitialLoading = enabled && loading && lastKnownCount === null;

    return {
        activeVisitors,
        isLoading: isInitialLoading,
        error: enabled ? error : null
    };
}; 