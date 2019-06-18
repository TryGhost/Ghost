const _ = require('lodash');
const sinon = require('sinon');
const UrlUtils = require('@tryghost/url-utils');
const config = require('../../server/config');
const urlUtils = require('../../server/lib/url-utils');

const defaultSandbox = sinon.createSandbox();

const getInstance = (options) => {
    const opts = {
        url: options.url,
        adminUrl: options.adminUrl,
        apiVersions: options.apiVersions,
        slugs: options.slugs,
        redirectCacheMaxAge: options.redirectCacheMaxAge,
        baseApiPath: '/ghost/api'
    };

    return new UrlUtils(opts);
};

const stubUrlUtils = (options, sandbox) => {
    const stubInstance = getInstance(options);

    Object.keys(urlUtils).forEach((key) => {
        sandbox.stub(urlUtils, key).callsFake(stubInstance[key]);
    });
};

// Method for regressions tests must be used with restore method
const stubUrlUtilsFromConfig = () => {
    const options = {
        url: config.get('url'),
        adminUrl: config.get('admin:url'),
        apiVersions: config.get('api:versions'),
        slugs: config.get('slugs').protected,
        redirectCacheMaxAge: config.get('caching:301:maxAge'),
        baseApiPath: '/ghost/api'
    };
    stubUrlUtils(options, defaultSandbox);
};

const restore = () => {
    defaultSandbox.restore();
};

module.exports.stubUrlUtils = stubUrlUtils;
module.exports.stubUrlUtilsFromConfig = stubUrlUtilsFromConfig;
module.exports.restore = restore;
module.exports.getInstance = getInstance;
