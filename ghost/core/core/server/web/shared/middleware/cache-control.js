// # CacheControl Middleware
// Usage: cacheControl(profile), where profile is one of 'public' or 'private'
// After: checkIsPrivate
// Before: routes
// App: Admin|Site|API
//
// Allows each app to declare its own default caching rules

const isString = require('lodash/isString');

/**
 * @param {'public'|'private'|'noCache'} profile Use "private" if you do not want caching
 * @param {object} [options]
 * @param {number} [options.maxAge] The max-age in seconds to use when profile is "public"
 * @param {number} [options.staleWhileRevalidate] The stale-while-revalidate in seconds to use when profile is "public"
 */
const cacheControl = (profile, options = {maxAge: 0}) => {
    const isOptionHasProperty = property => Object.prototype.hasOwnProperty.call(options, property);
    const publicOptions = [
        'public',
        `max-age=${options.maxAge}`,
        isOptionHasProperty('staleWhileRevalidate') ? `stale-while-revalidate=${options.staleWhileRevalidate}` : ''
    ];

    const profiles = {
        public: publicOptions.filter(option => option).join(', '),
        noCache: 'no-cache, max-age=0, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0',
        private: 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    };

    let output;

    if (isString(profile) && Object.prototype.hasOwnProperty.call(profiles, profile)) {
        output = profiles[profile];
    }

    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {() => void} next
     *
     * @returns {void}
     */
    return function cacheControlHeaders(req, res, next) {
        if (output) {
            res.set({'Cache-Control': output});
        }
        next();
    };
};

module.exports = cacheControl;
