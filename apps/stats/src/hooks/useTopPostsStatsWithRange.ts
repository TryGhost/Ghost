import {formatQueryDate, getRangeDates} from '@tryghost/shade';
import {useMemo} from 'react';
import {useTopPostsStats} from '@tryghost/admin-x-framework/api/stats';

/**
 * Represents the possible fields to order top posts by.
 * Could be expanded if needed (e.g., 'title asc').
 */
type TopPostsOrder = 'free_members desc' | 'paid_members desc' | 'mrr desc';

type ContentType = 'posts' | 'pages' | 'posts_and_pages';

/**
 * Hook to fetch Top Posts Stats, handling the conversion from a numeric range
 * and an optional order parameter to API query parameters.
 *
 * @param range - The number of days for the date range (e.g., 7, 30, 90). Defaults to 30.
 * @param order - The field and direction to order by (e.g., 'mrr desc'). Defaults to 'mrr desc'.
 * @param contentType - The content type to filter by ('posts', 'pages', 'posts_and_pages'). Defaults to undefined (all).
 */
export const useTopPostsStatsWithRange = (range?: number, order?: TopPostsOrder, contentType?: ContentType) => {
    // Default range and order
    const currentRange = range ?? 30;
    const currentOrder = order ?? 'mrr desc'; // Default to MRR descending

    // Calculate date strings using the helper, memoize for stability
    const {startDate, endDate} = useMemo(() => getRangeDates(currentRange), [currentRange]);

    // Construct searchParams including the order and post_type parameters
    const searchParams = useMemo(() => {
        const params: Record<string, string> = {
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate),
            order: currentOrder
        };

        // Add post_type filter based on content type
        if (contentType === 'posts') {
            params.post_type = 'post';
        } else if (contentType === 'pages') {
            params.post_type = 'page';
        }
        // For 'posts_and_pages' or undefined, don't add post_type filter to get both

        return params;
    }, [startDate, endDate, currentOrder, contentType]);

    // Call the original hook passing searchParams within an options object
    // Filter out undefined values (although not expected for these params)
    const filteredSearchParams = Object.fromEntries(
        Object.entries(searchParams).filter(([, value]) => value !== undefined)
    );
    const query = useTopPostsStats({searchParams: filteredSearchParams});

    // Return the result of the original hook
    return query;
};
