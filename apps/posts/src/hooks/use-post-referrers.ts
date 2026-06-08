import {getSymbol} from '@tryghost/admin-x-framework';
import {useMemo} from 'react';
import {useMrrHistory, usePostGrowthStats as usePostGrowthStatsAPI, usePostReferrers as usePostReferrersAPI} from '@tryghost/admin-x-framework/api/stats';

export const usePostReferrers = (postId: string) => {
    const {data: postReferrerResponse, isLoading: isPostReferrersLoading} = usePostReferrersAPI(postId);
    // API doesn't support date_from yet, so we fetch all data and filter on the client for now
    const {data: postGrowthStatsResponse, isLoading: isPostGrowthStatsLoading} = usePostGrowthStatsAPI(postId);
    const {data: mrrHistoryResponse, isLoading: isMrrLoading} = useMrrHistory();

    const stats = useMemo(() => {
        const rawStats = postReferrerResponse?.stats || [];
        // Backend now handles source normalization, so we can use the data directly
        return rawStats;
    }, [postReferrerResponse]);
    
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

    // Get site currency from MRR history (same logic as stats app)
    const {selectedCurrency, currencySymbol} = useMemo(() => {
        if (mrrHistoryResponse?.stats && mrrHistoryResponse?.meta?.totals) {
            // Select the currency with the highest total MRR value (same logic as Dashboard)
            const mrrTotals = mrrHistoryResponse.meta.totals;
            let currentMax = mrrTotals[0];
            if (!currentMax) {
                return {selectedCurrency: 'usd', currencySymbol: getSymbol('usd')};
            }

            for (const total of mrrTotals) {
                if (total.mrr > currentMax.mrr) {
                    currentMax = total;
                }
            }

            const useCurrency = currentMax.currency;
            return {
                selectedCurrency: useCurrency,
                currencySymbol: getSymbol(useCurrency)
            };
        }
        return {selectedCurrency: 'usd', currencySymbol: getSymbol('usd')};
    }, [mrrHistoryResponse]);

    const isLoading = useMemo(() => isPostReferrersLoading || isPostGrowthStatsLoading || isMrrLoading, [isPostReferrersLoading, isPostGrowthStatsLoading, isMrrLoading]);

    return {
        isLoading,
        stats,
        totals,
        selectedCurrency,
        currencySymbol
    };
};
