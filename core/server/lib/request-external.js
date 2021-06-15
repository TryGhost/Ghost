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
      /^::1$/.test(addr) ||
      /^::$/.test(addr);
}

async function errorIfHostnameResolvesToPrivateIp(options) {
    // allow requests through to local Ghost instance
    const siteUrl = new URL(config.get('url'));
    const requestUrl = new URL(options.href);
    if (requestUrl.host === siteUrl.host) {
        return Promise.resolve();
    }

    const result = await dnsPromises.lookup(options.hostname);

    if (isPrivateIp(result.address)) {
        return Promise.reject(new errors.InternalServerError({
            message: 'URL resolves to a non-permitted private IP block',
            code: 'URL_PRIVATE_INVALID',
            context: options.href
        }));
    }
}

// same as our normal request lib but if any request in a redirect chain resolves
// to a private IP address it will be blocked before the request is made.
const externalRequest = got.extend({
    headers: {
        'user-agent': 'Ghost(https://github.com/TryGhost/Ghost)'
    },
    hooks: {
        init: [(options) => {
            if (!options.hostname || !validator.isURL(options.hostname)) {
                throw new errors.InternalServerError({
                    message: 'URL empty or invalid.',
                    code: 'URL_MISSING_INVALID',
                    context: options.href
                });
            }
        }],
        beforeRequest: [errorIfHostnameResolvesToPrivateIp],
        beforeRedirect: [errorIfHostnameResolvesToPrivateIp]
    }
});

module.exports = externalRequest;
