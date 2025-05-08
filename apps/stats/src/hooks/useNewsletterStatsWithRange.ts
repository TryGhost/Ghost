import {getRangeDates} from './useGrowthStats';
import {useMemo} from 'react';
import {useNewsletterStats, useSubscriberCount} from '@tryghost/admin-x-framework/api/stats';

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
 */
export const useNewsletterStatsWithRange = (range?: number, order?: TopNewslettersOrder) => {
    // Default range and order
    const currentRange = range ?? 30;
    const currentOrder = order ?? 'date desc'; // Default to date descending

    // Calculate date strings using the helper, memoize for stability
    const {dateFrom, endDate} = useMemo(() => getRangeDates(currentRange), [currentRange]);

    // Construct searchParams including the order parameter
    const searchParams = {
        date_from: dateFrom,
        date_to: endDate,
        order: currentOrder
    };

    // Filter out undefined values
    const filteredSearchParams = Object.fromEntries(
        Object.entries(searchParams).filter(([, value]) => value !== undefined)
    );
    
    // Call the hook with the filtered parameters
    return useNewsletterStats({searchParams: filteredSearchParams});
};

/**
 * Hook to fetch Subscriber Count stats, handling the conversion from a numeric range
 * to API query parameters.
 * 
 * @param range - The number of days for the date range (e.g., 7, 30, 90). Defaults to 30.
 */
export const useSubscriberCountWithRange = (range?: number) => {
    // Default range
    const currentRange = range ?? 30;

    // Calculate date strings using the helper, memoize for stability
    const {dateFrom, endDate} = useMemo(() => getRangeDates(currentRange), [currentRange]);

    // Construct searchParams for date range
    const searchParams = {
        date_from: dateFrom,
        date_to: endDate
    };

    // Filter out undefined values
    const filteredSearchParams = Object.fromEntries(
        Object.entries(searchParams).filter(([, value]) => value !== undefined)
    );
    
    // Call the hook with the filtered parameters
    return useSubscriberCount({searchParams: filteredSearchParams});
}; 