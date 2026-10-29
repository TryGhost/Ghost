import { type Config, useBrowseConfig } from '../api/config';
import type { RequestOptions } from '../utils/api/fetch-api';

export type HostLimits = NonNullable<NonNullable<Config['hostSettings']>['limits']>;

export interface HostLimitsOptions {
  requestOptions?: Pick<RequestOptions, 'sessionExpiryRedirect'>;
}

/**
 * The site's host plan limits from config — undefined while config is loading
 * or when the site has none.
 */
export const useHostLimits = (options: HostLimitsOptions = {}): HostLimits | undefined => {
  const { data } = useBrowseConfig({
    refetchOnMount: false,
    requestOptions: options.requestOptions,
  });
  return data?.config.hostSettings?.limits;
};
