import {useMemo} from 'react';
import {usePostReferrers as usePostReferrersAPI, usePostGrowthStats as usePostGrowthStatsAPI} from '@tryghost/admin-x-framework/api/stats';

export const usePostReferrers = (postId: string) => {
    const {data: postReferrerResponse, isLoading: isPostReferrersLoading} = usePostReferrersAPI(postId);
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
