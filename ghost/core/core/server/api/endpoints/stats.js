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
        cache: statsService.cache,
        generateCacheKeyData() {
            return {
                method: 'memberCountHistory'
            };
        },
        async query() {
            return await statsService.api.getMemberCountHistory();
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
    topPages: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'siteUuid',
            'dateFrom',
            'dateTo',
            'timezone',
            'memberStatus',
            'tbVersion'
        ],
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        cache: statsService.cache,
        generateCacheKeyData(frame) {
            return {
                method: 'topPages',
                options: frame.options
            };
        },
        async query(frame) {
            return await statsService.api.getTopPages(frame.options);
        }
    }
};

module.exports = controller;
