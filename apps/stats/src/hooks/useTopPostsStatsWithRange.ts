import {getRangeDates} from './useGrowthStats';
import {useMemo} from 'react';
import {useTopPostsStats} from '@tryghost/admin-x-framework/api/stats';

/**
 * Represents the possible fields to order top posts by.
 * Could be expanded if needed (e.g., 'title asc').
 */
type TopPostsOrder = 'free_members desc' | 'paid_members desc' | 'mrr desc';

/**
 * Hook to fetch Top Posts Stats, handling the conversion from a numeric range
 * and an optional order parameter to API query parameters.
 *
 * @param range - The number of days for the date range (e.g., 7, 30, 90). Defaults to 30.
 * @param order - The field and direction to order by (e.g., 'mrr desc'). Defaults to 'mrr desc'.
 */
export const useTopPostsStatsWithRange = (range?: number, order?: TopPostsOrder) => {
    // Default range and order
    const currentRange = range ?? 30;
    const currentOrder = order ?? 'mrr desc'; // Default to MRR descending

    // Calculate date strings using the helper, memoize for stability
    const {dateFrom, endDate} = useMemo(() => getRangeDates(currentRange), [currentRange]);

    // Construct searchParams including the order parameter
    const searchParams = {
        date_from: dateFrom,
        date_to: endDate,
        order: currentOrder // Add the order parameter
    };

    // Call the original hook passing searchParams within an options object
    // Filter out undefined values (although not expected for these params)
    const filteredSearchParams = Object.fromEntries(
        Object.entries(searchParams).filter(([, value]) => value !== undefined)
    );
    const query = useTopPostsStats({searchParams: filteredSearchParams});

    // Return the result of the original hook
    return query;
};
