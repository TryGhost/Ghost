const got = require('got');
const dnsPromises = require('dns').promises;
const errors = require('@tryghost/errors');
const config = require('../../shared/config');
const validator = require('@tryghost/validator');

function isPrivateIp(addr) {
    return /^(::f{4}:)?10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
      /^(::f{4}:)?192\.168\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
      /^(::f{4}:)?172\.(1[6-9]|2\d|30|31)\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
      /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
      /^(::f{4}:)?169\.254\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
      /^f[cd][0-9a-f]{2}:/i.test(addr) ||
      /^fe80:/i.test(addr) ||
      /^::[10]$/.test(addr) ||
      /^::$/.test(addr) ||
      /^0/.test(addr);
}

async function errorIfHostnameResolvesToPrivateIp(options) {
    // Allow all requests if we are in development mode
    if (config.get('env') === 'development') {
        return Promise.resolve();
    }

    // allow requests through to local Ghost instance
    const siteUrl = new URL(config.get('url'));
    const requestUrl = new URL(options.url.href);
    if (requestUrl.host === siteUrl.host) {
        return Promise.resolve();
    }

    const result = await dnsPromises.lookup(options.url.hostname);

    if (isPrivateIp(result.address)) {
        return Promise.reject(new errors.InternalServerError({
            message: 'URL resolves to a non-permitted private IP block',
            code: 'URL_PRIVATE_INVALID',
            context: options.url.href
        }));
    }
}

async function errorIfInvalidUrl(options) {
    if (config.get('env') === 'development') {
        return Promise.resolve();
    }

    if (!options.url.hostname || !validator.isURL(options.url.hostname)) {
        throw new errors.InternalServerError({
            message: 'URL invalid.',
            code: 'URL_MISSING_INVALID',
            context: options.url.href
        });
    }
}

async function disableRetries(options) {
    // Force disable retries
    options.retry = {
        limit: 0,
        calculateDelay: () => 0
    };
    options.timeout = 5000;
}

// same as our normal request lib but if any request in a redirect chain resolves
// to a private IP address it will be blocked before the request is made.
const gotOpts = {
    headers: {
        'user-agent': 'Ghost(https://github.com/TryGhost/Ghost)'
    },
    timeout: 10000, // default is no timeout
    hooks: {
        init: process.env.NODE_ENV?.startsWith('test') ? [disableRetries] : [],
        beforeRequest: [errorIfInvalidUrl, errorIfHostnameResolvesToPrivateIp],
        beforeRedirect: [errorIfHostnameResolvesToPrivateIp]
    }
};

module.exports = got.extend(gotOpts);
