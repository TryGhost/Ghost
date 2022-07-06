const exploreService = require('../../services/explore');

module.exports = {
    docName: 'explore',

    read: {
        permissions: true,
        query() {
            return exploreService.fetchData();
        }
    }
};
