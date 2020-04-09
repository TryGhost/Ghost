const UrlUtils = require('@tryghost/url-utils');
const config = require('../config');
const mobiledoc = require('./mobiledoc');

const urlUtils = new UrlUtils({
    url: config.get('url'),
    adminUrl: config.get('admin:url'),
    apiVersions: config.get('api:versions'),
    defaultApiVersion: 'v3',
    slugs: config.get('slugs').protected,
    redirectCacheMaxAge: config.get('caching:301:maxAge'),
    baseApiPath: '/ghost/api',
    get cardTransformers() {
        return mobiledoc.cards;
    }
});

module.exports = urlUtils;
