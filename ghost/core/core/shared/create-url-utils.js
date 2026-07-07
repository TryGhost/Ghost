const UrlUtils = require('@tryghost/url-utils');

const BASE_API_PATH = '/ghost/api';

/**
 * @param {object} options
 * @param {object} options.siteConfig - the site slice of config (see shared/config/site-config)
 */
module.exports = function createUrlUtils({siteConfig}) {
    const urlUtils = new UrlUtils({
        getSubdir: siteConfig.getSubdir,
        getSiteUrl: siteConfig.getSiteUrl,
        getAdminUrl: siteConfig.getAdminUrl,
        assetBaseUrls: siteConfig.assetBaseUrls,
        slugs: siteConfig.protectedSlugs,
        redirectCacheMaxAge: siteConfig.redirectCacheMaxAge,
        baseApiPath: BASE_API_PATH
    });

    urlUtils.BASE_API_PATH = BASE_API_PATH;

    return urlUtils;
};

module.exports.BASE_API_PATH = BASE_API_PATH;
