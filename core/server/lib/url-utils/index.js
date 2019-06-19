const UrlUtils = require('@tryghost/url-utils');
const config = require('../../config');

const urlUtils = new UrlUtils({
    url: config.get('url'),
    adminUrl: config.get('admin:url'),
    apiVersions: config.get('api:versions'),
    slugs: config.get('slugs').protected,
    redirectCacheMaxAge: config.get('caching:301:maxAge'),
    baseApiPath: '/ghost/api'
});

module.exports = urlUtils;
