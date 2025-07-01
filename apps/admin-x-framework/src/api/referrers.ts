import {createQuery} from '../utils/api/hooks';

export type ReferrerHistoryItem = {
    date: string,
    signups: number,
    source: string|null,
    paid_conversions: number,
    mrr: number
};

export interface ReferrerHistoryResponseType {
    stats: ReferrerHistoryItem[];
}

const dataType = 'ReferrerHistoryResponseType';

export const useReferrerHistory = createQuery<ReferrerHistoryResponseType>({
    dataType,
    path: '/stats/referrers/'
});

export const useTopSourcesGrowth = createQuery<ReferrerHistoryResponseType>({
    dataType: 'TopSourcesGrowthResponseType',
    path: '/stats/top-sources-growth'
});
