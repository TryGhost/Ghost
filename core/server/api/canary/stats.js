const statsService = require('../../services/stats');

module.exports = {
    docName: 'stats',
    memberCountHistory: {
        permissions: {
            docName: 'members',
            method: 'browse'
        },
        async query() {
            const data = await statsService.members.getCountHistory();

            return {
                data
            };
        }
    }
};
