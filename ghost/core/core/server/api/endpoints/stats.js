const statsService = require('../../services/stats');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'stats',
    memberCountHistory: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'members',
            method: 'browse'
        },
        options: [
            'date_from'
        ],
        cache: statsService.cache,
        generateCacheKeyData(frame) {
            return {
                method: 'memberCountHistory',
                options: frame.options
            };
        },
        async query(frame) {
            return await statsService.api.getMemberCountHistory({
                dateFrom: frame?.options?.date_from
            });
        }
    },
    mrr: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'members',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData() {
            return {
                method: 'mrr'
            };
        },
        async query() {
            return await statsService.api.getMRRHistory();
        }
    },
    subscriptions: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'members',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData() {
            return {
                method: 'subscriptions'

            };
        },
        async query() {
            return await statsService.api.getSubscriptionCountHistory();
        }
    },
    postReferrers: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'id'
        ],
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData(frame) {
            return {
                method: 'postReferrers',
                data: {
                    id: frame.data.id
                }

            };
        },
        async query(frame) {
            return await statsService.api.getPostReferrers(frame.data.id);
        }
    },
    referrersHistory: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'id'
        ],
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData() {
            return {
                method: 'referrersHistory'
            };
        },
        async query() {
            return await statsService.api.getReferrersHistory();
        }
    },
    referrersHistoryWithRange: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'date_from',
            'date_to',
            'timezone',
            'member_status'
        ],
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData(frame) {
            return {
                method: 'referrersHistoryWithRange',
                options: {
                    date_from: frame.options.date_from,
                    date_to: frame.options.date_to,
                    timezone: frame.options.timezone,
                    member_status: frame.options.member_status
                }
            };
        },
        async query(frame) {
            return await statsService.api.getReferrersHistoryWithRange(frame.options.date_from, frame.options.date_to);
        }
    },
    topContent: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'date_from',
            'date_to',
            'timezone',
            'member_status',
            'tb_version',
            'post_type'
        ],
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData(frame) {
            return {
                method: 'topContent',
                options: frame.options
            };
        },
        async query(frame) {
            return await statsService.api.getTopContent(frame.options);
        }
    },
    topPosts: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'order',
            'limit',
            'date_from',
            'date_to',
            'timezone',
            'post_type'
        ],
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData(frame) {
            return {
                method: 'topPosts',
                options: {
                    order: frame.options.order,
                    limit: frame.options.limit,
                    date_from: frame.options.date_from,
                    date_to: frame.options.date_to,
                    timezone: frame.options.timezone,
                    post_type: frame.options.post_type
                }
            };
        },
        async query(frame) {
            return await statsService.api.getTopPosts(frame.options);
        }
    },
    topPostsViews: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'order',
            'limit',
            'date_from',
            'date_to',
            'timezone'
        ],
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData(frame) {
            return {
                method: 'topPostsViews',
                options: {
                    order: frame.options.order,
                    limit: frame.options.limit,
                    date_from: frame.options.date_from,
                    date_to: frame.options.date_to,
                    timezone: frame.options.timezone
                }
            };
        },
        async query(frame) {
            return await statsService.api.getTopPostsViews(frame.options);
        }
    },
    newsletterStats: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'order',
            'limit',
            'date_from',
            'date_to',
            'timezone',
            'newsletter_id'
        ],
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData(frame) {
            return {
                method: 'getNewsletterStats',
                options: {
                    order: frame.options.order,
                    limit: frame.options.limit,
                    date_from: frame.options.date_from,
                    date_to: frame.options.date_to,
                    timezone: frame.options.timezone,
                    newsletter_id: frame.options.newsletter_id
                }
            };
        },
        async query(frame) {
            return await statsService.api.getNewsletterStats(frame.options);
        }
    },
    newsletterBasicStats: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'order',
            'limit',
            'date_from',
            'date_to',
            'timezone',
            'newsletter_id'
        ],
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData(frame) {
            return {
                method: 'getNewsletterBasicStats',
                options: {
                    order: frame.options.order,
                    limit: frame.options.limit,
                    date_from: frame.options.date_from,
                    date_to: frame.options.date_to,
                    timezone: frame.options.timezone,
                    newsletter_id: frame.options.newsletter_id
                }
            };
        },
        async query(frame) {
            return await statsService.api.getNewsletterBasicStats(frame.options);
        }
    },
    newsletterClickStats: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'newsletter_id',
            'post_ids'
        ],
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData(frame) {
            return {
                method: 'getNewsletterClickStats',
                options: {
                    newsletter_id: frame.options.newsletter_id,
                    post_ids: frame.options.post_ids
                }
            };
        },
        async query(frame) {
            return await statsService.api.getNewsletterClickStats(frame.options);
        }
    },
    subscriberCount: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'date_from',
            'date_to',
            'newsletter_id'
        ],
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData(frame) {
            return {
                method: 'getNewsletterSubscriberStats',
                options: {
                    date_from: frame.options.date_from,
                    date_to: frame.options.date_to,
                    newsletter_id: frame.options.newsletter_id
                }
            };
        },
        async query(frame) {
            return await statsService.api.getNewsletterSubscriberStats(frame.options);
        }
    },
    postReferrersAlpha: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'order',
            'limit',
            'date_from',
            'date_to',
            'timezone'
        ],
        data: [
            'id'
        ],
        validation: {
            data: {
                id: {
                    type: 'string',
                    required: true
                }
            }
        },
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData(frame) {
            return {
                method: 'getReferrersForPost',
                data: {
                    id: frame.data.id
                }
            };
        },
        async query(frame) {
            return await statsService.api.getReferrersForPost(frame.data.id, frame.options);
        }
    },
    postGrowthStats: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'id'
        ],
        validation: {
            data: {
                id: {
                    type: 'string',
                    required: true
                }
            }
        },
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData(frame) {
            return {
                method: 'postGrowthStats',
                data: {
                    id: frame.data.id
                }
            };
        },
        async query(frame) {
            return await statsService.api.getGrowthStatsForPost(frame.data.id);
        }
    },
    latestPost: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData() {
            return {
                method: 'getLatestPostStats'
            };
        },
        async query() {
            return await statsService.api.getLatestPostStats();
        }
    }
};

module.exports = controller;
