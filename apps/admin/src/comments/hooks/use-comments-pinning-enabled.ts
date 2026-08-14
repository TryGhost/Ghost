import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';

/**
 * Returns true when the `commentsPinning` private labs flag is enabled.
 *
 * Uses useBrowseConfig directly so it works on routes that don't mount
 * PostAnalyticsProvider (e.g. the site-wide /ghost#/comments view).
 */
export const useCommentsPinningEnabled = (): boolean => {
    const {data: configData} = useBrowseConfig();
    return configData?.config?.labs?.commentsPinning === true;
};
