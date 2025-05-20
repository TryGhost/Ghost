import {getRangeDates} from './useGrowthStats';
import {useMemo} from 'react';
import {useNewsletterStatsByNewsletterId, useSubscriberCountByNewsletterId} from '@tryghost/admin-x-framework/api/stats';

/**
 * Represents the possible fields to order top newsletters by.
 */
export type TopNewslettersOrder = 'date desc' | 'open_rate desc' | 'click_rate desc';

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
    
    // Call the hook with the parameters
    return useNewsletterStatsByNewsletterId(newsletterId, {
        date_from: dateFrom,
        date_to: endDate,
        order: currentOrder
    });
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
    
    // Call the hook with the parameters
    return useSubscriberCountByNewsletterId(newsletterId, {
        date_from: dateFrom,
        date_to: endDate
    });
}; 