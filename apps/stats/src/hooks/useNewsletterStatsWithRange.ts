import {type NewsletterStatsResponseType, useNewsletterBasicStats, useNewsletterClickStats, useNewsletterStats, useSubscriberCount} from '@tryghost/admin-x-framework/api/stats';
import {formatQueryDate, getRangeDates} from '@tryghost/shade';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useMemo} from 'react';

/**
 * Represents the possible fields to order top newsletters by.
 */
export type TopNewslettersOrder = 'date asc' | 'date desc' | 'open_rate desc' | 'click_rate desc' | 'sent_to desc';

/**
 * Hook to fetch Newsletter Stats, handling the conversion from a numeric range
 * and an optional order parameter to API query parameters.
 *
 * @param range - The number of days for the date range (e.g., 7, 30, 90). Defaults to 30.
 * @param order - The field and direction to order by (e.g., 'open_rate desc'). Defaults to 'date desc'.
 * @param newsletterId - Optional ID of the specific newsletter to get stats for
 * @param shouldFetch - Whether to actually fetch data. If false, returns loading state without making API calls.
 */
export const useNewsletterStatsWithRange = (range?: number, order?: TopNewslettersOrder, newsletterId?: string, shouldFetch = true) => {
    // Default range and order
    const currentRange = range ?? 30;
    const currentOrder = order ?? 'date desc'; // Default to date descending

    // Calculate date strings using the helper, memoize for stability
    const {startDate, endDate} = useMemo(() => getRangeDates(currentRange), [currentRange]);

    // Build search params
    const searchParams = useMemo(() => {
        const params: Record<string, string> = {
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate),
            order: currentOrder
        };

        if (newsletterId) {
            params.newsletter_id = newsletterId;
        }

        return params;
    }, [startDate, endDate, currentOrder, newsletterId]);

    // Conditionally call the hook or return empty state
    const realResult = useNewsletterStats({searchParams, enabled: shouldFetch});
    
    if (!shouldFetch) {
        return {
            data: undefined,
            isLoading: false,
            error: null,
            isError: false,
            refetch: realResult.refetch
        };
    }
    
    return realResult;
};

/**
 * Hook to fetch Subscriber Count stats, handling the conversion from a numeric range
 * to API query parameters.
 *
 * @param range - The number of days for the date range (e.g., 7, 30, 90). Defaults to 30.
 * @param newsletterId - Optional ID of the specific newsletter to get stats for
 * @param shouldFetch - Whether to actually fetch data. If false, returns loading state without making API calls.
 */
export const useSubscriberCountWithRange = (range?: number, newsletterId?: string, shouldFetch = true) => {
    // Default range
    const currentRange = range ?? 30;

    // Calculate date strings using the helper, memoize for stability
    const {startDate, endDate} = useMemo(() => getRangeDates(currentRange), [currentRange]);

    // Build search params
    const searchParams = useMemo(() => {
        const params: Record<string, string> = {
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate)
        };

        if (newsletterId) {
            params.newsletter_id = newsletterId;
        }

        return params;
    }, [startDate, endDate, newsletterId]);

    // Conditionally call the hook or return empty state
    const realResult = useSubscriberCount({searchParams, enabled: shouldFetch});
    
    if (!shouldFetch) {
        return {
            data: undefined,
            isLoading: false,
            error: null,
            isError: false,
            refetch: realResult.refetch
        };
    }
    
    return realResult;
};

/**
 * Hook to fetch all newsletters with their subscriber counts
 * This is used to populate the newsletter dropdown and get basic stats
 */
export const useNewslettersList = () => {
    return useBrowseNewsletters();
};

/**
 * Hook to fetch Newsletter Basic Stats (without click data), handling the conversion from a numeric range
 * and an optional order parameter to API query parameters.
 *
 * @param range - The number of days for the date range (e.g., 7, 30, 90). Defaults to 30.
 * @param order - The field and direction to order by (e.g., 'open_rate desc'). Defaults to 'date desc'.
 * @param newsletterId - Optional ID of the specific newsletter to get stats for
 * @param shouldFetch - Whether to actually fetch data. If false, returns loading state without making API calls.
 */
