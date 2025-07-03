import {useEffect, useState} from 'react';
import {StatsConfig} from '../providers/FrameworkProvider';
import {useTinybirdQuery} from './useTinybirdQuery';

interface UseActiveVisitorsOptions {
    postUuid?: string;
    statsConfig?: StatsConfig | null;
    enabled?: boolean;
}

export const useActiveVisitors = (options: UseActiveVisitorsOptions = {}) => {
    const {postUuid, statsConfig, enabled = true} = options;
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
        _refresh: refreshKey.toString()
    };

    // Use useTinybirdQuery for consistent token handling
    const {data, loading, error} = useTinybirdQuery({
        statsConfig,
        endpoint: 'api_active_visitors',
        params,
        enabled
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