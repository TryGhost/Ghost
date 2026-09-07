import { useBrowseConfig } from '../api/config';
import { useFeatureFlagOverrides } from '../providers/feature-flag-overrides-context';
import type { RequestOptions } from '../utils/api/fetch-api';

export interface FeatureFlagOptions {
  requestOptions?: Pick<RequestOptions, 'sessionExpiryRedirect'>;
}

/**
 * Returns whether a Labs flag is explicitly enabled by config or the current
 * session's URL overrides. Only boolean `true` config values count. Avoids
 * refetching stale config when a feature-gated component mounts.
 */
export const useFeatureFlag = (
  flag: string,
  { requestOptions }: FeatureFlagOptions = {},
): boolean => {
  const { data: config } = useBrowseConfig({ refetchOnMount: false, requestOptions });
  const { enabledFlags } = useFeatureFlagOverrides();

  return config?.config.labs?.[flag] === true || enabledFlags.includes(flag);
};