export const useNewsletterBasicStatsWithRange = (range?: number, order?: TopNewslettersOrder, newsletterId?: string, shouldFetch = true) => {
    // Default range and order
    const currentRange = range ?? 30;
    const currentOrder = order ?? 'date desc'; // Default to date descending

    // Calculate date strings using the helper, memoize for stability
    const {startDate, endDate} = useMemo(() => getRangeDates(currentRange), [currentRange]);

    // Build search params
    const searchParams = useMemo(() => {
        const params: Record<string, string> = {
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate),
            order: currentOrder
        };

        if (newsletterId) {
            params.newsletter_id = newsletterId;
        }

        return params;
    }, [startDate, endDate, currentOrder, newsletterId]);

    // Conditionally call the hook or return empty state
    const realResult = useNewsletterBasicStats({searchParams, enabled: shouldFetch});
    
    if (!shouldFetch) {
        return {
            data: undefined,
            isLoading: false,
            error: null,
            isError: false,
            refetch: realResult.refetch
        };
    }
    
    return realResult;
};

/**
 * Hook to fetch Newsletter Click Stats for specific posts
 *
 * @param newsletterId - ID of the specific newsletter to get click stats for
 * @param postIds - Array of post IDs to get click data for
 * @param shouldFetch - Whether to actually fetch data. If false, returns loading state without making API calls.
 */
export const useNewsletterClickStatsWithRange = (newsletterId?: string, postIds: string[] = [], shouldFetch = true) => {
    // Build search params
    const searchParams = useMemo(() => {
        const params: Record<string, string> = {};

        if (newsletterId) {
            params.newsletter_id = newsletterId;
        }

        if (postIds.length > 0) {
            params.post_ids = postIds.join(',');
        }

        return params;
    }, [newsletterId, postIds]);

    // Conditionally call the hook or return empty state
    const realResult = useNewsletterClickStats({searchParams, enabled: shouldFetch});
    
    if (!shouldFetch) {
        return {
            data: undefined,
            isLoading: false,
            error: null,
            isError: false,
            refetch: realResult.refetch
        };
    }
    
    return realResult;
};

/**
 * Combined hook to fetch Newsletter Stats using split endpoints for better performance
 * This fetches basic stats immediately and click stats in parallel
 *
 * @param range - The number of days for the date range (e.g., 7, 30, 90). Defaults to 30.
 * @param order - The field and direction to order by (e.g., 'open_rate desc'). Defaults to 'date desc'.
 * @param newsletterId - Optional ID of the specific newsletter to get stats for
 * @param shouldFetch - Whether to actually fetch data. If false, returns loading state without making API calls.
 */
export const useNewsletterStatsWithRangeSplit = (range?: number, order?: TopNewslettersOrder, newsletterId?: string, shouldFetch = true): {
    data: NewsletterStatsResponseType | undefined;
    isLoading: boolean;
    isClicksLoading: boolean;
    error: unknown;
    isError: boolean;
    refetch: () => void;
} => {
    // Get basic stats first (fast)
    const basicStatsResult = useNewsletterBasicStatsWithRange(range, order, newsletterId, shouldFetch);
    
    // Extract post IDs from basic stats to fetch click data
    const postIds = useMemo(() => {
        if (!basicStatsResult.data?.stats) {
            return [];
        }
        return basicStatsResult.data.stats.map(stat => stat.post_id);
    }, [basicStatsResult.data]);

    // Get click stats for the posts (potentially slower)
    const clickStatsResult = useNewsletterClickStatsWithRange(
        newsletterId, 
        postIds, 
        shouldFetch && postIds.length > 0
    );

    // Merge the data
    const mergedData = useMemo(() => {
        if (!basicStatsResult.data?.stats) {
            return undefined;
        }

        const basicStats = basicStatsResult.data.stats;
        const clickStats = clickStatsResult.data?.stats || [];

        // Create a map of click data by post_id for fast lookup
        const clickStatsMap = new Map();
        clickStats.forEach((clickStat) => {
            clickStatsMap.set(clickStat.post_id, clickStat);
        });

        // Merge basic stats with click stats
        const mergedStats = basicStats.map((basicStat) => {
            const clickData = clickStatsMap.get(basicStat.post_id);
            return {
                ...basicStat,
                total_clicks: clickData?.total_clicks || 0,
                click_rate: clickData?.click_rate || 0
            };
        });

        return {
            ...basicStatsResult.data,
            stats: mergedStats
        };
    }, [basicStatsResult.data, clickStatsResult.data]);

    return {
        data: mergedData,
        isLoading: basicStatsResult.isLoading,
        isClicksLoading: clickStatsResult.isLoading,
        error: basicStatsResult.error || clickStatsResult.error,
        isError: basicStatsResult.isError || clickStatsResult.isError,
        refetch: () => {
            basicStatsResult.refetch();
            clickStatsResult.refetch();
        }
    };
};