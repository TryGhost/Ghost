const statsService = require('../../services/stats');

module.exports = {
    docName: 'stats',
    memberCountHistory: {
        permissions: {
            docName: 'members',
            method: 'browse'
        },
        async query() {
            return await statsService.getMemberCountHistory();
        }
    },
    mrr: {
        permissions: {
            docName: 'members',
            method: 'browse'
        },
        async query() {
            return await statsService.getMRRHistory();
        }
    },
    subscriptions: {
        permissions: {
            docName: 'members',
            method: 'browse'
        },
        async query() {
            return await statsService.getSubscriptionCountHistory();
        }
    },
    postReferrers: {
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
