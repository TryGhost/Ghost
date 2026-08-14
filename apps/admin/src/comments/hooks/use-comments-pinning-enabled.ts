import {useFeatureFlag} from '@tryghost/admin-x-framework/hooks';

/**
 * Returns true when the `commentsPinning` private labs flag is enabled.
 *
 * Reads the config query so it works on routes that don't mount
 * PostAnalyticsProvider (e.g. the site-wide /ghost#/comments view).
 */
export const useCommentsPinningEnabled = (): boolean => {
    return useFeatureFlag('commentsPinning');
};
