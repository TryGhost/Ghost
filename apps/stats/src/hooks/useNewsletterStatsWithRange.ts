import {getRangeDates} from './useGrowthStats';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useMemo} from 'react';
import {useNewsletterStats, useSubscriberCount} from '@tryghost/admin-x-framework/api/stats';

/**
 * Represents the possible fields to order top newsletters by.
 */
export type TopNewslettersOrder = 'date desc' | 'open_rate desc' | 'click_rate desc' | 'sent_to desc';

/**
 * Hook to fetch Newsletter Stats, handling the conversion from a numeric range
 * and an optional order parameter to API query parameters.
 *
 * @param range - The number of days for the date range (e.g., 7, 30, 90). Defaults to 30.
 * @param order - The field and direction to order by (e.g., 'open_rate desc'). Defaults to 'date desc'.
 * @param newsletterId - Optional ID of the specific newsletter to get stats for
 */
export const useNewsletterStatsWithRange = (range?: number, order?: TopNewslettersOrder, newsletterId?: string) => {
    // Default range and order
    const currentRange = range ?? 30;
    const currentOrder = order ?? 'date desc'; // Default to date descending

    // Calculate date strings using the helper, memoize for stability
    const {dateFrom, endDate} = useMemo(() => getRangeDates(currentRange), [currentRange]);

    // Build search params
    const searchParams = useMemo(() => {
        const params: Record<string, string> = {
            date_from: dateFrom,
            date_to: endDate,
            order: currentOrder
        };

        if (newsletterId) {
            params.newsletter_id = newsletterId;
        }

        return params;
    }, [dateFrom, endDate, currentOrder, newsletterId]);

    // Call the newsletter stats API
    return useNewsletterStats({searchParams});
};

/**
 * Hook to fetch Subscriber Count stats, handling the conversion from a numeric range
 * to API query parameters.
 *
 * @param range - The number of days for the date range (e.g., 7, 30, 90). Defaults to 30.
 * @param newsletterId - Optional ID of the specific newsletter to get stats for
 */
export const useSubscriberCountWithRange = (range?: number, newsletterId?: string) => {
    // Default range
    const currentRange = range ?? 30;

    // Calculate date strings using the helper, memoize for stability
    const {dateFrom, endDate} = useMemo(() => getRangeDates(currentRange), [currentRange]);

    // Build search params
    const searchParams = useMemo(() => {
        const params: Record<string, string> = {
            date_from: dateFrom,
            date_to: endDate
        };

        if (newsletterId) {
            params.newsletter_id = newsletterId;
        }

        return params;
    }, [dateFrom, endDate, newsletterId]);

    // Call the subscriber count API
    return useSubscriberCount({searchParams});
};

/**
 * Hook to fetch all newsletters with their subscriber counts
 * This is used to populate the newsletter dropdown and get basic stats
 */
export const useNewslettersList = () => {
    return useBrowseNewsletters();
};