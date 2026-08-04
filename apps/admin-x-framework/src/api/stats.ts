import { createQuery, createQueryWithId } from '../utils/api/hooks';
import { apiUrl, useFetchApi } from '../utils/api/fetch-api';
import { useQuery } from '@tanstack/react-query';

// Types

type StatsMeta = Record<string, never>;

export type TopContentItem = {
  pathname: string;
  visits: number;
  title?: string;
  post_uuid?: string;
  post_id?: string;
  post_type?: string;
  url_exists?: boolean;
};

export type TopContentResponseType = {
  stats: TopContentItem[];
  meta: StatsMeta;
};

export type MemberStatusItem = {
  date: string;
  paid: number;
  free: number;
  comped: number;
  gift?: number;
  paid_subscribed: number;
  paid_canceled: number;
};

export type MemberCountHistoryResponseType = {
  stats: MemberStatusItem[];
  meta: {
    totals: {
      paid: number;
      free: number;
      comped: number;
      gift: number;
    };
  };
};

export type TopPostStatItem = {
  post_id: string | null;
  attribution_url: string;
  attribution_type: string | null;
  attribution_id: string | null;
  title: string;
  free_members: number;
  paid_members: number;
  mrr: number;
  published_at: string | null;
  post_type: string | null;
  url_exists: boolean;
};

export type TopPostsStatsResponseType = {
  stats: TopPostStatItem[];
  meta: StatsMeta;
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
  meta: StatsMeta;
};

export type PostGrowthStatItem = {
  post_id: string;
  free_members: number;
  paid_members: number;
  mrr: number;
};

export type PostGrowthStatsResponseType = {
  stats: PostGrowthStatItem[];
  meta: StatsMeta;
};

export type MrrHistoryItem = {
  date: string;
  mrr: number;
  currency: string;
};

export type MrrTotalItem = {
  currency: string;
  mrr: number;
};

export type MrrHistoryResponseType = {
  stats: MrrHistoryItem[];
  meta: {
    totals: {
      mrr: number;
      currency: string;
    }[];
  };
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
  meta: StatsMeta;
};

export type NewsletterBasicStatItem = Omit<NewsletterStatItem, 'total_clicks' | 'click_rate'> & {
  total_clicks?: number;
  click_rate?: number;
};

export type NewsletterBasicStatsResponseType = {
  stats: NewsletterBasicStatItem[];
  meta: StatsMeta;
};

export type NewsletterClickStatItem = Pick<
  NewsletterStatItem,
  'post_id' | 'total_clicks' | 'click_rate'
> & {
  email_count: number;
};

export type NewsletterClickStatsResponseType = {
  stats: NewsletterClickStatItem[];
  meta: StatsMeta;
};

export type NewsletterSubscriberValue = {
  date: string;
  value: number; // Cumulative subscriber count for this date
};

export type NewsletterSubscriberStats = {
  total: number;
  values: NewsletterSubscriberValue[];
};

export type NewsletterSubscriberStatsResponseType = {
  stats: NewsletterSubscriberStats[];
};

export interface PostStats {
  id: string;
  recipient_count: number | null;
  opened_count: number | null;
  open_rate: number | null;
  member_delta: number;
  free_members: number;
  paid_members: number;
  visitors: number;
}

export type PostStatsResponseType = {
  stats: PostStats[];
};

export type TopPostViewsStats = {
  post_id: string;
  title: string;
  published_at: string;
  feature_image: string | null;
  status: string;
  authors: string;
  views: number;
  sent_count: number | null;
  opened_count: number | null;
  open_rate: number | null;
  clicked_count: number;
  click_rate: number | null;
  members: number;
  free_members: number;
  paid_members: number;
};

export type TopPostViewsResponseType = {
  stats: TopPostViewsStats[];
};

// Types for subscription stats
export type SubscriptionStatItem = {
  date: string;
  tier: string;
  cadence: string;
  positive_delta: number;
  negative_delta: number;
  signups: number;
  cancellations: number;
  count: number;
};

export type SubscriptionStatsResponseType = {
  stats: SubscriptionStatItem[];
  meta: {
    tiers: string[];
    cadences: string[];
    totals: {
      tier: string;
      cadence: string;
      count: number;
    }[];
  };
};

// Requests

const dataType = 'TopContentResponseType';
const memberCountHistoryDataType = 'MemberCountHistoryResponseType';
const topPostsStatsDataType = 'TopPostsStatsResponseType';
const postReferrersDataType = 'PostReferrersResponseType';
const newsletterStatsDataType = 'NewsletterStatsResponseType';
const newsletterBasicStatsDataType = 'NewsletterBasicStatsResponseType';
const newsletterClickStatsDataType = 'NewsletterClickStatsResponseType';
const newsletterSubscriberStatsDataType = 'NewsletterSubscriberStatsResponseType';

const postGrowthStatsDataType = 'PostGrowthStatsResponseType';
const mrrHistoryDataType = 'MrrHistoryResponseType';
const topPostViewsDataType = 'TopPostViewsResponseType';
const subscriptionStatsDataType = 'SubscriptionStatsResponseType';

