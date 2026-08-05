import {
    memberStatusStat,
    mrrHistoryStat,
    newsletterBasicStat,
    newsletterClickStat,
    newsletterSubscriberStat,
    newsletterSubscriberValue,
    postGrowthStat,
    postReferrerStat,
    postStats,
    subscriptionStat,
    topContentStat,
    topPostStat,
    topPostViewsStat,
} from "@tryghost/test-data";
import type {
    MemberCountHistoryResponseType,
    MrrHistoryResponseType,
    NewsletterBasicStatsResponseType,
    NewsletterClickStatsResponseType,
    NewsletterSubscriberStatsResponseType,
    PostGrowthStatsResponseType,
    PostReferrersResponseType,
    PostStatsResponseType,
    SubscriptionStatsResponseType,
    TopContentResponseType,
    TopPostsStatsResponseType,
    TopPostViewsResponseType,
} from "@tryghost/admin-x-framework/api/stats";

import { fakeAdminEndpoint, type EndpointCapture } from "./worker";

type InputOf<TBuilder> = TBuilder extends (input: infer TInput) => unknown ? NonNullable<TInput> : never;

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function endpoint(path: string): RegExp {
    return new RegExp(`^${escapeRegExp(path)}(?:\\?|$)`);
}

type MemberCountOptions = {
    stats?: [];
    totals?: MemberCountHistoryResponseType["meta"]["totals"];
} | {
    stats: Array<InputOf<typeof memberStatusStat>>;
    totals: MemberCountHistoryResponseType["meta"]["totals"];
};

type MrrOptions = {
    stats?: [];
    totals?: MrrHistoryResponseType["meta"]["totals"];
} | {
    stats: Array<InputOf<typeof mrrHistoryStat>>;
    totals: MrrHistoryResponseType["meta"]["totals"];
};

type SubscriptionOptions = {
    stats?: [];
    tiers?: string[];
    cadences?: string[];
    totals?: SubscriptionStatsResponseType["meta"]["totals"];
} | {
    stats: Array<InputOf<typeof subscriptionStat>>;
    tiers?: string[];
    cadences?: string[];
    totals: SubscriptionStatsResponseType["meta"]["totals"];
};

type PostStatsOverrides = Omit<InputOf<typeof postStats>, "id">;
type PostGrowthOverrides = Omit<InputOf<typeof postGrowthStat>, "post_id">;
type NewsletterSubscriberInput = Omit<InputOf<typeof newsletterSubscriberStat>, "values"> & {
    values?: Array<InputOf<typeof newsletterSubscriberValue>>;
};

/** Typed Admin analytics endpoints. Row defaults live in @tryghost/test-data. */
export const fakeAdminStats = {
    memberCount(options: MemberCountOptions = {}): EndpointCapture {
        const {stats = [], totals = {paid: 0, free: 0, comped: 0, gift: 0}} = options;
        const response = { stats: memberStatusStat.many(stats), meta: { totals } } satisfies MemberCountHistoryResponseType;
        return fakeAdminEndpoint("GET", endpoint("/stats/member_count/"), response);
    },

    mrr(options: MrrOptions = {}): EndpointCapture {
        const {stats = [], totals = []} = options;
        const response = { stats: mrrHistoryStat.many(stats), meta: { totals } } satisfies MrrHistoryResponseType;
        return fakeAdminEndpoint("GET", endpoint("/stats/mrr/"), response);
    },

    subscriptions(options: SubscriptionOptions = {}): EndpointCapture {
        const {stats = [], totals = []} = options;
        const builtStats = subscriptionStat.many(stats);
        const tiers = options.tiers ?? [...new Set(builtStats.map(stat => stat.tier))];
        const cadences = options.cadences ?? [...new Set(builtStats.map(stat => stat.cadence))];
        const response = { stats: builtStats, meta: { tiers, cadences, totals } } satisfies SubscriptionStatsResponseType;
        return fakeAdminEndpoint("GET", endpoint("/stats/subscriptions/"), response);
    },

    topContent(stats: Array<InputOf<typeof topContentStat>> = []): EndpointCapture {
        const response = { stats: topContentStat.many(stats), meta: {} } satisfies TopContentResponseType;
        return fakeAdminEndpoint("GET", endpoint("/stats/top-content/"), response);
    },

    topPosts(stats: Array<InputOf<typeof topPostStat>> = []): EndpointCapture {
        const response = { stats: topPostStat.many(stats), meta: {} } satisfies TopPostsStatsResponseType;
        return fakeAdminEndpoint("GET", endpoint("/stats/top-posts/"), response);
    },

    topPostViews(stats: Array<InputOf<typeof topPostViewsStat>> = []): EndpointCapture {
        const response = { stats: topPostViewsStat.many(stats) } satisfies TopPostViewsResponseType;
        return fakeAdminEndpoint("GET", endpoint("/stats/top-posts-views/"), response);
    },

    post(postId: string, overrides: PostStatsOverrides = {}): EndpointCapture {
        const response = { stats: [postStats({id: postId, ...overrides})] } satisfies PostStatsResponseType;
        return fakeAdminEndpoint("GET", endpoint(`/stats/posts/${postId}/stats/`), response);
    },

    postReferrers(postId: string, stats: Array<InputOf<typeof postReferrerStat>> = []): EndpointCapture {
        const response = { stats: postReferrerStat.many(stats), meta: {} } satisfies PostReferrersResponseType;
        return fakeAdminEndpoint("GET", endpoint(`/stats/posts/${postId}/top-referrers`), response);
    },

    postGrowth(postId: string, overrides: PostGrowthOverrides = {}): EndpointCapture {
        const response = { stats: [postGrowthStat({post_id: postId, ...overrides})], meta: {} } satisfies PostGrowthStatsResponseType;
        return fakeAdminEndpoint("GET", endpoint(`/stats/posts/${postId}/growth`), response);
    },

    newsletterSubscribers({values = [], ...overrides}: NewsletterSubscriberInput = {total: 0}): EndpointCapture {
        const response = {
            stats: [newsletterSubscriberStat({
                ...overrides,
                values: newsletterSubscriberValue.many(values)
            })]
        } satisfies NewsletterSubscriberStatsResponseType;
        return fakeAdminEndpoint("GET", endpoint("/stats/subscriber-count/"), response);
    },

    newsletterBasic(stats: Array<InputOf<typeof newsletterBasicStat>> = []): EndpointCapture {
        const response = { stats: newsletterBasicStat.many(stats), meta: {} } satisfies NewsletterBasicStatsResponseType;
        return fakeAdminEndpoint("GET", endpoint("/stats/newsletter-basic-stats/"), response);
    },

    newsletterClicks(stats: Array<InputOf<typeof newsletterClickStat>> = []): EndpointCapture {
        const response = { stats: newsletterClickStat.many(stats), meta: {} } satisfies NewsletterClickStatsResponseType;
        return fakeAdminEndpoint("GET", endpoint("/stats/newsletter-click-stats/"), response);
    },
};
