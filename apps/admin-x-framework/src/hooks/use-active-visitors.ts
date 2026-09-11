import { useEffect, useState } from 'react';
import { StatsConfig } from '../providers/framework-provider';
import { useTinybirdQuery } from './use-tinybird-query';

interface UseActiveVisitorsOptions {
  postUuid?: string;
  statsConfig?: StatsConfig | null;
  enabled?: boolean;
}

export const ACTIVE_VISITORS_REFETCH_INTERVAL = 60 * 1000;

export const useActiveVisitors = (options: UseActiveVisitorsOptions = {}) => {
  const { postUuid, statsConfig, enabled = true } = options;
  const [lastKnownCount, setLastKnownCount] = useState<number | null>(null);

  const params = {
    site_uuid: statsConfig?.id || '',
    ...(postUuid && { post_uuid: postUuid }),
  };

  const { data, loading, error } = useTinybirdQuery({
    statsConfig,
    endpoint: 'api_active_visitors',
    params,
    enabled,
    refetchInterval: ACTIVE_VISITORS_REFETCH_INTERVAL,
    // Keep counting while the tab is hidden (matches the old interval tick,
    // which the browser throttled to roughly this cadence anyway).
    refetchIntervalInBackground: true,
  });

  const currentCount = data?.[0]?.active_visitors;

  // Update last known count when we get new data
  useEffect(() => {
    if (enabled && currentCount !== undefined && typeof currentCount === 'number') {
      setLastKnownCount(currentCount);
    }
  }, [enabled, currentCount]);

  const activeVisitors = enabled ? lastKnownCount || 0 : 0;
  // Only show loading on initial load (when we have no last known count)
  const isInitialLoading = enabled && loading && lastKnownCount === null;

  return {
    activeVisitors,
    isLoading: isInitialLoading,
    error: enabled ? error : null,
  };
};
