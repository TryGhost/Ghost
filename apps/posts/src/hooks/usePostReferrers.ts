import moment from 'moment';
import {useMemo} from 'react';
import {usePostGrowthStats as usePostGrowthStatsAPI, usePostReferrers as usePostReferrersAPI} from '@tryghost/admin-x-framework/api/stats';

// Helper function to convert range to date parameters
export const getRangeDates = (rangeInDays: number) => {
    // Always use UTC to stay aligned with the backend's date arithmetic
    const endDate = moment.utc().format('YYYY-MM-DD');
    let dateFrom;

    if (rangeInDays === 1) {
        // Today
        dateFrom = endDate;
    } else if (rangeInDays === 1000) {
        // All time - use a far past date
        dateFrom = '2010-01-01';
    } else {
        // Specific range
        // Guard against invalid ranges
        const safeRange = Math.max(1, rangeInDays);
        dateFrom = moment.utc().subtract(safeRange - 1, 'days').format('YYYY-MM-DD');
    }

    return {dateFrom, endDate};
};

export const usePostReferrers = (postId: string) => {
    const {data: postReferrerResponse, isLoading: isPostReferrersLoading} = usePostReferrersAPI(postId);
    // API doesn't support date_from yet, so we fetch all data and filter on the client for now
    const {data: postGrowthStatsResponse, isLoading: isPostGrowthStatsLoading} = usePostGrowthStatsAPI(postId);

    const stats = useMemo(() => postReferrerResponse?.stats || [], [postReferrerResponse]);
    const totals = useMemo(() => {
        if (postGrowthStatsResponse?.stats.length === 0) {
            return {
                free_members: 0,
                paid_members: 0,
                mrr: 0
            };
        } else {
            return postGrowthStatsResponse?.stats[0];
        }
    }, [postGrowthStatsResponse]);

    const isLoading = useMemo(() => isPostReferrersLoading || isPostGrowthStatsLoading, [isPostReferrersLoading, isPostGrowthStatsLoading]);

    return {
        isLoading,
        stats,
        totals
    };
};
