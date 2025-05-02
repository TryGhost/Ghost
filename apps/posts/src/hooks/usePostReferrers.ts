import {PostReferrerStatItem, usePostReferrers as usePostReferrersAPI} from '@tryghost/admin-x-framework/api/stats';
import {useMemo} from 'react';

// Calculate totals from referrer data
const calculateTotals = (referrerData: PostReferrerStatItem[]) => {
    if (!referrerData.length) {
        return {
            free_members: 0,
            paid_members: 0,
            mrr: 0
        };
    }

    const totals = referrerData.reduce((acc, item) => {
        acc.free_members += item.free_members || 0;
        acc.paid_members += item.paid_members || 0;
        acc.mrr += item.mrr || 0;
        return acc;
    }, {free_members: 0, paid_members: 0, mrr: 0});

    return totals;
};

export const usePostReferrers = (postId: string) => {
    // Fetch post referrer data from API
    const {data: postReferrerResponse, isLoading} = usePostReferrersAPI(postId);

    // Extract the stats data
    const stats = useMemo(() => postReferrerResponse?.stats || [], [postReferrerResponse]);

    // Calculate totals
    const totals = useMemo(() => calculateTotals(stats), [stats]);

    return {
        isLoading,
        stats,
        totals
    };
};
