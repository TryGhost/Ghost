const UrlUtils = require('@tryghost/url-utils');
const config = require('./config');

const BASE_API_PATH = '/ghost/api';
const urlUtils = new UrlUtils({
    getSubdir: config.getSubdir,
    getSiteUrl: config.getSiteUrl,
    getAdminUrl: config.getAdminUrl,
    assetBaseUrls: {
        media: config.get('urls:media'),
        files: config.get('urls:files')
    },
    slugs: config.get('slugs').protected,
    redirectCacheMaxAge: config.get('caching:301:maxAge'),
    baseApiPath: BASE_API_PATH
});

module.exports = urlUtils;
module.exports.BASE_API_PATH = BASE_API_PATH;