export const useTopContent = createQuery<TopContentResponseType>({
  dataType,
  path: '/stats/top-content/',
});

export const useMemberCountHistory = createQuery<MemberCountHistoryResponseType>({
  dataType: memberCountHistoryDataType,
  path: '/stats/member_count/',
});

export const useTopPostsStats = createQuery<TopPostsStatsResponseType>({
  dataType: topPostsStatsDataType,
  path: '/stats/top-posts/',
});

export const usePostReferrers = createQueryWithId<PostReferrersResponseType>({
  dataType: postReferrersDataType,
  path: (id) => `/stats/posts/${id}/top-referrers`,
});

export const usePostGrowthStats = createQueryWithId<PostGrowthStatsResponseType>({
  dataType: postGrowthStatsDataType,
  path: (id) => `/stats/posts/${id}/growth`,
});
export const useMrrHistory = createQuery<MrrHistoryResponseType>({
  dataType: mrrHistoryDataType,
  path: '/stats/mrr/',
});

export const useSubscriptionStats = createQuery<SubscriptionStatsResponseType>({
  dataType: subscriptionStatsDataType,
  path: '/stats/subscriptions/',
});

export const usePostStats = createQueryWithId<PostStatsResponseType>({
  dataType: 'PostStatsResponseType',
  path: (id) => `/stats/posts/${id}/stats/`,
});

export const useTopPostsViews = createQuery<TopPostViewsResponseType>({
  dataType: topPostViewsDataType,
  path: '/stats/top-posts-views/',
});

export const useNewsletterStats = createQuery<NewsletterStatsResponseType>({
  dataType: newsletterStatsDataType,
  path: '/stats/newsletter-stats/',
  defaultSearchParams: {
    // Empty default params, will be filled by the hook
  },
});

export const useNewsletterBasicStats = createQuery<NewsletterBasicStatsResponseType>({
  dataType: newsletterBasicStatsDataType,
  path: '/stats/newsletter-basic-stats/',
  defaultSearchParams: {
    // Empty default params, will be filled by the hook
  },
});

export const useNewsletterClickStats = createQuery<NewsletterClickStatsResponseType>({
  dataType: newsletterClickStatsDataType,
  path: '/stats/newsletter-click-stats/',
  defaultSearchParams: {
    // Empty default params, will be filled by the hook
  },
});

export const useSubscriberCount = createQuery<NewsletterSubscriberStatsResponseType>({
  dataType: newsletterSubscriberStatsDataType,
  path: '/stats/subscriber-count/',
  defaultSearchParams: {
    // Empty default params, will be filled by the hook
  },
});

// Post visitor and member counts
//
// These two are POST-with-body *reads* — the id lists are too long for a query
// string — so they can't go through `createQuery`, which only builds GETs.
// Written directly against `useQuery` instead.

export type PostVisitorCounts = Record<string, number>;

export interface PostMemberCounts {
    [postId: string]: {free: number; paid: number};
}

/**
 * Visitor counts for a batch of posts, keyed by post uuid.
 *
 * The uuid list is part of the query key, so changing the filter starts a new
 * query rather than writing a stale response over the new one — which is what
 * the Ember service's manual generation counter exists to prevent.
 */
export const usePostVisitorCounts = (postUuids: string[], {enabled = true} = {}) => {
    const fetchApi = useFetchApi();

    return useQuery<PostVisitorCounts>({
        queryKey: ['PostVisitorCounts', [...postUuids].sort().join(',')],
        enabled: enabled && postUuids.length > 0,
        queryFn: async () => {
            const response = await fetchApi<{stats?: Array<{data?: {visitor_counts?: PostVisitorCounts}}>}>(
                apiUrl('/stats/posts-visitor-counts/'),
                {method: 'POST', body: JSON.stringify({postUuids})}
            );

            return response.stats?.[0]?.data?.visitor_counts ?? {};
        }
    });
};

/** Free and paid member counts for a batch of posts, keyed by post id. */
export const usePostMemberCounts = (postIds: string[], {enabled = true} = {}) => {
    const fetchApi = useFetchApi();

    return useQuery<PostMemberCounts>({
        queryKey: ['PostMemberCounts', [...postIds].sort().join(',')],
        enabled: enabled && postIds.length > 0,
        queryFn: async () => {
            // The endpoint returns `{stats: [{<postId>: {free_members,
            // paid_members}}]}` — the map sits directly in the first element,
            // not under a `data` key like the visitor endpoint's.
            // No explicit content-type: `fetchApi` sets it for string bodies,
            // and passing `Content-Type` here as well produces two
            // differently-cased keys in the same header object, which the
            // request drops — the endpoint then sees no body and returns an
            // empty map rather than an error.
            const response = await fetchApi<{
                stats?: Array<Record<string, {free_members?: number; paid_members?: number}>>
            }>(
                apiUrl('/stats/posts-member-counts/'),
                {method: 'POST', body: JSON.stringify({postIds})}
            );

            const raw = response.stats?.[0] ?? {};

            return Object.fromEntries(Object.entries(raw).map(([postId, counts]) => [
                postId,
                {free: counts.free_members ?? 0, paid: counts.paid_members ?? 0}
            ]));
        }
    });
};
