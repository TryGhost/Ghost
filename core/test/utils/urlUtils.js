const _ = require('lodash');
const sinon = require('sinon');
const config = require('../../server/config');
const UrlUtils = require('@tryghost/url-utils');
const urlUtils = require('../../server/lib/url-utils');

let sandbox;

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
    sandbox = sinon.createSandbox();
    const options = {
        url: config.get('url'),
        adminUrl: config.get('admin:url'),
        apiVersions: config.get('api:versions'),
        slugs: config.get('slugs').protected,
        redirectCacheMaxAge: config.get('caching:301:maxAge'),
        baseApiPath: '/ghost/api'
    };
    stubUrlUtils(options, sandbox);
};

const restore = () => {
    if (sandbox) {
        sandbox.restore();
    }
};

module.exports.stubUrlUtils = stubUrlUtils;
module.exports.stubUrlUtilsFromConfig = stubUrlUtilsFromConfig;
module.exports.restore = restore;
module.exports.getInstance = getInstance;
