const _ = require('lodash');
const UrlUtils = require('@tryghost/url-utils');
const urlUtils = require('../../server/lib/url-utils');

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

const stubUrlUtils = (config, sandbox) => {
    const stubInstance = getInstance(config);

    Object.keys(urlUtils).forEach((key) => {
        sandbox.stub(urlUtils, key).callsFake(stubInstance[key]);
    });
};

module.exports.stubUrlUtils = stubUrlUtils;
module.exports.getInstance = getInstance;
