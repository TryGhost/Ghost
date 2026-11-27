import type { HostLimits } from '@tryghost/admin-x-framework/hooks';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';

/** The host limits that switch a feature on or off. */
export type FeatureLimit = {
  [Name in keyof HostLimits]-?: NonNullable<HostLimits[Name]> extends { disabled: boolean }
    ? Name
    : never;
}[keyof HostLimits];

/**
 * Whether a host limit has switched a feature off, or `loading` until config says. An unset
 * limit switches nothing off, as on every self-hosted site.
 */
export type FeatureLimitStatus = 'loading' | 'disabled' | 'enabled';

export const useFeatureLimit = (limit: FeatureLimit): FeatureLimitStatus => {
  const { data } = useBrowseConfig({ refetchOnMount: false });
  if (!data) {
    return 'loading';
  }
  return data.config.hostSettings?.limits?.[limit]?.disabled === true ? 'disabled' : 'enabled';
};
