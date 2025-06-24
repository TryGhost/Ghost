import {useActiveVisitorsData} from '@src/hooks/api';
import {useEffect, useState} from 'react';

export const useActiveVisitors = (enabled: boolean = true) => {
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

    const {data, loading, error} = useActiveVisitorsData(enabled, refreshKey);

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