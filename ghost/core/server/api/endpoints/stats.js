const statsService = require('../../services/stats').default;

// The API pipeline keeps each method's cache by reference when it builds the
// controller, before boot initializes Stats. Resolve the optional stats cache
// per request instead. Without one, a miss lets the pipeline run the query
// once itself, as it does for a method with no cache.
const statsCache = {
  get(key, fetchData) {
    const adapter = statsService.service.cache;
    return adapter ? adapter.get(key, fetchData) : undefined;
  },
  set(key, value) {
    const adapter = statsService.service.cache;
    return adapter ? adapter.set(key, value) : undefined;
  },
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'stats',
  memberCountHistory: {
    headers: {
      cacheInvalidate: false,
    },
    permissions: {
      docName: 'members',
      method: 'browse',
    },
    options: ['date_from'],
    cache: statsCache,
    generateCacheKeyData(frame) {
      return {
        method: 'memberCountHistory',
        options: frame.options,
      };
    },
    async query(frame) {
      return await statsService.service.api.getMemberCountHistory({
        dateFrom: frame?.options?.date_from,
      });
    },
  },
  mrr: {
    headers: {
      cacheInvalidate: false,
    },
    permissions: {
      docName: 'members',
      method: 'browse',
    },
    options: ['date_from'],
    cache: statsCache,
    generateCacheKeyData(frame) {
      return {
        method: 'mrr',
        options: frame.options,
      };
    },
    async query(frame) {
      return await statsService.service.api.getMRRHistory({
        dateFrom: frame?.options?.date_from,
      });
    },
  },
  subscriptions: {
    headers: {
      cacheInvalidate: false,
    },
    permissions: {
      docName: 'members',
      method: 'browse',
    },
    cache: statsCache,
    generateCacheKeyData() {
      return {
        method: 'subscriptions',
      };
    },
    async query() {
      return await statsService.service.api.getSubscriptionCountHistory();
    },
  },
  referrersHistory: {
    headers: {
      cacheInvalidate: false,
    },
    data: ['id'],
    permissions: {
      docName: 'posts',
      method: 'browse',
    },
    cache: statsCache,
    generateCacheKeyData() {
      return {
        method: 'referrersHistory',
      };
    },
    async query() {
      return await statsService.service.api.getReferrersHistory();
    },
  },
  topContent: {
    headers: {
      cacheInvalidate: false,
    },
    options: [
      'date_from',
      'date_to',
      'timezone',
      'member_status',
      'post_type',
      'post_uuid',
      'pathname',
      'device',
      'location',
      'source',
      'gift_link',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
    ],
    permissions: {
      docName: 'posts',
      method: 'browse',
    },
    cache: statsCache,
    generateCacheKeyData(frame) {
      return {
        method: 'topContent',
        options: frame.options,
      };
    },
    async query(frame) {
      return await statsService.service.api.getTopContent(frame.options);
    },
  },
  topPosts: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['order', 'limit', 'date_from', 'date_to', 'timezone', 'post_type'],
    permissions: {
      docName: 'posts',
      method: 'browse',
    },
    cache: statsCache,
    generateCacheKeyData(frame) {
      return {
        method: 'topPosts',
        options: {
          order: frame.options.order,
          limit: frame.options.limit,
          date_from: frame.options.date_from,
          date_to: frame.options.date_to,
          timezone: frame.options.timezone,
          post_type: frame.options.post_type,
        },
      };
    },
    async query(frame) {
      return await statsService.service.api.getTopPosts(frame.options);
    },
  },
  topPostsViews: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['order', 'limit', 'date_from', 'date_to', 'timezone'],
    permissions: {
      docName: 'posts',
      method: 'browse',
    },
    cache: statsCache,
    generateCacheKeyData(frame) {
      return {
        method: 'topPostsViews',
        options: {
          order: frame.options.order,
          limit: frame.options.limit,
          date_from: frame.options.date_from,
          date_to: frame.options.date_to,
          timezone: frame.options.timezone,
        },
      };
    },
    async query(frame) {
      return await statsService.service.api.getTopPostsViews(frame.options);
    },
  },
  newsletterStats: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['order', 'limit', 'date_from', 'date_to', 'timezone', 'newsletter_id'],
    permissions: {
      docName: 'posts',
      method: 'browse',
    },
    cache: statsCache,
    generateCacheKeyData(frame) {
      return {
        method: 'getNewsletterStats',
        options: {
          order: frame.options.order,
          limit: frame.options.limit,
          date_from: frame.options.date_from,
          date_to: frame.options.date_to,
          timezone: frame.options.timezone,
          newsletter_id: frame.options.newsletter_id,
        },
      };
    },
    async query(frame) {
      return await statsService.service.api.getNewsletterStats(frame.options);
    },
  },
  newsletterBasicStats: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['order', 'limit', 'date_from', 'date_to', 'timezone', 'newsletter_id'],
    permissions: {
      docName: 'posts',
      method: 'browse',
    },
    cache: statsCache,
    generateCacheKeyData(frame) {
      return {
        method: 'getNewsletterBasicStats',
        options: {
          order: frame.options.order,
          limit: frame.options.limit,
          date_from: frame.options.date_from,
          date_to: frame.options.date_to,
          timezone: frame.options.timezone,
          newsletter_id: frame.options.newsletter_id,
        },
      };
    },
    async query(frame) {
      return await statsService.service.api.getNewsletterBasicStats(frame.options);
    },
  },
  newsletterClickStats: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['newsletter_id', 'post_ids'],
    permissions: {
      docName: 'posts',
      method: 'browse',
    },
    cache: statsCache,
    generateCacheKeyData(frame) {
      return {
        method: 'getNewsletterClickStats',
        options: {
          newsletter_id: frame.options.newsletter_id,
          post_ids: frame.options.post_ids,
        },
      };
    },
    async query(frame) {
      return await statsService.service.api.getNewsletterClickStats(frame.options);
    },
  },
  subscriberCount: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['date_from', 'date_to', 'newsletter_id'],
    permissions: {
      docName: 'posts',
      method: 'browse',
    },
    cache: statsCache,
    generateCacheKeyData(frame) {
      return {
        method: 'getNewsletterSubscriberStats',
        options: {
          date_from: frame.options.date_from,
          date_to: frame.options.date_to,
          newsletter_id: frame.options.newsletter_id,
        },
      };
    },
    async query(frame) {
      return await statsService.service.api.getNewsletterSubscriberStats(frame.options);
    },
  },
  postReferrers: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['order', 'limit', 'date_from', 'date_to', 'timezone'],
    data: ['id'],
    validation: {
      data: {
        id: {
          type: 'string',
          required: true,
        },
      },
    },
    permissions: {
      docName: 'posts',
      method: 'browse',
    },
    cache: statsCache,
    generateCacheKeyData(frame) {
      return {
        method: 'postReferrers',
        data: {
          id: frame.data.id,
        },
      };
    },
    async query(frame) {
      return await statsService.service.api.getReferrersForPost(frame.data.id, frame.options);
    },
  },
  postGrowthStats: {
    headers: {
      cacheInvalidate: false,
    },
    data: ['id'],
    validation: {
      data: {
        id: {
          type: 'string',
          required: true,
        },
      },
    },
    permissions: {
      docName: 'posts',
      method: 'browse',
    },
    cache: statsCache,
    generateCacheKeyData(frame) {
      return {
        method: 'postGrowthStats',
        data: {
          id: frame.data.id,
        },
      };
    },
    async query(frame) {
      return await statsService.service.api.getGrowthStatsForPost(frame.data.id);
    },
  },
  postStats: {
    headers: {
      cacheInvalidate: false,
    },
    data: ['id'],
    validation: {
      data: {
        id: {
          type: 'string',
          required: true,
        },
      },
    },
    permissions: {
      docName: 'posts',
      method: 'browse',
    },
    cache: statsCache,
    generateCacheKeyData(frame) {
      return {
        method: 'getPostStats',
        data: {
          id: frame.data.id,
        },
      };
    },
    async query(frame) {
      return await statsService.service.api.getPostStats(frame.data.id);
    },
  },
  postsVisitorCounts: {
    headers: {
      cacheInvalidate: false,
    },
    data: ['postUuids'],
    validation: {
      data: {
        postUuids: {
          type: 'array',
          required: true,
        },
      },
    },
    permissions: {
      docName: 'posts',
      method: 'browse',
    },
    cache: statsCache,
    generateCacheKeyData(frame) {
      return {
        method: 'getPostsVisitorCounts',
        data: {
          postUuids: frame.data.postUuids,
        },
      };
    },
    async query(frame) {
      const visitorCounts = await statsService.service.api.getPostsVisitorCounts(
        frame.data.postUuids,
      );

      // Return in format expected by serializer
      return {
        data: [visitorCounts],
      };
    },
  },
  postsMemberCounts: {
    headers: {
      cacheInvalidate: false,
    },
    data: ['postIds'],
    validation: {
      data: {
        postIds: {
          type: 'array',
          required: true,
        },
      },
    },
    permissions: {
      docName: 'posts',
      method: 'browse',
    },
    cache: statsCache,
    generateCacheKeyData(frame) {
      return {
        method: 'getPostsMemberCounts',
        data: {
          postIds: frame.data.postIds,
        },
      };
    },
    async query(frame) {
      const memberCounts = await statsService.service.api.getPostsMemberCounts(frame.data.postIds);

      // Return in format expected by serializer
      return {
        data: [memberCounts],
      };
    },
  },
  topSourcesGrowth: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['order', 'limit', 'date_from', 'date_to', 'timezone', 'member_status'],
    permissions: {
      docName: 'posts',
      method: 'browse',
    },
    cache: statsCache,
    generateCacheKeyData(frame) {
      return {
        method: 'topSourcesGrowth',
        options: {
          order: frame.options.order,
          limit: frame.options.limit,
          date_from: frame.options.date_from,
          date_to: frame.options.date_to,
          timezone: frame.options.timezone,
          member_status: frame.options.member_status,
        },
      };
    },
    async query(frame) {
      return await statsService.service.api.getTopSourcesWithRange(frame.options);
    },
  },
};

module.exports = controller;
