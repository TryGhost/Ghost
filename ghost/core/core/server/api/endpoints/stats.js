const statsService = require('../../services/stats');

module.exports = {
    docName: 'stats',
    memberCountHistory: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'members',
            method: 'browse'
        },
        async query() {
            return await statsService.getMemberCountHistory();
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
        async query() {
            return await statsService.getMRRHistory();
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
        async query() {
            return await statsService.getSubscriptionCountHistory();
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
        async query(frame) {
            return await statsService.getPostReferrers(frame.data.id);
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
        async query() {
            return await statsService.getReferrersHistory();
        }
    }
};
