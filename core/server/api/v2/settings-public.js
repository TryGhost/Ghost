const settingsCache = require('../../services/settings/cache');

module.exports = {
    docName: 'settings',

    browse: {
        permissions: true,
        query() {
            return settingsCache.getPublic();
        }
    }
};
