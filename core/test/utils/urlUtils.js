const _ = require('lodash');
const UrlUtils = require('@tryghost/url-utils');

const getInstance = (config) => {
    const params = {
        url: config.url,
        adminUrl: config.adminUrl,
        apiVersions: config.apiVersions,
        slugs: config.slugs,
        redirectCacheMaxAge: config.cachingMaxAge,
        baseApiPath: '/ghost/api'
    };

    return new UrlUtils(params);
};

module.exports.getInstance = getInstance;
