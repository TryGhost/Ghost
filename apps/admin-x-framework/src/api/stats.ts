import {Meta, createQuery, createQueryWithId} from '../utils/api/hooks';

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

export type PostReferrerStatItem = {
    source: string;
    referrer_url?: string;
    free_members: number;
    paid_members: number;
    mrr: number;
};

export type PostReferrersResponseType = {
    stats: PostReferrerStatItem[];
    meta: Meta;
};

export type PostGrowthStatItem = {
    post_id: string;
    free_members: number;
    paid_members: number;
    mrr: number;
};

export type PostGrowthStatsResponseType = {
    stats: PostGrowthStatItem[];
    meta: Meta;
};

export type MrrHistoryItem = {
    date: string;
    mrr: number;
    currency: string;
};
export type MrrHistoryResponseType = {
    stats: MrrHistoryItem[];
    meta: Meta;
};

export type NewsletterStatItem = {
    post_id: string;
    post_title: string;
    send_date: string;
    sent_to: number;
    total_opens: number;
    open_rate: number;
    total_clicks: number;
    click_rate: number;
};

export type NewsletterStatsResponseType = {
    stats: NewsletterStatItem[];
    meta: Meta;
};

export type NewsletterSubscriberDelta = {
    date: string;
    value: number;
};

export type NewsletterSubscriberStats = {
    total: number;
    deltas: NewsletterSubscriberDelta[];
};

export type NewsletterSubscriberStatsResponseType = {
    stats: NewsletterSubscriberStats[];
};

// Requests

const dataType = 'TopContentResponseType';
const memberCountHistoryDataType = 'MemberCountHistoryResponseType';
const topPostsStatsDataType = 'TopPostsStatsResponseType';
const postReferrersDataType = 'PostReferrersResponseType';
const newsletterStatsDataType = 'NewsletterStatsResponseType';
const newsletterSubscriberStatsDataType = 'NewsletterSubscriberStatsResponseType';

const postGrowthStatsDataType = 'PostGrowthStatsResponseType';
const mrrHistoryDataType = 'MrrHistoryResponseType';

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

export const usePostReferrers = createQueryWithId<PostReferrersResponseType>({
    dataType: postReferrersDataType,
    path: id => `/stats/posts/${id}/top-referrers`
});

export const usePostGrowthStats = createQueryWithId<PostGrowthStatsResponseType>({
    dataType: postGrowthStatsDataType,
    path: id => `/stats/posts/${id}/growth`
});
export const useMrrHistory = createQuery<MrrHistoryResponseType>({
    dataType: mrrHistoryDataType,
    path: '/stats/mrr/'
});

export const useNewsletterStats = createQuery<NewsletterStatsResponseType>({
    dataType: newsletterStatsDataType,
    path: '/stats/newsletter-stats/'
});

export const useSubscriberCount = createQuery<NewsletterSubscriberStatsResponseType>({
    dataType: newsletterSubscriberStatsDataType,
    path: '/stats/subscriber-count/'
});
