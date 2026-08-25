import { type Config, useBrowseConfig } from '../api/config';

export type HostLimits = NonNullable<NonNullable<Config['hostSettings']>['limits']>;

/**
 * The site's host plan limits from config — undefined while config is loading
 * or when the site has none.
 */
export const useHostLimits = (): HostLimits | undefined => {
  const { data } = useBrowseConfig({ refetchOnMount: false });
  return data?.config.hostSettings?.limits;
};
