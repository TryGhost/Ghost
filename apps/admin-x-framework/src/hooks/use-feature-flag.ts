import { useBrowseConfig } from '../api/config';
import { useFeatureFlagOverrides } from '../providers/feature-flag-overrides-context';

/**
 * Returns whether a Labs flag is explicitly enabled by config or the current
 * session's URL overrides. Only boolean `true` config values count. Avoids
 * refetching stale config when a feature-gated component mounts.
 */
export const useFeatureFlag = (flag: string): boolean => {
  const { data: config } = useBrowseConfig({ refetchOnMount: false });
  const { enabledFlags } = useFeatureFlagOverrides();

  return config?.config.labs?.[flag] === true || enabledFlags.includes(flag);
};
