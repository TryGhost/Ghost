const UrlUtils = require('@tryghost/url-utils');
const config = require('./config');

const urlUtils = new UrlUtils({
    url: config.get('url'),
    adminUrl: config.get('admin:url'),
    apiVersions: config.get('api:versions'),
    defaultApiVersion: 'v3',
    slugs: config.get('slugs').protected,
    redirectCacheMaxAge: config.get('caching:301:maxAge'),
    baseApiPath: '/ghost/api',
    get cardTransformers() {
        // do not require mobiledoc until it's requested to avoid circular dependencies
        // shared/url-utils > server/lib/mobiledoc > server/lib/image/image-size > server/adapters/storage/utils
        const mobiledoc = require('../server/lib/mobiledoc');
        return mobiledoc.cards;
    }
});

module.exports = urlUtils;
