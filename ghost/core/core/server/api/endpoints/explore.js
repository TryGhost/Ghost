const exploreService = require('../../services/explore');

module.exports = {
    docName: 'explore',

    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query() {
            return exploreService.fetchData();
        }
    }
};
