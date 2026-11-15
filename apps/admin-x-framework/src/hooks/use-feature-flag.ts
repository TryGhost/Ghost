import { useCallback } from 'react';
import { useBrowseConfig } from '../api/config';
import { useFeatureFlagOverrides } from '../providers/feature-flag-overrides-context';
import type { RequestOptions } from '../utils/api/fetch-api';

export interface FeatureFlagOptions {
  requestOptions?: Pick<RequestOptions, 'sessionExpiryRedirect'>;
  /** Off when the caller renders a config failure itself. */
  defaultErrorHandler?: boolean;
}

/**
 * Returns a check of whether a Labs flag is explicitly enabled by config or the current
 * session's URL overrides, for a caller asking about flags it only knows at runtime. Only
 * boolean `true` config values count. Avoids refetching stale config when a feature-gated
 * component mounts.
 */
export const useFeatureFlags = ({
  requestOptions,
  defaultErrorHandler,
}: FeatureFlagOptions = {}): ((flag: string) => boolean) => {
  const { data: config } = useBrowseConfig({
    defaultErrorHandler,
    refetchOnMount: false,
    requestOptions,
  });
  const { enabledFlags } = useFeatureFlagOverrides();
  const labs = config?.config.labs;

  return useCallback(
    (flag: string) => labs?.[flag] === true || enabledFlags.includes(flag),
    [labs, enabledFlags],
  );
};

/** Returns whether a Labs flag is enabled, as `useFeatureFlags` checks it. */
export const useFeatureFlag = (flag: string, options: FeatureFlagOptions = {}): boolean =>
  useFeatureFlags(options)(flag);
