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
    topContent: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'date_from',
            'date_to',
            'timezone',
            'member_status',
            'tb_version'
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
            'timezone'
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
                    timezone: frame.options.timezone
                }
            };
        },
        async query(frame) {
            return await statsService.api.getTopPosts(frame.options);
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
    }
};

module.exports = controller;
