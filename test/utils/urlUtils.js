const _ = require('lodash');
const sinon = require('sinon');
const UrlUtils = require('@tryghost/url-utils');
const config = require('../../core/server/config');
const urlUtils = require('../../core/server/lib/url-utils');

const defaultSandbox = sinon.createSandbox();

const getInstance = (options) => {
    const opts = {
        url: options.url,
        adminUrl: options.adminUrl,
        apiVersions: options.apiVersions,
        defaultApiVersion: 'v3',
        slugs: options.slugs,
        redirectCacheMaxAge: options.redirectCacheMaxAge,
        baseApiPath: '/ghost/api'
    };

    return new UrlUtils(opts);
};

const stubUrlUtils = (options, sandbox) => {
    const stubInstance = getInstance(options);
    const classPropNames = Object.getOwnPropertyNames(Object.getPrototypeOf(urlUtils))
        .filter(name => name !== 'constructor');

    classPropNames.forEach((key) => {
        if (typeof urlUtils[key] === 'function') {
            sandbox.stub(urlUtils, key).callsFake(function () {
                return stubInstance[key](...arguments);
            });
        } else {
            sandbox.stub(urlUtils, key).get(function () {
                return stubInstance[key];
            });
        }
    });
};

// Method for regressions tests must be used with restore method
const stubUrlUtilsFromConfig = () => {
    const options = {
        url: config.get('url'),
        adminUrl: config.get('admin:url'),
        apiVersions: config.get('api:versions'),
        defaultApiVersion: 'v3',
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
