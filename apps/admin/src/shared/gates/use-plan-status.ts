import { type HostLimits, useHostLimits } from '@tryghost/admin-x-framework/hooks';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';

/** The host limits that switch a feature on or off for a site's plan. */
export type FeatureLimit = {
  [Name in keyof HostLimits]-?: NonNullable<HostLimits[Name]> extends { disabled: boolean }
    ? Name
    : never;
}[keyof HostLimits];

/**
 * Whether the site's plan includes a feature, or `loading` until config says. An unset limit
 * withholds nothing, as on every self-hosted site and every plan that includes the feature.
 */
export type PlanStatus = 'loading' | 'withheld' | 'included';

export const usePlanStatus = (limit: FeatureLimit): PlanStatus => {
  const { data } = useBrowseConfig({ refetchOnMount: false });
  const limits = useHostLimits();
  if (!data) {
    return 'loading';
  }
  return limits?.[limit]?.disabled === true ? 'withheld' : 'included';
};
