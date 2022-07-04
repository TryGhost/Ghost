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
    }
};
