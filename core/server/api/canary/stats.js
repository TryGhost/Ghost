const statsService = require('../../services/stats');

module.exports = {
    docName: 'stats',
    memberCountHistory: {
        permissions: {
            docName: 'members',
            method: 'browse'
        },
        async query() {
            return await statsService.members.getCountHistory();
        }
    },
    mrr: {
        permissions: {
            docName: 'members',
            method: 'browse'
        },
        async query() {
            return await statsService.mrr.getHistory();
        }
    }
};
