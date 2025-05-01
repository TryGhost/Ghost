import {getRangeDates} from './useGrowthStats'; // Import the helper
import {useTopPostsStats} from '@tryghost/admin-x-framework/api/stats';
import {useMemo} from 'react'; // Import useMemo

/**
 * Hook to fetch Top Posts Stats, handling the conversion from a numeric range
 * to date_from and date_to query parameters.
 */
export const useTopPostsStatsWithRange = (range?: number) => {
    // Default to 30 days if range is undefined
    const currentRange = range ?? 30;

    // Calculate date strings using the helper, memoize for stability
    const {dateFrom, endDate} = useMemo(() => getRangeDates(currentRange), [currentRange]);

    // Construct searchParams
    const searchParams = {
        date_from: dateFrom,
        date_to: endDate
    };

    // Call the original hook passing searchParams within an options object
    // Filter out undefined values to avoid sending empty params (though shouldn't happen now)
    const filteredSearchParams = Object.fromEntries(
        Object.entries(searchParams).filter(([, value]) => value !== undefined)
    );
    const query = useTopPostsStats({searchParams: filteredSearchParams});

    // Return the result of the original hook
    return query;
};
