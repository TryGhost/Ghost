const settingsCache = require('../../services/settings/cache');
const urlUtils = require('../../../shared/url-utils');

module.exports = {
    docName: 'settings',

    browse: {
        permissions: true,
        query() {
            // @TODO: decouple settings cache from API knowledge
            // The controller fetches models (or cached models) and the API frame for the target API version formats the response.
            return Object.assign({}, settingsCache.getPublic(), {
                url: urlUtils.urlFor('home', true)
            });
        }
    }
};
