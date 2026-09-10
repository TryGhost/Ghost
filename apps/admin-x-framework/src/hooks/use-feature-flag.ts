import { useBrowseConfig } from '../api/config';
import { useFeatureFlagOverrides } from '../providers/feature-flag-overrides-context';
import type { RequestOptions } from '../utils/api/fetch-api';

export interface FeatureFlagOptions {
  requestOptions?: Pick<RequestOptions, 'sessionExpiryRedirect'>;
  /** Off when the caller renders a config failure itself. */
  defaultErrorHandler?: boolean;
}

/**
 * Returns whether each requested Labs flag is explicitly enabled by config or
 * the current session's URL overrides. Only boolean `true` config values count. Avoids
 * refetching stale config when a feature-gated component mounts.
 */
export const useFeatureFlags = (
  flags: readonly string[],
  { requestOptions, defaultErrorHandler }: FeatureFlagOptions = {},
): Record<string, boolean> => {
  const { data: config } = useBrowseConfig({
    defaultErrorHandler,
    refetchOnMount: false,
    requestOptions,
  });
  const { enabledFlags } = useFeatureFlagOverrides();

  return Object.fromEntries(
    flags.map((flag) => [
      flag,
      config?.config.labs?.[flag] === true || enabledFlags.includes(flag),
    ]),
  );
};

export const useFeatureFlag = (flag: string, options?: FeatureFlagOptions): boolean =>
  useFeatureFlags([flag], options)[flag] ?? false;
