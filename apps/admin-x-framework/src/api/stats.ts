import {Meta, createQuery} from '../utils/api/hooks';

// Types

export type TopContentItem = {
    pathname: string;
    visits: number;
    title?: string;
    post_uuid?: string;
    post_id?: string;
}

export type TopContentResponseType = {
    stats: TopContentItem[];
    meta: Meta;
}

export type MemberStatusItem = {
    date: string;
    paid: number;
    free: number;
    comped: number;
    paid_subscribed: number;
    paid_canceled: number;
}

export type MemberCountHistoryResponseType = {
    stats: MemberStatusItem[];
    meta: {
        totals: {
            paid: number;
            free: number;
            comped: number;
        }
    };
}

export type TopPostStatItem = {
    post_id: string;
    title: string;
    free_members: number;
    paid_members: number;
    mrr: number;
};

export type TopPostsStatsResponseType = {
    stats: TopPostStatItem[];
    meta: Meta;
};

// Requests

const dataType = 'TopContentResponseType';
const memberCountHistoryDataType = 'MemberCountHistoryResponseType';
const topPostsStatsDataType = 'TopPostsStatsResponseType';

export const useTopContent = createQuery<TopContentResponseType>({
    dataType,
    path: '/stats/top-content/'
});

export const useMemberCountHistory = createQuery<MemberCountHistoryResponseType>({
    dataType: memberCountHistoryDataType,
    path: '/stats/member_count/'
});

export const useTopPostsStats = createQuery<TopPostsStatsResponseType>({
    dataType: topPostsStatsDataType,
    path: '/stats/top-posts/'
});
