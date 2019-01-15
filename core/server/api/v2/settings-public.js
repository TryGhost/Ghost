const settingsCache = require('../../services/settings/cache');

module.exports = {
    docName: 'settings',

    browse: {
        permissions: true,
        query() {
            // @TODO: decouple settings cache from API knowledge
            // The controller fetches models (or cached models) and the API frame for the target API version formats the response.
            return settingsCache.getPublic();
        }
    }
};
